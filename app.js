(()=>{
'use strict';
const creatures=(window.CREATURES||[]).map(d=>({...d,kind:'creature'}));
const refs=(window.REFERENCE_ITEMS||[]).map(d=>({...d,kind:'reference'}));
const byKey=new Map([...creatures,...refs].map(d=>[String(d.id),d]));
const $=id=>document.getElementById(id), NS='http://www.w3.org/2000/svg';
const els={search:$('search'),cat:$('category'),metric:$('metric'),list:$('list'),details:$('details'),chips:$('refChips'),refList:$('refOptions'),dialog:$('referenceDialog'),viewport:$('viewport'),scene:$('scene'),world:$('world')};
const cats={great:'Wielki Smok',higher:'Wyższy Smok',dragon:'Smok',drakonid:'Drakonid',reference:'Punkt odniesienia'};
const nativeVertical=new Set(['ref-human','ref-giraffe','ref-apartment','ref-statue','ref-pkin','ref-eiffel','ref-burj']);
const key=d=>String(d.id);
const fmt=n=>n==null?'—':Number(n).toLocaleString('pl-PL',{maximumFractionDigits:2})+' m';
const safe=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const metric=()=>els.metric.value;
const metricName={length:'Długość',height:'Wysokość',wingspan:'Rozpiętość skrzydeł'};
let checked=new Set(creatures.map(key)),checkedRefs=new Set(),rotation=new Map(),selected='0',heightDragon='0',mode='list',alpha=.64;
const camera={x:-200,y:-2750,w:5100,h:2800}; let bounds={x:-200,y:-2750,w:5100,h:2900},pan=null,dragMoved=false;
const locations=new Map();
const imageRatios=new Map();
function node(tag,attrs={},parent=els.world){const e=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))if(v!=null)e.setAttribute(k,String(v));parent.appendChild(e);return e;}
function line(g,x1,y1,x2,y2,color='#5b7893',sw=1.4,dash){return node('line',{x1,y1,x2,y2,stroke:color,'stroke-width':sw,'stroke-dasharray':dash||null,'vector-effect':'non-scaling-stroke'},g);}
function text(g,x,y,value,size=31,color='#e8f3ff',weight=650){const e=node('text',{x,y,fill:color,'font-size':size,'font-weight':weight,'font-family':'system-ui,Segoe UI,sans-serif','paint-order':'stroke',stroke:'#111a28','stroke-width':Math.max(1,size*.09),'stroke-linejoin':'round'},g);e.textContent=value;return e;}
function drawLine(g,x1,y1,x2,y2,label,color='#82c9ee',isVertical=false){line(g,x1,y1,x2,y2,color,1.3);if(isVertical){line(g,x1-8,y1,x1+8,y1,color,1.3);line(g,x2-8,y2,x2+8,y2,color,1.3);text(g,x1+Math.max(.045,Math.abs(y2-y1)*.045),(y1+y2)/2,label,Math.max(.045,Math.min(28,Math.abs(y2-y1)*.11)),color)}else{line(g,x1,y1-7,x1,y1+7,color,1.3);line(g,x2,y2-7,x2,y2+7,color,1.3);text(g,x1,y1+Math.max(.045,Math.min(31,Math.abs(x2-x1)*.12)),label,Math.max(.05,Math.min(29,Math.abs(x2-x1)*.11)),color)}}
function aspect(d){return imageRatios.get(key(d))||d.artRatio||(d.kind==='creature'?1448/1086:1);}
function normalRefIsVertical(d){return nativeVertical.has(key(d));}
function refPlacement(d){
 let explicit=rotation.get(key(d));
 if(explicit) return explicit;
 if(metric()==='height') return normalRefIsVertical(d)?'standing':'natural';
 return normalRefIsVertical(d)||d.elevationOnly?'lying':'natural';
}
function referenceSize(d){
 const a=aspect(d),pos=refPlacement(d),tall=normalRefIsVertical(d);
 if(d.elevationOnly){const elevation=d.height;return pos==='standing'?{w:elevation*a,h:elevation,display:elevation,axis:'wysokość n.p.m.'}:{w:elevation,h:elevation/a,display:elevation,axis:'wysokość n.p.m.'};}
 if(tall){return pos==='lying'?{w:d.height,h:d.height*a,display:d.height,axis:'wysokość obrócona'}:{w:d.height*a,h:d.height,display:d.height,axis:'wysokość'};}
 if(pos==='standing')return {w:d.length/a,h:d.length,display:d.length,axis:'długość pionowo'};
 if(metric()==='height')return {w:d.height*a,h:d.height,display:d.height,axis:'wysokość'};
 return {w:d.length,h:d.length/a,display:d.length,axis:'długość'};
}
function size(d){if(d.kind==='reference')return referenceSize(d);if(metric()==='wingspan'){const w=d.wingspan||0;return {w,h:w*.38,display:w,axis:'rozpiętość'};}
 const a=aspect(d);if(metric()==='height')return {w:d.height*a,h:d.height,display:d.height,axis:'wysokość'};
 return {w:d.length,h:d.length/a,display:d.length,axis:'długość'};
}
function drawnImage(g,d,x,baseline,w,h,angle=0){const src=d.kind==='reference'?(d.calibratedArtwork||d.silhouette):d.silhouette;
 if(angle===0)node('image',{href:src,x,y:baseline-h,width:w,height:h,preserveAspectRatio:'none',style:d.id==='ref-human'?'filter:brightness(2.1) invert(.86)':''},g);
 else if(angle===-90){const q=node('g',{transform:`translate(${x} ${baseline}) rotate(-90)`},g);node('image',{href:src,x:0,y:0,width:h,height:w,preserveAspectRatio:'none',style:d.id==='ref-human'?'filter:brightness(2.1) invert(.86)':''},q);}
 else if(angle===90){const q=node('g',{transform:`translate(${x+w} ${baseline}) rotate(90)`},g);node('image',{href:src,x:-h,y:0,width:h,height:w,preserveAspectRatio:'none',style:d.id==='ref-human'?'filter:brightness(2.1) invert(.86)':''},q);}
}
function drawReference(g,d,x,base,sz){
 const pos=refPlacement(d),tall=normalRefIsVertical(d)||d.elevationOnly;
 const angle=tall&&pos==='lying'?-90:(!tall&&pos==='standing'?90:0);
 drawnImage(g,d,x,base,sz.w,sz.h,angle);
 const mark=Math.max(.08,sz.display*.018);
 if(metric()==='height'&&pos!=='lying')drawLine(g,x+sz.w+Math.max(.07,sz.w*.055),base-sz.h,x+sz.w+Math.max(.07,sz.w*.055),base,fmt(sz.display),'#a9e2b1',true);
 else drawLine(g,x,base+mark,x+sz.w,base+mark,fmt(sz.display),'#a9e2b1');
 if(d.elevationOnly){text(g,x,base-sz.h-Math.max(.09,Math.min(60,sz.h*.018)),'UWAGA: 8848,86 m n.p.m., nie od podnóża',Math.max(.09,Math.min(34,sz.h*.007)),'#ffd096',700);}
}
function drawDragon(g,d,x,base,sz){
 drawnImage(g,d,x,base,sz.w,sz.h);
 const marker=Math.max(.08,sz.display*.018);
 if(metric()==='height')drawLine(g,x+sz.w+Math.max(.08,sz.w*.04),base-sz.h,x+sz.w+Math.max(.08,sz.w*.04),base,fmt(d.height),'#b5d5f9',true);
 else drawLine(g,x,base+marker,x+sz.w,base+marker,fmt(d.length),'#b5d5f9');
}
function drawWing(g,d,x,base,sz){
 const w=sz.w,h=sz.h,cx=x+w/2;
 const ink=d.palette?.[0]||'#729cc4',edge=d.palette?.[1]||'#29486b',tip=d.palette?.[2]||'#b3e1ff';
 const minY=base-h, bottom=base-h*.12;
 const outline=Math.max(.002,w*.004);
 const mk=(dd,fill)=>node('path',{d:dd,fill,stroke:edge,'stroke-width':outline,'stroke-linejoin':'round'},g);
 // Wszystkie punkty skrzydeł pozostają PONAD linią gruntu — także dla skrzydeł 0,75 m.
 mk(`M ${cx} ${minY+h*.58} C ${cx-w*.11} ${minY+h*.20} ${x+w*.1} ${minY+h*.02} ${x} ${minY+h*.21} Q ${x+w*.13} ${minY+h*.50} ${x+w*.31} ${minY+h*.56} Q ${cx-w*.11} ${minY+h*.67} ${cx} ${minY+h*.89} Z`,ink);
 mk(`M ${cx} ${minY+h*.58} C ${cx+w*.11} ${minY+h*.20} ${x+w*.9} ${minY+h*.02} ${x+w} ${minY+h*.21} Q ${x+w*.87} ${minY+h*.50} ${x+w*.69} ${minY+h*.56} Q ${cx+w*.11} ${minY+h*.67} ${cx} ${minY+h*.89} Z`,ink);
 mk(`M ${cx-w*.022} ${minY+h*.18} Q ${cx-w*.06} ${minY+h*.55} ${cx} ${bottom} Q ${cx+w*.055} ${minY+h*.55} ${cx+w*.022} ${minY+h*.18} Z`,edge);
 mk(`M ${cx-w*.018} ${minY+h*.2} L ${cx} ${minY} L ${cx+w*.018} ${minY+h*.2} Z`,tip);
 const r=base+Math.max(.045,w*.017);drawLine(g,x,r,x+w,r,fmt(d.wingspan),tip);
}
function draw(g,d,x,base,sz){if(metric()==='wingspan'&&d.kind==='creature')return drawWing(g,d,x,base,sz);if(d.kind==='reference')return drawReference(g,d,x,base,sz);return drawDragon(g,d,x,base,sz);}
function filtered(){const q=els.search.value.trim().toLowerCase();return creatures.filter(d=>(els.cat.value==='all'||d.category===els.cat.value)&&(d.name+' '+d.title).toLowerCase().includes(q)&&(metric()!=='wingspan'||d.wingspan!=null)).sort((a,b)=>(metric()==='height'?b.height-a.height:metric()==='wingspan'?b.wingspan-a.wingspan:b.length-a.length));}
function active(){let a=metric()==='height'?[byKey.get(heightDragon)].filter(x=>x?.kind==='creature'):filtered().filter(d=>checked.has(key(d)));
 let b=refs.filter(d=>checkedRefs.has(key(d)));
 if(metric()==='height'){const visible=filtered();if(!a.length||!visible.find(d=>key(d)===key(a[0]))){a=visible.slice(0,1);if(a.length)heightDragon=key(a[0]);}}
 return [...a,...b].sort((x,y)=>(metric()==='height'?(y.kind==='creature')-(x.kind==='creature')||size(y).display-size(x).display:size(y).display-size(x).display));}
function showDetails(d){if(!d){els.details.textContent='Kliknij obiekt, aby zobaczyć oryginalną grafikę i wymiary.';return;}
 els.details.innerHTML=`<div class="detail-content"><img src="${safe(d.silhouette)}" alt="${safe(d.name)}"><div><strong>${safe(d.name)}</strong> <span class="tag ${d.kind==='reference'?'ref':''}">${safe(cats[d.category])}</span><div>${safe(d.title||'')}</div><div>Długość: <b>${fmt(d.length)}</b> · Wysokość: <b>${fmt(d.height)}</b> · Skrzydła: <b>${fmt(d.wingspan)}</b></div><div class="muted">${safe(d.description||'')}</div>${d.elevationOnly?'<div class="warning">Everest: wysokość podana n.p.m., a nie od podnóża.</div>':''}</div></div>`;
}
function pick(d){selected=key(d);if(d.kind==='creature')heightDragon=key(d);showDetails(d);renderList();renderScene();focusSelected(true);}
function renderList(){els.list.replaceChildren();for(const d of filtered()){
 const row=document.createElement('div');row.className='creature-row'+(selected===key(d)?' active':'');
 const cb=document.createElement('input');cb.type=metric()==='height'?'radio':'checkbox';cb.name='activeCreatures';cb.checked=metric()==='height'?heightDragon===key(d):checked.has(key(d));cb.title='Pokaż '+d.name;
 cb.onclick=e=>e.stopPropagation();cb.onchange=()=>{if(metric()==='height'){heightDragon=key(d);selected=key(d);}else{cb.checked?checked.add(key(d)):checked.delete(key(d));}renderList();renderScene();};
 const img=document.createElement('img');img.src=d.silhouette;img.className='small-icon';img.alt='';img.loading='lazy';
 const inf=document.createElement('div');inf.className='row-info';inf.innerHTML=`<span class="row-name">${safe(d.name)}</span><small>Dł. ${fmt(d.length)} · Wys. ${fmt(d.height)}${d.wingspan!=null?' · Skrz. '+fmt(d.wingspan):''}</small>`;
 row.append(cb,img,inf);row.onclick=()=>pick(d);els.list.append(row);
 }}
function drawGround(g,base,maxX,x0=0){line(g,x0,base,maxX,base,'#6b8c95',1.05,'5 9');}
function drawEntity(g,d,x,base,sz){const bg=node('g',{},g);drawGround(bg,base,x+sz.w+Math.max(2,sz.w*.06),Math.max(0,x-30));const fg=node('g',{'data-object':key(d)},g);draw(fg,d,x,base,sz);fg.style.cursor='pointer';fg.addEventListener('click',()=>{if(!dragMoved)pick(d);});fg.setAttribute('role','button');fg.setAttribute('tabindex','0');fg.setAttribute('aria-label',d.name);fg.addEventListener('keydown',e=>{if(e.key==='Enter')pick(d);});}
function renderScene(){els.world.replaceChildren();locations.clear();const list=active(),wing=metric()==='wingspan';
 $('alphaWrap').hidden=mode!=='overlay';$('overlayLegend').hidden=mode!=='overlay';$('sceneTitle').textContent=`${mode==='list'?'Lista':mode==='side'?'Obok siebie':'Nałożone'} · ${metricName[metric()]} · ${list.length} obiektów`;
 $('viewNote').textContent=wing?'Skrzydła: wspólny, uproszczony kształt z góry. Wybierz małego smoka i kliknij „Zbliż na wybrany”, aby zobaczyć szczegóły.':metric()==='height'?'Wysokość: jeden smok + dowolne reference items. Każdy obiekt stoi lub leży zgodnie z ustawieniem orientacji.':'Długość: oryginalne ilustracje w proporcjach źródłowych. Liczby wysokości nie są wyliczane z grafiki.';
 const legend=$('overlayLegend');legend.replaceChildren();if(!list.length){text(els.world,60,0,'Wybierz stworzenie lub punkt odniesienia.',45);bounds={x:-160,y:-900,w:4600,h:1750};setViewBox();return;}
 const sizes=list.map(size),sp=(n,h)=>Math.max(n,Math.min(270,h*.10));
 if(mode==='list'){
  let base=0,maxW=0;list.forEach((d,i)=>{const z=sizes[i];if(i)base+=z.h+sp(150,z.h)+Math.max(60,sizes[i-1].display*.025);
   const g=node('g',{'data-key':key(d)});const x=350;drawEntity(g,d,x,base,z);locations.set(key(d),{x,y:base,w:z.w,h:z.h});
   const labelY=base-z.h-Math.max(21,Math.min(95,z.display*.055));const labelSize=Math.max(.09,Math.min(45,z.display*.032));
   text(g,25,labelY,`${i+1}. ${d.name}`,labelSize,d.kind==='reference'?'#bce7a2':'#e7f1ff');
   text(g,25,labelY+labelSize*1.1,wing&&d.kind==='creature'?`Skrzydła: ${fmt(d.wingspan)}`:`Dł. ${fmt(d.length)} · wys. ${fmt(d.height)}`,Math.max(.06,labelSize*.65),'#b1cadc',500);
   maxW=Math.max(maxW,x+z.w+Math.max(100,z.w*.13));});
   let first=sizes[0],last=locations.get(key(list[list.length-1]));bounds={x:-150,y:-first.h-Math.max(250,first.h*.25),w:Math.max(4300,maxW+200),h:last.y+first.h+Math.max(500,first.h*.3)};
 }else if(mode==='side'){
   let x=230,maxH=0;list.forEach((d,i)=>{const z=sizes[i],g=node('g',{'data-key':key(d)});drawEntity(g,d,x,0,z);locations.set(key(d),{x,y:0,w:z.w,h:z.h});maxH=Math.max(maxH,z.h);const fs=Math.max(.07,Math.min(38,z.display*.06));text(g,x,-z.h-Math.max(17,z.h*.10),d.name,fs,d.kind==='reference'?'#bce7a2':'#e7f1ff');x+=z.w+Math.max(15,Math.min(250,z.w*.15));});
   drawGround(els.world,0,x+130,-10);bounds={x:-150,y:-maxH-Math.max(250,maxH*.18),w:Math.max(4300,x+300),h:maxH+Math.max(500,maxH*.25)};
 }else{
   let maxW=0,maxH=0;list.forEach((d,i)=>{const z=sizes[i],g=node('g',{'data-key':key(d),opacity:alpha}),x=500;drawEntity(g,d,x,0,z);locations.set(key(d),{x,y:0,w:z.w,h:z.h});maxH=Math.max(maxH,z.h);maxW=Math.max(maxW,z.w);
    const row=document.createElement('div');row.className='legend-line';const dot=document.createElement('span');dot.className='legend-dot';dot.style.background=d.palette?.[0]||'#a9dea5';const label=document.createElement('span');label.textContent=d.name+' · '+fmt(z.display);row.append(dot,label);legend.append(row);});
   drawGround(els.world,0,Math.max(3000,maxW+700),0);bounds={x:-130,y:-maxH-Math.max(250,maxH*.18),w:Math.max(4300,maxW+1100),h:maxH+Math.max(500,maxH*.25)};
 }
 setViewBox();
}
function setViewBox(){els.scene.setAttribute('viewBox',`${camera.x} ${camera.y} ${camera.w} ${camera.h}`);$('zoomLabel').textContent=`Widok ${Math.round(camera.w)} m szerokości · wspólna skala`;}
function setMode(m){mode=m;for(const name of ['list','side','overlay']){$('view'+name[0].toUpperCase()+name.slice(1)).classList.toggle('active',mode===name);}renderScene();}
function focusSelected(zoomIt=false){const p=locations.get(selected);if(!p)return;const ar=Math.max(.35,els.viewport.clientWidth/Math.max(1,els.viewport.clientHeight));if(zoomIt){const w=Math.max(.55,p.w*1.8,p.h*1.55*ar);camera.w=w;camera.h=w/ar;}camera.x=p.x+p.w*.5-camera.w*.5;camera.y=p.y-p.h*.5-camera.h*.5;setViewBox();}
function fitView(){const a=Math.max(.3,els.viewport.clientWidth/Math.max(1,els.viewport.clientHeight));camera.w=Math.max(bounds.w,bounds.h*a);camera.h=camera.w/a;camera.x=bounds.x;camera.y=bounds.y;setViewBox();}
function resetView(){const ar=Math.max(.3,els.viewport.clientWidth/Math.max(1,els.viewport.clientHeight));camera.w=5000;camera.h=camera.w/ar;camera.x=-200;camera.y=mode==='list'?-(size(active()[0]||creatures[0]).h+250):-Math.max(1300,Math.max(...active().map(d=>size(d).h),1000)+150);setViewBox();}
function zoom(f,rx=.5,ry=.5){const oldW=camera.w,oldH=camera.h;camera.w=Math.max(.08,Math.min(80000,oldW/f));camera.h=Math.max(.08,Math.min(80000,oldH/f));camera.x+=(oldW-camera.w)*rx;camera.y+=(oldH-camera.h)*ry;setViewBox();}
els.viewport.addEventListener('wheel',e=>{e.preventDefault();const r=els.viewport.getBoundingClientRect();zoom(e.deltaY<0?1.2:1/1.2,(e.clientX-r.left)/r.width,(e.clientY-r.top)/r.height);},{passive:false});
els.viewport.addEventListener('pointerdown',e=>{if(e.button!==0)return;dragMoved=false;pan={x:e.clientX,y:e.clientY,cx:camera.x,cy:camera.y};els.viewport.setPointerCapture(e.pointerId);});
els.viewport.addEventListener('pointermove',e=>{if(!pan)return;const dx=e.clientX-pan.x,dy=e.clientY-pan.y;if(Math.hypot(dx,dy)>5)dragMoved=true;const r=els.viewport.getBoundingClientRect();camera.x=pan.cx-dx*camera.w/r.width;camera.y=pan.cy-dy*camera.h/r.height;setViewBox();});
els.viewport.addEventListener('pointerup',()=>pan=null);els.viewport.addEventListener('pointercancel',()=>pan=null);
$('zoomIn').onclick=()=>zoom(1.25);$('zoomOut').onclick=()=>zoom(.8);$('reset').onclick=resetView;$('fitView').onclick=fitView;$('focusSelected').onclick=()=>focusSelected(true);
$('viewList').onclick=()=>setMode('list');$('viewSide').onclick=()=>setMode('side');$('viewOverlay').onclick=()=>setMode('overlay');
$('overlayAlpha').addEventListener('input',e=>{alpha=Number(e.target.value)/100;if(mode==='overlay')renderScene();});
$('selectAll').onclick=()=>{filtered().forEach(d=>checked.add(key(d)));renderList();renderScene();};$('clearAll').onclick=()=>{checked.clear();renderList();renderScene();};
for(const e of [els.search,els.cat,els.metric])e.addEventListener(e===els.search?'input':'change',()=>{renderList();renderScene();});
function toggleRotation(d){const old=refPlacement(d);rotation.set(key(d),old==='standing'?'lying':old==='lying'?'standing':metric()==='height'?'standing':'standing');refChanged();}
function refChanged(){renderChips();renderRefs();renderScene();}
function renderChips(){els.chips.replaceChildren();$('refCount').textContent=`(${checkedRefs.size})`;if(!checkedRefs.size){const t=document.createElement('span');t.className='ref-placeholder';t.textContent='Nie wybrano punktów odniesienia';els.chips.append(t);return;}
 for(const d of refs.filter(d=>checkedRefs.has(key(d)))){const chip=document.createElement('span');chip.className='ref-chip';chip.append(document.createTextNode(d.name));const rot=document.createElement('button');rot.type='button';rot.textContent='⟳';rot.title='Obróć '+d.name;rot.onclick=()=>toggleRotation(d);chip.append(rot);const del=document.createElement('button');del.type='button';del.textContent='×';del.title='Usuń '+d.name;del.onclick=()=>{checkedRefs.delete(key(d));refChanged();};chip.append(del);els.chips.append(chip);}}
function renderRefs(){els.refList.replaceChildren();const query=$('referenceSearch').value.trim().toLowerCase();for(const d of refs.filter(d=>d.name.toLowerCase().includes(query))){const el=document.createElement('div');el.className='ref-option';const cb=document.createElement('input');cb.type='checkbox';cb.checked=checkedRefs.has(key(d));cb.onchange=()=>{cb.checked?checkedRefs.add(key(d)):checkedRefs.delete(key(d));refChanged();};const span=document.createElement('span');span.className='ref-title';span.innerHTML=`${safe(d.name)}<small>${d.elevationOnly?'8848,86 m n.p.m. — nie od podnóża':`Dł. ${fmt(d.length)} · wys. ${fmt(d.height)}`}</small>`;const turn=document.createElement('button');turn.type='button';turn.textContent='⟳';turn.title='Zmień orientację';turn.className='rotate-ref';turn.onclick=()=>toggleRotation(d);el.append(cb,span,turn);els.refList.append(el);}}
$('openRefs').onclick=()=>{$('referenceSearch').value='';renderRefs();els.dialog.showModal();};$('closeRefs').onclick=()=>els.dialog.close();$('refDone').onclick=()=>els.dialog.close();els.dialog.addEventListener('click',e=>{if(e.target===els.dialog)els.dialog.close();});
$('referenceSearch').oninput=renderRefs;$('refHuman').onclick=()=>{checkedRefs.add('ref-human');refChanged();};$('refAll').onclick=()=>{refs.forEach(d=>checkedRefs.add(key(d)));refChanged();};$('refClear').onclick=()=>{checkedRefs.clear();refChanged();};
// Load natural ratios once and rerender without changing the camera. This prevents fake aspect corrections.
for(const d of creatures){const im=new Image();im.onload=()=>{if(im.naturalWidth&&im.naturalHeight){imageRatios.set(key(d),im.naturalWidth/im.naturalHeight);renderScene();}};im.src=d.silhouette;}
window.ALTEA_ATLAS_DEBUG={getEntries:()=>active().map(d=>({id:key(d),name:d.name,kind:d.kind})),getSize:k=>{const d=byKey.get(String(k));return d?size(d):null;},getCamera:()=>({...camera}),getLocations:()=>Object.fromEntries(locations),getRotation:k=>{const d=byKey.get(String(k));return d?refPlacement(d):null;},setMode};
renderList();renderChips();renderRefs();showDetails(null);renderScene();resetView();
})();
