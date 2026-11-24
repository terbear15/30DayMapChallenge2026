"""Build native-resolution 6-degree US and 30-degree global detail tiles."""
from pathlib import Path
import sys
root = Path(__file__).resolve().parents[1]
sys.path.insert(0,str(root/".python-libs"))
from PIL import Image
Image.MAX_IMAGE_PIXELS=500_000_000
assets=(root/"dist/assets") if (root/"dist/assets").exists() else root/"assets"
out=assets/"detail"
out.mkdir(exist_ok=True)
for phase in ("day","night"):
    with Image.open(root/"Data"/f"{phase}.jpg") as world:
        world.thumbnail((2048,1024),Image.Resampling.LANCZOS)
        world.save(assets/f"{phase}-preview.jpg",quality=90)
    for area,west,east in (("A1",-132,-90),("B1",-90,-60)):
        name=area if phase=="day" else "night-"+area
        with Image.open(root/"Data"/f"{name}.jpg") as source:
            scale=source.width/90
            origin=-180 if area=="A1" else -90
            for x in range(west,east,6):
                for y in range(20,56,6):
                    box=tuple(round(v*scale) for v in (x-origin,90-y-6,x+6-origin,90-y))
                    source.crop(box).save(out/f"{phase}_{x}_{y}.jpg",quality=94,subsampling=0)
with Image.open(root/"Data/day.jpg") as source:
    for x in range(-180,180,30):
        for y in range(-90,90,30):
            box=tuple(v*60 for v in (x+180,60-y,x+210,90-y))
            source.crop(box).save(out/f"world_{x}_{y}.jpg",quality=92)
    source.resize((4096,2048),Image.Resampling.LANCZOS).save(assets/"day-globe-medium.jpg",quality=93)
