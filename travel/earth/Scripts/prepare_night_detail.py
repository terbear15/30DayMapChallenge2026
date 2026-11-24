"""Losslessly crop native night JPEGs on their MCU grid, then build smaller LODs.
Requires libturbojpeg, Pillow. Set TURBOJPEG_LIBRARY if it is not on the system path.
"""
from pathlib import Path
import ctypes as C
import ctypes.util, io, os, sys
root=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(root/".python-libs"))
from PIL import Image
assets=root/"dist/assets" if (root/"dist/assets").exists() else root/"assets"
out=assets/"night-mosaic"
out.mkdir(exist_ok=True)
dll=C.CDLL(os.environ.get("TURBOJPEG_LIBRARY") or ctypes.util.find_library("turbojpeg") or "turbojpeg")
class Region(C.Structure):
    _fields_=[(k,C.c_int) for k in ("x","y","w","h")]
class Transform(C.Structure):
    _fields_=[("region",Region),("op",C.c_int),("options",C.c_int),("data",C.c_void_p),("filter",C.c_void_p)]
dll.tjInitTransform.restype=C.c_void_p
dll.tjTransform.argtypes=[C.c_void_p,C.c_char_p,C.c_ulong,C.c_int,C.POINTER(C.c_void_p),C.POINTER(C.c_ulong),C.POINTER(Transform),C.c_int]
dll.tjFree.argtypes=[C.c_void_p]
dll.tjDestroy.argtypes=[C.c_void_p]
areas=[(-39,75,15,81),(87,171,3,69),(-147,-45,9,69)]
for c,letter in enumerate("ABCD"):
    for r in range(2):
        cells=[]
        for i in range(15):
            for j in range(15):
                col=c*15+i; row=r*15+j
                x=-177+col*6; y=87-row*6
                if any(w<=x<=e and s<=y<=n for w,e,s,n in areas):
                    cells.append((col,row,i,j))
        if not cells:continue
        n=len(cells)
        source=(root/"Data"/f"night-{letter}{r+1}.jpg").read_bytes()
        filters=(Transform*n)(*(Transform(Region(i*1440,j*1440,1440,1440),0,4,None,None) for _,_,i,j in cells))
        buffers=(C.c_void_p*n)();sizes=(C.c_ulong*n)()
        handle=dll.tjInitTransform()
        try:
            if dll.tjTransform(handle,source,len(source),n,buffers,sizes,filters,0):
                raise RuntimeError("Native JPEG crop failed")
            for k,(col,row,_,_) in enumerate(cells):
                raw=C.string_at(buffers[k],sizes[k])
                (out/f"{col}_{row}_1440.jpg").write_bytes(raw)
                with Image.open(io.BytesIO(raw)) as im:
                    assert im.size==(1440,1440)
                    for width in (360,720):
                        im.resize((width,width),Image.Resampling.LANCZOS).save(out/f"{col}_{row}_{width}.jpg",quality=95,subsampling=0)
        finally:
            for p in buffers:
                if p:dll.tjFree(p)
            dll.tjDestroy(handle)
        print(letter,r+1,n,flush=True)
# Regional overview textures resolve before individual visible tiles.
for name,left,right,top,bottom in [("europe",25,41,2,11),("asia",45,57,5,14)]:
    canvas=Image.new("RGB",((right-left)*360,(bottom-top)*360))
    for col in range(left,right):
        for row in range(top,bottom):
            with Image.open(out/f"{col}_{row}_360.jpg") as patch:
                canvas.paste(patch,((col-left)*360,(row-top)*360))
    canvas.thumbnail((4096,4096),Image.Resampling.LANCZOS)
    canvas.save(assets/f"night-{name}.jpg",quality=96,subsampling=0)
