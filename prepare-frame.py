"""
Ubah frame PNG yang slot fotonya masih berupa pola kotak-kotak (checkerboard "palsu")
menjadi PNG dengan lubang transparan asli, lalu ukur koordinat slot.

Pakai:  python3 scripts/prepare-frame.py input.png output.png WIDTH HEIGHT
Output: output.png + output.json (koordinat slot siap tempel ke src/lib/templates.ts)
"""
import sys, json
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

src, dst, W, H = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
im = Image.open(src).convert("RGBA")
a = np.array(im)

# 1. crop ke area yang benar-benar opaque (buang sisi hitam/transparan)
ys, xs = np.where(a[..., 3] > 200)
x0, x1, y0, y1 = xs.min() + 2, xs.max() - 1, ys.min(), ys.max() + 1
a = a[y0:y1, x0:x1].copy()
print("crop strip:", a.shape[1], "x", a.shape[0])

# 2. cari piksel checkerboard: abu/putih netral, terang
r, g, b = (a[..., i].astype(int) for i in range(3))
neutral = (abs(r - g) < 7) & (abs(g - b) < 7) & (np.minimum(np.minimum(r, g), b) > 205)
lab, n = ndi.label(neutral)
sizes = ndi.sum(neutral, lab, range(1, n + 1))
slots = [i + 1 for i, s in enumerate(sizes) if s > 60000]
print("slot ditemukan:", len(slots))
hole = np.isin(lab, slots)
hole = ndi.binary_closing(hole, iterations=2)
hole = ndi.binary_dilation(hole, iterations=1)  # hilangkan sisa tepi terang
a[hole, 3] = 0

# 3. resize dengan premultiplied alpha supaya tidak ada halo terang di tepi slot
out = Image.fromarray(a, "RGBA").convert("RGBa").resize((W, H), Image.LANCZOS).convert("RGBA")
out.save(dst, optimize=True)

# 4. ukur slot di hasil akhir
oa = np.array(out)[..., 3]
lab2, n2 = ndi.label(oa < 8)
res = []
for i in range(1, n2 + 1):
    yy, xx = np.where(lab2 == i)
    if len(yy) < 20000:
        continue
    res.append(dict(x=int(xx.min()), y=int(yy.min()), w=int(xx.max() - xx.min() + 1), h=int(yy.max() - yy.min() + 1)))
res.sort(key=lambda s: (s["y"], s["x"]))
json.dump(dict(width=W, height=H, slots=res), open(dst.replace(".png", ".json"), "w"), indent=2)
print(json.dumps(res))
