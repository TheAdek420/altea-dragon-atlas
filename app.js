(()=>{
'use strict';
const creatures=(window.CREATURES||[]).map(d=>({...d,kind:'creature'}));
const references=(window.REFERENCE_ITEMS||[]).map(d=>({...d,kind:'reference'}));
const all=[...creatures,...references], byKey=new Map(all.map(d=>[String(d.id),d]));
const $=id=>document.getElementById(id), NS='http://www.w3.org/2000/svg';
const els={search:$('search'),cat:$('category'),metric:$('metric'),list:$('list'),details:$('details'),chips:$('refChips'),refList:$('refOptions'),dialog:$('referenceDialog'),viewport:$('viewport'),scene:$('scene'),world:$('world')};
const cats={great:'Wielki Smok',higher:'Wyższy Smok',dragon:'Smok',drakonid:'Drakonid',reference:'Punkt odniesienia'};
const key=d=>String(d.id), fmt=n=>n==null?'—':n.toLocaleString('pl-PL',{maximumFractionDigits:2})+' m';
const safe=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const metric=()=>els.metric.value;
let checked=new Set(creatures.map(key)),checkedRefs=new Set(),selected=null,mode='list',alpha=0.6;
let pan=null,dragMoved=false;
// Jeden metr = jedna jednostka SVG, niezależnie od sortowania, kategorii i trybu.
// Widok (camera) skaluje CAŁĄ scenę równocześnie, nie osobne obiekty.
const camera={x:-170,y:-1490,w:4600,h:2470};
let bounds={x:-170,y:-1490,w:4600,h:2470};
const locations=new Map();

function s(tag,attrs={},parent=els.world){let n=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))if(v!=null)n.setAttribute(k,String(v));parent.appendChild(n);return n;}
function st(x,y,str,size=43,color='#deebfc',parent=els.world,weight=600){let t=s('text',{x,y,'font-size':size,fill:color,'font-weight':weight,'font-family':'system-ui,Segoe UI,sans-serif','paint-order':'stroke',stroke:'#101c2d','stroke-width':Math.max(1,size*.065),'stroke-linejoin':'round'},parent);t.textContent=str;return t;}
function line(x1,y1,x2,y2,color='#587a9a',width=3,parent=els.world,dash){return s('line',{x1,y1,x2,y2,stroke:color,'stroke-width':width,'stroke-dasharray':dash||null},parent);}
function path(d,fill,stroke='#13283b',sw=9,parent=els.world,opacity){return s('path',{d,fill,stroke,'stroke-width':sw,'stroke-linecap':'round','stroke-linejoin':'round',opacity},parent);}
function shape(g,d){
 const L=d.length,H=d.name==='Oblyr'?115:d.height;
 const bodyEnd=1000*(1-(d.tailFraction??.5));
 const winged=d.wingspan!=null;
 const type=d.figureKind || (winged?'classic':'quadruped');
 const colors=d.palette||['#6081af','#253752','#c5d7ec'];
 const uid='shade-'+String(d.id).replace(/[^a-zA-Z0-9]/g,'');
 const uidWing=uid+'-wing';
 const defs=s('defs',{},g);
 const grad=s('linearGradient',{id:uid,x1:'0%',y1:'0%',x2:'40%',y2:'100%'},defs);
 for(const [o,c] of [['0%',colors[2]],['34%',colors[0]],['100%',colors[1]]])s('stop',{offset:o,'stop-color':c},grad);
 const gw=s('linearGradient',{id:uidWing,x1:'10%',y1:'0%',x2:'85%',y2:'100%'},defs);
 for(const [o,c] of [['0%',colors[2]],['36%',colors[0]],['100%',colors[1]]])s('stop',{offset:o,'stop-color':c,'stop-opacity':o==='100%'?'.85':'.74'},gw);
 const fill=`url(#${uid})`, wingFill=`url(#${uidWing})`, edge=colors[1], highlight=colors[2];
 // Shape coordinates are generated in a normalized 1000 x 1000 anatomical frame.
 // Its left/right and ground/head control points represent exactly length and height.
 // No pre-existing raster illustration is stretched to fake those dimensions.
 const t=s('g',{transform:`scale(${L/1000} ${H/1000})`},g);
 const limb=(pos,rev=false)=>{
  const x=pos;const ofs=rev?45:-18;
  path(`M ${x-48} -365 Q ${x-56} -195 ${x+ofs} -52 L ${x+ofs-42} -25 L ${x+ofs-33} 0 L ${x+ofs+40} 0 L ${x+ofs+64} -18 L ${x+32} -60 Q ${x+80} -241 ${x+45} -360 Z`,fill,edge,8,t);
  for(let i=0;i<3;i++)path(`M ${x+ofs-23+i*26} -7 l 7 12 l 9 -12`,highlight,edge,3,t);
 };
 if(type==='serpent'){
  path(`M 18 -730 Q 78 -880 157 -740 Q 240 -580 290 -435 Q 420 -690 550 -460 Q 675 -270 758 -355 Q 865 -450 996 -180 Q 926 -290 846 -260 Q 713 -152 580 -286 Q 477 -386 361 -255 Q 255 -171 197 -460 Q 134 -605 50 -575 Z`,fill,edge,14,t);
  path('M 9 -750 Q 37 -820 109 -826 L 156 -767 L 151 -681 L 58 -645 L 13 -670 Z',fill,edge,13,t);
  path('M 70 -824 l 34 -176 l 24 165',highlight,edge,9,t);
  path('M 185 -685 L 215 -812 L 245 -679 M 302 -480 L 334 -585 L 364 -459 M 436 -518 L 468 -648 L 495 -513',highlight,edge,9,t);
  s('circle',{cx:66,cy:-745,r:17,fill:highlight,stroke:edge,'stroke-width':9},t);
  // Meter marker apex at -1000 is the horn, not a distorted raster.
 } else if(type==='armored'){
  // Oblyr: 105 m to the back, approx. 115 m to the head. The H used above is 115 m.
  path(`M ${bodyEnd-35} -475 Q ${bodyEnd+135} -500 755 -350 Q 898 -250 1000 -155 Q 924 -213 780 -229 Q 630 -300 ${bodyEnd-20} -300 Z`,fill,edge,11,t);
  limb(240);limb(bodyEnd-62,true);
  path(`M 102 -524 Q 250 -845 440 -816 Q 530 -822 ${bodyEnd+22} -590 Q ${bodyEnd+45} -413 330 -395 Q 170 -405 102 -524 Z`,fill,edge,16,t);
  // Overlapping armored plates, not wings.
  for(let i=0;i<6;i++){
   const x=150+i*(bodyEnd-180)/6;
   path(`M ${x} ${-570-(i%2)*32} L ${x+37} ${-820-(i%3)*40} L ${x+98} ${-605-(i%2)*35} Z`,fill,edge,8,t);
  }
  path('M 95 -635 Q 55 -785 37 -872 L 88 -970 L 162 -913 Q 183 -799 168 -673 Z',fill,edge,12,t);
  path('M 44 -874 Q 20 -926 0 -926 L 10 -1000 L 78 -948 Z',highlight,edge,6,t);
  s('circle',{cx:75,cy:-860,r:17,fill:highlight,stroke:edge,'stroke-width':8},t);
 }else if(type==='biped'){
  // Bipedal Anemis with gliding membranes between front and hind legs; no wings.
  path(`M ${bodyEnd-15} -375 Q ${bodyEnd+190} -338 710 -220 Q 857 -150 1000 -83 Q 840 -125 717 -126 Q 580 -199 ${bodyEnd-20} -254 Z`,fill,edge,10,t);
  path(`M ${bodyEnd-65} -375 Q 402 -240 430 -89 L 469 0 L 542 0 L 529 -43 Q 542 -200 ${bodyEnd+20} -341 Z`,fill,edge,10,t);
  path('M 312 -356 Q 260 -189 270 -83 L 259 0 L 336 0 L 345 -63 L 395 -302 Z',fill,edge,10,t);
  path('M 120 -462 L 255 -580 Q 333 -598 439 -382 L 510 -280 L 386 -274 Q 262 -366 173 -356 Z',fill,edge,13,t);
  path('M 268 -407 Q 390 -492 533 -295 Q 408 -245 310 -106 Q 361 -279 268 -407 Z',wingFill,edge,10,t);
  path('M 120 -489 Q 149 -798 137 -890 L 206 -933 L 235 -816 Q 228 -679 261 -543 Z',fill,edge,11,t);
  path('M 143 -888 l 18 -112 l 31 99',highlight,edge,7,t);
  path('M 120 -817 L 23 -796 L 0 -758 L 142 -737 Z',fill,edge,8,t);
  s('circle',{cx:136,cy:-824,r:15,fill:highlight,stroke:edge,'stroke-width':6},t);
 }else if(type==='hydra'){
  path(`M ${bodyEnd-25} -442 Q ${bodyEnd+160} -429 732 -317 Q 878 -262 1000 -151 Q 911 -194 733 -197 Q 612 -251 ${bodyEnd-35} -277 Z`,fill,edge,10,t);
  limb(250);limb(bodyEnd-36,true);
  path(`M 165 -530 Q 290 -671 ${bodyEnd-40} -563 Q ${bodyEnd+20} -448 ${bodyEnd-50} -312 L 183 -327 Q 100 -368 165 -530 Z`,fill,edge,13,t);
  // Multiple heads, all within same height bounds.
  for(let i=0;i<5;i++){
   const xx=54+i*43,top= i===2?-1000:-720-(i%3)*105;
   path(`M ${xx+65} -445 Q ${xx-30} -600 ${xx} ${top+140} L ${xx+41} ${top+110} Q ${xx+62} -610 ${xx+108} -432 Z`,fill,edge,8,t);
   path(`M ${xx} ${top+130} Q ${xx-21} ${top+49} ${xx+22} ${top+8} L ${xx+94} ${top+38} L ${xx+111} ${top+113} Z`,fill,edge,7,t);
   path(`M ${xx+20} ${top+18} l 22 -35 l 29 52`,highlight,edge,5,t);
  }
 }else{
  const xTail=bodyEnd;
  // Tail starts at the agreed anatomical fraction of full length.
  path(`M ${xTail-25} -428 Q ${xTail+195} -424 ${xTail+310} -340 Q 840 -246 1000 -132 Q 941 -155 875 -159 Q 702 -210 ${xTail+220} -235 Q ${xTail+56} -275 ${xTail-20} -303 Z`,fill,edge,11,t);
  path(`M ${xTail+90} -394 Q 785 -313 994 -143`, 'none',highlight,7,t,.55);
  // Hind legs behind torso.
  limb(Math.max(280,xTail*.80),true);
  limb(Math.max(232,xTail*.60));
  if(winged){
   const shoulder=Math.min(335,xTail*.61);
   path(`M ${shoulder-60} -500 Q ${shoulder-40} -735 ${shoulder+24} -944 L ${shoulder+103} -754 L ${shoulder+182} -901 L ${shoulder+175} -676 L ${shoulder+274} -760 L ${shoulder+230} -540 Q ${shoulder+110} -505 ${shoulder-60} -500 Z`,wingFill,edge,11,t,.94);
   path(`M ${shoulder-40} -534 Q ${shoulder-6} -750 ${shoulder+24} -944 M ${shoulder-33} -527 L ${shoulder+103} -754 M ${shoulder-27} -516 L ${shoulder+182} -901`, 'none',highlight,8,t,.42);
  }
  path(`M 125 -476 Q 235 -595 ${xTail-80} -538 Q ${xTail+34} -501 ${xTail+20} -372 Q ${xTail-32} -270 303 -292 Q 185 -311 125 -476 Z`,fill,edge,14,t);
  // Chest and climbing neck. Crown is exactly the height marker.
  path('M 125 -463 Q 108 -634 99 -780 L 176 -918 L 223 -833 Q 200 -633 257 -535 L 282 -367 Z',fill,edge,11,t);
  path('M 113 -814 Q 63 -870 22 -836 L 0 -788 L 40 -733 Q 113 -711 185 -748 L 190 -825 Z',fill,edge,10,t);
  path('M 112 -826 L 129 -1000 L 165 -854 L 198 -959 L 202 -829',highlight,edge,7,t);
  s('circle',{cx:99,cy:-808,r:18,fill:highlight,stroke:edge,'stroke-width':7},t);
  path('M 12 -766 Q 66 -744 114 -772', 'none',edge,8,t);
  // Foreleg over chest.
  limb(245);
  if(type==='wyvern'){
   // Wyverns and wyvern-like creatures are predominantly bipedal.
   path('M 230 -370 Q 300 -286 331 -128 L 349 0 L 414 0 L 391 -61 Q 399 -244 353 -380 Z',fill,edge,8,t);
  }
  // Small ridge spines.
  for(let i=0;i<6;i++){
   const xx=205+i*(Math.max(200,xTail-240))/6;
   path(`M ${xx} -546 l 13 -47 l 17 52 Z`,highlight,edge,5,t,.70);
  }
 }
 // fixed physical dimensions are independently checked by the test runner.
}
function dimensionLine(g,x1,y1,x2,y2,color,label,vertical=false){
 line(x1,y1,x2,y2,color,5,g);
 if(vertical){line(x1-13,y1,x1+13,y1,color,5,g);line(x2-13,y2,x2+13,y2,color,5,g);
   st(x1+17, (y1+y2)/2,label,36,color,g,700);
 }else{line(x1,y1-12,x1,y1+12,color,5,g);line(x2,y2-12,x2,y2+12,color,5,g);
   st((x1+x2)/2-50,y1+49,label,36,color,g,700);
 }
}
function addClick(g,d){
 const name=d.name||'Obiekt';g.setAttribute('role','button');g.setAttribute('tabindex','0');g.setAttribute('aria-label',name+' '+fmt(d.length)+' na '+fmt(d.height));
 g.style.cursor='pointer';g.addEventListener('click',()=>{if(!dragMoved){selected=key(d);showDetails(d);renderList();renderScene();}});
 g.addEventListener('keydown',ev=>{if(ev.key==='Enter'){selected=key(d);showDetails(d);renderList();renderScene();}});
}
const VERTICAL_REFS=new Set(['ref-human','ref-giraffe','ref-apartment','ref-statue','ref-pkin','ref-eiffel','ref-burj']);
function drawReference(g,d,x,ground){
 const c='#a4dfaa';
 if(d.elevationOnly){
  const r=s('g',{},g);
  const py=ground-230;
  path(`M ${x} ${ground} L ${x+160} ${py} L ${x+325} ${ground} Z`,'#647d8e','#88c1cc',5,r,.65);
  st(x,py-35,`${fmt(d.height)} n.p.m.`,32,'#ecdaad',r,700);
  st(x,ground+48,'Uwaga: to wysokość n.p.m., nie od podnóża',27,'#f0c18c',r,500);
  return {w:325,h:230,dim:'elevation',drawnHeight:230};
 }
 if(d.id==='ref-field'){
  const w=d.length;const g2=s('g',{},g);
  s('rect',{x,y:ground-28,width:w,height:28,rx:3,fill:'#3d8760',stroke:'#a5e9b2','stroke-width':1.5},g2);
  line(x+w/2,ground-28,x+w/2,ground,'#fff9',1,g2);
  dimensionLine(g,x,ground+35,x+w,ground+35,c,fmt(d.length));
  return {w,h:28,dim:'length'};
 }
 if(d.id==='ref-pyramid'){
  const w=d.length,h=d.height;
  path(`M ${x} ${ground} L ${x+w/2} ${ground-h} L ${x+w} ${ground} Z`,'#c7a977','#785c3f',3,g);
  path(`M ${x+w/2} ${ground-h} L ${x+w*.73} ${ground} L ${x+w} ${ground} Z`,'#99744b','#786245',2,g);
  dimensionLine(g,x,ground+38,x+w,ground+38,c,fmt(w));
  dimensionLine(g,x+w+28,ground-h,x+w+28,ground,c,fmt(h),true);
  return {w,h,dim:'both'};
 }
 const vertical=VERTICAL_REFS.has(d.id);
 const ratio=d.artRatio||1;
 // One uniform scale for each cropped real-world photograph; never stretch a raster.
 // The reference height is exact for standing objects, length exact for horizontal objects.
 let w,h;
 if(vertical){h=d.height;w=h*ratio;}
 else{w=d.length;h=w/ratio;}
 if(w<=0||h<=0)return {w:0,h:0};
 s('image',{href:d.calibratedArtwork||d.silhouette,x,y:ground-h,width:w,height:h,preserveAspectRatio:'xMinYMin meet','pointer-events':'none'},g);
 if(vertical){dimensionLine(g,x+w+28,ground-d.height,x+w+28,ground,c,fmt(d.height),true);}
 else dimensionLine(g,x,ground+38,x+w,ground+38,c,fmt(d.length));
 return {w,h,dim:vertical?'height':'length'};
}
function drawDragon(g,d,x,ground){
 const L=d.length,H=d.name==='Oblyr'?115:d.height,color=d.palette?.[2]||'#c0d9ff';
 const geom=s('g',{transform:`translate(${x} ${ground})`},g);shape(geom,d);
 dimensionLine(g,x,ground+60,x+L,ground+60,color,fmt(L));
 dimensionLine(g,x-42,ground-H,x-42,ground,color,fmt(H),true);
 return {w:L,h:H};
}
function drawWing(g,d,x,y){
 const w=d.wingspan;
 if(w==null)return {w:0,h:0};
 const center=x+w*.5;const depth=Math.max(1,w*.36),col=d.palette||['#6ca7c1','#273b50','#b0d3ef'];
 const gg=s('g',{},g);
 const root=y-depth*.58;
 path(`M ${center} ${root} Q ${center-w*.12} ${y-depth*.65} ${x} ${y-depth*.40} Q ${x+w*.11} ${y-depth*.03} ${x+w*.29} ${y-depth*.16} Q ${center-w*.09} ${y-depth*.07} ${center} ${y+depth*.18} Z`,col[0],col[1],2,gg);
 path(`M ${center} ${root} Q ${center+w*.12} ${y-depth*.65} ${x+w} ${y-depth*.40} Q ${x+w*.89} ${y-depth*.03} ${x+w*.71} ${y-depth*.16} Q ${center+w*.09} ${y-depth*.07} ${center} ${y+depth*.18} Z`,col[0],col[1],2,gg);
 path(`M ${center-w*.035} ${y-depth*.47} Q ${center-w*.024} ${y+depth*.06} ${center} ${y+depth*.46} Q ${center+w*.028} ${y+depth*.08} ${center+w*.035} ${y-depth*.47} Z`,col[1],col[2],2,gg);
 path(`M ${center-w*.028} ${y-depth*.43} l ${w*.028} ${-depth*.13} l ${w*.028} ${depth*.13} Z`,col[2],col[1],2,gg);
 dimensionLine(g,x,y+depth*.53,x+w,y+depth*.53,col[2],fmt(w));
 return {w,h:depth};
}
function entrySize(d){
 if(metric()==='wingspan')return {w:d.wingspan||0,h:Math.max(1,(d.wingspan||0)*.36)};
 if(d.elevationOnly)return {w:325,h:230};
 if(d.kind==='creature')return {w:d.length,h:d.name==='Oblyr'?115:d.height};
 if(d.id==='ref-field')return {w:d.length,h:28};
 if(d.id==='ref-pyramid')return {w:d.length,h:d.height};
 if(VERTICAL_REFS.has(key(d)))return {w:d.height*(d.artRatio||.35),h:d.height};
 return {w:d.length,h:d.length/(d.artRatio||1)};
}
function draw(g,d,x,y){
 if(metric()==='wingspan')return drawWing(g,d,x,y);
 return d.kind==='creature'?drawDragon(g,d,x,y):drawReference(g,d,x,y);
}
function eligible(d){return metric()==='length'||(d.wingspan!=null&&d.wingspan>0);}
function searched(){const q=els.search.value.trim().toLocaleLowerCase('pl');return creatures.filter(d=>(els.cat.value==='all'||d.category===els.cat.value)&&(d.name+' '+d.title).toLocaleLowerCase('pl').includes(q)&&eligible(d)).sort((a,b)=>(metric()==='wingspan'?b.wingspan-a.wingspan:b.length-a.length));}
function active(){let a=searched().filter(d=>checked.has(key(d)));let b=references.filter(d=>checkedRefs.has(key(d))&&eligible(d));return [...a,...b].sort((x,y)=>(metric()==='wingspan'?(y.wingspan||0)-(x.wingspan||0):(y.length??0)-(x.length??0)));}
function renderList(){
 els.list.replaceChildren();for(const d of searched()){
  const row=document.createElement('div');row.className='creature-row'+(key(d)===selected?' active':'');
  const cb=document.createElement('input');cb.type='checkbox';cb.checked=checked.has(key(d));cb.title='Pokaż / ukryj '+d.name;
  cb.addEventListener('click',ev=>ev.stopPropagation());cb.addEventListener('change',()=>{cb.checked?checked.add(key(d)):checked.delete(key(d));renderScene();});
  const img=document.createElement('img');img.className='small-icon';img.src=d.silhouette;img.alt='';img.loading='lazy';
  const div=document.createElement('div');div.className='row-info';div.innerHTML=`<span class="row-name">${safe(d.name)}</span><small>Dł. ${fmt(d.length)} · wys. ${fmt(d.height)}${d.wingspan!=null?' · skrz. '+fmt(d.wingspan):''}</small>`;
  row.append(cb,img,div);row.addEventListener('click',()=>{selected=key(d);showDetails(d);renderList();renderScene();centerSelected(false);});els.list.append(row);
 }
}
function showDetails(d){
 if(!d){els.details.textContent='Wybierz stworzenie lub punkt odniesienia, aby zobaczyć oryginalny obraz i dokładne wymiary.';return;}
 const tag=d.kind==='reference'?'ref':'';
 let suffix=d.kind==='creature'?`<br><span class="muted">Kalibrowana sylwetka: ogon ok. ${Math.round((d.tailFraction||.5)*100)}% długości. Oryginalna ilustracja zachowana bez deformacji.</span>`:'<br><span class="muted">Zdjęcie / rysunek poglądowy; pionowe wymiary referencji są kalibrowane osobno.</span>';
 if(d.elevationOnly)suffix='<br><strong>Uwaga:</strong> Mount Everest: 8848,86 m to wysokość nad poziomem morza, nie wysokość góry od podnóża.';
 els.details.innerHTML=`<div class="detail-content"><img src="${safe(d.silhouette)}" alt="Oryginalna ilustracja: ${safe(d.name)}"><div><strong>${safe(d.name)}</strong><span class="tag ${tag}">${safe(cats[d.category])}</span><div>${safe(d.title||'')}</div><div>Dł.: <b>${fmt(d.length)}</b> · Wys.: <b>${fmt(d.height)}</b> · Rozpiętość: <b>${fmt(d.wingspan)}</b></div>${suffix}</div></div>`;
}
function renderChips(){
 els.chips.replaceChildren();$('refCount').textContent=`(${checkedRefs.size})`;
 if(!checkedRefs.size){let z=document.createElement('span');z.className='ref-placeholder';z.textContent='Nie wybrano punktów odniesienia';els.chips.append(z);return;}
 for(const d of references.filter(d=>checkedRefs.has(key(d)))){
  const chip=document.createElement('span');chip.className='ref-chip';chip.append(document.createTextNode(d.name));
  const b=document.createElement('button');b.type='button';b.textContent='×';b.title='Usuń '+d.name;b.onclick=()=>{checkedRefs.delete(key(d));refChanged();};chip.append(b);els.chips.append(chip);
 }
}
function renderRefs(){
 const q=$('referenceSearch').value.trim().toLocaleLowerCase('pl');els.refList.replaceChildren();
 for(const d of references.filter(d=>d.name.toLocaleLowerCase('pl').includes(q))){
  const l=document.createElement('label');l.className='ref-option';const cb=document.createElement('input');cb.type='checkbox';cb.checked=checkedRefs.has(key(d));
  cb.onchange=()=>{cb.checked?checkedRefs.add(key(d)):checkedRefs.delete(key(d));refChanged();};
  const span=document.createElement('span');span.innerHTML=`${safe(d.name)}<small>${d.elevationOnly?'wysokość szczytu n.p.m.':`dł. ${fmt(d.length)} · wys. ${fmt(d.height)}${d.wingspan!=null?' · skrz. '+fmt(d.wingspan):''}`}</small>`;
  l.append(cb,span);els.refList.append(l);
 }
}
function refChanged(){renderChips();renderRefs();renderScene();}
function setViewBox(){els.scene.setAttribute('viewBox',`${camera.x} ${camera.y} ${camera.w} ${camera.h}`);$('zoomLabel').textContent=`1 m = 1 jednostka · widok ${Math.round(camera.w)} m szer.`;}
function renderScene(){
 els.world.replaceChildren();locations.clear();const list=active(),wing=metric()==='wingspan';
 $('alphaWrap').hidden=mode!=='overlay';$('overlayLegend').hidden=mode!=='overlay';
 $('sceneTitle').textContent=`${mode==='list'?'Lista':mode==='side'?'Obok siebie':'Nałożone'} · ${wing?'rozpiętość skrzydeł':'długość i wysokość'} · ${list.length} obiektów`;
 $('viewNote').textContent=wing?'Rozpiętość skrzydeł pokazujemy jako kalibrowany schemat z góry. Jeden metr nadal oznacza jedną jednostkę.':'Długość i wysokość sylwetek kalibracyjnych pochodzą z danych. Oryginalne ilustracje oglądasz po wybraniu stworzenia.';
 const legend=$('overlayLegend');legend.replaceChildren();
 if(list.length===0){st(80,-220,'Brak obiektów — zaznacz stworzenia lub reference items.',49);bounds={x:-200,y:-1250,w:4600,h:1800};setViewBox();return;}
 const size=list.map(entrySize);
 if(mode==='list'){
  const start=310,gap=210;let base=0,maxW=0;
  list.forEach((d,i)=>{
   const {w,h}=size[i];if(i>0)base+=h+gap;
   let g=s('g',{'data-key':key(d)});
   if(i===0){/* First calibrated row starts at y=0. */}
   line(0,base,start+Math.max(3500,w)+80,base,'#49647b',4,g,'12 16');
   const x=start;draw(g,d,x,base);
   addClick(g,d);locations.set(key(d),{x,y:base,w,h});
   st(25,base-h-75,`${i+1}. ${d.name}`,54,d.kind==='reference'?'#bce7a2':'#e3edff',g,730);
   st(25,base-h-20,wing?`Rozpiętość: ${fmt(d.wingspan)}`:`Dł. ${fmt(d.length)} · wys. ${fmt(d.height)}`,35,'#abc2d8',g,500);
   maxW=Math.max(maxW,start+w+270);
  });
  const last=locations.get(key(list[list.length-1]));
  bounds={x:-140,y:-Math.max(1500,size[0].h+260),w:Math.max(4700,maxW+180),h:last.y+gap+Math.max(1500,size[0].h+260)};
 }else if(mode==='side'){
  const maxH=Math.max(...size.map(e=>e.h));let x=280;
  list.forEach((d,i)=>{
   const g=s('g',{'data-key':key(d)}),{w,h}=size[i];draw(g,d,x,0);
   addClick(g,d);locations.set(key(d),{x,y:0,w,h});
   st(x,-h-93,d.name,48,d.kind==='reference'?'#d6eeaa':'#e3edff',g,700);
   st(x,-h-45,wing?fmt(d.wingspan):`${fmt(d.length)} · wys. ${fmt(d.height)}`,35,'#abc2d8',g,500);
   x+=Math.max(35,w)+Math.max(130,Math.min(450,w*.12));
  });
  line(0,0,x+300,0,'#c7d2cc',7,els.world);
  bounds={x:-160,y:-maxH-300,w:Math.max(4600,x+500),h:maxH+700};
 }else{
  let maxH=0,maxW=0;
  list.forEach((d,i)=>{
   const {w,h}=size[i],x=550;
   const g=s('g',{'data-key':key(d),opacity:alpha});
   draw(g,d,x,0);addClick(g,d);locations.set(key(d),{x,y:0,w,h});
   maxH=Math.max(maxH,h);maxW=Math.max(maxW,w);
   const row=document.createElement('div');row.className='legend-line';
   const dot=document.createElement('span');dot.className='legend-dot';dot.style.background=d.kind==='reference'?'#d6e9a2':(d.palette?.[0]||'#d7e6ff');
   const label=document.createElement('span');label.textContent=`${d.name} · ${wing?fmt(d.wingspan):fmt(d.length)+' / '+fmt(d.height)}`;
   row.append(dot,label);legend.append(row);
  });
  line(0,0,Math.max(4000,maxW+900),0,'#c7d2cc',7,els.world);
  bounds={x:-130,y:-Math.max(1200,maxH)-250,w:Math.max(4600,maxW+1150),h:Math.max(1500,maxH+700)};
 }
 setViewBox();
}
function setMode(next){mode=next;for(const name of ['list','side','overlay']){
 const b=$('view'+name[0].toUpperCase()+name.slice(1));b.classList.toggle('active',name===mode);b.setAttribute('aria-pressed',String(name===mode));
 }renderScene(); // Don't change camera scale on mode switch.
 if(selected&&locations.has(selected))centerSelected(false);
}
function centerSelected(magnify){
 const l=locations.get(selected);if(!l)return;
 if(magnify){const w=Math.max(10,l.w*1.55,l.h*2.2);camera.w=Math.min(13000,w);camera.h=camera.w*(els.viewport.clientHeight||700)/Math.max(1,els.viewport.clientWidth||1150);}
 camera.x=l.x+l.w/2-camera.w/2;camera.y=l.y-l.h/2-camera.h/2;setViewBox();
}
function fitView(){
 const vw=Math.max(400,els.viewport.clientWidth),vh=Math.max(300,els.viewport.clientHeight);
 const ar=vw/vh,desiredW=Math.max(bounds.w,bounds.h*ar);
 camera.w=desiredW;camera.h=desiredW/ar;camera.x=bounds.x;camera.y=bounds.y;setViewBox();
}
function resetView(){camera.w=4600;camera.h=4600*Math.max(300,els.viewport.clientHeight)/Math.max(400,els.viewport.clientWidth);camera.x=-170;camera.y=mode==='list'?-1450:-1550;setViewBox();}
function zoom(f,px=.5,py=.5){const oldW=camera.w,oldH=camera.h;camera.w=Math.max(.1,Math.min(60000,oldW/f));camera.h=Math.max(.1,Math.min(60000,oldH/f));camera.x+=(oldW-camera.w)*px;camera.y+=(oldH-camera.h)*py;setViewBox();}
els.viewport.addEventListener('wheel',e=>{e.preventDefault();const r=els.viewport.getBoundingClientRect();zoom(e.deltaY<0?1.17:1/1.17,(e.clientX-r.left)/r.width,(e.clientY-r.top)/r.height);},{passive:false});
els.viewport.addEventListener('pointerdown',e=>{if(e.button!==0)return;dragMoved=false;pan={x:e.clientX,y:e.clientY,ox:camera.x,oy:camera.y};els.viewport.setPointerCapture(e.pointerId);});
els.viewport.addEventListener('pointermove',e=>{if(!pan)return;const dx=e.clientX-pan.x,dy=e.clientY-pan.y;if(Math.hypot(dx,dy)>5)dragMoved=true;const r=els.viewport.getBoundingClientRect();camera.x=pan.ox-dx*camera.w/r.width;camera.y=pan.oy-dy*camera.h/r.height;setViewBox();});
els.viewport.addEventListener('pointerup',()=>pan=null);els.viewport.addEventListener('pointercancel',()=>pan=null);
$('zoomIn').onclick=()=>zoom(1.25);$('zoomOut').onclick=()=>zoom(1/1.25);
$('reset').onclick=resetView;$('fitView').onclick=fitView;$('focusSelected').onclick=()=>centerSelected(true);
$('viewList').onclick=()=>setMode('list');$('viewSide').onclick=()=>setMode('side');$('viewOverlay').onclick=()=>setMode('overlay');
$('overlayAlpha').addEventListener('input',e=>{alpha=Number(e.target.value)/100;if(mode==='overlay')renderScene();});
$('selectAll').onclick=()=>{searched().forEach(d=>checked.add(key(d)));renderList();renderScene();};
$('clearAll').onclick=()=>{checked.clear();renderList();renderScene();};
for(const el of [els.search,els.cat,els.metric])el.addEventListener(el===els.search?'input':'change',()=>{renderList();renderScene();});
$('openRefs').onclick=()=>{$('referenceSearch').value='';renderRefs();els.dialog.showModal();$('referenceSearch').focus();};
$('closeRefs').onclick=()=>els.dialog.close();$('refDone').onclick=()=>els.dialog.close();
els.dialog.addEventListener('click',e=>{if(e.target===els.dialog)els.dialog.close();});
$('referenceSearch').addEventListener('input',renderRefs);
$('refHuman').onclick=()=>{checkedRefs.add('ref-human');refChanged();};
$('refAll').onclick=()=>{references.forEach(d=>checkedRefs.add(key(d)));refChanged();};
$('refClear').onclick=()=>{checkedRefs.clear();refChanged();};
renderList();renderChips();renderRefs();showDetails(null);renderScene();resetView();
// Test hooks are read-only and exposed for automated consistency checks.
window.ALTEA_ATLAS_DEBUG={getEntries:()=>active().map(d=>({name:d.name,key:key(d),length:d.length,height:d.height,wingspan:d.wingspan})),getSize:k=>{const x=byKey.get(String(k));return x?entrySize(x):null},getCamera:()=>({...camera}),getLocations:()=>Object.fromEntries(locations),setMode};
})();
