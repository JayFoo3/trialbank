"""b2.py - tiny Backblaze B2 client (S3-compatible API) for Trialbank's PDFs. No extra packages needed.
Reads B2_KEY_ID, B2_APP_KEY, B2_BUCKET, B2_ENDPOINT (e.g. s3.us-west-004.backblazeb2.com) from the environment."""
import datetime, hashlib, hmac, os, sys, time, urllib.parse
import requests

KEY_ID = os.environ.get('B2_KEY_ID', '')
APP_KEY = os.environ.get('B2_APP_KEY', '')
BUCKET = os.environ.get('B2_BUCKET', '')
ENDPOINT = os.environ.get('B2_ENDPOINT', '').replace('https://', '').replace('http://', '').rstrip('/')
REGION = ENDPOINT.split('.')[1] if ENDPOINT.count('.') >= 2 else 'us-west-004'


def ready():
    return all((KEY_ID, APP_KEY, BUCKET, ENDPOINT))


def need():
    if not ready():
        sys.exit('Set B2_KEY_ID, B2_APP_KEY, B2_BUCKET and B2_ENDPOINT first.')


def _sign(method, key, headers, now=None, params=None):
    """AWS Signature Version 4 headers for one request (payload left unsigned)."""
    now = now or datetime.datetime.now(datetime.timezone.utc)
    amz, day = now.strftime('%Y%m%dT%H%M%SZ'), now.strftime('%Y%m%d')
    path = '/' + BUCKET + ('/' + urllib.parse.quote(key, safe='/~') if key is not None else '')
    q = '&'.join(f"{urllib.parse.quote(k, safe='-_.~')}={urllib.parse.quote(str(v), safe='-_.~')}" for k, v in sorted((params or {}).items()))
    h = {**{k.lower(): str(v).strip() for k, v in headers.items()},
         'host': ENDPOINT, 'x-amz-date': amz, 'x-amz-content-sha256': 'UNSIGNED-PAYLOAD'}
    names = sorted(h)
    canonical = '\n'.join([method, path, q, ''.join(f'{n}:{h[n]}\n' for n in names), ';'.join(names), 'UNSIGNED-PAYLOAD'])
    scope = f'{day}/{REGION}/s3/aws4_request'
    to_sign = '\n'.join(['AWS4-HMAC-SHA256', amz, scope, hashlib.sha256(canonical.encode()).hexdigest()])
    k = ('AWS4' + APP_KEY).encode()
    for part in (day, REGION, 's3', 'aws4_request'):
        k = hmac.new(k, part.encode(), hashlib.sha256).digest()
    sig = hmac.new(k, to_sign.encode(), hashlib.sha256).hexdigest()
    h['authorization'] = f'AWS4-HMAC-SHA256 Credential={KEY_ID}/{scope}, SignedHeaders={";".join(names)}, Signature={sig}'
    return f'https://{ENDPOINT}{path}' + ('?' + q if q else ''), h


def _call(method, key, data=None, headers=None, tries=5, params=None):
    err = ''
    for i in range(tries):
        url, h = _sign(method, key, headers or {}, params=params)
        try:
            r = requests.request(method, url, headers=h, data=data, timeout=180)
            if r.status_code < 500 and r.status_code != 429:
                return r
            err = f'{r.status_code}: {r.text[:200]}'
        except requests.RequestException as ex:
            err = str(ex)
        time.sleep(3 * (i + 1))
    sys.exit(f'B2 {method} {key} failed: {err}')


def put(key, data, ctype='application/pdf'):
    r = _call('PUT', key, data, {'content-type': ctype, 'content-length': str(len(data))})
    if r.status_code >= 300:
        sys.exit(f'B2 upload {key} -> {r.status_code}: {r.text[:300]}')


def size(key):
    """Size in bytes, or None if it isn't there."""
    r = _call('HEAD', key)
    return int(r.headers.get('content-length', 0)) if r.status_code == 200 else None


def delete(key):
    _call('DELETE', key)


def listing(prefix=''):
    """{key: size} for everything in the bucket (one request per 1,000 files)."""
    import xml.etree.ElementTree as ET
    out, token = {}, None
    while True:
        params = {'list-type': '2', 'max-keys': '1000'}
        if prefix: params['prefix'] = prefix
        if token: params['continuation-token'] = token
        r = _call('GET', None, params=params)
        if r.status_code >= 300:
            sys.exit(f'B2 list -> {r.status_code}: {r.text[:300]}')
        root = ET.fromstring(r.content); ns = root.tag.split('}')[0] + '}' if root.tag.startswith('{') else ''
        for c in root.findall(f'{ns}Contents'):
            out[c.find(f'{ns}Key').text] = int(c.find(f'{ns}Size').text)
        if root.findtext(f'{ns}IsTruncated') != 'true':
            return out
        token = root.findtext(f'{ns}NextContinuationToken')
