"""Four concept-led airframes. Blender --background --python scripts/author-roster.py.

Source coordinate convention matches author-models.py: X right, Y up, -Z nose.
The airframe layouts are independent; only manufacturing primitives are shared.
"""
import bpy, math, json, importlib.util
from pathlib import Path
from mathutils import Vector
from mathutils.geometry import tessellate_polygon

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('airframe',ROOT/'scripts/author-models.py')
A=importlib.util.module_from_spec(spec);spec.loader.exec_module(A)
A.clear()
P={name:A.material(name,(.5,.5,.5),texture=name,metal=name=='silver') for name in ['lacquer','vermilion','midnight','silver','cobalt','frost','slate','carbon']}
P['metal']=A.material('titanium',(.4,.45,.5),metal=True)
P['dark']=A.material('graphite',(.02,.03,.04))
P['glass']=A.material('Cockpit glass',(.018,.036,.055),glass=True)
P['cyan']=bpy.data.materials.new('Cyan sensor optics');P['cyan'].use_nodes=True
bs=P['cyan'].node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(.02,.25,.38,1);bs.inputs['Emission Color'].default_value=(.03,.55,.8,1);bs.inputs['Emission Strength'].default_value=1.7;bs.inputs['Roughness'].default_value=.23
# Engine internals use the same authored metal, dark ceramic and titanium colors.
A.M={'titanium':P['metal'],'graphite':P['dark'],'brass':P['silver']}

def skin(name,rings,mat,sub=2,sides=48):
    rings2=[]
    for a,b in zip(rings,rings[1:]):rings2.extend([a,tuple((x+y)/2 for x,y in zip(a,b))])
    rings2.append(rings[-1]);o=A.loft(name,rings2,mat,sides)
    m=o.modifiers.new('Continuous formed skin','SUBSURF');m.levels=sub
    return o

def patch(name,points,mat,thick=.012):
    o=A.mesh(name,points,[tuple(range(len(points)))],mat)
    for face in o.data.polygons:face.use_smooth=False
    if thick:m=o.modifiers.new('Surface panel depth','SOLIDIFY');m.thickness=thick;m.offset=0
    return o

def wing_paint(name,points,mat,span,root,tip,y=0):
    # Paint follows the actual airfoil. No raised armor plates or hovering decals.
    def fit(v):
        x,z=v.x,v.y
        t=max(0,min(1,(abs(x)-.6)/(span-.6)));lead=root[0]*(1-t)+tip[0]*t;trail=root[1]*(1-t)+tip[1]*t
        u=max(0,min(1,(z-lead)/(trail-lead)));h=(.1*(1-t)+.018*t)*math.sin(math.pi*u)**.6
        return (x,y+h-.035*t+.004,z)
    verts=[];faces=[]
    def emit(a,b,c,depth=0):
        if max((a-b).length,(b-c).length,(c-a).length)>.2 and depth<6:
            ab=(a+b)*.5;bc=(b+c)*.5;ca=(c+a)*.5
            for tri in [(a,ab,ca),(ab,b,bc),(ca,bc,c),(ab,bc,ca)]:emit(*tri,depth+1)
        else:
            i=len(verts);verts.extend([fit(a),fit(b),fit(c)]);faces.append((i,i+1,i+2))
    polygon=[Vector((x,z,0)) for x,_,z in points]
    for tri in tessellate_polygon([polygon]):emit(*(polygon[v] if isinstance(v,int) else v for v in tri))
    return A.mesh(name,verts,faces,mat)

def fin(name,x,z,height,length,mat,accent,cant=.3,cap_fraction=.79):
    side=1 if x>=0 else -1
    pts=[(x,.22,z),(x,.22,z+length),(x+side*cant,height,z+length*.88),(x+side*cant*.9,height,z+length*.39)]
    patch(name,pts,mat,.055)
    # Two separate faces make the colored cap readable from either side.
    v=[Vector(p) for p in pts];normal=(v[1]-v[0]).cross(v[2]-v[0]).normalized()
    cap=[v[3],v[2],v[1].lerp(v[2],cap_fraction),v[0].lerp(v[3],cap_fraction)]
    for side in [-1,1]:patch(name+' painted cap',[tuple(p+normal*.03*side) for p in cap],accent,0)
    A.curve(name+' rudder seam',[(x+side*cant*.3,.4,z+length*.84),(x+side*cant*.95,height*.94,z+length*.75)],P['dark'],.008)

def canopy(front=-3.6,rear=-1.65,width=.32,base=.4,height=.34):
    middle=(front+rear)/2
    skin('Smoked laminated cockpit',[(front,.02,.025,base),(front+.3,width*.7,height*.6,base),(middle,width,height,base),(rear-.2,width*.72,height*.5,base),(rear,.025,.025,base)],P['glass'],2,32)
    for side in [-1,1]:
        A.curve('Canopy sill',[(side*.025,base+.03,front),(side*width*.72,base+.065,front+.3),(side*width,base+.065,middle),(side*width*.72,base+.06,rear-.2),(side*.025,base+.025,rear)],P['silver'],.016)
    A.curve('Cockpit bow',[(math.cos(i/32*math.pi)*width,base+math.sin(i/32*math.pi)*height,middle) for i in range(33)],P['carbon'],.017)

def intake(side,x,z,width=.46,height=.48,frame=None):
    x*=side;frame=frame or P['silver']
    outer=[(x-side*width*.55,-.025,z-.12),(x+side*width*.62,-.015,z),(x+side*width*.5,-height,z+.12),(x-side*width*.42,-height*.9,z-.05)]
    inner=[(x+(p[0]-x)*.82,p[1]*.82-.035,p[2]+.37) for p in outer]
    patch('Deep intake throat',inner,P['dark'])
    A.mesh('Intake interior walls',outer+inner,[(i,(i+1)%4,(i+1)%4+4,i+4) for i in range(4)],P['carbon'])
    A.curve('Machined intake lip',outer+[outer[0]],frame,.035)
    # Interior vanes, rather than a flat black painted rectangle.
    for t in [.2,.4,.6,.8]:
        A.curve('Intake stator',[(x-side*width*.35,-height*t,z+.27),(x+side*width*.35,-height*t,z+.38)],P['metal'],.009)

def numbering(text,side,x,z,mat):
    data=bpy.data.curves.new('Airframe identity '+text,'FONT');data.body=text;data.size=.36;data.extrude=.001;data.align_x='CENTER'
    o=bpy.data.objects.new('Painted serial '+text,data);bpy.context.collection.objects.link(o);o.location=A.xyz((side*x,.16,z));o.data.materials.append(mat)
    # Text lies on the upper wing in Blender XY; no real military insignia.
    bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False)

def panel_detail(side,span,z,accent):
    A.curve('Flaperon hinge',[(side*1.25,.15,z+.3),(side*(span-.15),.1,z+.95)],P['dark'],.008)
    for x in [1.8,2.3,2.8]:
        if x<span-.2:A.curve('Control surface break',[(side*x,.14,z+.22),(side*x,.13,z+.65)],P['dark'],.007)
    # Small hatch boundaries are engraved rather than modeled as raised plates.
    A.curve('Flush access hatch',[(side*1.24,.11,.2),(side*1.52,.11,.4),(side*1.48,.11,1.05),(side*1.23,.11,.9),(side*1.24,.11,.2)],P['dark'],.005)

def armament(muzzles):
    for i,p in enumerate(muzzles):
        A.box('Recessed cannon surround',(p[0],p[1],p[2]+.26),(.12,.12,.47),P['metal'],.025)
        A.cylinder('Cannon dark bore',p,.036,.07,P['dark'],20)
        A.anchor('muzzle.primary.'+str(i+1),p)

def engines(points,radius,vector=False):
    exits=[]
    for i,(x,y,z) in enumerate(points):
        A.engine(x,y,z,radius)
        # The visible chamber lies aft of the fuselage closure, inside the petals.
        A.cylinder('Recessed exhaust chamber',(x,y,z+.55),radius*.89,.035,P['dark'],48)
        A.cylinder('Rear turbine hub',(x,y,z+.59),radius*.16,.025,P['metal'],24)
        for k in range(14):
            a=k/14*math.tau
            A.curve('Rear turbine vane',[(x+math.cos(a)*radius*.2,y+math.sin(a)*radius*.2,z+.6),(x+math.cos(a+.3)*radius*.75,y+math.sin(a+.3)*radius*.75,z+.6)],P['metal'],.013)
        if vector:
            # Vector actuators and a wider external travel collar.
            for angle in [0,math.pi*.5,math.pi,math.pi*1.5]:
                dx=math.cos(angle)*(radius+.09);dy=math.sin(angle)*(radius+.09)
                A.curve('Vector nozzle actuator',[(x+dx,y+dy,z-.02),(x+dx*1.1,y+dy*1.1,z+.58)],P['silver'],.032)
            A.curve('Nozzle gimbal ring',[(x+math.cos(k/64*math.tau)*(radius+.065),y+math.sin(k/64*math.tau)*(radius+.065),z+.18) for k in range(65)],P['carbon'],.035)
        exit=[x,y,z+.7];exits.append(exit);A.anchor('exhaust.'+str(i+1),exit)
    return exits

def akari():
    skin('Akari slender single engine fuselage',[(-4.8,.018,.02,0),(-4.15,.27,.14,.04),(-3.4,.43,.24,.09),(-2.5,.52,.31,.12),(-1.4,.61,.38,.06),(-.4,.65,.39,.03),(1,.62,.38,.01),(2.3,.59,.36,0),(3.55,.47,.31,0),(4.05,.45,.3,0)],P['lacquer'])
    canopy(-3.45,-1.45,.3,.33,.33)
    for s in [-1,1]:
        A.wing('Akari large maritime wing',s,(-1.45,2.75),(.62,1.84),3.4,P['lacquer'],36)
        A.wing('Vermilion swept recognition stripe',s,(-1.25,-.89),(.78,1.04),3.36,P['vermilion'],20,y=.115)
        A.wing('Navy trailing flaperon',s,(2.22,2.65),(1.53,1.79),3.22,P['midnight'],20,y=.085)
        A.wing('Akari aft stabilizer',s,(2.6,4.05),(3.38,3.89),2.06,P['lacquer'],20,y=.04)
        A.wing('Red stabilizer tip',s,(3.0,3.21),(3.43,3.63),2.03,P['vermilion'],12,y=.12)
        intake(s,.57,-1.9,.38,.48,P['lacquer'])
        A.box('Wingtip instrumentation rail',(s*3.38,.03,1.12),(.095,.12,1.45),P['vermilion'],.04)
        panel_detail(s,3.4,1.05,P['lacquer']);numbering('02',s,2.55,1.27,P['midnight'])
    fin('Single dorsal vertical stabilizer',0,1.55,1.85,2.43,P['lacquer'],P['vermilion'],0,.55)
    A.curve('Red dorsal precision marking',[(0,.44,-.8),(0,.44,.7),(0,.4,1.65)],P['vermilion'],.065)
    muzzles=[[-.36,-.02,-2.88],[.36,-.02,-2.88]];armament(muzzles)
    return dict(scale=.78,radius=1.05,muzzles=muzzles,exhausts=engines([(0,-.025,3.65)],.47),battleTarget=20000,engineCount=1,tailCount=1)

def haneul():
    skin('Haneul twin engine chines',[(-5.4,.02,.02,0),(-4.65,.3,.13,.035),(-3.8,.48,.24,.06),(-2.9,.6,.32,.09),(-1.7,.9,.38,.02),(-.4,1.1,.34,0),(1.2,1.15,.29,0),(2.5,1.04,.28,-.02),(3.8,.87,.26,-.04),(4.55,.82,.22,-.05)],P['midnight'])
    canopy(-3.95,-1.65,.31,.35,.31)
    for s in [-1,1]:
        A.wing('Haneul trapezoid main wing',s,(-1.82,3.1),(1.13,2.35),3.88,P['midnight'],38)
        A.wing('Silver leading structural band',s,(-1.72,-1.55),(1.2,1.39),3.8,P['silver'],20,y=.1)
        A.wing('Twin engine rear stabilizer',s,(2.7,4.78),(3.8,4.45),2.3,P['midnight'],22)
        intake(s,.9,-2.05,.57,.52,P['silver'])
        fin('Haneul canted vertical tail',s*.78,2.22,1.7,2.22,P['midnight'],P['silver'],.44)
        panel_detail(s,3.88,1.45,P['carbon']);numbering('21',s,3.05,1.94,P['silver'])
        # Conformal EW nodes, not oversized external antenna pods.
        for x,z in [(1.15,-1.15),(2.7,1.05),(1.15,2.3)]:
            A.curve('Conformal EW cyan aperture',[(s*x,.24,z),(s*(x+.3),.2,z+.37)],P['cyan'],.017)
        patch('Distributed sensor window',[(s*.5,.31,-1.3),(s*.7,.29,-1.1),(s*.7,.29,-.65),(s*.49,.32,-.78)],P['silver'])
    A.box('Flush dorsal data link',(0,.35,.25),(.24,.09,1.2),P['carbon'],.055)
    muzzles=[[-.42,0,-3.38],[.42,0,-3.38]];armament(muzzles)
    return dict(scale=.74,radius=1.15,muzzles=muzzles,exhausts=engines([(-.57,-.08,4.0),(.57,-.08,4.0)],.4),battleTarget=20000,engineCount=2,tailCount=2)

def astra():
    skin('Astra deep integrated single engine body',[(-4.4,.02,.02,0),(-3.7,.35,.21,.03),(-2.95,.58,.34,.06),(-2.05,.72,.45,.02),(-1.1,.97,.45,-.04),(.1,1.03,.42,-.07),(1.4,.88,.38,-.05),(2.6,.71,.34,-.03),(3.6,.52,.31,-.02)],P['carbon'])
    canopy(-3.25,-1.27,.34,.39,.36)
    for s in [-1,1]:
        A.wing('Astra clipped stealth wing',s,(-1.45,2.35),(.83,1.93),3.12,P['carbon'],36)
        wing_paint('Cobalt polygon camouflage',[(s*1.12,.19,-.94),(s*2.93,.1,.92),(s*2.78,.11,1.27),(s*1.35,.2,.25)],P['cobalt'],3.12,(-1.45,2.35),(.83,1.93))
        A.wing('Astra horizontal stabilizer',s,(1.94,3.86),(3.05,3.63),2.12,P['carbon'],24)
        A.wing('Cobalt tail plane inset',s,(2.53,2.81),(3.19,3.4),1.97,P['cobalt'],12,y=.1)
        fin('Astra low canted tail',s*.66,1.55,1.51,2.11,P['carbon'],P['cobalt'],.58)
        intake(s,.86,-1.97,.48,.56,P['carbon'])
        # Flush diverter bump, EO aperture and closed serrated weapon-bay panels.
        skin('DSI pressure bump '+str(s),[(-2.1,.08,.04,-.02),(-1.88,.18,.12,-.02),(-1.5,.09,.04,-.02)],P['carbon'],1,24).location.x=s*.68
        patch('Electro optical flank sensor',[(s*.42,.14,-3.0),(s*.59,.12,-2.83),(s*.59,.1,-2.61),(s*.43,.14,-2.72)],P['cyan'])
        A.curve('Serrated bay boundary',[(s*.36,-.44,-.65),(s*.53,-.45,-.53),(s*.47,-.45,-.34),(s*.68,-.41,-.18),(s*.63,-.4,1.5),(s*.4,-.41,1.3)],P['silver'],.009)
        A.curve('Electric blue data edge',[(s*.79,.23,-1.5),(s*1.12,.22,-1.2),(s*1.66,.18,-.58)],P['cyan'],.012)
        panel_detail(s,3.12,1.05,P['carbon']);numbering('35',s,2.43,1.46,P['cobalt'])
    muzzles=[[-.4,.02,-2.87],[.4,.02,-2.87]];armament(muzzles)
    return dict(scale=.82,radius=1.1,muzzles=muzzles,exhausts=engines([(0,-.06,3.28)],.56),battleTarget=20000,engineCount=1,tailCount=2)

def snega():
    skin('Snega wide lifting body',[(-5.8,.02,.02,.0),(-4.9,.35,.16,.025),(-4.0,.58,.26,.05),(-2.9,.82,.36,.02),(-1.8,1.25,.34,-.01),(-.4,1.55,.27,-.04),(1.2,1.55,.25,-.06),(2.6,1.37,.22,-.05),(4.4,1.08,.2,-.06),(4.85,.6,.16,-.06)],P['frost'])
    canopy(-4.17,-1.96,.33,.3,.33)
    for s in [-1,1]:
        # Clearly separated nacelles under broad wing roots.
        skin('Separated engine nacelle '+str(s),[(-2.7,.38,.26,-.2),(-1.8,.5,.39,-.23),(.3,.52,.36,-.2),(2.6,.5,.32,-.16),(4.5,.43,.28,-.12)],P['slate'],2,36).location.x=s*.9
        A.wing('Snega broad blended main wing',s,(-2.12,3.47),(.46,2.48),4.4,P['frost'],40,y=.04)
        wing_paint('Angular frost blue camouflage',[(s*.95,.24,-1.6),(s*1.4,.2,-1.13),(s*1.64,.19,-.15),(s*3.95,.11,.97),(s*3.68,.12,1.43),(s*2.4,.16,.99),(s*2.75,.16,2.44),(s*1.48,.21,2.68)],P['slate'],4.4,(-2.12,3.47),(.46,2.48),.04)
        A.wing('Snega all moving tailplane',s,(2.4,5.02),(3.85,4.58),2.88,P['frost'],24,y=.06)
        A.wing('Steel blue tail inset',s,(3.0,3.64),(3.98,4.46),2.72,P['slate'],15,y=.13)
        fin('Snega outward vertical tail',s*1.17,2.55,1.45,2.0,P['frost'],P['slate'],.35)
        intake(s,1.0,-2.24,.62,.56,P['slate'])
        A.curve('Cold cyan inlet sensor',[(s*.73,-.09,-2.24),(s*.78,-.45,-2.17)],P['cyan'],.016)
        panel_detail(s,4.4,1.7,P['frost']);numbering('57',s,3.4,1.93,P['slate'])
    skin('Central tail sting',[(2.7,.25,.2,0),(4.2,.23,.2,.02),(5.1,.1,.12,.02),(5.4,.015,.02,.01)],P['frost'],1,32)
    muzzles=[[-.48,-.02,-3.45],[.48,-.02,-3.45]];armament(muzzles)
    return dict(scale=.69,radius=1.2,muzzles=muzzles,exhausts=engines([(-.92,-.12,4.35),(.92,-.12,4.35)],.43,True),battleTarget=20000,engineCount=2,tailCount=2)

manifest_path=ROOT/'src/game/model-manifest.json'
A.manifest=json.loads(manifest_path.read_text(encoding='utf-8'))
for name,build in [('akari',akari),('haneul',haneul),('astra',astra),('snega',snega)]:
    A.clear();info=build();A.prepare();A.export(name,info)
manifest_path.write_text(json.dumps(A.manifest,indent=2),encoding='utf-8')
(A.OUT/'manifest.json').write_text(json.dumps(A.manifest,indent=2),encoding='utf-8')
print('ROSTER MODELS COMPLETE',flush=True)
