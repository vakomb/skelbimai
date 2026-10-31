import sys
d = open("soft-path.txt").read()
def svg(rounded):
    r = 'rx="229"' if rounded else ''
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a6ad0"/><stop offset="1" stop-color="#2149a3"/></linearGradient><radialGradient id="h" cx="0.5" cy="0" r="0.9"><stop offset="0" stop-color="#ffffff" stop-opacity=".16"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient></defs><rect width="1024" height="1024" {r} fill="url(#g)"/><rect width="1024" height="1024" {r} fill="url(#h)"/><path d="{d}" fill="#ffffff" fill-rule="evenodd"/></svg>'''
open("app-icon.svg","w").write(svg(False))
open("favicon.svg","w").write(svg(True))
