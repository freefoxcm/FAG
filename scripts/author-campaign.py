"""Rebuild campaign assets. Blender --background --python scripts/author-campaign.py."""
import importlib.util,json,math
from pathlib import Path
import bpy
spec=importlib.util.spec_from_file_location('airframes',Path(__file__).with_name('author-models.py'))
a=importlib.util.module_from_spec(spec);spec.loader.exec_module(a)
a.M={name:a.material(name,color,metal=name in ['titanium','brass'],glass=name in ['glass','enemyglass']) for name,color in {'ceramic':(.85,.87,.8),'celadon':(.5,.65,.57),'titanium':(.37,.42,.44),'graphite':(.08,.1,.11),'hostile':(.5,.18,.08),'brass':(.63,.51,.28),'navy':(.1,.15,.2),'glass':(.035,.09,.105),'enemyglass':(.23,.06,.02)}.items()}
M=a.M
def simple(name,color,metal=0,rough=.75):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough;return m
wall=simple('Warm concrete',(.56,.55,.49));roof=simple('Roof membrane',(.28,.33,.32));glass=simple('Blue architectural glass',(.12,.25,.29),.5,.24);trim=simple('Aluminum facade',(.64,.65,.58),.45,.4);bark=simple('Weathered bark',(.23,.19,.13));leaf=[simple('Foliage '+str(i),c) for i,c in enumerate([(.16,.29,.17),(.22,.34,.19),(.29,.39,.22)])]
def tagged(part,fn):
 before=set(bpy.context.scene.objects);fn()
 for o in set(bpy.context.scene.objects)-before:
  if o.type in ['MESH','CURVE']:o['part_id']=part
def plate(name,points,mat,thickness=.08):
 o=a.mesh(name,points,[tuple(range(len(points)))],mat);m=o.modifiers.new('Plate thickness','SOLIDIFY');m.thickness=thickness;return o
def plane(kind):
 length={'drone':3.6,'interceptor':6.5,'heavy':5.5,'support':4.8}[kind];span={'drone':2.6,'interceptor':3,'heavy':4.7,'support':4.2}[kind];w=.5 if kind in ['drone','interceptor'] else .9
 a.loft(kind+' chined fuselage',[(-length/2,.025,.035,0),(-length*.32,w*.65,.22,.08),(-.3,w,.38,.1),(length*.25,w*.9,.3,.08),(length*.45,w*.7,.24,0)],M['navy'] if kind!='heavy' else M['graphite'],32)
 for side in [-1,1]:
  if kind=='drone':a.wing('Cranked delta',side,(-1.2,1.5),(.7,1.45),span,M['navy'],12)
  elif kind=='interceptor':
   a.wing('Swept arrow wing',side,(-1.5,2.2),(1.5,2.15),span,M['navy'],16);a.wing('Forward canard',side,(-2.1,-1.4),(-1.6,-1.35),1.35,M['titanium'],8,y=.1);a.fin(side,.4,1.7,1.15,1)
  elif kind=='heavy':
   a.wing('Thick armored wing',side,(-1.8,2.2),(-.2,2.1),span,M['graphite'],16);a.box('Wing armor',(side*2.4,.24,.3),(1.3,.38,2.5),M['titanium'],.12)
   for x in [1.8,3.2]:a.box('Rocket canister',(side*x,-.15,-.6),(.55,.55,2.8),M['hostile'],.09);a.cylinder('Rocket mouth',(side*x,-.15,-2.05),.18,.08,M['graphite'])
   a.fin(side,.8,1.1,1.2,1.4)
  else:
   plate('Diamond sensor wing',[(side*.6,0,-1.9),(side*span,0,.1),(side*2.3,0,1.8),(side*.6,0,2)],M['navy'],.16)
   for z in [-.6,0,.6]:a.box('Phased array strip',(side*2,.14,z),(.12,.12,1.8),M['hostile'],.02)
  a.engine(side*(.65 if kind!='heavy' else 1.1),0,length*.35,.3 if kind!='heavy' else .5)
  a.curve('Identification stripe',[(side*.8,.28,-.7),(side*(span-.2),.13,.9),(side*(span-.25),.13,1.4)],M['hostile'],.045)
  a.box('Gun breech',(side*.42,-.04,-length*.27),(.24,.24,.8),M['titanium'],.04)
  a.cylinder('Gun muzzle',(side*.42,-.04,-length*.45),.09,.5,M['graphite'],16)
 if kind=='support':
  for z in [-.7,.7]:a.box('Dorsal sensor',(0,.75,z),(1.7,.3,.5),M['titanium'],.1)
  a.curve('Sensor bridge',[(-.6,.8,-.7),(0,1.3,0),(.6,.8,.7)],M['hostile'],.065)
 else:a.loft('Faceted optical canopy',[(-length*.3,.02,.02,.3),(-length*.15,.23,.18,.4),(0,.1,.06,.4)],M['enemyglass'],20)
 return dict(scale=1,radius=2.4 if kind=='heavy' else 1.6 if kind=='support' else 1.05,muzzles=[[-.42,-.04,-length*.45-.25],[.42,-.04,-length*.45-.25]],exhausts=[[-.65 if kind!='heavy' else -1.1,0,length*.35+.7],[.65 if kind!='heavy' else 1.1,0,length*.35+.7]],battleTarget=6000)
def boss(kind):
 a.loft('Command hull',[(-7,.05,.05,0),(-5,1.4,.6,.1),(-2,2.1,1,.2),(2,2.2,.8,.2),(5.7,1.2,.5,.1)],M['graphite'],48)
 for side in [-1,1]:
  if kind=='prism':
   plate('Diamond array deck',[(side*.8,.2,-5),(side*10,.2,-.8),(side*8,.2,4),(side*1,.2,5)],M['navy'],.4)
   for z in [-2,0,2]:a.box('Array guide rail',(side*4,.55,z),(5,.12,.12),M['hostile'])
  elif kind=='canopy':
   a.box('Carrier flight deck',(side*6,.25,.4),(5,.6,11),M['navy'],.3)
   a.box('Launch runway',(side*6,.62,.3),(1,.06,9),M['titanium'])
   for z in [-3,-1,1,3]:a.box('Runway light',(side*6,.68,z),(.7,.04,.1),M['hostile'])
   a.box('Hangar bunker',(side*3.5,.8,2),(1.8,1.3,4),M['titanium'],.2)
  else:
   a.wing('Fortress armored wing',side,(-3,4),(-.8,3.8),10.5,M['graphite'],24);a.fin(side,1.1,2.8,2.3,2.2)
  for x in ([1.25] if kind=='boss' else [1.25,3.3]):a.engine(side*x,-.4,4.5,.63)
 for z in [-2,1,3]:a.box('Command armor',(0,1,z),(2.3,.8,1.6),M['titanium'],.15)
 for i,side in enumerate([-1,1]):
  def gun():
   a.box('Turret armored mantlet',(side*5.1,.45,-2.8),(2.3,1.2,2.5),M['titanium'],.2)
   for x in [-.35,.35]:a.cylinder('Independent cannon',(side*5.1+x,.55,-4.05),.19,2,M['graphite'],20);a.cylinder('Muzzle collar',(side*5.1+x,.55,-4.9),.23,.15,M['hostile'],20)
  tagged('part_'+str(i),gun)
  def module():
   if kind=='boss':a.engine(side*7.4,.3,2.1,.95);a.box('Engine armored cover',(side*7.4,.5,1.6),(2.3,1,2.6),M['hostile'],.2)
   elif kind=='prism':
    a.box('Radar base',(side*7.4,.3,2.1),(2.2,.5,2.4),M['titanium'],.15)
    plate('Radar planar array',[(side*7.4-1,1,1.3),(side*7.4+1,1,1.3),(side*7.4+1,2.6,2.5),(side*7.4-1,2.6,2.5)],M['hostile'],.14)
   else:
    a.cylinder('Shield generator',(side*7.4,.3,2.1),1,1.4,M['titanium'],32)
    for r in [.6,.9]:a.curve('Shield winding',[(side*7.4+math.cos(j/32*math.tau)*r,.8+math.sin(j/32*math.tau)*r,2.1) for j in range(33)],M['hostile'],.09)
  tagged('part_'+str(i+2),module)
 return dict(scale=1,radius=3.2,muzzles=[[-5.1,.55,-5],[5.1,.55,-5]],exhausts=([[-1.25,-.4,5.2],[1.25,-.4,5.2],[-7.4,.3,2.8],[7.4,.3,2.8]] if kind=='boss' else [[x,-.4,5.2] for x in [-3.3,-1.25,1.25,3.3]]),battleTarget=18000)
def pickup(kind):
 color=M['brass'] if kind=='power' else M['celadon']
 a.box('Supply capsule',(0,0,0),(1.9,.65,1.6),M['ceramic'],.18);a.box('Colored inset',(0,.36,0),(1.55,.12,1.25),color,.06)
 for x in [-1,1]:a.box('Carry rail',(x*.9,.2,0),(.16,.35,1.4),M['titanium'],.04)
 if kind=='power':
  for x in [-.4,.4]:a.cylinder('Twin ammunition tubes',(x,.08,-.8),.16,1.3,M['titanium'],16)
  plate('Raised upgrade arrow',[(-.19,.48,.45),(.19,.48,.45),(.19,.48,-.05),(.48,.48,-.05),(0,.48,-.55),(-.48,.48,-.05),(-.19,.48,-.05)],M['graphite'],.06)
 else:
  a.box('Repair symbol vertical',(0,.49,0),(.26,.09,1),M['ceramic'],.015);a.box('Repair symbol horizontal',(0,.49,0),(1,.09,.26),M['ceramic'],.015)
  for x in [-.5,.5]:a.box('Medical latch',(x,-.05,-.9),(.35,.26,.25),color,.04)
 return dict(scale=1,radius=1.8,muzzles=[],exhausts=[],battleTarget=1600)
def building(kind):
 w,d,h=(9,13,7) if kind=='residential' else (10,11,10) if kind=='office' else (12,17,4)
 a.box('Facade',(0,h/2,0),(w,h,d),wall,.12);a.box('Plinth',(0,.35,0),(w+.6,.7,d+.6),roof,.05)
 for y in range(2,h,2):
  a.box('Floor belt',(0,y-.65,0),(w+.12,.16,d+.12),trim,.02)
  for side in [-1,1]:
   for x in range(-int(w/2)+1,int(w/2),2):
    a.box('Window frame',(x,y,side*(d/2+.04)),(1.35,1.25,.12),trim,.02);a.box('Window recess',(x,y,side*(d/2+.12)),(1.12,1,.035),glass,.01)
    if kind=='residential':a.box('Balcony slab',(x,y-.7,side*(d/2+.4)),(1.5,.14,.8),wall,.02);a.box('Balcony front',(x,y-.4,side*(d/2+.8)),(1.5,.55,.1),trim,.02)
   for z in range(-int(d/2)+1,int(d/2),2):a.box('Side glazing',(side*(w/2+.03),y,z),(.06,1,1.2),glass,.01)
 a.box('Roof slab',(0,h+.1,0),(w+.35,.25,d+.35),roof,.05)
 for side in [-1,1]:a.box('Roof parapet',(side*w/2,h+.4,0),(.16,.5,d),wall,.02);a.box('Roof parapet',(0,h+.4,side*d/2),(w,.5,.16),wall,.02)
 for x in [-2,2]:
  a.box('Rooftop HVAC',(x,h+.65,1),(1.5,.9,2.2),trim,.08)
  for z in [-.5,0,.5]:a.box('HVAC slat',(x,h+1.12,1+z),(1.2,.03,.12),roof,0)
 a.box('Roof stairwell',(2,h+1.1,-3),(2,2,2.5),wall,.05);a.box('Entrance',(0,1.2,-d/2-.1),(2,2.4,.1),glass,.02);a.box('Entrance canopy',(0,2.5,-d/2-.7),(3,.18,1.5),trim,.03)
 if kind=='warehouse':
  for x in [-3,3]:a.box('Loading door',(x,1.4,-d/2-.1),(2.8,2.8,.12),roof,.01)
  for z in [-5,0,5]:a.box('Roof skylight',(0,h+.35,z),(5,.3,1.6),glass,.06)
 return dict(scale=1,radius=0,muzzles=[],exhausts=[],battleTarget=3500)
def tree(kind):
 a.box('Trunk',(0,1.4,0),(.35,2.8,.35),bark,.06)
 for i in range(5):
  angle=i*2.4;r=.7;z=math.sin(angle)*r;x=math.cos(angle)*r
  a.curve('Main branch',[(0,1.2+i*.2,0),(x,2.2+i*.2,z)],bark,.09)
 if kind=='pine':
  for i in range(4):
   bpy.ops.mesh.primitive_cone_add(vertices=12,radius1=1.7-i*.28,radius2=.12,depth=2,location=a.xyz((0,2+i*.65,0)));bpy.context.object.data.materials.append(leaf[i%3])
 else:
  for i in range(8):
   angle=i*2.4;r=0 if i==0 else 1.05;x=math.cos(angle)*r;z=math.sin(angle)*r
   bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=1,location=a.xyz((x,2.8+(i%3)*.4,z)));o=bpy.context.object;o.name='Layered foliage';o.scale=(1.1,.95,1.2 if kind=='broadleaf' else .7);o.data.materials.append(leaf[i%3])
 return dict(scale=1,radius=0,muzzles=[],exhausts=[],battleTarget=1100)
def facility(kind):
 a.box('Concrete foundation',(0,.1,0),(3.8,.3,4.6),roof,.08);a.box('Equipment chassis',(0,.65,0),(2.8,.9,3.5),M['navy'],.12)
 if kind=='radar':
  a.box('Sensor mast',(0,2,0),(.35,2.6,.35),M['titanium'])
  plate('Ground radar array',[(-1.8,2.4,-.5),(1.8,2.4,-.5),(1.8,4,.3),(-1.8,4,.3)],M['celadon'],.2)
  for x in [-1.2,-.6,0,.6,1.2]:a.curve('Antenna rib',[(x,2.4,-.52),(x,4,.28)],M['titanium'],.035)
 else:
  a.box('Armored turret',(0,1.2,0),(1.8,.8,2),M['titanium'],.13)
  for x in [-.5,.5]:a.cylinder('Cannon barrel',(x,1,-1.3),.14,2.2,M['graphite'],16);a.cylinder('Cannon collar',(x,1,-2.35),.2,.2,M['hostile'],16)
  if kind=='missile-site':
   for x in [-1.15,1.15]:a.box('Missile rack',(x,1.35,0),(.55,.8,2.8),M['hostile'],.1)
 return dict(scale=1,radius=1.6,muzzles=[[.5,1,-2.4]],exhausts=[],battleTarget=2300)
entries=[(k,lambda k=k:plane(k)) for k in ['drone','interceptor','heavy','support']]+[(k,lambda k=k:boss(k)) for k in ['boss','prism','canopy']]+[(k,lambda k=k:pickup(k)) for k in ['power','repair']]+[('building-'+k,lambda k=k:building(k)) for k in ['residential','office','warehouse']]+[('tree-'+k,lambda k=k:tree(k)) for k in ['broadleaf','pine','coastal']]+[(k,lambda k=k:facility(k)) for k in ['turret','radar','missile-site']]
for kind,author in entries:
 a.clear();info=author()
 for i,p in enumerate(info['muzzles']):a.anchor('muzzle.primary.'+str(i+1),p)
 for i,p in enumerate(info['exhausts']):a.anchor('exhaust.'+str(i+1),p)
 a.prepare();a.export(kind,info)
path=a.ROOT/'src/game/model-manifest.json';old=json.loads(path.read_text(encoding='utf-8'));old.update(a.manifest);path.write_text(json.dumps(old,indent=2),encoding='utf-8');(a.OUT/'manifest.json').write_text(json.dumps(old,indent=2),encoding='utf-8')
print('CAMPAIGN ASSETS COMPLETE',flush=True)
