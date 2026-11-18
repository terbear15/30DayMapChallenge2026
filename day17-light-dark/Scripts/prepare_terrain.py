"""Crop NASA's global elevation raster for the US satellite view."""
from pathlib import Path
import sys
root=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(root/".python-libs"))
from PIL import Image
Image.MAX_IMAGE_PIXELS=250_000_000
assets=root/"dist/assets" if (root/"dist/assets").exists() else root/"assets"
with Image.open(root/"Data/elevation.jpg") as dem:
    assert dem.size==(21600,10800)
    # One pixel per arcminute, west -132, east -60, north 56, south 20.
    crop=dem.crop((2880,2040,7200,4200)).convert("L")
    crop.resize((4096,2048),Image.Resampling.LANCZOS).save(assets/"terrain.webp",lossless=True,method=4)
