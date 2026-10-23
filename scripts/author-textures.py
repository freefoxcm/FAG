"""Reproducible panel paint, tangent normals and packed ORM; no external imagery."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import math, random
OUT=Path('assets/source/textures');OUT.mkdir(parents=True,exist_ok=True)
N=1024
palette={'ivory':(222,225,210),'celadon':(149,178,162),'steel':(101,119,128),'graphite':(49,61,67),'rust':(137,78,53),'brass':(172,148,91),'navy':(49,69,85),'lacquer':(225,230,229),'vermilion':(178,39,43),'midnight':(30,46,68),'silver':(153,166,179),'cobalt':(40,74,125),'frost':(209,220,226),'slate':(92,125,148),'carbon':(60,67,76)}
height=Image.new('L',(N,N),128);hd=ImageDraw.Draw(height)
lines=[]
for row in range(8):
    y=row*128;offset=(row%2)*75
    for col in range(6):
        x=col*190-offset
        poly=[(x+2,y+3),(x+165,y+3),(x+188,y+32),(x+188,y+123),(x+2,y+123)]
        lines.append(poly);hd.line(poly+[poly[0]],fill=100,width=3)
        for bx,by in [(x+9,y+11),(x+177,y+113)]:hd.ellipse((bx-2,by-2,bx+2,by+2),fill=108)
height=height.filter(ImageFilter.GaussianBlur(.7));height.save(OUT/'panel-height.png')
normal=Image.new('RGB',(N,N));src=height.load();dest=normal.load()
for y in range(N):
    for x in range(N):
        dx=(src[(x+1)%N,y]-src[(x-1)%N,y])*.018;dy=(src[x,(y+1)%N]-src[x,(y-1)%N])*.018
        length=math.sqrt(dx*dx+dy*dy+1);dest[x,y]=(int(127.5-127.5*dx/length),int(127.5-127.5*dy/length),int(127.5+127.5/length))
normal.save(OUT/'panel-normal.png')
for name,color in palette.items():
    rng=random.Random(824);im=Image.new('RGB',(N,N),color);pixels=im.load()
    for y in range(N):
        for x in range(N):
            noise=rng.randint(-3,3);pixels[x,y]=tuple(max(0,min(255,v+noise)) for v in color)
    d=ImageDraw.Draw(im)
    for p in lines:d.line(p+[p[0]],fill=tuple(int(v*.72) for v in color),width=2)
    for y in range(0,N,128):
        for x in range(0,N,190):
            for bx,by in [(x+9,y+11),(x+177,y+113)]:d.ellipse((bx-1,by-1,bx+1,by+1),fill=tuple(int(v*.55) for v in color))
    d.text((43,48),'AIRFRAME / SERVICE' if name in ['lacquer','vermilion','midnight','silver','cobalt','frost','slate','carbon'] else 'QL-01   AIR SUPERIORITY',fill=tuple(int(v*.55) for v in color))
    d.line([(40,70),(90,70),(105,85)],fill=(174,153,100),width=2)
    im.save(OUT/f'{name}-color.png',optimize=True)
for name,rough,metal in [('paint',94,15),('metal',112,225)]:
    im=Image.new('RGB',(N,N));pix=im.load();rng=random.Random(92)
    for y in range(N):
        for x in range(N):pix[x,y]=(240 if src[x,y]<120 else 255,rough+rng.randint(-7,7),metal)
    im.save(OUT/f'{name}-orm.png',optimize=True)
print('Authored color / tangent normal / packed ORM textures:',OUT)
