import sys, json, hashlib
from pathlib import Path
root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(root/".python-libs"))
from PIL import Image
Image.MAX_IMAGE_PIXELS = 500_000_000
assets = root/"assets"
for name in ["day", "night"]:
    image = Image.open(root/f"Data/{name}.jpg").convert("RGB")
    width, height = image.size
    globe = image.resize((8192,4096) if name=="day" else (4096,2048), Image.Resampling.LANCZOS)
    globe.save(assets/f"{name}-globe.jpg", quality=94, optimize=True)
    if name == "day":
        image.resize((16384,8192), Image.Resampling.LANCZOS).save(
            assets/"day-globe-hd.jpg", quality=94, optimize=True)
    bounds = (-132,20,-60,56)
    west,south,east,north = bounds
    region=image.crop((round((west+180)/360*width),round((90-north)/180*height),
                       round((east+180)/360*width),round((90-south)/180*height)))
    region.thumbnail((4096,2048),Image.Resampling.LANCZOS)
    region.save(assets/f"{name}-us.jpg",quality=95,optimize=True)
    if name == "day":
        # NASA northwestern hemisphere tiles meet at 90 degrees west.
        hd = Image.new("RGB",(8640,4320))
        for tile, origin, left, right in [("A1",-180,-132,-90),("B1",-90,-90,-60)]:
            with Image.open(root/f"Data/{tile}.jpg") as source:
                source.draft("RGB",(10800,10800))
                scale=source.width/90
                crop=source.crop(tuple(round(v*scale) for v in
                    (left-origin,90-north,right-origin,90-south)))
                hd.paste(crop,(round((left-west)*scale),0))
        hd.resize((8192,4096),Image.Resampling.LANCZOS).save(
            assets/"day-us-hd.jpg", quality=95,optimize=True)
    print(name, image.size, region.size)
manifest = {"region_bounds":bounds,"day_year":2004,"day_month":11,"night_year":2016,
            "sources":{"day":"https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-map/",
                       "night":"https://science.nasa.gov/earth/earth-observatory/earth-at-night/maps/"},
            "assets":{}}
for p in assets.glob("*.jpg"):
    manifest["assets"][p.name]={"bytes":p.stat().st_size,"sha256":hashlib.sha256(p.read_bytes()).hexdigest()}
(assets/"imagery.json").write_text(json.dumps(manifest,indent=2))

