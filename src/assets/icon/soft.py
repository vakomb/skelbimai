import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage
from skimage import measure
import sys
N = 4096
weight = sys.argv[1] if len(sys.argv) > 1 else "ExtraBold"
sigma_k = float(sys.argv[2]) if len(sys.argv) > 2 else 0.045
font = ImageFont.truetype(f"/usr/share/fonts/opentype/inter/InterDisplay-{weight}.otf", 2000)
img = Image.new("L", (N, N), 0)
d = ImageDraw.Draw(img)
# tracking: draw letters separately
letters = "AE"; track = float(sys.argv[3]) * 2000 if len(sys.argv) > 3 else 0.05 * 2000
xs = []; x = 0
for ch in letters:
    bb = font.getbbox(ch)
    xs.append(x); x += font.getlength(ch) + track
tmp = Image.new("L", (N * 2, N), 0); dt = ImageDraw.Draw(tmp)
layers = []
for ch, ox in zip(letters, xs):
    t2 = Image.new("L", (N * 2, N), 0); ImageDraw.Draw(t2).text((200 + ox, 600), ch, font=font, fill=255)
    layers.append(np.array(t2) > 127)
    dt.text((200 + ox, 600), ch, font=font, fill=255)
arr = np.array(tmp) > 127
ys, xs2 = np.where(arr)
y0, y1, x0, x1 = ys.min(), ys.max(), xs2.min(), xs2.max()
cap = y1 - y0
crops = [L[y0:y1 + 1, x0:x1 + 1].astype(float) for L in layers]
crop = arr[y0:y1 + 1, x0:x1 + 1].astype(float)
# mastelis: raidžių aukštis = 0.335 * N
target = 0.335 * N
scale = target / cap
sigma = sigma_k * target
soft = np.zeros((N, N))
for cr in crops:
    glyph = Image.fromarray((cr * 255).astype(np.uint8)).resize((int(cr.shape[1] * scale), int(cr.shape[0] * scale)), Image.LANCZOS)
    canvas = np.zeros((N, N))
    gx = (N - glyph.width) // 2
    gy = int(N / 2 - glyph.height / 2 + N * 0.004)
    canvas[gy:gy + glyph.height, gx:gx + glyph.width] = np.array(glyph) / 255.0
    # švelninimas: kiekviena raidė atskirai (nesulimpa), suapvalinami visi kampai
    soft = np.maximum(soft, ndimage.gaussian_filter(canvas, sigma))
contours = measure.find_contours(soft, 0.5)
s = 1024 / N
def simplify(c, tol):
    from skimage.measure import approximate_polygon
    return approximate_polygon(c, tolerance=tol)
paths = []
for c in contours:
    c = simplify(c, 0.6)  # 4096 vienetais
    pts = [(p[1] * s, p[0] * s) for p in c]
    dstr = "M" + " L".join(f"{x:.2f} {y:.2f}" for x, y in pts) + "Z"
    paths.append(dstr)
d_all = " ".join(paths)
open(f"soft-path.txt", "w").write(d_all)
print(len(contours), len(d_all))
