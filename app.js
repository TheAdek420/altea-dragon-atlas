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

function pick(id){
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
    line.onclick = () => pick(d.id);
    els.list.append(line);
  }
}

function renderScene(){
  world.replaceChildren();
  const items = filtered();
  const max = Math.max(10, ...items.map(x => measure(x) || 0));
  const drawWidth = 1000;
  const ppu = drawWidth / max;
  const yTop = 96;
  const rowHeight = 84;
  const baseX = 230;
  const labelX = 10;

  for (let j = 0; j <= 5; j++){
    const val = max * j / 5;
    const x = baseX + val * ppu;
    svg('line',{x1:x,y1:40,x2:x,y2:yTop+items.length*rowHeight,class:'scale-line','stroke-dasharray':'4 10',opacity:.45});
    textNode(x+4, 30, fmt(val), 'scale-label');
  }

  items.forEach((d, i) => {
    const y = yTop + i * rowHeight;
    const w = (measure(d) || 0) * ppu;
    const barW = Math.max(1, w);
    const isSelected = d.id === selected;
    const g = svg('g', {class:'creature-g', tabindex:'0', role:'button', 'aria-label':d.name});
    svg('line', {x1:0, y1:y+31, x2:1250, y2:y+31, class:'rowline'}, g);
    textNode(labelX, y+8, d.name, 'name', g);
    textNode(labelX, y+28, metricValueLabel(d), 'dimension', g);

    if (d.silhouette && measure(d) != null){
      const boxX = baseX;
      const boxY = y - 2;
      const boxH = 56;
      const clipId = `clip-${d.id}`;
      svg('rect', {
        x: boxX, y: boxY, width: barW, height: boxH,
        rx: 8, fill: colors[d.category], opacity: isSelected ? 0.28 : 0.18,
        stroke: isSelected ? '#f1f8ff' : '#8eb3d3', 'stroke-width': isSelected ? 2.2 : 1.2
      }, g);
      const defs = svg('defs', {}, g);
      const cp = svg('clipPath', {id: clipId}, defs);
      svg('rect', {x: boxX, y: boxY, width: barW, height: boxH, rx: 8}, cp);
      svg('image', {
        href: d.silhouette,
        x: boxX, y: boxY, width: Math.max(barW, 40), height: boxH,
        preserveAspectRatio: 'xMinYMid slice',
        'clip-path': `url(#${clipId})`
      }, g);
      svg('rect', {
        x: boxX, y: boxY, width: barW, height: boxH,
        rx: 8, fill:'none', stroke: isSelected ? '#f1f8ff' : 'rgba(175,215,245,0.55)', 'stroke-width': isSelected ? 2.2 : 1.2
      }, g);
    } else {
      svg('path', {
        d:`M ${baseX} ${y+20} L ${baseX+barW*.08} ${y+6} L ${baseX+barW*.7} ${y+6} L ${baseX+barW} ${y+14} L ${baseX+barW*.78} ${y+30} L ${baseX} ${y+30} Z`,
        fill:colors[d.category], opacity:isSelected?1:.75, class:'outline'
      }, g);
      svg('circle', {
        cx:baseX+Math.min(barW*.1,22), cy:y+14, r:Math.min(5,Math.max(1,barW*.025)), fill:'#f6fbff'
      }, g);
    }
    g.addEventListener('click', () => pick(d.id));
    g.addEventListener('keydown', ev => { if (ev.key === 'Enter') pick(d.id); });
  });

  scene.setAttribute('viewBox', `0 0 1280 ${Math.max(520, yTop + items.length * rowHeight + 50)}`);
  byId('sceneTitle').textContent = `${metricLabels[els.metric.value]} · ${items.length} stworzeń`;
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
viewport.addEventListener('pointerdown', ev => { if (ev.button !== 0) return; drag = {x:ev.clientX, y:ev.clientY, ox, oy}; viewport.setPointerCapture(ev.pointerId); });
viewport.addEventListener('pointermove', ev => {
  if (!drag) return;
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
