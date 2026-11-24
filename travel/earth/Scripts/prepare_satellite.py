"""Build 6-degree tiles from the same NASA mosaics used in the opening frame."""
from pathlib import Path
import sys
root=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(root/".python-libs"))
from PIL import Image
Image.MAX_IMAGE_PIXELS=500_000_000
assets=root/"dist/assets" if (root/"dist/assets").exists() else root/"assets"
out=assets/"satellite"
out.mkdir(exist_ok=True)
for column,letter in enumerate("ABCD"):
    for row in range(2):
        tile=f"{letter}{row+1}"
        for phase in ("day","night"):
            file=(tile if phase=="day" else "night-"+tile)+".jpg"
            with Image.open(root/"Data"/file) as source:
                assert source.size==(21600,21600)
                for j in range(15):
                    for i in range(15):
                        box=(i*1440,j*1440,(i+1)*1440,(j+1)*1440)
                        source.crop(box).save(out/f"{phase}_{column*15+i}_{row*15+j}.webp",
                            quality=83,method=0)
        print(tile,flush=True)
