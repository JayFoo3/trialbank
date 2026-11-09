import random, math
import sympy as sp
from sympy import Rational as Q, latex, sqrt, pi, sin, cos, tan, exp, log, symbols, integrate, diff, simplify, factor, expand, Eq, solve, Symbol

x, y, t, k, n = symbols('x y t k n', real=True)


def m(e):
    """sympy expression or TeX string -> \\( \\)"""
    return '\\(' + (e if isinstance(e, str) else latex(e)) + '\\)'


def L(e): return e if isinstance(e, str) else latex(e)


def dp(v, d=2):
    v = float(v)
    s = f'{v:,.{d}f}'
    return s.replace(',', '{,}')


def money(v): return '\\$' + dp(v, 2)


def opts4(right, cands, fmt=str):
    """right answer + first 3 distinct wrong candidates (formatted), or None"""
    r = fmt(right); out = [r]
    for c in cands:
        try: f = fmt(c)
        except Exception: continue
        if f not in out: out.append(f)
        if len(out) == 4: return r, out[1:]
    return None
