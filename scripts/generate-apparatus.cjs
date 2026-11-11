// Chem Studio schematic artwork. Coordinates and paths are authored here.
// This generator has no image input and uses no downloaded artwork.
// The separately reviewed assets/biochemistry pack is not generated or changed here.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const target = path.resolve(__dirname, '../assets/apparatus');
fs.mkdirSync(target, {recursive:true});
const C={ink:'#294454', glass:'#dcefeb', teal:'#258f89', metal:'#c6d2d7', warm:'#d79b59', red:'#c75b55', leaf:'#6da37c'};
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
class Art {
  constructor(w=160,h=200){this.w=w;this.h=h;this.nodes=[];this.ports=[];this.boreCount=-1;this.neckCount=0;}
  tag(tag,a,body=''){this.nodes.push(`<${tag} ${Object.entries(a).map(([k,v])=>`${k}="${esc(v)}"`).join(' ')}>${body}</${tag}>`);return this;}
  p(d,fill='none',extra={}){return this.tag('path',{d,fill,...extra});}
  line(x1,y1,x2,y2,extra={}){return this.tag('line',{x1,y1,x2,y2,...extra});}
  rect(x,y,width,height,fill=C.glass,rx=0,extra={}){return this.tag('rect',{x,y,width,height,rx,fill,...extra});}
  ellipse(cx,cy,rx,ry,fill='none',extra={}){return this.tag('ellipse',{cx,cy,rx,ry,fill,...extra});}
  circle(cx,cy,r,fill='none',extra={}){return this.ellipse(cx,cy,r,r,fill,extra);}
  text(x,y,text,size=12,fill=C.ink){return this.tag('text',{x,y,fill,stroke:'none','font-size':size,'font-family':'sans-serif','text-anchor':'middle'},esc(text));}
  port(id,x,y,dx,dy,type='mouth',diameter=16,extra={}){this.ports.push({id,x,y,dx,dy,type,diameter,...extra});return this;}
  ticks(x,y,n,spacing=12,len=14){for(let i=0;i<n;i++)this.line(x,y+i*spacing,x-(i%2?len*.6:len),y+i*spacing,{'stroke-width':1.3});return this;}
  svg(){return `<svg xmlns="http://www.w3.org/2000/svg" width="${this.w}" height="${this.h}" viewBox="0 0 ${this.w} ${this.h}"><g stroke="${C.ink}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round">${this.nodes.join('')}</g></svg>\n`;}
}
const entries=[];
function correctInterfaces(id, a) {
  const update = (name, data) => Object.assign(a.ports.find(p => p.id === name), data);
  const remove = name => { a.ports = a.ports.filter(p => p.id !== name); };
  const pipe = (d, width) => {
    a.p(d, 'none', {stroke: C.ink, 'stroke-width': width, 'stroke-linecap': 'butt'});
    a.p(d, 'none', {stroke: '#f4f9f8', 'stroke-width': width - 4, 'stroke-linecap': 'butt'});
  };
  const surface = (name, x1, y1, x2, y2) => a.port(name, (x1+x2)/2, (y1+y2)/2,
    y2-y1, x1-x2, 'surface', 0, {segment:[x1,y1,x2,y2]});
  if (['beaker','displacement-beaker','eureka','tank','water-bath','ice-bath','tlc-chamber'].includes(id))
    update('mouth', {x:76.5, diameter:121, edge:[16,34,137,34]});
  const pipes = {
    'test-tube-with-side-arm':['M50 48 H66 V36',6],
    'conical-flask-with-side-arm':['M98 57 L137 38',13],
    'displacement-beaker':['M137 64 H153 V88',12], 'eureka':['M137 64 H153 V88',12],
    'wash-bottle':['M80 10 V8 H126 L149 30',10],
    'distillation-flask':['M99 55 H132 V83',12], 'schlenk-flask':['M99 55 H132 V83',12],
    'spe-cartridge':['M128 61 H162',10], 'piston-chamber':['M25 53 H10',12],
    'vacuum-pump':['M137 86 V55',12], 'syringe-pump':['M39 65 H20',8],
    'gas-cylinder':['M65 18 H80',10],
  };
  if (pipes[id]) pipe(...pipes[id]);
  if (id === 'test-tube-with-side-arm') update('outlet', {diameter:6});
  if (id === 'gas-cylinder') update('outlet', {x:80,y:18,diameter:10});
  if (['graham','allihn','liebig-condenser'].includes(id)) pipe('M24 66 H7 M86 191 H103',12);
  if (id === 'cold-finger') {
    pipe('M62 28 V10 M78 28 V10',8);
    update('inlet', {diameter:8}); update('outlet', {diameter:8});
  }
  if (id === 'distillation-head' || id === 'claisen') {
    pipe(id === 'claisen' ? 'M76 66 H130 V92' : 'M76 66 H124 V92',16);
    if (id === 'claisen') { pipe('M76 122 H112 V12',18); update('outlet', {x:130}); }
  }
  if (id === 'dean-stark-trap') pipe('M112 38 H122 V17',18);
  if (id === 'pipette') update('mouth', {diameter:10, type:'pipette-stem'});
  if (id === 'mohr') update('mouth', {diameter:26, type:'pipette-stem'});
  if (id === 'burette') update('mouth', {diameter:26, type:'mouth'});
  if (id === 'thermometer' || id === 'hydrometer') {
    remove('mouth');
    if (id === 'thermometer') update('stem', {y:241, diameter:34, segment:[40,200,40,30]});
    else {
      a.line(35,10,45,10); a.line(35,244,45,244);
      update('stem', {type:'immersible', diameter:10});
    }
  }
  if (id === 'eudiometer') {
    a.nodes=[];
    a.p('M27 10 V225 A13 13 0 0 0 53 225 V10'); a.ticks(47,30,14,12,14);
    remove('stem'); update('mouth', {type:'mouth',diameter:26});
    a.port('base',40,238,0,1,'base',0);
  }
  if (id === 'syringe') update('outlet', {type:'probe',diameter:2.4,segment:[50,218,50,198]});
  if (id === 'gas-syringe') update('outlet', {diameter:14});
  if (id === 'glass-stopper') update('plug', {y:68,diameter:22,depth:30});
  if (id === 'septum-seal') { a.boreCount=-1; update('plug', {y:56,diameter:74,type:'lid'}); }
  if (id === 'crucible-cover') { remove('mouth'); a.port('lid',85,96,0,1,'lid',133); }
  if (id === 'crucible') update('mouth', {y:26,diameter:110});
  if (id === 'mortar') update('mouth', {y:38,diameter:140});
  if (id === 'spotting-tile') {
    remove('mouth');
    for(let y=37;y<109;y+=34)for(let x=39;x<146;x+=45)a.port(`well-${x}-${y}`,x,y,0,-1,'well',0);
  }
  const bases = {'pipette-bottle':[50,210],'oven':[90,175],'kettle':[85,161],
    'microscope':[100,159],'fume-hood':[100,159],'desiccator':[100,144],
    'desk-lamp':[88,164],'desk-fan':[99,164],'computer':[100,162],
    'petri-dish':[90,130],'pot':[90,158],'soda-can':[90,131]};
  if (bases[id]) a.port('base',...bases[id],0,1,'base',0);
  if (id==='table') surface('surface',10,48,190,48);
  if (id==='oven') surface('surface',37,126,116,126);
  if (id==='desiccator') surface('surface',36,105,164,105);
  if (id==='fume-hood') surface('surface',29,140,171,140);
  if (id==='microscope') surface('surface',28,101,137,101);
  if (id==='ramp') surface('surface',12,139,176,34);
  if (id==='clay-triangle') a.port('surface',90,64,0,-1,'surface',0);
  if (id==='peg') a.port('grip',64,167,0,1,'grip',0);
  if (id==='tlc-plate') a.port('lane',90,120,0,-1,'lane',0,{segment:[39,120,141,120]});
  if (id==='tlc-spot') a.port('spot',90,74,0,1,'spot',0);
  if (id==='balloon') a.port('hanger',90,147,0,1,'hanger',0);
  if (id==='light-gate') {
    a.circle(141,43,5,C.ink); a.port('signal',141,43,0,1,'wire',0);
    a.port('grip-site',48,100,1,0,'grip-site',0);
  }
  if (id==='lamp') { a.line(73,131,73,141); a.line(107,131,107,141); }
}
function save(id,name,category,a){
  correctInterfaces(id,a);
  const svg=a.svg();fs.writeFileSync(path.join(target,id+'.svg'),svg);
  const e={id:'studio:'+id,name,category,search:id.replaceAll('-',' '),svg:id+'.svg',sha256:crypto.createHash('sha256').update(svg).digest('hex'),width:a.w,height:a.h,ports:a.ports,boreCount:a.boreCount,neckCount:a.neckCount};
  entries.push(e);return e;
}
function group(category,spec,draw){for(const part of spec.trim().split('\n')){const [id,name]=part.split('|');save(id,name,category,draw(id));}}
function vessel(id){
 const a=new Art();const tube=['test-tube','test-tube-with-side-arm','eudiometer'].includes(id);
 if(tube){a.w=70;a.p('M17 12 H20 V160 A15 15 0 0 0 50 160 V12 H53');a.port('mouth',35,12,0,-1,'mouth',30,{depth:28,target:[35,135]});if(id.includes('side-arm')){a.p('M50 48 H66 V36');a.port('outlet',66,36,0,-1,'tube',12);}if(id==='eudiometer')a.ticks(45,34,10,12,10);return a;}
 if(['beaker','displacement-beaker','eureka','tank','calorimetry-cup','water-bath','ice-bath','tlc-chamber'].includes(id)){
   a.p('M16 34 L27 42 V167 Q27 178 39 178 H126 Q137 178 137 167 V34');a.ticks(126,66,6,16,22);a.port('mouth',82,34,0,-1,'mouth',105,{depth:25,target:[82,150]});
   if(['displacement-beaker','eureka'].includes(id)){a.p('M137 64 H153 V88');a.port('outlet',153,88,0,1,'tube',12);}
   if(id==='calorimetry-cup'){a.p('M19 46 V181 H145 V46');a.line(23,31,141,31);}
   if(id==='tlc-chamber'){a.rect(52,60,52,104,'none');a.line(56,137,100,137);a.circle(68,118,3,C.teal);a.circle(88,93,3,C.teal);}
   if(id==='ice-bath'){for(const [x,y] of [[50,130],[90,150],[109,115]])a.p(`M${x} ${y} l18 -6 8 15 -18 6Z`,C.glass);}
   if(id==='water-bath'){a.rect(19,178,126,17,C.metal,3);a.circle(126,187,3,C.teal);}
 }else if(['watch-glass','weight-boat','evaporating-dish'].includes(id)){
   a.h=70;if(id==='weight-boat')a.p('M12 12 H148 L130 58 H30Z',C.glass);else a.p('M10 19 Q80 82 150 19 Q80 37 10 19Z',id==='evaporating-dish'?'#f1efea':C.glass);
 }else if(id==='stemmed-glass'){a.p('M24 16 H136 C135 100 105 112 80 112 C55 112 25 100 24 16Z',C.glass,{'fill-opacity':.35});a.line(80,112,80,177);a.ellipse(80,184,43,7,C.metal);
 }else if(['conical-flask','conical-flask-with-side-arm'].includes(id)){
   a.p('M58 12 H62 V55 L20 168 Q16 180 30 180 H130 Q144 180 140 168 L98 55 V12 H102');a.ticks(115,126,3,16,19);a.port('mouth',80,12,0,-1,'mouth',36,{depth:24,target:[80,146]});
   if(id.includes('side-arm')){a.p('M98 57 L137 38');a.port('outlet',137,38,.87,-.5,'tube',13);}
 }else if(['round-bottom-flask','boiling-flask','distillation-flask','volumetric-flask','schlenk-flask','pycnometer'].includes(id)){
   const vol=id==='volumetric-flask';a.p(vol?'M65 12 H69 V103 C12 139 31 184 80 184 C129 184 148 139 91 103 V12 H95':'M57 12 H61 V64 C-1 101 13 181 80 181 C147 181 161 101 99 64 V12 H103');a.port('mouth',80,12,0,-1,'glass-female',vol?22:38,{depth:25,target:[80,140]});a.neckCount=1;
   if(vol){a.line(68,62,92,62);a.text(80,148,'100 mL');}if(id==='boiling-flask')a.line(47,179,113,179);
   if(['distillation-flask','schlenk-flask'].includes(id)){a.p('M99 55 H132 V83');a.port('outlet',132,83,0,1,'tube',12);if(id==='schlenk-flask'){a.line(122,68,142,68);a.circle(132,68,3,C.teal);}}
   if(id==='pycnometer')a.rect(63,3,34,9,C.metal,2);
 }else{
   const wide=id==='gas-jar';a.p(wide?'M34 14 H38 V171 Q38 181 48 181 H112 Q122 181 122 171 V14 H126':'M56 15 H60 V45 Q27 56 27 80 V171 Q27 183 40 183 H120 Q133 183 133 171 V80 Q133 56 100 45 V15 H104');a.port('mouth',80,14,0,-1,'mouth',wide?84:40,{depth:24,target:[80,144]});
   if(['reagent-bottle','bottle','thermos','wash-bottle'].includes(id)){a.rect(55,4,50,10,C.metal,2);a.rect(48,90,64,43,'none',3);}
   if(id==='wash-bottle'){a.p('M80 10 V8 H126 L149 30');a.port('outlet',149,30,.7,.7,'tube',10);}
   if(id==='thermos')a.p('M41 76 V166 H119 V76');
 }
 a.port('base',a.w/2,a.h-18,0,1,'base',0);return a;
}
group('容器',`beaker|烧杯
conical-flask|锥形瓶
test-tube|试管
round-bottom-flask|圆底烧瓶
volumetric-flask|容量瓶
gas-jar|集气瓶
test-tube-with-side-arm|侧支试管
conical-flask-with-side-arm|侧支锥形瓶
boiling-flask|平底烧瓶
displacement-beaker|溢流杯
eureka|排水罐
watch-glass|表面皿
tank|水槽
ice-bath|冰浴
weight-boat|称量舟
calorimetry-cup|量热杯
thermos|真空保温瓶
wash-bottle|洗瓶
stemmed-glass|高脚杯
schlenk-flask|施伦克瓶
distillation-flask|蒸馏烧瓶
pycnometer|比重瓶
reagent-bottle|试剂瓶
bottle|玻璃瓶
tlc-chamber|展开缸
water-bath|水浴锅
evaporating-dish|蒸发皿`,vessel);

function tube(id){
 const a=new Art(140,180);let d='M70 10 V165',ends=[[70,10,0,-1],[70,165,0,1]];
 if(id==='tube-bend'){d='M18 155 H88 Q120 155 120 123 V12';ends=[[18,155,-1,0],[120,12,0,-1]];}
 if(id==='u-bent-tube'||id==='salt-bridge'){d='M35 12 V130 A35 35 0 0 0 105 130 V12';ends=[[35,12,0,-1],[105,12,0,-1]];}
 if(id==='s-bent-tube'){d='M100 12 V45 C100 86 40 84 40 127 V166';ends=[[100,12,0,-1],[40,166,0,1]];}
 if(id==='rubber-tube'||id==='cable'){d='M16 32 C118 4 20 145 122 152';ends=[[16,32,-1,0],[122,152,1,0]];}
 if(id==='3-way-crossing'){d='M20 75 H120 M70 12 V165';ends=[[20,75,-1,0],[120,75,1,0],[70,12,0,-1],[70,165,0,1]];}
 if(id==='tube-adapter'){a.p('M53 12 V70 L62 105 V165 M87 12 V70 L78 105 V165');a.port('inlet',70,12,0,-1,'tube',34);a.port('outlet',70,165,0,1,'tube',16);return a;}
 const width=id==='capillary-tube'?7:id==='cable'?5:16;
 a.p(d,'none',{'stroke-width':width+4,'stroke-linecap':'butt'});a.p(d,'none',{'stroke-width':width,'stroke-linecap':'butt',stroke:id==='rubber-tube'?'#89999f':id==='cable'?C.teal:'#f4f9f8'});
 ends.forEach(([x,y,dx,dy],i)=>{a.port(i===0?'inlet':i===1?'outlet':'branch-'+i,x,y,dx,dy,id==='cable'?'wire':id==='rubber-tube'?'hose':'tube',width+4,{segment:[x-dx*5,y-dy*5,x-dx*35,y-dy*35],edge:[x-dy*width/2,y+dx*width/2,x+dy*width/2,y-dx*width/2]});});return a;
}
group('导管',`tube|直玻璃管
tube-bend|90° 弯管
s-bent-tube|S 形管
u-bent-tube|U 形管
rubber-tube|橡胶软管
capillary-tube|毛细管
tube-adapter|变径接头
3-way-crossing|交叉导管
cable|电缆
salt-bridge|盐桥`,tube);

function condenser(id){const a=new Art(110,260);a.p('M45 10 V38 H24 V224 H45 V248 M65 10 V38 H86 V224 H65 V248');
 a.port('inlet',55,10,0,-1,'glass-female',20,{depth:20});a.port('outlet',55,248,0,1,'glass-male',20,{depth:22});
 if(id==='graham'){let d='M55 10 V42';for(let y=44;y<216;y+=28)d+=` C20 ${y} 90 ${y+14} 55 ${y+28}`;a.p(d);}
 else if(id==='allihn'){a.line(55,10,55,40);for(let y=57;y<214;y+=34)a.ellipse(55,y,17,17);a.line(55,210,55,248);}
 else if(id==='fractionating-column'){a.line(45,10,45,248);a.line(65,10,65,248);for(let y=57;y<215;y+=23)a.p(`M45 ${y} l13 7 -13 7 M65 ${y+10} l-13 7 13 7`);}
 else {a.line(45,10,45,248);a.line(65,10,65,248);}
 if(id!=='fractionating-column'){a.p('M24 66 H7 M86 191 H103');a.port('water-out',7,66,-1,0,'coolant',12);a.port('water-in',103,191,1,0,'coolant',12);}return a;}
group('冷凝与蒸馏',`graham|蛇形冷凝管
allihn|球形冷凝管
liebig-condenser|直形冷凝管
fractionating-column|分馏柱`,condenser);

function specialty(id){const a=new Art(140,210);
 if(id==='thiele-tube'){a.p('M48 12 V160 Q48 187 75 187 Q98 187 98 160 V12 M98 80 H124 V149 H98');a.port('mouth',73,12,0,-1,'mouth',50);}
 else if(id==='cold-finger'){a.p('M30 28 H110 M45 28 V166 Q70 193 95 166 V28 M62 10 V160 M78 160 V10');a.port('inlet',62,10,0,-1,'coolant',12);a.port('outlet',78,10,0,-1,'coolant',12);}
 else if(id==='distillation-head'||id==='claisen'){a.p('M56 12 V196 M76 12 V196 M76 66 H124 V92');a.port('mouth',66,12,0,-1,'glass-female',20);a.port('outlet',124,92,0,1,'glass-male',16);a.port('base',66,196,0,1,'glass-male',20);if(id==='claisen'){a.p('M76 122 H112 V12');a.port('mouth-right',112,12,0,-1,'glass-female',18);}}
 else if(id==='dean-stark-trap'){a.p('M45 10 V172 Q45 196 69 196 Q93 196 93 172 V53 H122 V17 M61 10 V170 Q61 180 69 180 Q77 180 77 170 V38 H122');a.ticks(85,90,7,12,12);a.port('inlet',53,10,0,-1,'glass-male',16);a.port('outlet',122,17,0,-1,'glass-female',18);}
 else if(id==='drying-tube'){a.p('M57 10 V65 C13 85 13 129 57 147 V198 M77 10 V65 C121 85 121 129 77 147 V198');for(let y=87;y<131;y+=14)for(let x=50;x<92;x+=14)a.circle(x,y,3,C.metal);a.port('inlet',67,10,0,-1,'tube',20);a.port('outlet',67,198,0,1,'tube',20);}
 return a;}
group('冷凝与蒸馏',`thiele-tube|提勒熔点管
cold-finger|冷指
distillation-head|蒸馏头
claisen|克莱森接头
dean-stark-trap|分水器
drying-tube|干燥管`,specialty);

function funnel(id){const a=new Art(140,210);const sep=['separatory-funnel','dropping-funnel'].includes(id);
 if(sep){a.rect(57,5,26,10,C.metal);a.p('M57 16 V36 C-2 58 30 129 62 137 V198 M83 16 V36 C142 58 110 129 78 137 V198');a.line(46,156,94,156);a.rect(64,150,12,12,C.teal,2);a.port('mouth',70,16,0,-1,'glass-female',26);}
 else if(id==='thistle-tube'){a.p('M34 15 Q34 60 63 63 V198 M106 15 Q106 60 77 63 V198');a.ellipse(70,15,36,8);a.port('mouth',70,15,0,-1,'mouth',72);}
 else {a.p('M12 22 H128 L78 103 V198 M12 22 L62 103 V198');a.port('mouth',70,22,0,-1,'mouth',116);}
 a.port('stem',70,198,0,1,'stem',16,{segment:[70,190,70,115],depth:80});return a;}
group('过滤与分液',`filter-funnel|过滤漏斗
thistle-tube|长颈漏斗
separatory-funnel|分液漏斗
dropping-funnel|滴液漏斗`,funnel);

function measuring(id){const a=new Art(80,260);
 if(['pipette','mohr','burette','eudiometer','thermometer','hydrometer'].includes(id)){
  if(id==='pipette'||id==='hydrometer'){a.p('M35 10 V96 C10 106 10 160 35 170 V244 M45 10 V96 C70 106 70 160 45 170 V244');a.line(32,60,48,60);}
  else if(id==='thermometer'){a.p('M32 208 V22 A8 8 0 0 1 48 22 V208 A17 17 0 1 1 32 208Z',C.glass);a.line(40,79,40,223,{stroke:C.red,'stroke-width':5});a.circle(40,224,10,C.red,{stroke:'none'});a.ticks(59,32,13,12,9);}
  else{a.p('M27 10 V221 L36 235 V248 M53 10 V221 L44 235 V248');a.ticks(47,30,14,12,14);if(id==='burette'){a.line(15,215,65,215);a.rect(34,209,12,12,C.teal);}}
  a.port('stem',40,244,0,1,'probe',id==='thermometer'?16:10,{segment:[40,234,40,170]});a.port('mouth',40,10,0,-1,'tube',18);
 }else if(id==='cylinder'){a.p('M23 12 V226 H57 V12');a.ellipse(40,239,34,9,C.metal);a.ticks(52,33,15,12,18);a.port('mouth',40,12,0,-1,'mouth',34);a.port('base',40,248,0,1,'base',0);
 }else if(id==='dynamometer'){a.rect(19,30,42,160,C.glass,10);a.p('M40 30 V12 Q25 0 25 16');a.p('M40 52 l-10 9 20 12 -20 12 20 12 -20 12 20 12 -10 9 V207 Q60 225 42 237');a.ticks(57,68,8,14,8);a.port('hook',42,237,0,1,'hook',0);
 }else{a.w=110;a.h=210;a.rect(15,12,80,77,C.metal,8);a.rect(24,25,62,36,'#f5faf7',3);a.text(55,49,id==='ph-probe'?'pH 7.0':'24.0',17);a.line(55,89,55,194,{'stroke-width':8});a.port('probe',55,194,0,1,'probe',8,{segment:[55,180,55,113]});}
 return a;
}
group('测量',`cylinder|量筒
pipette|移液管
mohr|刻度吸管
burette|滴定管
eudiometer|量气管
thermometer|温度计
hydrometer|液体比重计
dynamometer|测力计
digital-thermometer|数字温度计
ph-probe|pH 探头`,measuring);

function transfer(id){const a=new Art(100,230);
 if(['pump','suction-pear'].includes(id)){a.p('M44 200 V151 C-13 137 1 46 50 46 C99 46 113 137 56 151 V200Z',C.red);a.rect(44,17,12,30,C.metal,3);if(id==='pump')for(const [x,y] of [[28,84],[74,84],[50,121]])a.circle(x,y,9,C.warm);a.port('mouth',50,200,0,1,'pipette-filler',12);}
 else if(['dropper-pipette','plastic-pipette'].includes(id)){a.p('M39 69 V196 L50 215 61 196 V69');a.p('M38 69 C13 10 87 10 62 69Z',id==='plastic-pipette'?C.glass:C.red);a.port('tip',50,215,0,1,'stem',10,{segment:[50,205,50,95]});}
 else if(id==='pipette-bottle'){a.p('M31 87 Q12 99 12 112 V210 H88 V112 Q88 99 69 87 V69 H31Z',C.warm);a.rect(29,61,42,13,C.metal,2);a.p('M40 61 C20 13 80 13 60 61Z',C.red);a.rect(25,129,50,48,'#f3eee4',3);}
 else if(id==='needle'){a.rect(30,12,40,36,C.teal,4);a.p('M47 49 V208 L53 194 V49');a.port('tip',50,205,0,1,'probe',6,{segment:[50,200,50,60]});}
 else{a.rect(23,58,54,123,'none',3);a.line(50,20,50,110,{'stroke-width':6});a.line(29,18,71,18,{'stroke-width':5});a.line(16,57,84,57);a.line(30,110,70,110,{'stroke-width':6});a.ticks(71,126,4,12,17);a.p('M43 181 V196 H57 V181');if(id==='syringe')a.line(50,196,50,220);a.port('outlet',50,id==='syringe'?220:196,0,1,'luer-male',10);}
 return a;
}
group('移液与注射',`pump|三阀吸球
suction-pear|吸耳球
dropper-pipette|滴管
plastic-pipette|塑料滴管
pipette-bottle|滴瓶
syringe|注射器
gas-syringe|气体注射器
needle|针头`,transfer);

function stopper(id){const a=new Art(100,75);a.boreCount=0;
 if(id==='bung'){a.p('M14 3 H86 L76 65 H24Z',C.warm);a.line(23,13,77,13,{stroke:'#f4d3a9','stroke-width':3});}
 else if(id==='glass-stopper'){a.rect(29,4,42,22,C.glass,5);a.p('M32 27 H68 L61 68 H39Z',C.glass);}
 else{a.rect(13,20,74,36,C.metal,7);a.ellipse(50,20,37,10,C.red);}
 a.port('plug',50,65,0,1,'plug',52,{depth:36});return a;}
group('塞子与密封',`bung|木塞 / 橡胶塞
glass-stopper|玻璃塞
septum-seal|隔膜密封盖`,stopper);

function heat(id){const a=new Art(180,190);
 if(id==='flame'){a.p('M88 10 C105 52 153 95 136 139 C117 190 49 184 43 141 C28 105 64 83 60 57 C68 71 74 74 77 87 C92 63 94 38 88 10Z','#e8b064');a.p('M87 95 C128 141 105 170 81 164 C53 157 64 125 87 95Z','#efda9d',{stroke:'none'});}
 else if(id==='bunsen'){a.rect(71,50,28,96,C.metal,3);a.ellipse(85,160,62,12,C.metal);a.p('M98 130 H153 V141');a.circle(86,120,6);a.p('M84 48 C59 29 88 21 88 5 C113 30 100 43 84 48Z','#e5b366');a.port('gas',153,136,1,0,'tube',11);a.port('surface',85,48,0,-1,'surface',0);}
 else if(id==='oven'){a.rect(15,12,150,163,C.metal,8);a.rect(29,41,95,116,'#f2f7f5',3);a.line(37,91,116,91);a.line(37,126,116,126);a.line(110,61,110,82);a.circle(143,47,9,C.teal);a.rect(134,78,19,27,'#f8f8f2',2);}
 else if(id==='kettle'){a.p('M31 67 Q18 143 43 161 H126 Q147 143 132 67Z',C.metal);a.p('M130 80 C190 30 190 145 137 137');a.p('M28 99 L6 48 L45 71');a.ellipse(81,67,52,10);a.rect(65,43,33,14,C.ink,4);}
 else if(id==='heating-mantle'||id==='sand-bath'){a.p('M18 56 Q90 17 162 56 L147 143 Q90 168 33 143Z',id==='sand-bath'?C.warm:C.metal);a.ellipse(90,56,72,22,'#f6f5ee');a.rect(29,153,122,24,C.metal,3);a.circle(127,165,5,C.teal);a.port('surface',90,56,0,-1,'surface',0);}
 else{a.rect(17,94,146,68,C.metal,8);a.rect(12,76,156,21,'#f1f0ea',5);a.circle(130,133,13,C.teal);a.rect(31,116,53,26,'#f5faf7',3);a.text(57,135,id==='magnetic-stirrer-heater'?'350 rpm':'80 C',11);a.port('surface',90,76,0,-1,'surface',0);}
 return a;
}
group('加热',`bunsen|本生灯
flame|火焰
hot-plate|加热板
magnetic-stirrer-heater|磁力加热搅拌器
sand-bath|砂浴
heating-mantle|电热套
oven|烘箱
kettle|水壶`,heat);

function support(id){const a=new Art(180,200);
 if(id==='retort-stand'){a.rect(15,179,150,13,C.metal,4);a.rect(37,11,7,166,C.metal,2);a.port('rail',40,75,0,-1,'rail',7,{segment:[40,20,40,170]});}
 else if(id==='tripod'){a.ellipse(90,34,60,16);a.p('M35 43 L16 180 M145 43 L164 180 M90 49 V188');a.port('surface',90,34,0,-1,'surface',0);}
 else if(id==='test-tube-rack'){a.rect(13,64,154,14,C.warm,3);a.rect(13,166,154,14,C.warm,3);a.line(23,79,23,165,{'stroke-width':8});a.line(157,79,157,165,{'stroke-width':8});for(let x=40;x<158;x+=33){a.ellipse(x,70,10,4,'#f6efe3');a.port('rack-'+x,x,70,0,-1,'rack',20);}}
 else if(id==='retort-ring'){a.line(16,72,81,72,{'stroke-width':6});a.ellipse(119,72,44,21);a.port('clamp',16,72,-1,0,'clamp',8);a.port('surface',119,72,0,-1,'surface',0);}
 else if(id==='g-clamp'){a.p('M139 39 H51 Q23 39 23 68 V126 Q23 151 51 151 H139 V130 H51 V60 H139Z',C.metal);a.line(127,69,127,172,{'stroke-width':5});a.line(105,174,149,174);a.rect(112,61,30,11,C.metal,2);}
 else if(id==='clamp'||id==='clamp-front'){if(id==='clamp-front'){a.p('M46 67 Q16 102 46 137 M134 67 Q164 102 134 137');a.line(34,100,146,100);a.rect(84,86,12,28,C.teal,2);}else{a.line(12,100,97,100,{'stroke-width':7});a.p('M92 100 L121 67 H155 M92 100 L121 133 H155');a.line(132,72,132,128);a.circle(92,100,7,C.teal);}a.port('clamp',12,100,-1,0,'clamp',8);a.port('grip',146,100,1,0,'grip',25);}
 else if(id==='plastic-joint-clip'){a.p('M38 61 Q90 13 142 61 L128 136 H111 V73 H69 V136 H52Z',C.teal);a.port('clip',90,80,0,-1,'clip',24);}
 else if(['tongs','test-tube-holder','tweezers'].includes(id)){a.p('M30 18 Q80 35 84 62 L48 180 M30 18 Q111 21 104 70 L139 180');a.circle(93,66,5,C.warm);if(id!=='tweezers'){a.p('M48 180 l-17 -18 M139 180 l17 -18');a.port('grip',95,163,0,1,'grip',38);}}
 else if(id==='peg'){a.p('M60 16 L111 25 L88 184 L41 175Z',C.warm);a.line(76,30,62,167);a.circle(76,100,13,C.metal);}
 return a;
}
group('支撑与夹持',`retort-stand|铁架台
tripod|三脚架
test-tube-rack|试管架
retort-ring|铁圈
clamp|万能夹
clamp-front|夹具正视图
g-clamp|G 形夹
plastic-joint-clip|磨口夹
tongs|坩埚钳
test-tube-holder|试管夹
tweezers|镊子
peg|木夹`,support);

function small(id){const a=new Art(180,120);
 if(['stirring-rod','wooden-splint','metal-strip','spatula','pencil','felt-tip-pen','swab','pestle','nail','electrode'].includes(id)){
   const fill=id==='wooden-splint'||id==='pencil'?C.warm:id==='pestle'?'#ecece6':C.metal;
   if(id==='pestle')a.p('M32 47 Q16 58 32 70 L150 88 Q176 85 173 66 Q170 46 150 48Z',fill);
   else{a.rect(17,52,142,id==='metal-strip'?24:12,fill,4);if(id==='spatula')a.ellipse(145,58,27,13,C.metal);if(id==='nail')a.line(21,40,21,76,{'stroke-width':5});if(id==='pencil')a.p('M159 52 l18 6 -18 6Z',C.warm);if(id==='felt-tip-pen')a.rect(18,45,45,26,C.teal,5);if(id==='swab'){a.ellipse(22,58,17,12,'#f7f6ef');a.ellipse(157,58,17,12,'#f7f6ef');}}
   a.port(id==='electrode'?'wire':'probe',170,58,1,0,id==='electrode'?'wire':'probe',12,{segment:[150,58,30,58]});
 }else if(['magnetic-stir-bar','stirbar2'].includes(id)){a.rect(40,43,100,31,'#e9eee9',id==='stirbar2'?15:8);a.line(82,44,82,72);a.port('contents',90,58,0,1,'contents',0);}
 else if(['wire-gauze','bench-mat','sieve','filter-paper'].includes(id)){
   if(id==='filter-paper'){a.circle(90,58,49,'#f5f1e6');a.line(90,9,90,107,{'stroke-dasharray':'4 5'});a.line(41,58,139,58,{'stroke-dasharray':'4 5'});}
   else{a.rect(19,16,142,87,id==='bench-mat'?'#eae7e0':'none',4);if(id!=='bench-mat'){for(let x=28;x<157;x+=12)a.line(x,20,x,98,{'stroke-width':.7});for(let y=25;y<98;y+=12)a.line(23,y,157,y,{'stroke-width':.7});if(id==='wire-gauze')a.ellipse(90,58,35,28,'#e5e8e0',{'fill-opacity':.7});}}a.port('surface',90,16,0,-1,'surface',0);
 }else if(id==='clay-triangle'){a.p('M30 99 L90 13 150 99Z');a.p('M43 79 L72 37 M108 37 L137 79 M58 99 H122','none',{stroke:C.warm,'stroke-width':9});}
 else if(id==='capsule-pill'){a.rect(34,35,113,40,'#f2f2e9',20);a.p('M90 35 H127 A20 20 0 0 1 127 75 H90Z',C.teal);}
 else if(id==='syringe-filter'){a.ellipse(90,60,44,24,C.glass);a.rect(36,54,12,12,C.metal);a.rect(133,54,12,12,C.metal);a.port('inlet',36,60,-1,0,'luer-female',12);a.port('outlet',145,60,1,0,'luer-male',12);}
 else if(id==='spe-cartridge'){a.rect(45,33,83,56,'none');a.rect(47,53,79,21,C.metal);a.line(128,61,162,61);a.port('outlet',162,61,1,0,'luer-male',10);}
 else if(id==='paperclip'){a.p('M53 82 V28 Q53 11 74 11 H106 Q129 11 129 34 V87 Q129 107 107 107 H74 Q69 107 69 87 V35 Q69 29 78 29 H102 Q112 29 112 39 V77 Q112 91 96 91');}
 else if(id==='adhesive-tape'){a.ellipse(76,57,47,37,C.warm);a.ellipse(76,57,25,20,'#fbf8f1');a.p('M111 83 H162 V103 H100Z',C.warm);}
 else if(id==='scissors'){a.ellipse(40,84,21,15);a.ellipse(97,93,21,15);a.p('M54 74 L144 15 L88 77 M85 80 L70 16 L65 78');a.circle(76,72,5,C.teal);}
 else if(id==='corkborer'){for(let i=0;i<4;i++){let x=22+i*39;a.rect(x,30-i*4,14+i*3,66+i*4,C.metal);a.line(x-4,23-i*4,x+20+i*3,23-i*4);}}
 return a;
}
group('实验小工具',`stirring-rod|玻璃搅拌棒
wooden-splint|木条
metal-strip|金属条
spatula|药匙
pencil|铅笔
felt-tip-pen|记号笔
swab|棉签
pestle|研杵
nail|铁钉
electrode|电极
magnetic-stir-bar|磁力搅拌子
stirbar2|椭圆搅拌子
wire-gauze|金属纱网
bench-mat|实验台垫
sieve|筛网
filter-paper|滤纸
clay-triangle|泥三角
capsule-pill|胶囊
syringe-filter|针式过滤器
spe-cartridge|固相萃取柱
paperclip|回形针
adhesive-tape|胶带
scissors|剪刀
corkborer|打孔器`,small);

function ceramic(id){const a=new Art(170,135);
 if(id==='spotting-tile'){a.rect(13,15,143,102,'#eeeee7',8);for(let y=37;y<109;y+=34)for(let x=39;x<146;x+=45)a.ellipse(x,y,14,10,'#d7e1de');}
 else if(id==='crucible-cover'){a.p('M19 96 Q84 27 152 96Z','#eeeee7');a.rect(70,51,28,14,C.metal,4);}
 else if(id==='crucible'){a.p('M30 26 H140 L123 113 Q85 132 47 113Z','#eeeee7');a.ellipse(85,26,55,12);}
 else{a.p('M15 38 Q85 5 155 38 Q141 105 85 119 Q29 105 15 38Z','#eeeee7');a.ellipse(85,38,70,19);}
 a.port('mouth',85,30,0,-1,'mouth',90);return a;
}
group('陶瓷',`mortar|研钵
crucible|坩埚
crucible-cover|坩埚盖
spotting-tile|点滴板`,ceramic);

function instrument(id){const a=new Art(200,170);
 if(id==='balance'){a.rect(18,91,164,62,C.metal,8);a.rect(52,37,96,16,'#f0f1ec',6);a.rect(94,53,12,37,C.metal);a.rect(36,110,83,25,'#eef8ef',3);a.text(77,128,'0.000 g',13);a.circle(151,122,10,C.teal);a.port('surface',100,37,0,-1,'surface',0);}
 else if(id==='fume-hood'){a.rect(15,10,170,149,C.metal,5);a.rect(29,37,142,103,'#f5faf8');a.rect(29,37,142,42,C.glass,0,{'fill-opacity':.65});a.line(29,79,171,79);a.line(35,148,166,148);a.text(100,28,'AIR',10);}
 else if(id==='microscope'){a.rect(25,147,152,12,C.metal,6);a.p('M149 147 V76 Q149 36 109 26 L85 26','none',{'stroke-width':17});a.p('M80 17 L101 28 L70 89 L49 78Z',C.metal);a.line(28,101,137,101,{'stroke-width':7});a.circle(128,71,13,C.teal);a.ellipse(83,132,23,9,C.glass);}
 else if(id==='vacuum-pump'){a.rect(20,66,95,72,C.metal,8);a.circle(66,103,30);for(let x=42;x<94;x+=10)a.line(x,86,x,120);a.rect(115,86,61,52,C.metal,4);a.line(137,86,137,55,{'stroke-width':8});a.port('inlet',137,55,0,-1,'tube',12);a.line(27,146,175,146,{'stroke-width':7});}
 else if(id==='syringe-pump'){a.rect(11,84,178,67,C.metal,5);a.rect(39,54,90,22,'none');a.line(20,65,169,65,{'stroke-width':4});a.rect(149,40,17,47,C.teal,3);a.rect(31,108,75,24,'#eef8ef',3);a.text(68,125,'1.00 mL/h',10);a.port('outlet',20,65,-1,0,'luer-male',8);}
 else if(id==='piston-chamber'){a.rect(25,36,150,92,'none',3);a.rect(90,39,16,86,C.metal);a.line(106,82,192,82,{'stroke-width':8});a.line(10,53,25,53);a.port('inlet',10,53,-1,0,'tube',12);}
 else if(id==='gas-cylinder'){a.w=110;a.h=240;a.p('M23 222 V55 Q23 25 55 25 Q87 25 87 55 V222Z',C.teal);a.rect(45,12,20,14,C.metal);a.line(38,8,73,8);a.rect(32,90,46,55,'#f1f7ef',3);a.text(55,123,'GAS');a.port('outlet',73,14,1,0,'tube',12);}
 else if(id==='desiccator'){a.p('M20 53 H180 L155 144 H45Z',C.glass,{'fill-opacity':.35});a.p('M20 52 Q100 -14 180 52');a.rect(82,6,36,13,C.metal,4);a.line(36,105,164,105);for(let x=50;x<157;x+=19)a.circle(x,99,2,C.ink);}
 else if(id==='table'){a.rect(10,48,180,15,C.warm,2);a.line(25,64,25,158,{'stroke-width':9});a.line(175,64,175,158,{'stroke-width':9});a.line(25,117,175,117,{'stroke-width':5});}
 else if(id==='desk-lamp'){a.ellipse(88,155,62,9,C.metal);a.p('M87 146 L66 100 L124 44','none',{'stroke-width':6});a.circle(66,100,6,C.teal);a.p('M105 23 Q128 9 148 28 L172 68 L107 80Z',C.metal);}
 else if(id==='desk-fan'){a.circle(99,67,57);a.circle(99,67,50);a.circle(99,67,11,C.teal);for(let i=0;i<3;i++)a.p('M103 58 C103 16 147 25 125 52 L109 68Z',C.metal,{transform:`rotate(${120*i} 99 67)`});a.line(99,124,99,146,{'stroke-width':9});a.ellipse(99,156,54,8,C.metal);}
 else if(id==='computer'){a.rect(16,17,168,103,C.metal,6);a.rect(25,27,150,82,'#edf8f5',2);a.line(100,120,100,142,{'stroke-width':10});a.line(65,146,135,146,{'stroke-width':7});a.p('M25 162 H175 L160 150 H40Z',C.metal);}
 else if(id==='camera'||id==='videocamera'){a.rect(16,49,139,83,C.metal,8);a.circle(85,92,32);a.circle(85,92,20,C.glass);a.rect(36,33,42,16,C.metal,3);if(id==='videocamera')a.p('M155 72 L187 57 V124 L155 109Z',C.metal);a.circle(135,64,5,C.red);}
 else if(id==='timer'){a.circle(100,91,58,C.metal);a.circle(100,91,48,'#f6faf7');a.rect(91,12,18,20,C.teal,3);a.line(100,91,100,52);a.line(100,91,126,103);for(let i=0;i<12;i++){let t=i*Math.PI/6;a.line(100+39*Math.sin(t),91-39*Math.cos(t),100+44*Math.sin(t),91-44*Math.cos(t));}}
 return a;
}
group('设备',`balance|电子天平
fume-hood|通风橱
microscope|显微镜
vacuum-pump|真空泵
syringe-pump|注射泵
piston-chamber|活塞气室
gas-cylinder|气瓶
desiccator|干燥器
table|实验桌
desk-lamp|台灯
desk-fan|台式风扇
computer|电脑
camera|相机
videocamera|摄像机
timer|秒表`,instrument);

function electrical(id){const a=new Art(180,150);
 if(['powerpack','digital-ammeter','digital-voltmeter','multimeter'].includes(id)){a.rect(19,15,142,116,C.metal,8);a.rect(31,29,118,35,'#ecf6eb',3);a.text(90,53,id==='digital-ammeter'?'0.00 A':id==='digital-voltmeter'?'0.00 V':id==='multimeter'?'0.000':'12.0 V',17);a.circle(90,91,18,C.teal);a.circle(42,116,5,C.red);a.circle(138,116,5,C.ink);a.port('positive',42,116,0,1,'wire',0);a.port('negative',138,116,0,1,'wire',0);}
 else if(id==='battery'){a.w=90;a.h=170;a.rect(22,24,46,129,C.metal,6);a.rect(35,15,20,9,C.ink,2);a.rect(24,28,42,35,C.warm,3);a.text(45,52,'+',22);a.line(37,131,53,131);a.port('positive',45,15,0,-1,'wire',0);a.port('negative',45,154,0,1,'wire',0);}
 else if(id==='lamp'||id==='led'){if(id==='lamp'){a.p('M67 101 C62 82 43 74 43 51 A47 47 0 0 1 137 51 C137 74 118 82 113 101Z','#f6e7ac');a.p('M72 101 L68 61 L79 73 L90 61 L101 73 L112 61 L108 101');a.rect(67,102,46,29,C.metal,4);a.line(68,111,112,111);a.line(68,120,112,120);}else{a.p('M63 91 V49 A27 27 0 0 1 117 49 V91Z','#aedab2');a.line(59,94,122,94);a.line(73,94,73,142);a.line(107,94,107,142);a.p('M123 41 l16 -16 m-8 0 h8 v8 M132 54 l16 -16 m-8 0 h8 v8');}a.port('positive',73,141,0,1,'wire',0);a.port('negative',107,141,0,1,'wire',0);}
 else if(id==='magnet'){a.p('M30 25 V88 A60 45 0 0 0 150 88 V25 H118 V87 A28 16 0 0 1 62 87 V25Z',C.metal);a.rect(30,25,32,36,C.red);a.rect(118,25,32,36,C.teal);a.text(46,50,'N');a.text(134,50,'S');}
 else if(id==='compass'){a.circle(90,75,60,'#f6faf7');a.p('M90 27 L78 85 L90 75 L102 85Z',C.red);a.p('M90 123 L78 85 L90 75 L102 85Z',C.metal);a.text(90,21,'N',10);}
 else if(id==='solenoid'){a.line(10,76,31,76);let d='M31 76';for(let x=32;x<143;x+=18)d+=` C${x-5} 16 ${x+27} 16 ${x+18} 76 C${x+8} 112 ${x+7} 113 ${x+18} 76`;a.p(d);a.line(158,76,174,76);a.port('a',10,76,-1,0,'wire',0);a.port('b',174,76,1,0,'wire',0);}
 else{a.line(10,75,54,75);a.line(126,75,170,75);if(id==='resistor')a.rect(54,61,72,28,'#f4eee1',2);if(id==='capacitor'){a.line(72,40,72,110);a.line(108,40,108,110);a.line(54,75,72,75);a.line(108,75,126,75);}if(id==='diode'){a.p('M59 48 L112 75 L59 102Z',C.glass);a.line(113,47,113,103);}a.port('a',10,75,-1,0,'wire',0);a.port('b',170,75,1,0,'wire',0);}
 return a;
}
group('电学',`powerpack|直流电源
battery|电池
digital-ammeter|数字电流表
digital-voltmeter|数字电压表
multimeter|万用表
resistor|电阻
lamp|灯泡
diode|二极管
led|发光二极管
capacitor|电容
magnet|磁铁
compass|指南针
solenoid|螺线管`,electrical);

function biology(id){const a=new Art(180,180);
 if(['petri-dish','petri-top','choice-chamber'].includes(id)){if(id==='petri-dish'){a.p('M18 64 V105 A72 25 0 0 0 162 105 V64');a.ellipse(90,64,72,25);a.ellipse(90,71,63,18,'#ecf6ea',{'fill-opacity':.35});}else{a.circle(90,88,72);a.circle(90,88,65);if(id==='choice-chamber'){a.line(90,24,90,152);a.line(26,88,154,88);}else for(const [x,y] of [[65,55],[116,102],[71,114],[111,59]])a.circle(x,y,6,C.leaf);}}
 else if(id==='microscope-slide'||id==='cover-slip'){a.h=100;a.rect(15,22,150,60,C.glass,2,{'fill-opacity':.4});if(id==='microscope-slide')a.rect(30,35,31,34,'#f8f7ed');a.rect(89,35,30,30,'none');}
 else if(id==='quadrat'){a.rect(16,16,148,148,'none');for(let i=1;i<5;i++){a.line(16+i*29.6,16,16+i*29.6,164);a.line(16,16+i*29.6,164,16+i*29.6);}}
 else if(id==='bacteria'){for(const [x,y,angle] of [[48,46,25],[119,53,-36],[70,113,-22],[129,133,47]]){a.rect(x-22,y-11,44,22,'#b2d3b8',11,{transform:`rotate(${angle} ${x} ${y})`});a.p(`M${x+20} ${y} q25 -18 23 15`);a.circle(x-5,y,2,C.ink);}}
 else if(id==='seed'||id==='potato'){a.p(id==='seed'?'M36 139 C1 62 94 15 145 35 C175 91 118 166 36 139Z':'M24 111 C-1 67 48 29 86 35 C150 10 192 90 147 138 C110 168 45 153 24 111Z',id==='seed'?C.warm:'#c8a879');if(id==='seed')a.p('M42 134 Q100 98 133 45');else for(const [x,y] of [[50,73],[90,117],[132,76],[62,130]])a.p(`M${x} ${y} q6 -6 11 0`);}
 else if(id==='agar'){a.p('M20 55 L120 24 L164 69 L67 107Z','#d9b99c');a.p('M20 55 V116 L67 158 V107Z','#c3a087');a.p('M67 107 L164 69 V127 L67 158Z','#e5c8ad');}
 else if(id==='pot'){a.p('M34 69 H146 L130 158 H50Z',C.warm);a.rect(25,53,130,18,C.warm,3);}
 else if(id==='daisy'){for(let i=0;i<10;i++)a.ellipse(90,42,12,27,'#f4f2e7',{transform:`rotate(${i*36} 90 83)`});a.circle(90,83,20,'#dfb159');a.line(90,108,90,170,{stroke:C.leaf,'stroke-width':5});}
 else if(id==='tree'){a.p('M77 82 L70 170 H106 L98 82Z',C.warm);for(const [x,y,r] of [[51,72,33],[122,68,36],[86,34,31],[86,91,37]])a.circle(x,y,r,C.leaf);}
 else if(id==='leaf'){a.p('M28 147 C-5 55 100 13 154 20 C159 101 91 169 28 147Z',C.leaf);a.p('M23 158 Q80 89 144 31 M58 116 L47 80 M83 89 L111 99 M112 62 L110 42');}
 else{a.p('M90 172 Q83 112 94 12','none',{stroke:C.leaf,'stroke-width':4});for(let i=0;i<4;i++){const y=43+i*30;a.p(`M92 ${y+20} Q${i%2?35:148} ${y+9} ${i%2?33:154} ${y-17} Q${i%2?75:116} ${y-19} 92 ${y+20}Z`,C.leaf);}if(id==='plant-shoot')a.p('M90 172 l-22 6 m22 -6 l18 5');if(id==='pond-weed')a.line(14,155,169,155,{stroke:C.teal,'stroke-dasharray':'5 6'});}
 return a;
}
group('生物实验',`petri-dish|培养皿
petri-top|培养皿俯视图
choice-chamber|选择室
microscope-slide|载玻片
cover-slip|盖玻片
quadrat|样方框
bacteria|杆菌示意
seed|种子
potato|马铃薯
agar|琼脂块
pot|花盆
daisy|雏菊
tree|树
leaf|叶片
plant-shoot|植物幼苗
shoot|嫩枝
pond-weed|水草`,biology);

function material(id){const a=new Art(170,130);
 if(id==='drop')a.p('M85 9 C68 45 31 62 42 99 C58 137 114 132 128 99 C141 62 101 43 85 9Z',C.teal);
 else if(id==='ice-cube'){a.p('M22 38 L100 15 L149 56 L69 80Z',C.glass);a.p('M22 38 V96 L69 121 V80Z',C.glass);a.p('M69 80 L149 56 V104 L69 121Z',C.glass);}
 else if(id==='crystals'){for(const [x,y,s] of [[48,65,35],[96,57,39],[126,85,23]])a.p(`M${x-s/2} ${y+s} V${y-s/2} L${x} ${y-s} L${x+s/2} ${y-s/2} V${y+s}Z`,C.glass);}
 else if(['smoke','glass-wool','steel-wool','cotton-wool'].includes(id)){
   if(id==='smoke'){for(let i=0;i<5;i++)a.p(`M${46+i*20} 119 C${i*13} 73 ${149-i*12} 74 ${71+i*10} 10`,'none',{stroke:C.metal,'stroke-width':8,'stroke-opacity':.45});}
   else if(id==='cotton-wool'){a.p('M25 88 C4 50 41 24 57 40 C75 6 113 19 119 39 C167 24 181 93 144 103 C99 126 50 124 25 88Z','#f2f0e6');}
   else for(let i=0;i<17;i++)a.p(`M${20+i*5} ${36+(i*19)%63} C${130-i*3} ${3+i*7} ${13+i*7} ${133-i*3} ${145-i*4} ${27+(i*13)%66}`,'none',{stroke:id==='steel-wool'?'#7f959c':'#b3c7c9','stroke-width':1.3});
 }else if(id==='dirt'||id==='powder'){a.p('M14 111 Q39 102 59 68 Q84 30 107 72 Q133 98 158 111Z',id==='dirt'?'#a69075':'#d9d5c7');for(let i=0;i<30;i++)a.circle(45+(i*37)%85,77+(i*19)%32,1.3,C.ink,{stroke:'none'});}
 else{for(let i=0;i<11;i++){let x=23+(i*41)%125,y=20+(i*23)%91;let r=id==='bubbles'?6+(i*7)%14:7;a.circle(x,y,r,id==='bubbles'?'none':id==='beads'?C.teal:C.warm);}}
 return a;
}
group('物质与填充',`bubbles|气泡
beads|微珠
particles|颗粒
crystals|晶体
drop|液滴
ice-cube|冰块
powder|粉末
dirt|土壤
smoke|烟雾
glass-wool|玻璃棉
steel-wool|钢丝绒
cotton-wool|脱脂棉`,material);

function miscellaneous(id){const a=new Art(180,150);
 if(['ph-paper','litmus-paper'].includes(id)){for(let i=0;i<(id==='ph-paper'?5:2);i++)a.rect(20+i*28,26,23,100,['#c96759','#d4a766','#ced284','#7fba9b','#7c95bc'][i]);}
 else if(id==='ruler'){a.h=75;a.rect(9,15,162,41,C.warm,2);for(let i=0;i<30;i++)a.line(15+i*5,16,15+i*5,i%5?28:39,{'stroke-width':1});}
 else if(id==='tape-measure'){a.rect(23,29,91,83,C.warm,19);a.circle(67,69,25,C.metal);a.rect(113,86,55,18,'#f0e7ca');for(let x=121;x<165;x+=9)a.line(x,87,x,94);}
 else if(id==='protractor'){a.p('M16 121 A74 74 0 0 1 164 121Z',C.glass,{'fill-opacity':.4});a.p('M42 121 A48 48 0 0 1 138 121');for(let i=0;i<=18;i++){let t=i*Math.PI/18;a.line(90-69*Math.cos(t),121-69*Math.sin(t),90-61*Math.cos(t),121-61*Math.sin(t));}}
 else if(id==='tlc-plate'){a.rect(29,12,122,128,'#f3f0e4');a.line(39,120,141,120);for(const [x,y] of [[56,90],[86,51],[119,70]])a.circle(x,y,5,C.teal);}
 else if(id==='tlc-spot'){a.ellipse(90,74,12,8,C.teal);}
 else if(id==='faucet'){a.p('M25 129 V56 H136 Q154 56 154 74 V98 H131 V79 H49 V129Z',C.metal);a.rect(65,42,38,14,C.metal);a.line(85,16,85,42,{'stroke-width':6});a.line(58,17,112,17,{'stroke-width':7});a.port('outlet',142,98,0,1,'tube',23);}
 else if(id==='balloon'){a.ellipse(90,60,55,49,'#c5a4ac');a.p('M82 109 l-6 12 h28 l-7 -12');a.p('M90 122 q-18 12 0 25');}
 else if(id==='soda-can'){a.rect(40,27,100,104,C.metal,7);a.ellipse(90,27,50,12);a.ellipse(90,27,14,5);a.p('M48 62 H132 V96 H48Z',C.teal);}
 else if(id==='goggles'){a.p('M19 49 H78 L87 61 L97 49 H161 L152 105 H105 L89 89 L73 105 H29Z',C.glass,{'fill-opacity':.45});a.line(19,55,7,71);a.line(161,55,174,71);}
 else if(id==='lab-coat'){a.p('M60 19 L25 35 L9 82 L35 91 L46 60 V139 H133 V60 L146 91 L171 82 L154 35 L119 19 L90 42Z','#eef1eb');a.line(90,43,90,139);a.rect(107,83,16,20,'none');}
 else if(id==='glove'||id==='hand'){a.p('M49 137 L30 88 Q20 65 34 65 L53 85 V30 Q53 14 65 26 V65 V16 Q70 2 79 17 V62 V20 Q91 6 94 23 V68 V34 Q106 23 110 41 V90 L133 72 Q153 68 141 91 L116 136Z',id==='glove'?C.glass:'#dbb99b');}
 else if(id==='magnifying-glass'){a.circle(72,61,43,C.glass,{'fill-opacity':.4});a.line(104,92,153,136,{'stroke-width':15});}
 return a;
}
group('测量与防护',`ph-paper|pH 试纸
litmus-paper|石蕊试纸
ruler|直尺
tape-measure|卷尺
protractor|量角器
tlc-plate|薄层色谱板
tlc-spot|色谱斑点
faucet|水龙头
balloon|气球
soda-can|易拉罐
goggles|护目镜
lab-coat|实验服
glove|手套
hand|手部示意
magnifying-glass|放大镜`,miscellaneous);

function optics(id){const a=new Art(190,160);
 if(id==='prism'){a.p('M58 122 L100 27 L151 122Z',C.glass,{'fill-opacity':.35});a.p('M12 82 H75 M127 80 L183 62','none',{stroke:C.warm});for(let i=0;i<4;i++)a.line(128,83,183,80+i*12,{stroke:[C.red,C.warm,C.leaf,C.teal][i],'stroke-width':1.6});}
 else if(id==='lens'){a.p('M95 15 Q43 80 95 145 Q147 80 95 15Z',C.glass,{'fill-opacity':.45});a.line(12,80,178,80,{'stroke-dasharray':'6 6','stroke-width':1});}
 else if(id==='glass-block'){a.p('M26 41 L144 20 L170 118 L52 140Z',C.glass,{'fill-opacity':.4});}
 else if(id==='mirror'||id==='curved-mirror'){a.p(id==='mirror'?'M98 15 V145':'M121 15 Q59 80 121 145','none',{'stroke-width':5});for(let y=25;y<145;y+=15)a.line(id==='mirror'?101:110,y,id==='mirror'?112:122,y-9);}
 else if(id==='raybox'){a.rect(18,42,102,85,C.metal,5);for(let y=61;y<119;y+=22){a.line(117,y,173,y,{stroke:C.warm});a.rect(110,y-4,9,8,C.ink);}}
 else if(id==='ray'){a.line(11,86,177,50,{stroke:C.warm,'stroke-width':3});a.p('M159 43 L177 50 L164 65');}
 else if(id==='sun'){a.circle(95,80,35,'#edc781');for(let i=0;i<12;i++){let t=i*Math.PI/6;a.line(95+45*Math.cos(t),80+45*Math.sin(t),95+65*Math.cos(t),80+65*Math.sin(t),{stroke:C.warm,'stroke-width':3});}}
 return a;
}
group('光学',`prism|三棱镜
lens|凸透镜
glass-block|玻璃砖
mirror|平面镜
curved-mirror|凹面镜
raybox|光源盒
ray|光线
sun|太阳`,optics);

function mechanics(id){const a=new Art(190,165);
 if(id==='trolley'){a.rect(20,65,147,55,C.metal,6);a.circle(51,130,15,C.ink);a.circle(140,130,15,C.ink);a.port('hook',172,90,1,0,'hanger',0);}
 else if(id==='ramp'){a.p('M12 139 L176 34 V139Z',C.metal);a.line(12,145,179,145);}
 else if(id==='light-gate'){a.p('M36 137 V30 H154 V137 H125 V58 H65 V137Z',C.metal);a.line(66,99,123,99,{stroke:C.red,'stroke-dasharray':'4 4'});}
 else if(id==='pulley'){a.circle(95,80,48,C.metal);a.circle(95,80,36);a.circle(95,80,7,C.teal);a.p('M47 148 V80 A48 48 0 0 1 143 80 V148');a.line(95,31,95,12);a.port('hanger',95,12,0,-1,'hanger',0);}
 else if(id==='spring'){let d='M95 9 V25';for(let y=25;y<129;y+=13)d+=` l-25 6 50 6 -25 1`;d+=' V151';a.p(d);a.port('top',95,9,0,-1,'hanger',0);a.port('bottom',95,151,0,1,'hook',0);}
 else{a.rect(52,88,87,26,C.metal,5);a.rect(52,114,87,26,C.metal,5);a.line(96,45,96,141,{'stroke-width':5});a.p('M96 46 V19 Q77 7 77 25');a.line(96,101,138,101);a.port('hanger',77,25,0,-1,'hanger',0);}
 return a;
}
group('力学',`trolley|小车
ramp|斜面
light-gate|光电门
pulley|滑轮
spring|弹簧
slotted-weight|钩码`,mechanics);

function geometry(id){const a=new Art(180,140);
 if(id==='rectangle')a.rect(20,25,140,90,'none',3);
 if(id==='ellipse')a.ellipse(90,70,70,47);
 if(id==='triangle')a.p('M90 15 L166 124 H14Z');
 if(id==='line'||id==='arrow'){a.line(15,70,164,70);if(id==='arrow')a.p('M144 53 L165 70 L144 87');}
 if(id==='curve'||id==='curved-arrow'){a.p('M17 115 C20 -9 123 155 159 26');if(id==='curved-arrow')a.p('M140 30 L160 25 L168 44');}
 if(id==='stir-arrow'){a.p('M133 109 A58 48 0 1 1 151 54 M135 45 L153 55 L162 36');}
 if(id==='cross'){a.line(35,70,145,70);a.line(90,15,90,125);}
 if(id==='cuboid'){a.p('M23 40 L116 16 L158 48 L64 77Z');a.p('M23 40 V99 L64 127 V77 M64 127 L158 98 V48');}
 if(id==='isocube'){a.p('M90 10 L151 44 L90 79 L29 44Z');a.p('M29 44 V106 L90 139 L151 106 V44 M90 79 V139');}
 if(id==='3dcylinder'){a.p('M32 35 V109 A58 17 0 0 0 148 109 V35');a.ellipse(90,35,58,17);}
 if(id==='label'){a.p('M15 29 H133 L167 70 L133 111 H15Z','#f4eee0');a.circle(137,70,5);a.line(29,51,113,51);a.line(29,70,100,70);a.line(29,89,113,89);}
 if(id==='eye'){a.p('M15 70 Q90 -6 165 70 Q90 146 15 70Z');a.circle(90,70,27,C.glass);a.circle(90,70,11,C.ink);}
 if(id==='ghs-hazard'){a.p('M90 9 L151 70 L90 131 L29 70Z','#faf9f4',{stroke:C.red,'stroke-width':5});a.line(90,40,90,78,{'stroke-width':8});a.circle(90,96,4,C.ink);}
 return a;
}
group('图形与标记',`rectangle|矩形框
ellipse|椭圆
triangle|三角形
line|直线
arrow|箭头
curve|曲线
curved-arrow|曲线箭头
stir-arrow|旋转箭头
cross|十字
cuboid|长方体
isocube|立方体
3dcylinder|圆柱体
label|标签
eye|眼睛
ghs-hazard|危险提示菱形`,geometry);

const ids=new Set();for(const e of entries){if(ids.has(e.id))throw Error('Duplicate '+e.id);ids.add(e.id);}
const round=entries.find(e=>e.id==='studio:round-bottom-flask');
round.variants=[{...round}];
for(let n=2;n<=4;n++){
 const a=new Art();a.neckCount=n;
 a.p('M23 81 C-8 116 16 183 80 183 C144 183 168 116 137 81');
 let previous=23;
 for(let i=0;i<n;i++){
   const cx=80+(i-(n-1)/2)*30;
   a.p(`M${previous} 81 H${cx-9} V18 M${cx+9} 18 V81`);
   a.port(i===0?'mouth':'mouth-'+(i+1),cx,18,0,-1,'glass-female',18,{depth:22,target:[cx,143]});
   previous=cx+9;
 }
 a.line(previous,81,137,81);
 const svg=a.svg(),file=`round-bottom-flask-necks-${n}.svg`;
 fs.writeFileSync(path.join(target,file),svg);
 round.variants.push({svg:file,sha256:crypto.createHash('sha256').update(svg).digest('hex'),width:a.w,height:a.h,ports:a.ports,neckCount:n,boreCount:-1});
}
const manifest={format:'chem-studio-art',version:1,license:'WTFPL-2.0',author:'Chem Studio contributors',method:'Programmatic schematic drawing from authored geometric primitives; no raster tracing.',assets:entries};
fs.writeFileSync(path.join(target,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(`Generated ${entries.length} schematic SVG assets in ${target}`);
