#!/usr/bin/env python3
"""
Clepso design-system build. stdlib only.

  python3 design/src/build.py            # writes design/system/** and the review page
  python3 design/src/build.py --artifact <path>   # also writes the artifact-flavoured review page

Inputs  (design/src):  tokens.py · bundle.css · base.css · page.css · icons.svg · previews/*.html · screens/*.html · page/*.html · guidelines.py
Outputs (design/system): tokens.json · tokens.css · contrast-report.md · components/bundle.css ·
        components/<Comp>/preview.html (+ README.md) · cards.json · preview.html
"""
import json, os, re, sys, html
from html.parser import HTMLParser

SRC = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.abspath(os.path.join(SRC, '..', 'system'))
sys.path.insert(0, SRC)
import tokens as T
import build_tokens
from guidelines import GUIDELINES

FONTS_HREF = "https://fonts.googleapis.com/css2?family=Geist:wght@300..700&family=Geist+Mono:wght@400..600&display=swap"

def read(p):
    with open(p, encoding='utf-8') as f: return f.read()

def write(p, s):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, 'w', encoding='utf-8') as f: f.write(s)

# ── placeholder substitution ─────────────────────────────────────────────────
SEM = {n: {'light': l, 'dark': d} for n, l, d, _v, _u in T.SEMANTIC}
def subst(s):
    def t(m): return SEM[m.group(1)][m.group(2)]
    def a(m): return T.ACCENTS[T.DEFAULT_ACCENT][m.group(2)][m.group(1)]
    def st(m): return T.STATUS[m.group(1)][m.group(3)][m.group(2)]
    s = re.sub(r'\{\{T:([a-z0-9-]+):(light|dark)\}\}', t, s)
    s = re.sub(r'\{\{A:([a-z-]+):(light|dark)\}\}', a, s)
    s = re.sub(r'\{\{S:([a-z]+):([a-z]+):(light|dark)\}\}', st, s)
    return s

# ── fragment parsing ─────────────────────────────────────────────────────────
HEAD_RE = re.compile(r'^\s*<!--\s*@card\s+(.*?)\s*-->\s*', re.S)
ATTR_RE = re.compile(r'(\w+)=(?:"([^"]*)"|(\S+))')
def parse_fragment(path):
    raw = read(path)
    m = HEAD_RE.match(raw)
    if not m: raise SystemExit(f"{path}: missing <!-- @card ... --> header")
    attrs = {k: (v1 or v2) for k, v1, v2 in ATTR_RE.findall(m.group(1))}
    body = subst(raw[m.end():]).strip()
    attrs.setdefault('height', '400')
    attrs['file'] = os.path.basename(path)
    return attrs, body

# ── tag balance check (cheap guard, since nothing renders these in CI) ────────
VOID = {'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr','use','path','circle','rect','line','polyline','polygon'}
class Balance(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=False); self.stack = []; self.errors = []
    def handle_starttag(self, tag, attrs):
        if tag in VOID: return
        self.stack.append((tag, self.getpos()[0]))
    def handle_startendtag(self, tag, attrs): pass
    def handle_endtag(self, tag):
        if tag in VOID: return
        if not self.stack: self.errors.append(f"stray </{tag}> at line {self.getpos()[0]}"); return
        if self.stack[-1][0] != tag:
            # look back for a match: report mismatch
            names = [t for t, _ in self.stack]
            if tag in names:
                while self.stack and self.stack[-1][0] != tag:
                    t, ln = self.stack.pop(); self.errors.append(f"unclosed <{t}> from line {ln} (closed by </{tag}> at {self.getpos()[0]})")
                self.stack.pop()
            else:
                self.errors.append(f"unexpected </{tag}> at line {self.getpos()[0]} (open: {names[-3:]})")
        else:
            self.stack.pop()
def check_balance(name, s):
    b = Balance(); b.feed(s); b.close()
    for t, ln in b.stack: b.errors.append(f"unclosed <{t}> from line {ln}")
    return [f"{name}: {e}" for e in b.errors]

# ── assembly ─────────────────────────────────────────────────────────────────
def preview_doc(attrs, body, css, sprite):
    title = html.escape(attrs.get('title', attrs.get('dir', 'Preview')))
    head_line = f'<!-- @dsCard group="{html.escape(attrs.get("group", "Components"))}" height={int(attrs["height"])} -->'
    return (f'{head_line}\n<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
            f'<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>{title} · Clepso</title>\n'
            f'<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
            f'<link rel="stylesheet" href="{FONTS_HREF}">\n<style>\n{css}\n</style>\n</head>\n<body class="cl">\n{sprite}\n{body}\n</body>\n</html>\n')

def demo_block(attrs, body, extra_cls=''):
    sub = f'<small>{html.escape(attrs.get("subtitle", ""))}</small>' if attrs.get('subtitle') else ''
    return (f'<div class="rp-demo rp-demo--canvas {extra_cls}"><div class="rp-demo__title"><span>{html.escape(attrs.get("title", ""))}</span>{sub}</div>'
            f'<div class="cl">{body}</div></div>')

def frame_block(attrs, body):
    cap = f'<div class="rp-frame__cap"><b>{html.escape(attrs.get("title", ""))}</b>{html.escape(attrs.get("subtitle", ""))}</div>'
    if attrs.get('frame') == 'browser':
        return (f'<div class="rp-frame" style="width:100%"><div class="rp-browser-wrap"><div class="rp-browser-scale" data-scale-width="{attrs.get("width", "1280")}">'
                f'<div class="cl">{body}</div></div></div>{cap}</div>')
    out = f'<div class="rp-frame"><div class="cl">{body}</div>{cap}</div>'
    if attrs.get('dark') == 'true':
        out += f'<div class="rp-frame"><div class="cl cl-theme-dark">{body}</div><div class="rp-frame__cap"><b>{html.escape(attrs.get("title", ""))} · dark</b>Courthouse mode</div></div>'
    return out

def main():
    artifact_path = None
    if '--artifact' in sys.argv:
        artifact_path = sys.argv[sys.argv.index('--artifact') + 1]
    build_tokens.main()
    tokens_css = read(os.path.join(OUT, 'tokens.css'))
    bundle_css = read(os.path.join(SRC, 'bundle.css'))
    base_css = read(os.path.join(SRC, 'base.css'))
    page_css = read(os.path.join(SRC, 'page.css'))
    sprite = read(os.path.join(SRC, 'icons.svg')).strip()
    write(os.path.join(OUT, 'components', 'bundle.css'), bundle_css)
    write(os.path.join(OUT, 'assets', 'icons', 'sprite.svg'), sprite.replace(' style="display:none" aria-hidden="true"', '') + '\n')

    preview_css = tokens_css + '\n' + bundle_css + '\n' + base_css
    errors, cards = [], []
    frags = []
    for folder in ('previews', 'screens'):
        d = os.path.join(SRC, folder)
        for fn in sorted(os.listdir(d)):
            if not fn.endswith('.html'): continue
            attrs, body = parse_fragment(os.path.join(d, fn))
            frags.append((attrs, body))
            comp = attrs['dir']
            doc = preview_doc(attrs, body, preview_css, sprite)
            errors += check_balance(f'{folder}/{fn}', body)
            write(os.path.join(OUT, 'components', comp, 'preview.html'), doc)
            readme = GUIDELINES.get(comp)
            if not readme:
                readme = f"# {attrs.get('title', comp)}\n\n{attrs.get('subtitle', '')}\n"
                errors.append(f'{folder}/{fn}: no guideline text for {comp} (using subtitle)')
            write(os.path.join(OUT, 'components', comp, 'README.md'), readme.strip() + '\n')
            cards.append({'path': f'components/{comp}/preview.html', 'group': attrs.get('group'), 'name': attrs.get('title'),
                          'subtitle': attrs.get('subtitle', ''), 'height': int(attrs['height']), 'source': f'design/src/{folder}/{fn}'})
    write(os.path.join(OUT, 'cards.json'), json.dumps({'system': 'Clepso', 'cards': cards}, indent=2, ensure_ascii=False) + '\n')

    # ── review page ──
    by_group = {}
    for attrs, body in frags: by_group.setdefault(attrs.get('group'), []).append((attrs, body))
    def embed(m):
        group = m.group(1)
        items = by_group.get(group, [])
        return '<div class="rp-demos">' + ''.join(demo_block(a, b, 'span-2' if a.get('wide') == 'true' else '') for a, b in items) + '</div>'
    def embed_screens(m):
        group = m.group(1)
        items = by_group.get(group, [])
        return '<div class="rp-frames">' + ''.join(frame_block(a, b) for a, b in items) + '</div>'
    parts = []
    pd = os.path.join(SRC, 'page')
    for fn in sorted(os.listdir(pd)):
        if fn.endswith('.html'): parts.append(subst(read(os.path.join(pd, fn))))
    body = '\n'.join(parts)
    body = re.sub(r'\{\{EMBED:([^}]+)\}\}', embed, body)
    body = re.sub(r'\{\{EMBED_SCREENS:([^}]+)\}\}', embed_screens, body)
    errors += check_balance('page', body)
    page_js = read(os.path.join(SRC, 'page.js'))
    style = tokens_css + '\n' + bundle_css + '\n' + page_css
    title = 'Clepso Design System'
    head = (f'<title>{title}</title>\n<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
            f'<link rel="stylesheet" href="{FONTS_HREF}">\n<style>\n{style}\n</style>\n')
    page_body = f'<div class="rp">\n{sprite}\n{body}\n</div>\n<script>\n{page_js}\n</script>\n'
    inner = head + page_body
    full = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
            + head + '</head>\n<body>\n' + page_body + '</body>\n</html>\n')
    write(os.path.join(OUT, 'preview.html'), full)
    if artifact_path:
        write(artifact_path, inner)
    print(f"built {len(cards)} cards → {OUT}")
    if errors:
        print(f"{len(errors)} warnings:")
        for e in errors: print('  ' + e)
    else:
        print('tag balance: clean')

if __name__ == '__main__':
    main()
