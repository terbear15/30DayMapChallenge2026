"""Pack cloud opacity, ocean mask and shaded ocean relief into one WebP."""
from pathlib import Path
import sys
root=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(root/".python-libs"))
from PIL import Image
assets=(root/"dist/assets") if (root/"dist/assets").exists() else root/"assets"
size=(3072,1536)
def channel(name,band):
    with Image.open(root/"Data"/name) as image:
        return image.convert("RGB").getchannel(band).resize(size,Image.Resampling.LANCZOS)
layers=Image.merge("RGB",(channel("clouds-hd.jpg","R"),channel("ocean.tif","R"),channel("ocean-relief.jpg","B")))
layers.save(assets/"atmosphere.webp",quality=94,method=6)
