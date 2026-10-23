"""Run with Blender --background --python scripts/author-models.py.
All design coordinates: X right, Y up, -Z forward. Blender conversion is explicit.
"""
import bpy, math, json, os
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'public/assets/models';SRC=ROOT/'assets/source';TEX=SRC/'textures'
OUT.mkdir(parents=True,exist_ok=True);SRC.mkdir(parents=True,exist_ok=True)
manifest={}
def xyz(p):return (p[0],-p[2],p[1])
def material(name,color,metal=False,glass=False,texture=None):
    m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Metallic'].default_value=.85 if metal else .03;p.inputs['Roughness'].default_value=.31
    p.inputs['Coat Weight'].default_value=.65 if glass else .22;p.inputs['Coat Roughness'].default_value=.12 if glass else .26
    if glass:p.inputs['Metallic'].default_value=.48;p.inputs['Roughness'].default_value=.12;return m
    key=texture or {'ceramic':'ivory','celadon':'celadon','titanium':'steel','graphite':'graphite','hostile':'rust','brass':'brass','navy':'navy'}[name]
    nodes=m.node_tree.nodes;links=m.node_tree.links
    image=nodes.new('ShaderNodeTexImage');image.image=bpy.data.images.load(str(TEX/f'{key}-color.png'),check_existing=True);links.new(image.outputs['Color'],p.inputs['Base Color'])
    normal=nodes.new('ShaderNodeTexImage');normal.image=bpy.data.images.load(str(TEX/'panel-normal.png'),check_existing=True);normal.image.colorspace_settings.name='Non-Color';normalmap=nodes.new('ShaderNodeNormalMap');normalmap.inputs['Strength'].default_value=.32;links.new(normal.outputs['Color'],normalmap.inputs['Color']);links.new(normalmap.outputs['Normal'],p.inputs['Normal'])
    orm=nodes.new('ShaderNodeTexImage');orm.image=bpy.data.images.load(str(TEX/('metal-orm.png' if metal else 'paint-orm.png')),check_existing=True);orm.image.colorspace_settings.name='Non-Color';sep=nodes.new('ShaderNodeSeparateColor');links.new(orm.outputs['Color'],sep.inputs['Color']);links.new(sep.outputs['Green'],p.inputs['Roughness']);links.new(sep.outputs['Blue'],p.inputs['Metallic']);return m
def mesh(name,verts,faces,mat):
    data=bpy.data.meshes.new(name);data.from_pydata([xyz(p) for p in verts],[],faces);data.update();o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o);o.data.materials.append(mat)
    uv=data.uv_layers.new(name='UVMap')
    for poly in data.polygons:
        for li in poly.loop_indices:
            v=data.vertices[data.loops[li].vertex_index].co;uv.data[li].uv=(v.x*.18+.5,v.y*.13+.5)
    for p in data.polygons:p.use_smooth=True
    return o
def box(name,p,size,mat,bevel=.04):
    bpy.ops.mesh.primitive_cube_add(size=1,location=xyz(p));o=bpy.context.object;o.name=name;o.dimensions=(size[0],size[2],size[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(mat)
    if bevel:mod=o.modifiers.new('Machined edge bevel','BEVEL');mod.width=bevel;mod.segments=2
    return o
def loft(name,rings,mat,sides=40):
    verts=[]
    for z,w,h,y in rings:
        for j in range(sides):
            a=j/sides*math.tau;verts.append((math.cos(a)*w,y+math.sin(a)*h,z))
    faces=[]
    for i in range(len(rings)-1):
        for j in range(sides):a=i*sides+j;b=i*sides+(j+1)%sides;faces.append((a,b,b+sides,a+sides))
    faces.extend([tuple(range(sides-1,-1,-1)),tuple((len(rings)-1)*sides+j for j in range(sides))]);return mesh(name,verts,faces,mat)
def wing(name,side,root,tip,span,mat,steps=16,y=.05):
    verts=[];chord=14
    for layer in [1,-1]:
        for i in range(steps+1):
            t=i/steps;x=.6+(span-.6)*t;lead=root[0]*(1-t)+tip[0]*t;trail=root[1]*(1-t)+tip[1]*t
            for j in range(chord+1):
                u=j/chord;thickness=(.1*(1-t)+.018*t)*math.sin(math.pi*u)**.6;verts.append((side*x,y+layer*thickness-.035*t,lead+(trail-lead)*u))
    faces=[];count=(steps+1)*(chord+1)
    for layer in range(2):
        off=layer*count
        for i in range(steps):
            for j in range(chord):a=off+i*(chord+1)+j;faces.append((a,a+1,a+chord+2,a+chord+1) if layer==0 else (a+chord+1,a+chord+2,a+1,a))
    for j in range(chord):faces.append((steps*(chord+1)+j,steps*(chord+1)+j+1,count+steps*(chord+1)+j+1,count+steps*(chord+1)+j))
    for i in range(steps):
        for j in [0,chord]:a=i*(chord+1)+j;b=(i+1)*(chord+1)+j;faces.append((a,b,b+count,a+count))
    return mesh(name,verts,[tuple(reversed(f)) for f in faces] if side<0 else faces,mat)
def curve(name,points,mat,radius=.012):
    data=bpy.data.curves.new(name,'CURVE');data.dimensions='3D';data.resolution_u=2;data.bevel_depth=radius;data.bevel_resolution=2;s=data.splines.new('POLY');s.points.add(len(points)-1)
    for v,p in zip(s.points,points):v.co=(*xyz(p),1)
    o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o);o.data.materials.append(mat);return o
def cylinder(name,p,radius,depth,mat,vertices=36):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=radius,depth=depth,location=xyz(p),rotation=(math.pi/2,0,0));o=bpy.context.object;o.name=name;o.data.materials.append(mat)
    for p in o.data.polygons:p.use_smooth=True
    return o
def engine(x,y,z,r=.36):
    loft('Engine shroud',[(z-.65,r*.84,r*.84,y),(z-.2,r,r,y),(z+.3,r*.94,r*.94,y)],M['titanium'],32).location.x=x
    for i in range(18):
        a=i/18*math.tau;b=(i+.87)/18*math.tau
        verts=[(x+math.cos(t)*rr,y+math.sin(t)*rr,zz) for zz,rr in [(z+.12,r),(z+.7,r*1.1)] for t in [a,b]]
        mesh('Nozzle petal',verts,[(0,1,3,2)],M['titanium'])
    cylinder('Nozzle recess',(x,y,z+.21),r*.86,.04,M['graphite']);cylinder('Turbine hub',(x,y,z+.25),r*.18,.07,M['brass'])
    for i in range(12):
        a=i/12*math.tau;curve('Turbine blade',[(x+math.cos(a)*r*.2,y+math.sin(a)*r*.2,z+.26),(x+math.cos(a+.3)*r*.78,y+math.sin(a+.3)*r*.78,z+.28)],M['titanium'],.025)
    for dz in [0,.13]:curve('Exhaust collar',[(x+math.cos(i/48*math.tau)*r,y+math.sin(i/48*math.tau)*r,z+dz) for i in range(49)],M['brass'],.017)
def fin(side,x,z,h=1.1,length=1.8):
    verts=[(side*x,.22,z),(side*x,.22,z+length),(side*(x+.3),h,z+length*.9),(side*(x+.25),h,z+length*.48)]
    o=mesh('Canted vertical stabilizer',verts,[(0,1,2,3)],M['ceramic']);solid=o.modifiers.new('Fin thickness','SOLIDIFY');solid.thickness=.055;bevel=o.modifiers.new('Leading edge','BEVEL');bevel.width=.025;bevel.segments=2
    curve('Fin trim',[verts[0],verts[3],verts[2]],M['brass'],.015)
def anchor(name,p):
    o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.location=xyz(p)
def clear():bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def qingluan():
    # Multiple chines and a continuous, broad shoulder rather than isolated flat wings.
    rings=[(-5.5,.018,.018,.04),(-5,.2,.11,.06),(-4.3,.38,.17,.09),(-3.5,.54,.25,.11),(-2.7,.65,.36,.13),(-1.7,.78,.38,.13),(-.6,.94,.34,.12),(.6,1.12,.3,.1),(1.7,1.16,.28,.08),(2.8,1.03,.26,.07),(3.8,.87,.22,.06),(4.35,.77,.2,.05)]
    refined=[]
    for a,b in zip(rings,rings[1:]):
        refined.extend([a,tuple((u+v)/2 for u,v in zip(a,b))])
    refined.append(rings[-1]);body=loft('Ceramic titanium fuselage',refined,M['ceramic'],48);sub=body.modifiers.new('Airframe surface refinement','SUBSURF');sub.levels=2
    for side in [-1,1]:
        wing('Integrated main wing',side,(-1.8,3.9),(1.85,3.35),4.15,M['ceramic'],24)
        wing('Celadon trailing control surface',side,(1.5,3.65),(2.75,3.2),3.98,M['celadon'],14,y=.073)
        wing('Canard',side,(-3.3,-1.8),(-2.08,-1.6),2.0,M['ceramic'],12,y=.15)
        fin(side,.79,2.1,1.37,2.0)
        # Geometric intake lip and dark inset cavity, open toward the nose.
        x=side*.92;outer=[(x-side*.25,-.05,-2.4),(x+side*.42,-.08,-2.25),(x+side*.37,-.44,-1.95),(x-side*.2,-.4,-2.1)]
        inner=[(p[0]*.97,p[1]*.8-.04,p[2]+.28) for p in outer]
        mesh('Recessed intake cavity',inner,[(0,1,2,3)],M['graphite']);mesh('Intake bevel surround',outer+inner,[(i,(i+1)%4,(i+1)%4+4,i+4) for i in range(4)],M['titanium']);curve('Intake lip',outer+[outer[0]],M['ceramic'],.045)
        engine(side*.57,-.08,3.95,.36)
        curve('Wing gold boundary',[(side*.85,.18,-1.45),(side*4.08,.06,1.88),(side*4.05,.06,3.28),(side*2.2,.11,3.48)],M['brass'],.011)
        for d in [0,.5,1.0]:curve('Control surface seam',[(side*(1.0+d),.21,1.2+d),(side*(3.15+d*.3),.12,2.86+d*.2)],M['graphite'],.007)
        # Restrained shallow gold cloud curl near the outer wing.
        curl=[]
        for i in range(50):a=i/49*math.pi*3;r=.28*(1-i/65);curl.append((side*(3.35+math.cos(a)*r),.13,2.6+math.sin(a)*r))
        curve('Cloud engraving',curl,M['brass'],.009)
        box('Cannon housing',(side*.42,.02,-3.35),(.17,.14,.66),M['titanium'],.03)
        anchor('muzzle.primary.'+('left' if side<0 else 'right'),(side*.42,.02,-3.72))
        anchor('exhaust.'+('left' if side<0 else 'right'),(side*.57,-.08,4.65))
    canopy=loft('Smoked canopy',[(-3.85,.025,.02,.31),(-3.5,.22,.19,.33),(-2.95,.32,.29,.36),(-2.35,.3,.27,.38),(-1.9,.08,.07,.37)],M['glass'],32)
    sub=canopy.modifiers.new('Canopy curvature','SUBSURF');sub.levels=2
    for side in [-1,1]:curve('Canopy titanium rail',[(side*.05,.34,-3.82),(side*.22,.39,-3.5),(side*.32,.43,-2.95),(side*.3,.44,-2.35),(side*.08,.4,-1.9)],M['brass'],.016)
    curve('Canopy cross brace',[(math.cos(i/24*math.pi)*.31,.4+math.sin(i/24*math.pi)*.29,-2.9) for i in range(25)],M['graphite'],.014)
    box('Dorsal fairing',(0,.39,.3),(.22,.12,2.6),M['celadon'],.07)
    return {'scale':.75,'radius':1.1,'muzzles':[[-.42,.02,-3.72],[.42,.02,-3.72]],'exhausts':[[-.57,-.08,4.65],[.57,-.08,4.65]]}
def hostile(kind):
    configs={'drone':(3.8,2.6,.55),'interceptor':(6.2,2.4,.46),'heavy':(5.0,4.3,1.0),'support':(4.1,3.6,.6),'boss':(13.5,10.5,1.9)}
    length,span,width=configs[kind];half=length/2;mat=M['graphite'] if kind in ['heavy','boss'] else M['navy'];trim=M['hostile']
    body=loft(kind+' armored fuselage',[(-half,.018,.02,0),(-half*.7,width*.48,width*.32,.08),(-half*.2,width,width*.5,.1),(half*.5,width*.95,width*.38,.06),(half*.9,width*.65,width*.3,0)],mat,40)
    sub=body.modifiers.new('Aerodynamic fillets','SUBSURF');sub.levels=3 if kind=='boss' else 2
    muzzles=[];exhausts=[]
    for side in [-1,1]:
        if kind=='drone':root=(-.5,1.5);tip=(.9,1.5)
        elif kind=='interceptor':root=(-1.5,2.3);tip=(1.35,2.1)
        elif kind=='support':root=(-1.4,1.7);tip=(-.05,.6)
        else:root=(-half*.45,half*.7);tip=(half*.2,half*.65)
        wing(kind+' structural wing',side,root,tip,span,mat,48 if kind=='boss' else 28,y=.03)
        wing(kind+' orange identification edge',side,(root[0]+.2,root[0]+.5),(tip[0]+.05,tip[0]+.23),span*.98,trim,12,y=.1)
        if kind!='support':fin(side,width*.7,half*.4,1.0 if kind!='boss' else 2.0,half*.55)
        count=2 if kind=='boss' else 1
        for j in range(count):
            x=side*(width*.68+j*2.5);r=.32 if kind not in ['heavy','boss'] else .6;z=half*.72;engine(x,0,z,r);exhausts.append([x,0,z+.7]);anchor('exhaust.'+str(len(exhausts)),exhausts[-1])
        if kind in ['heavy','boss']:
            x=side*span*.5;box('Armored weapon pod',(x,.2,-half*.08),(width,.7,half*.7),M['titanium'],.1);muzzles.append([x,.1,-half*.48]);box('Cannon barrel',(x,.1,-half*.4),(.2,.2,.8),M['graphite']);anchor('muzzle.primary.'+str(len(muzzles)),muzzles[-1])
    if not muzzles:muzzles=[[0,.12,-half]];anchor('muzzle.primary.1',muzzles[0])
    if kind=='support':
        cylinder('Sensor array',(0,.75,.1),.9,.22,M['titanium'],48).rotation_euler=(0,0,0)
        curve('Radar ring',[(math.cos(i/48*math.tau)*.8,1.02,math.sin(i/48*math.tau)*.8+.1) for i in range(49)],M['hostile'],.035)
    if kind=='boss':
        for z in [-1.8,1.2]:box('Command armor',(0,1,z),(2.5,.9,2),M['titanium'],.2)
        for side in [-1,1]:box('Outboard weapon rack',(side*6.8,.1,.5),(1.1,.6,2.4),M['hostile'],.08)
    else:loft('Hostile sensor canopy',[(-half*.65,.03,.02,.28),(-half*.42,.22,.16,.36),(-half*.2,.12,.06,.33)],M['enemyglass'],24)
    return {'scale':1,'radius':6.2 if kind=='boss' else 2.4 if kind=='heavy' else 1.6 if kind=='support' else 1.05,'muzzles':muzzles,'exhausts':exhausts}
def prepare():
    # Apply authoring modifiers, preserve UV, then merge only by material.
    for o in list(bpy.context.scene.objects):
        if o.type=='CURVE':bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False)
    for o in list(bpy.context.scene.objects):
        if o.type!='MESH':continue
        bpy.context.view_layer.objects.active=o
        for mod in list(o.modifiers):
            try:bpy.ops.object.modifier_apply(modifier=mod.name)
            except RuntimeError:pass
        if not o.data.uv_layers:
            uv=o.data.uv_layers.new(name='UVMap')
            for li,l in enumerate(o.data.loops):v=o.data.vertices[l.vertex_index].co;uv.data[li].uv=(v.x*.2+.5,v.y*.2+.5)
    mats={o.data.materials[0] for o in bpy.context.scene.objects if o.type=='MESH'}
    for mat in mats:
        bpy.ops.object.select_all(action='DESELECT');objects=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.data.materials[0]==mat]
        for o in objects:o.select_set(True)
        bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();objects[0].name=mat.name.split('.')[0]+'-surfaces';bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
def export(kind,info):
    for image in bpy.data.images:
        if image.source=='FILE':image.pack()
    bpy.ops.wm.save_as_mainfile(filepath=str(SRC/f'{kind}.blend'))
    high=OUT/f'{kind}-high.glb';battle=OUT/f'{kind}.glb'
    bpy.ops.export_scene.gltf(filepath=str(high),export_format='GLB',export_yup=True,export_texcoords=True,export_normals=True,export_materials='EXPORT',export_image_format='AUTO')
    tris=0
    for o in bpy.context.scene.objects:
        if o.type=='MESH':
            o.data.calc_loop_triangles();tris+=len(o.data.loop_triangles)
    target=info.pop('battleTarget',25000 if kind=='boss' else 20000 if kind=='qingluan' else 6000)
    ratio=min(1,target/max(1,tris))
    for o in bpy.context.scene.objects:
        if o.type=='MESH' and len(o.data.polygons)>100:
            bpy.context.view_layer.objects.active=o;mod=o.modifiers.new('Battle LOD','DECIMATE');mod.ratio=ratio;bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.ops.export_scene.gltf(filepath=str(battle),export_format='GLB',export_yup=True,export_texcoords=True,export_normals=True,export_materials='EXPORT',export_image_format='AUTO')
    info.update(url=f'/assets/models/{kind}.glb',highUrl=f'/assets/models/{kind}-high.glb',highTriangles=tris)
    manifest[kind]=info;print('AUTHORED',kind,tris,'battle ratio',ratio,flush=True)
if __name__=='__main__':
    clear()
    M={name:material(name,color,metal=name in ['titanium','brass'],glass=name in ['glass','enemyglass']) for name,color in {'ceramic':(.85,.87,.8),'celadon':(.5,.65,.57),'titanium':(.37,.42,.44),'graphite':(.08,.1,.11),'hostile':(.5,.18,.08),'brass':(.63,.51,.28),'navy':(.1,.15,.2),'glass':(.035,.09,.105),'enemyglass':(.23,.06,.02)}.items()}
    for kind in ['qingluan','drone','interceptor','heavy','support','boss']:
        clear();info=qingluan() if kind=='qingluan' else hostile(kind);prepare();export(kind,info)
    (ROOT/'src/game/model-manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
    (OUT/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
    print('ALL MODELS COMPLETE',flush=True)
