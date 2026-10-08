(()=>{
'use strict';
const data = window.DRAGONS;
const ns = 'http://www.w3.org/2000/svg';
const byId = id => document.getElementById(id);
const viewport = byId('viewport');
const scene = byId('scene');
const world = byId('world');
const cats = {great:'Wielki Smok', higher:'Wyższy Smok', dragon:'Smok', drakonid:'Drakonid'};
const colors = {great:'#8187ee', higher:'#74cfe2', dragon:'#5bb8a4', drakonid:'#efad71'};
let selected = null, checked = new Set(), compareOnly = false, scale = 1, ox = 30, oy = 20, drag = null;
let rowPositions = new Map(), movedSinceDown = false;
const els = {search:byId('search'), cat:byId('category'), metric:byId('metric'), list:byId('list'), details:byId('details')};
const metricLabels = {length:'Długość', height:'Wysokość', wingspan:'Rozpiętość skrzydeł'};
const fmt = n => n.toLocaleString('pl-PL', {maximumFractionDigits:2}) + ' m';
const measure = d => d[els.metric.value];

function svg(tag, attrs = {}, parent = world){
  const e = document.createElementNS(ns, tag);
  for (const [k,v] of Object.entries(attrs)) e.setAttribute(k, v);
  parent.appendChild(e);
  return e;
}
function textNode(x,y,value,cl,parent=world){ const el = svg('text',{x,y,class:cl},parent); el.textContent=value; return el; }
function escapeHtml(s){ return String(s).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
function metricValueLabel(d){ return measure(d)==null ? 'brak danych' : fmt(measure(d)); }
function detailValue(v){ return v==null ? 'brak danych' : fmt(v); }
function matches(d){
  return (!compareOnly || checked.has(d.id)) &&
    (els.cat.value === 'all' || d.category === els.cat.value) &&
    (d.name + ' ' + d.title).toLowerCase().includes(els.search.value.toLowerCase());
}
function filtered(){ return data.filter(matches).sort((a,b)=>(measure(b)??-1) - (measure(a)??-1)); }

function pick(id, focus = false){
  selected = id;
  const d = data.find(x => x.id === id);
  if (!d) return;
  els.details.innerHTML =
    `<strong>${escapeHtml(d.name)}</strong> <span class="tag">${escapeHtml(cats[d.category])}</span>`+
    `<br>${escapeHtml(d.title)}`+
    `<br>Długość: <strong>${detailValue(d.length)}</strong> · Wysokość: <strong>${detailValue(d.height)}</strong> · Skrzydła: <strong>${detailValue(d.wingspan)}</strong>`+
    `${d.description ? '<br><span class="muted">' + escapeHtml(d.description) + '</span>' : ''}`;
  renderList();
  renderScene();
  if (focus && rowPositions.has(id)) { oy = 38 - rowPositions.get(id) * scale; updateTransform(); }
}

function renderList(){
  els.list.replaceChildren();
  for (const d of filtered()){
    const line = document.createElement('div');
    line.className = 'creature-row' + (d.id === selected ? ' active' : '');
    const check = document.createElement('input');
    check.type = 'checkbox';
    check.checked = checked.has(d.id);
    check.title = 'Dodaj do porównania';
    check.addEventListener('click', ev => ev.stopPropagation());
    check.addEventListener('change', () => {
      if (check.checked && checked.size >= 4){
        check.checked = false;
        alert('Możesz porównać maksymalnie 4 stworzenia.');
        return;
      }
      check.checked ? checked.add(d.id) : checked.delete(d.id);
      byId('count').textContent = checked.size;
    });
    const label = document.createElement('span');
    label.innerHTML = `${escapeHtml(d.name)}<small>${escapeHtml(cats[d.category])} · ${metricValueLabel(d)}</small>`;
    line.append(check, label);
    line.onclick = () => pick(d.id, true);
    els.list.append(line);
  }
}

function renderScene(){
  world.replaceChildren();
  rowPositions = new Map();
  const items = filtered();
  const max = Math.max(10, ...items.map(x => measure(x) || 0));
  // Każdy obraz zajmuje dokładnie szerokość odpowiadającą długości w metrach.
  // Zachowujemy przy tym naturalne proporcje PNG: nigdy nie obcinamy głowy, skrzydeł ani ogona.
  const drawWidth = 770;
  const ppu = drawWidth / max;
  const startY = 105;
  const baseX = 250;
  const labelX = 14;
  const imageAspect = 1086/1448;
  let currentY = startY;
  const rows = items.map(d => {
    const lengthPx = (measure(d)||0) * ppu;
    const hasIllustration = Boolean(d.silhouette && els.metric.value === 'length' && measure(d) != null);
    const imageWidth = Math.max(5, lengthPx);
    const imageHeight = imageWidth * imageAspect;
    const rowHeight = hasIllustration ? Math.max(138, imageHeight + 78) : 88;
    const row = {d, y:currentY, lengthPx, hasIllustration, imageWidth, imageHeight, rowHeight};
    rowPositions.set(d.id,currentY);
    currentY += rowHeight;
    return row;
  });

  // Podziałka pozostaje wspólna dla wszystkich stworzeń i przelicza się po zmianie filtra.
  for (let j=0; j<=5; j++) {
    const val=max*j/5;
    const x=baseX+val*ppu;
    svg('line',{x1:x,y1:46,x2:x,y2:currentY,class:'scale-line','stroke-dasharray':'4 10',opacity:.42});
    textNode(x+4,30,fmt(val),'scale-label');
  }

  for (const row of rows){
    const {d,y,lengthPx,hasIllustration,imageWidth,imageHeight,rowHeight}=row;
    const barW=Math.max(1,lengthPx);
    const isSelected=d.id===selected;
    const g=svg('g',{class:'creature-g',tabindex:'0',role:'button','aria-label':d.name});
    const lineY=y+rowHeight-12;
    svg('line',{x1:0,y1:lineY,x2:1240,y2:lineY,class:'rowline'},g);
    textNode(labelX,y+22,d.name,'name',g);
    textNode(labelX,y+44,metricValueLabel(d),'dimension',g);

    if(hasIllustration){
      const imageY=y+2;
      // PNG już posiada prawdziwą przezroczystość. Bez clip-path i bez "slice".
      svg('image',{
        href:d.silhouette,
        x:baseX,y:imageY,width:imageWidth,height:imageHeight,
        preserveAspectRatio:'xMinYMin meet',
        'pointer-events':'none'
      },g);
      const meterLine=imageY+imageHeight+5;
      svg('line',{
        x1:baseX,y1:meterLine,x2:baseX+barW,y2:meterLine,
        stroke:isSelected?'#effaff':colors[d.category],
        'stroke-width':isSelected?4:2.8,opacity:.95
      },g);
      svg('line',{x1:baseX,y1:meterLine-5,x2:baseX,y2:meterLine+5,stroke:colors[d.category],'stroke-width':2},g);
      svg('line',{x1:baseX+barW,y1:meterLine-5,x2:baseX+barW,y2:meterLine+5,stroke:colors[d.category],'stroke-width':2},g);
    }else if(measure(d)!=null){
      // Dla pozostałych stworzeń i innych wymiarów używamy dotychczasowych pasków.
      svg('path',{
        d:`M ${baseX} ${y+32} L ${baseX+barW*.08} ${y+18} L ${baseX+barW*.7} ${y+18} L ${baseX+barW} ${y+26} L ${baseX+barW*.78} ${y+42} L ${baseX} ${y+42} Z`,
        fill:colors[d.category],opacity:isSelected?1:.75,class:'outline'
      },g);
      svg('circle',{cx:baseX+Math.min(barW*.1,22),cy:y+26,r:Math.min(5,Math.max(1,barW*.025)),fill:'#f6fbff'},g);
    }
    g.addEventListener('click',()=>{if(!movedSinceDown) pick(d.id);});
    g.addEventListener('keydown',ev=>{if(ev.key==='Enter') pick(d.id);});
  }
  // Stały rozmiar okna widoku: wysokość całego atlasu nie może pomniejszać rysunków.
  // Przesuwanie w dół pozwala dotrzeć do kolejnych stworzeń.
  scene.setAttribute('viewBox','0 0 1280 750');
  byId('sceneTitle').textContent=`${metricLabels[els.metric.value]} · ${items.length} stworzeń`;
  const note=document.querySelector('.bottom span');
  if(note) note.textContent=els.metric.value==='length'
    ? 'Pełne sylwetki pierwszych trzech smoków. Szerokość ilustracji odpowiada długości na podziałce; wysokość grafiki jest poglądowa. Przeciągnij, aby przejść do kolejnych stworzeń.'
    : 'Porównanie liczbowe w metrach. Pełne boczne sylwetki oglądaj w trybie „Długość”.';
  updateTransform();
}
function updateTransform(){
  world.setAttribute('transform', `translate(${ox} ${oy}) scale(${scale})`);
  byId('zoomLabel').textContent = Math.round(scale * 100) + '%';
}
function zoom(factor, x, y){
  const r = scene.getBoundingClientRect(), v = scene.viewBox.baseVal;
  const sx = (x - r.left) * v.width / r.width, sy = (y - r.top) * v.height / r.height;
  const next = Math.min(25, Math.max(0.25, scale * factor)), ratio = next / scale;
  ox = sx - (sx - ox) * ratio;
  oy = sy - (sy - oy) * ratio;
  scale = next;
  updateTransform();
}

viewport.addEventListener('wheel', ev => { ev.preventDefault(); zoom(ev.deltaY < 0 ? 1.2 : 1/1.2, ev.clientX, ev.clientY); }, {passive:false});
viewport.addEventListener('pointerdown', ev => { if (ev.button !== 0) return; movedSinceDown = false; drag = {x:ev.clientX, y:ev.clientY, ox, oy}; viewport.setPointerCapture(ev.pointerId); });
viewport.addEventListener('pointermove', ev => {
  if (!drag) return;
  if (Math.hypot(ev.clientX-drag.x,ev.clientY-drag.y)>5) movedSinceDown=true;
  const r = scene.getBoundingClientRect(), v = scene.viewBox.baseVal;
  ox = drag.ox + (ev.clientX - drag.x) * v.width / r.width;
  oy = drag.oy + (ev.clientY - drag.y) * v.height / r.height;
  updateTransform();
});
viewport.addEventListener('pointerup', ()=>drag=null);
viewport.addEventListener('pointercancel', ()=>drag=null);

byId('zoomIn').onclick = () => { const r = scene.getBoundingClientRect(); zoom(1.3, r.left+r.width/2, r.top+r.height/2); };
byId('zoomOut').onclick = () => { const r = scene.getBoundingClientRect(); zoom(1/1.3, r.left+r.width/2, r.top+r.height/2); };
function reset(){ scale = 1; ox = 30; oy = 20; updateTransform(); }
byId('reset').onclick = reset;
byId('compare').onclick = () => {
  if (!checked.size){ alert('Zaznacz od 1 do 4 stworzeń po lewej.'); return; }
  compareOnly = !compareOnly;
  byId('compare').textContent = compareOnly ? 'Pokaż wszystkie' : `Porównaj wybrane (${checked.size})`;
  renderList(); renderScene(); reset();
};
[els.search, els.cat, els.metric].forEach(e => e.addEventListener(e===els.search?'input':'change', ()=>{ renderList(); renderScene(); reset(); }));
renderList(); renderScene();
})();
