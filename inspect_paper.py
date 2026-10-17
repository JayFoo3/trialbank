import cutter, re, sys, json
pdf = sys.argv[1]
pages = cutter.parse_pages(pdf)
items, ends, sol = cutter.find_structure(pages)
s1, s2 = cutter.find_sections(pages)
print('pages', len(pages), 'sec1', s1, 'sec2', s2, 'sol_start', sol, 'ends', ends[:4])
print('items:', [(i['kind'][0], i['number'], i['part'], i['page']+1, i['marks']) for i in items])
if len(sys.argv) > 2:
    for pg in [int(x) for x in sys.argv[2].split(',')]:
        p = pages[pg-1]; print('--- page', pg)
        for l in p['lines']:
            left = l['x0'] < p['width']*0.35
            right = len(l['words'])==1 and l['x0'] > p['width']*0.8
            if left or right:
                print(round(l['x0']), round(l['y0']), ('R ' if right else '') + repr(l['text'][:55]))
