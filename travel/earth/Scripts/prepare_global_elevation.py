from pathlib import Path
import sys
root=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(root/".python-libs"))
from PIL import Image
Image.MAX_IMAGE_PIXELS=250_000_000
assets=root/"dist/assets" if (root/"dist/assets").exists() else root/"assets"
out=assets/"elevation"
out.mkdir(exist_ok=True)
with Image.open(root/"Data/elevation.jpg") as src:
    for row in range(10):
        for col in range(20):
            box=(col*1080,row*1080,(col+1)*1080,(row+1)*1080)
            src.crop(box).convert("L").save(out/f"{col}_{row}.webp",lossless=True,method=2)
