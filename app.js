
(()=>{
'use strict';
const creatures = (window.CREATURES||[]).map((d,i)=>({...d,id:d.id??i,kind:'creature'}));
const refs = (window.REFERENCE_ITEMS||[]).map((d,i)=>({...d,id:d.id??('ref-'+i),kind:'reference'}));
const allById = new Map([...creatures, ...refs].map(x=>[String(x.id), x]));
const cats = {great:'Wielki Smok', higher:'Wyższy Smok', dragon:'Smok', drakonid:'Drakonid', reference:'Reference'};
const colors = {great:'#8187ee', higher:'#74cfe2', dragon:'#5bb8a4', drakonid:'#efad71', reference:'#b0df75'};
const metricLabels = {length:'Długość', wingspan:'Rozpiętość skrzydeł'};
const ns='http://www.w3.org/2000/svg';
const byId=id=>document.getElementById(id);
const els={search:byId('search'),cat:byId('category'),metric:byId('metric'),list:byId('list'),refList:byId('refList'),details:byId('details')};
const viewport=byId('viewport'), scene=byId('scene'), world=byId('world');
let checked = new Set(creatures.map(d=>String(d.id)));
let checkedRefs = new Set();
let selected = null, view='list', overlayAlpha=0.60;
let scale=1, ox=30, oy=20, drag=null, movedSinceDown=false;

const fmt = n => n==null ? 'brak danych' : n.toLocaleString('pl-PL',{maximumFractionDigits:2}) + ' m';
const baseMetric = d => els.metric.value==='wingspan' ? d.wingspan : d.length;
const metricText = d => `${fmt(baseMetric(d))}`;
const escapeHtml=s=>String(s).replace(/[&<>"']/g, ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
function svg(tag, attrs={}, parent=world){const e=document.createElementNS(ns, tag); for(const [k,v] of Object.entries(attrs)){ if(v!=null) e.setAttribute(k,v); } parent.appendChild(e); return e; }
function textNode(x,y,t,cl,parent=world){ const el=svg('text',{x,y,class:cl},parent); el.textContent=t; return el; }

function creatureMatches(d){
  return (els.cat.value==='all' || d.category===els.cat.value) &&
    (d.name + ' ' + d.title).toLowerCase().includes(els.search.value.toLowerCase()) &&
    (els.metric.value!=='wingspan' || d.wingspan != null);
}
function filteredCreatures(){
  return creatures.filter(creatureMatches).sort((a,b)=> (baseMetric(b)??-1) - (baseMetric(a)??-1) || b.height-a.height);
}
function activeCompareItems(){
  const activeCreatures = filteredCreatures().filter(d=>checked.has(String(d.id)));
  const activeRefs = refs.filter(d=>checkedRefs.has(String(d.id)) && (els.metric.value!=='wingspan' || d.wingspan != null));
  return [...activeCreatures, ...activeRefs].sort((a,b)=> (baseMetric(b)??-1) - (baseMetric(a)??-1) || b.height-a.height);
}
function activeListItems(){
  return [...filteredCreatures(), ...refs.filter(d=>checkedRefs.has(String(d.id)) && (els.metric.value!=='wingspan' || d.wingspan != null))]
    .sort((a,b)=> (baseMetric(b)??-1) - (baseMetric(a)??-1) || b.height-a.height);
}

function updateDetails(item){
  if(!item){ els.details.textContent='Kliknij stworzenie albo reference item, aby wyświetlić informacje.'; return; }
  const tagClass = item.kind==='reference' ? 'tag ref-tag' : 'tag';
  els.details.innerHTML = `<strong>${escapeHtml(item.name)}</strong> <span class="${tagClass}">${escapeHtml(cats[item.category]||item.category)}</span>`+
    `<br>${escapeHtml(item.title)}`+
    `<br>Długość: <strong>${fmt(item.length)}</strong> · Wysokość: <strong>${fmt(item.height)}</strong> · Skrzydła: <strong>${fmt(item.wingspan)}</strong>`+
    (item.description ? `<br><span class="muted">${escapeHtml(item.description)}</span>` : '');
}

function renderList(){
  els.list.replaceChildren();
  for(const d of filteredCreatures()){
    const row=document.createElement('div'); row.className='creature-row'+(String(selected)===String(d.id)?' active':'');
    const cb=document.createElement('input'); cb.type='checkbox'; cb.checked=checked.has(String(d.id));
    cb.addEventListener('click',ev=>ev.stopPropagation());
    cb.addEventListener('change',()=>{ cb.checked ? checked.add(String(d.id)) : checked.delete(String(d.id)); renderScene(); });
    const span=document.createElement('span');
    span.innerHTML = `${escapeHtml(d.name)}<small>${escapeHtml(cats[d.category])} · dł. ${fmt(d.length)} · wys. ${fmt(d.height)} · skrz. ${fmt(d.wingspan)}</small>`;
    row.append(cb, span); row.onclick=()=>{selected=d.id; updateDetails(d); renderList(); renderRefList(); renderScene();};
    els.list.append(row);
  }
}
function renderRefList(){
  els.refList.replaceChildren();
  for(const d of refs){
    const row=document.createElement('div'); row.className='creature-row'+(String(selected)===String(d.id)?' active':'');
    const cb=document.createElement('input'); cb.type='checkbox'; cb.checked=checkedRefs.has(String(d.id));
    cb.addEventListener('click',ev=>ev.stopPropagation());
    cb.addEventListener('change',()=>{ cb.checked ? checkedRefs.add(String(d.id)) : checkedRefs.delete(String(d.id)); renderScene(); renderRefList(); });
    const span=document.createElement('span');
    span.innerHTML = `<div>${escapeHtml(d.name)}</div><small>dł. ${fmt(d.length)} · wys. ${fmt(d.height)} · skrz. ${fmt(d.wingspan)}</small><span class="ref-badge">reference</span>`;
    row.append(cb, span); row.onclick=()=>{selected=d.id; updateDetails(d); renderList(); renderRefList(); renderScene();};
    els.refList.append(row);
  }
}

function setMode(mode){
  view=mode;
  byId('viewList').classList.toggle('active', mode==='list');
  byId('viewSide').classList.toggle('active', mode==='side');
  byId('viewOverlay').classList.toggle('active', mode==='overlay');
  byId('alphaWrap').hidden = mode!=='overlay';
  renderScene(); fitView();
}

function drawItem(g,d,x,baseline,ppm,isOverlay=false){
  const metric=els.metric.value;
  const primary = metric==='wingspan' ? (d.wingspan ?? d.length) : d.length;
  const w = Math.max(2, primary * ppm);
  const h = Math.max(2, d.height * ppm);
  const color = colors[d.category] || '#ffffff';
  const isRef = d.kind==='reference';
  if(d.silhouette){
    svg('image',{href:d.silhouette, x, y:baseline-h, width:w, height:h, preserveAspectRatio:'none'}, g);
  } else {
    svg('rect',{x, y:baseline-h, width:w, height:h, fill:color, opacity:isOverlay?overlayAlpha:0.72, rx:6}, g);
  }
  if(!isOverlay){
    const lineY = baseline + 28;
    svg('line',{x1:x, y1:lineY, x2:x+w, y2:lineY, class:'metric-line'+(isRef?' ref':'')}, g);
    svg('line',{x1:x, y1:lineY-6, x2:x, y2:lineY+6, stroke:color, 'stroke-width':2}, g);
    svg('line',{x1:x+w, y1:lineY-6, x2:x+w, y2:lineY+6, stroke:color, 'stroke-width':2}, g);
    textNode(x, baseline-h-14, d.name, 'compare-label', g);
    textNode(x, lineY+22, `${metricLabels[metric]}: ${fmt(metric==='wingspan' ? d.wingspan : d.length)} · Wys.: ${fmt(d.height)}`, 'dimension', g);
  }
  const hit = svg('rect',{x, y:baseline-h, width:Math.max(12,w), height:h+38, fill:'transparent'}, g);
  hit.style.cursor='pointer';
  const activate=()=>{selected=d.id; updateDetails(d); renderList(); renderRefList();};
  hit.addEventListener('click',()=>{ if(!movedSinceDown){ activate(); }});
}

function renderScene(){
  world.replaceChildren();
  const metric=els.metric.value;
  const isOverlay = view==='overlay';
  const items = view==='list' ? activeListItems() : activeCompareItems();
  const label = metric==='wingspan' ? 'rozpiętości skrzydeł' : 'długości';
  byId('sceneTitle').textContent = view==='overlay'
    ? `Nałożone · skala ${label}`
    : view==='side'
      ? `Obok siebie · skala ${label}`
      : `Lista · skala ${label}`;

  if(!items.length){
    scene.setAttribute('viewBox', '0 0 1400 900');
    textNode(80, 110, 'Brak obiektów do wyświetlenia w tym trybie.', 'compare-label');
    textNode(80, 142, metric==='wingspan' ? 'W trybie rozpiętości pokazywane są tylko obiekty ze skrzydłami.' : 'Zmień filtry albo zaznacz wybrane stworzenia / reference items.', 'note');
    updateTransform();
    return;
  }

  const maxVal = Math.max(1, ...items.map(d => metric==='wingspan' ? (d.wingspan ?? 0) : d.length));
  const sceneWBase = 1400;
  let sceneW = sceneWBase, sceneH = 900;

  if(view==='list'){
    const rowGap = 160;
    sceneH = 120 + items.length*rowGap;
    sceneW = 1600;
    const ppm = 960 / maxVal;
    items.forEach((d,i)=>{
      const rowY = 110 + i*rowGap;
      const g = svg('g',{},world);
      const baseline = rowY + 72;
      svg('line',{x1:40,y1:baseline,x2:1540,y2:baseline,class:'helper-line'},g);
      const val = metric==='wingspan' ? (d.wingspan ?? d.length) : d.length;
      const w = Math.max(2, val*ppm), h = Math.max(2, d.height*ppm);
      drawItem(g,d,260,baseline,ppm,false);
      textNode(48,rowY+20,`${i+1}. ${d.kind==='reference'?'[REF] ':''}${d.name}`,'compare-label',g);
      textNode(48,rowY+46,`Dł.: ${fmt(d.length)} · Wys.: ${fmt(d.height)} · Skrz.: ${fmt(d.wingspan)}`,'mini',g);
    });
  } else if(view==='side'){
    const gap = 130;
    const ppm = 1000 / maxVal;
    const widths = items.map(d => Math.max(2, ((metric==='wingspan' ? (d.wingspan ?? d.length) : d.length) * ppm)));
    sceneW = Math.max(1500, 150 + widths.reduce((a,b)=>a+b,0) + gap*(items.length));
    sceneH = 980;
    const baseline=760;
    let x=110;
    items.forEach((d,idx)=>{
      const g=svg('g',{},world);
      drawItem(g,d,x,baseline,ppm,false);
      x += widths[idx] + gap;
    });
  } else {
    const ppm = 980 / maxVal;
    const baseline=770;
    sceneW=1700; sceneH=1000;
    const center=760;
    items.forEach((d,i)=>{
      const g=svg('g',{},world);
      g.setAttribute('opacity', String(overlayAlpha));
      const primary = metric==='wingspan' ? (d.wingspan ?? d.length) : d.length;
      const w = Math.max(2, primary*ppm);
      drawItem(g,d,center - w/2,baseline,ppm,true);
      const lx = 40 + 380*Math.floor(i/14);
      const ly = 70 + 28*(i%14);
      svg('circle',{cx:lx, cy:ly-5, r:6, fill:colors[d.category]||'#fff'},g);
      textNode(lx+14, ly, `${d.name} · ${metric==='wingspan'?'skrzydła':'dł.'} ${fmt(primary)} · wys. ${fmt(d.height)}`,'dimension',g);
    });
    textNode(42, 470, metric==='wingspan' ? 'Tryb rozpiętości: tylko obiekty z danymi o skrzydłach.' : 'Tryb długości: sortowanie domyślne po długości, wysokość jest pokazana dodatkowo.', 'note');
  }

  scene.setAttribute('viewBox', `0 0 ${sceneW} ${sceneH}`);
  updateTransform();
}

function updateTransform(){
  world.setAttribute('transform', `translate(${ox} ${oy}) scale(${scale})`);
  byId('zoomLabel').textContent = Math.round(scale*100) + '%';
}
function zoom(factor, clientX, clientY){
  const r=scene.getBoundingClientRect(), v=scene.viewBox.baseVal;
  const sx=(clientX-r.left)*v.width/r.width, sy=(clientY-r.top)*v.height/r.height;
  const next=Math.min(30, Math.max(0.15, scale*factor)), ratio=next/scale;
  ox = sx - (sx-ox)*ratio;
  oy = sy - (sy-oy)*ratio;
  scale=next; updateTransform();
}
function fitView(){ scale=1; ox=30; oy=20; updateTransform(); }
function reset(){ fitView(); }

viewport.addEventListener('wheel', ev=>{ ev.preventDefault(); zoom(ev.deltaY<0?1.18:1/1.18, ev.clientX, ev.clientY); }, {passive:false});
viewport.addEventListener('pointerdown', ev=>{ if(ev.button!==0) return; movedSinceDown=false; drag={x:ev.clientX,y:ev.clientY,ox,oy}; viewport.setPointerCapture(ev.pointerId); });
viewport.addEventListener('pointermove', ev=>{ if(!drag) return; if(Math.hypot(ev.clientX-drag.x, ev.clientY-drag.y)>5) movedSinceDown=true; const r=scene.getBoundingClientRect(), v=scene.viewBox.baseVal; ox = drag.ox + (ev.clientX-drag.x)*v.width/r.width; oy = drag.oy + (ev.clientY-drag.y)*v.height/r.height; updateTransform(); });
viewport.addEventListener('pointerup', ()=>drag=null); viewport.addEventListener('pointercancel', ()=>drag=null);
byId('zoomIn').onclick=()=>{ const r=scene.getBoundingClientRect(); zoom(1.25, r.left+r.width/2, r.top+r.height/2); };
byId('zoomOut').onclick=()=>{ const r=scene.getBoundingClientRect(); zoom(1/1.25, r.left+r.width/2, r.top+r.height/2); };
byId('reset').onclick=reset; byId('fitView').onclick=fitView;
byId('viewList').onclick=()=>setMode('list'); byId('viewSide').onclick=()=>setMode('side'); byId('viewOverlay').onclick=()=>setMode('overlay');
byId('overlayAlpha').addEventListener('input', ev=>{ overlayAlpha=Number(ev.target.value)/100; if(view==='overlay') renderScene(); });
byId('selectAll').onclick=()=>{ checked = new Set(filteredCreatures().map(d=>String(d.id))); renderList(); renderScene(); };
byId('clearAll').onclick=()=>{ checked.clear(); renderList(); renderScene(); };
byId('clearRefs').onclick=()=>{ checkedRefs.clear(); renderRefList(); renderScene(); };
[els.search, els.cat, els.metric].forEach(el=>el.addEventListener(el===els.search?'input':'change', ()=>{ renderList(); renderRefList(); renderScene(); fitView(); }));
updateDetails(null); renderList(); renderRefList(); renderScene(); fitView();
})();
