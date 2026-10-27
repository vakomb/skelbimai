# One-time migration: original single-file index.html -> src/ tree.
import re, os, sys, json
src_path, out = sys.argv[1], sys.argv[2]
s = open(src_path, encoding='utf-8').read()
pat = re.compile(r'<(style|script)\b([^>]*)>(.*?)</\1>', re.S | re.I)
unnamed = {0:'base-theme', 3:'task-form-row', 4:'legacy-ui-a', 5:'legacy-ui-b'}
os.makedirs(f'{out}/styles', exist_ok=True); os.makedirs(f'{out}/scripts', exist_ok=True)
os.makedirs(f'{out}/vendor', exist_ok=True); os.makedirs(f'{out}/partials', exist_ok=True)
parts=[]; prev=0; n=0
for idx,m in enumerate(pat.finditer(s)):
    tag, attrs, body = m.group(1), m.group(2), m.group(3)
    parts.append(s[prev:m.start()]); prev=m.end()
    if 'src=' in attrs and not body:
        parts.append(m.group(0)); continue
    n+=1
    mid = re.search(r'id="([^"]+)"', attrs)
    name = mid.group(1) if mid else unnamed.get(idx)
    if not name:
        if '.vehicleDocPicker' in body[:200]: name='vehicle-doc-picker'
        elif 'LEGACY_STORAGE_KEY' in body[:200]: name='app-main'
        else: name=f'unnamed-{idx}'
    if name=='embedded-jszip':
        rel='vendor/jszip.min.js'
    else:
        ext='css' if tag=='style' else 'js'
        rel=f"{'styles' if tag=='style' else 'scripts'}/{n:03d}-{name}.{ext}"
    open(f'{out}/{rel}','w',encoding='utf-8',newline='').write(body)
    parts.append(f'<!-- @inline <{tag}{attrs}> {rel} -->')
parts.append(s[prev:])
tpl=''.join(parts)
# markup partials
cuts=[('login','\n<section class="autoEasierLogin"'),
      (None,'\n<div class="app">')]
for v in ['home','garage-what','garage','garage-leads','garage-stats','finance','menu','customers','accounting','settings']:
    tag='main' if v=='home' else 'div'
    cuts.append((f'view-{v}', f'\n  <{tag} class="view" id="view-{v}"'))
cuts.append((None,'\n  <div class="footerSpace">'))
cuts.append(('overlays','\n<div class="toastWrap"'))
cuts.append(('nav','\n<div class="navWrap">'))
cuts.append((None,'\n<!-- @inline'))
pos=[]
for name,needle in cuts:
    k=tpl.find(needle, pos[-1][1] if pos else 0); assert k>0,needle; pos.append((name,k))
outtpl=tpl[:pos[0][1]+1]
for (name,a),(_,b) in zip(pos,pos[1:]):
    chunk=tpl[a+1:b+1]
    if name:
        open(f'{out}/partials/{name}.html','w',encoding='utf-8',newline='').write(chunk)
        outtpl+=f'<!-- @include partials/{name}.html -->\n'
    else: outtpl+=chunk
outtpl+=tpl[pos[-1][1]+1:]
open(f'{out}/index.html','w',encoding='utf-8',newline='').write(outtpl)
print('blocks',n)
