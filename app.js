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
let selected = null, checked = new Set(data.map(d => d.id)), compareOnly = false, scale = 1, ox = 30, oy = 20, drag = null;
let rowPositions = new Map(), movedSinceDown = false;
let viewMode = 'list', overlapAlpha = .55;
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
      check.checked ? checked.add(d.id) : checked.delete(d.id);
      updateCompareButton();
      if (viewMode !== 'list') {renderScene(); fitView();}
    });
    const label = document.createElement('span');
    label.innerHTML = `${escapeHtml(d.name)}<small>${escapeHtml(cats[d.category])} · ${metricValueLabel(d)}</small>`;
    line.append(check, label);
    line.onclick = () => pick(d.id, true);
    els.list.append(line);
  }
}

function renderScene(){
  if(viewMode !== 'list') return renderComparison();
  world.replaceChildren();
  rowPositions = new Map();
  const items = filtered();
  const max = Math.max(10, ...items.map(x => measure(x) || 0));
  // Każdy obraz zajmuje dokładnie szerokość odpowiadającą długości w metrach.
  // Zachowujemy przy tym naturalne proporcje PNG: nigdy nie obcinamy głowy, skrzydeł ani ogona.
  const isHeight = els.metric.value === 'height';
  // Dwie niezależne skale: długość wyznacza szerokość, wysokość wysokość obrazu.
  const drawWidth = isHeight ? 440 : 770;
  const ppu = drawWidth / max;
  const HEAD_FOOT_FRACTION = .73; // Szacunkowy odcinek od głowy do łap w obecnych ilustracjach.
  const startY = 105;
  const baseX = 250;
  const labelX = 14;
  const imageAspect = 1086/1448;
  let currentY = startY;
  const rows = items.map(d => {
    const lengthPx = (measure(d)||0) * ppu;
    const hasIllustration = Boolean(d.silhouette && (els.metric.value === 'length' || isHeight) && measure(d) != null);
    const imageHeight = isHeight ? Math.max(3,lengthPx/HEAD_FOOT_FRACTION) : Math.max(5,lengthPx)*imageAspect;
    const imageWidth = isHeight ? imageHeight/imageAspect : Math.max(5,lengthPx);
    const rowHeight = hasIllustration ? Math.max(138, imageHeight + 78) : 88;
    const row = {d, y:currentY, lengthPx, hasIllustration, imageWidth, imageHeight, rowHeight};
    rowPositions.set(d.id,currentY);
    currentY += rowHeight;
    return row;
  });

  // Podziałka pozostaje wspólna dla wszystkich stworzeń i przelicza się po zmianie filtra.
  if(!isHeight){
    for (let j=0; j<=5; j++) {
      const val=max*j/5;
      const x=baseX+val*ppu;
      svg('line',{x1:x,y1:46,x2:x,y2:currentY,class:'scale-line','stroke-dasharray':'4 10',opacity:.42});
      textNode(x+4,30,fmt(val),'scale-label');
    }
  }else{
    textNode(baseX,36,'SKALA PIONOWA · od łap do głowy (orientacyjna)','scale-label');
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
      if(isHeight){
        const markerX=baseX+imageWidth+12;
        const headY=imageY+imageHeight*.17, feetY=imageY+imageHeight*.90;
        svg('line',{x1:markerX,y1:headY,x2:markerX,y2:feetY,stroke:colors[d.category],'stroke-width':2.5},g);
        for(const yy of [headY,feetY]) svg('line',{x1:markerX-6,y1:yy,x2:markerX+6,y2:yy,stroke:colors[d.category],'stroke-width':2},g);
      }else{
        const meterLine=imageY+imageHeight+5;
        svg('line',{
          x1:baseX,y1:meterLine,x2:baseX+barW,y2:meterLine,
          stroke:isSelected?'#effaff':colors[d.category],
          'stroke-width':isSelected?4:2.8,opacity:.95
        },g);
        svg('line',{x1:baseX,y1:meterLine-5,x2:baseX,y2:meterLine+5,stroke:colors[d.category],'stroke-width':2},g);
        svg('line',{x1:baseX+barW,y1:meterLine-5,x2:baseX+barW,y2:meterLine+5,stroke:colors[d.category],'stroke-width':2},g);
      }
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
    ? 'DŁUGOŚĆ: szerokości ilustracji odpowiadają długościom smoków. Przeciągnij planszę, aby zobaczyć dalsze.'
    : isHeight
      ? 'WYSOKOŚĆ: sylwetki mają wspólną skalę pionową. Punkty głowy i łap są orientacyjne — skrzydła mogą wystawać ponad głowę.'
      : 'ROZPIĘTOŚĆ: paski przedstawiają wartości liczbowe. Do wizualizacji skrzydeł potrzebne będą osobne rzuty z góry.';
  updateTransform();
}
function updateCompareButton(){
  const btn = byId('compare');
  btn.innerHTML = viewMode === 'list'
    ? `Porównaj wybrane (<span id="count">${checked.size}</span>)`
    : 'Wróć do listy';
}
function setMode(mode){
  viewMode = mode;
  ['list','side','overlay'].forEach(key=>{
    const name = {list:'viewList',side:'viewSide',overlay:'viewOverlay'}[key];
    byId(name).classList.toggle('active',mode===key);
    byId(name).setAttribute('aria-pressed', String(mode===key));
  });
  byId('alphaWrap').hidden = mode!=='overlay';
  updateCompareButton();
  renderList(); renderScene(); fitView();
}
function fitView(){
  scale = 1; ox = 0; oy = 0;
  updateTransform();
}
function drawGrid(w,h,maxMeters,startX=0,endX=w){
  // Linie podziałki i etykiety na wspólnej skali metrycznej.
  const steps=5;
  for(let i=0;i<=steps;i++){
    const val=maxMeters*i/steps;
    const x=startX+(endX-startX)*i/steps;
    svg('line',{x1:x,y1:54,x2:x,y2:h-45,stroke:'#54718e','stroke-width':1,'stroke-dasharray':'5 12',opacity:.32});
    textNode(x+5,46,fmt(val),'scale-label');
  }
}
function renderComparison(){
  world.replaceChildren();
  rowPositions=new Map();
  const chosen = filtered().filter(d=>checked.has(d.id)).sort((a,b)=>(measure(b)??0)-(measure(a)??0));
  const available=chosen.filter(d=>Number.isFinite(measure(d))&&measure(d)>0);
  const metric=els.metric.value;
  const isLength = metric === 'length';
  const isHeight = metric === 'height';
  const hasImages = isLength || isHeight;
  const note = document.querySelector('.bottom span');
  const isOverlay=viewMode==='overlay';
  if(!available.length){
    scene.setAttribute('viewBox','0 0 1000 640');
    textNode(90,250,chosen.length?'Brak danych dla wybranego wymiaru':'Zaznacz stworzenia w panelu po lewej.','name');
    if(note) note.textContent='Zaznacz dowolną liczbę stworzeń po lewej stronie.';
    byId('sceneTitle').textContent='Porównanie · brak wybranych danych';
    updateTransform();
    return;
  }
  const max = Math.max(...available.map(d=>measure(d)));
  const aspect=1086/1448;             // Wysokość / szerokość obecnych assetów.
  const headY=.17, footY=.90;         // Szacowane punkty na obrazach (głowa i łapy).
  const standingFraction=footY-headY; // 0.73 wysokości pliku odpowiada wysokości postaci.
  const ppu = (isHeight?440:640)/max;
  const px=d=>measure(d)*ppu;
  const foot=d=>({Abyrion:.865, Omnich:.88, Vran:.88}[d.name]??.88);
  const imageHeight=d=>isHeight ? px(d)/standingFraction : px(d)*aspect;
  const imageWidth=d=>isHeight ? imageHeight(d)/aspect : px(d);
  const visualWidth=d=>isHeight && !d.silhouette
    ? Math.max(34, Math.min(104,px(d)*.65)) : imageWidth(d);
  const Hmax=hasImages ? Math.max(...available.map(d=>imageHeight(d))) : 300;
  const baseLine=130+(isHeight?Hmax*footY:Hmax*.88);
  const barHeight=hasImages?0:86;
  const cols=Math.min(4,Math.max(1,Math.ceil(available.length/8)));
  const legendRows=Math.ceil(available.length/cols);
  const sceneH=Math.ceil(baseLine+(isOverlay?135+legendRows*27:165)+barHeight);
  let sceneW, spots=[];
  if(isOverlay){
    sceneW=Math.max(1380, Math.ceil(210+visualWidth(available[0])+135));
    spots=available.map(d=>({d,x:175,width:visualWidth(d)}));
    if(isHeight){
      // Linie poziome oznaczają realną skalę wysokości; głowy są przybliżone.
      for(let i=0;i<=5;i++){
        const meters=max*i/5;
        const y=baseLine-meters*ppu;
        svg('line',{x1:160,y1:y,x2:sceneW-30,y2:y,stroke:'#54718e','stroke-width':1,'stroke-dasharray':'5 12',opacity:.35});
        textNode(15,y-5,fmt(meters),'scale-label');
      }
    } else {
      drawGrid(sceneW,sceneH,max,175,175+px(available[0]));
    }
  }else{
    const gap=86;
    let nextX=85;
    for(const d of available){
      const w=visualWidth(d);
      spots.push({d,x:nextX,width:w});
      nextX+=w+gap;
    }
    sceneW=Math.max(1020,Math.ceil(nextX+25));
    if(isHeight){
      for(let i=0;i<=5;i++){
        const meters=max*i/5;
        const y=baseLine-meters*ppu;
        svg('line',{x1:35,y1:y,x2:sceneW-35,y2:y,stroke:'#54718e','stroke-width':1,'stroke-dasharray':'5 12',opacity:.35});
        textNode(4,y-5,fmt(meters),'scale-label');
      }
    }
  }
  textNode(30,26,`${isOverlay?'NAŁOŻONE':'OBOK SIEBIE'} • 1 wspólna skala`,'compare-heading');
  svg('line',{x1:50,y1:baseLine,x2:sceneW-50,y2:baseLine,stroke:'#abc7dd','stroke-width':1.3,opacity:.75});
  spots.forEach(({d,x,width},index)=>{
    const g=svg('g',{class:'compare-creature',tabindex:'0',role:'button','aria-label':d.name});
    const has=d.silhouette && hasImages;
    const imgH=has ? imageHeight(d) : 0;
    const imgY=baseLine-imgH*(isHeight?footY:foot(d));
    const palette=['#c5a0ff','#d1dbe4','#52baff','#ffb96a','#98eeaa','#fb8fa5','#e4d874','#99b6ff'];
    const color=palette[index%palette.length];
    const alpha = isOverlay ? Math.max(.09,Math.min(.9,overlapAlpha*Math.sqrt(4/available.length))):1;
    if(has){
      svg('image',{href:d.silhouette,x,y:imgY,width,height:imgH,preserveAspectRatio:'xMinYMin meet',opacity:alpha,'pointer-events':'none'},g);
    } else {
      // Placeholder, kiedy dla danego stworzenia nie mamy jeszcze sylwetki.
      if(isHeight){
        svg('rect',{x:x+10,y:baseLine-px(d),width:Math.max(12,width-20),height:Math.max(1,px(d)),rx:3,fill:color,opacity:isOverlay?alpha:.7},g);
      }else{
        const fillY=baseLine-36;
        svg('path',{d:`M ${x} ${baseLine} L ${x+width*.09} ${fillY} L ${x+width*.74} ${fillY} L ${x+width} ${baseLine-10} L ${x+width*.84} ${baseLine} Z`,fill:color,opacity:isOverlay?alpha:.82},g);
      }
    }
    const lineY=isOverlay ? baseLine+34 : baseLine+50;
    if(isHeight){
      if(!isOverlay){
        const rulerX=x+width+8, rulerH=px(d);
        svg('line',{x1:rulerX,y1:baseLine-rulerH,x2:rulerX,y2:baseLine,stroke:color,'stroke-width':2.5},g);
        for(const yy of [baseLine-rulerH,baseLine]) svg('line',{x1:rulerX-6,y1:yy,x2:rulerX+6,y2:yy,stroke:color,'stroke-width':2},g);
      }
    }else if(!isOverlay || available.length<=5){
      svg('line',{x1:x,y1:lineY,x2:x+width,y2:lineY,stroke:color,'stroke-width':3,opacity:.93},g);
      for(const end of [x,x+width]) svg('line',{x1:end,y1:lineY-7,x2:end,y2:lineY+7,stroke:color,'stroke-width':2},g);
    }
    if(isOverlay){
      const columnCount = Math.min(4,Math.max(1,Math.ceil(available.length/8)));
      const rowCount = Math.ceil(available.length/columnCount);
      const col = Math.floor(index/rowCount), row = index%rowCount;
      const lx=42+col*305, ly=baseLine+94+row*27;
      svg('circle',{cx:lx,cy:ly-5,r:6,fill:color,stroke:'#effaff','stroke-width':1},g);
      textNode(lx+17,ly,`${d.name} · ${fmt(measure(d))}`,'compare-label',g);
    }else{
      textNode(x,72,d.name,'compare-label',g);
      textNode(x,lineY+25,`${fmt(measure(d))} · ${Math.round(100*measure(d)/max)}% największego`,'dimension',g);
    }
    const hitH=has?Math.max(110,imgH):Math.max(94,px(d));
    svg('rect',{x,y:baseLine-hitH*(isHeight?1:.9),width:Math.max(10,width),height:hitH,fill:'transparent'},g);
    g.addEventListener('click',()=>{if(!movedSinceDown) pick(d.id,false);});
    g.addEventListener('keydown',ev=>{if(ev.key==='Enter') pick(d.id,false);});
  });
  scene.setAttribute('viewBox',`0 0 ${isOverlay?sceneW:Math.min(sceneW,1380)} ${sceneH}`);
  byId('sceneTitle').textContent=`${isOverlay?'Nakładka':'Obok siebie'} · ${metricLabels[metric]} · ${available.length} ${available.length === 1 ? 'stworzenie' : 'stworzenia'}`;
  if(note) note.textContent=isLength
    ? `DŁUGOŚĆ: grafiki są skalowane według długości; proporcje wysokości pozostają orientacyjne. ${isOverlay?'Przezroczystość regulujesz suwakiem.':'Przeciągnij scenę w bok, aby zobaczyć wszystkie stworzenia.'}`
    : isHeight
      ? `WYSOKOŚĆ: sylwetki mają wspólną skalę od łap do głowy (orientacyjne punkty na ilustracjach). Skrzydła mogą sięgać wyżej niż głowa. ${isOverlay?'Przezroczystość regulujesz suwakiem.':'Przeciągaj scenę w bok.'}`
      : 'ROZPIĘTOŚĆ: pozostają paski liczbowe. Aby dokładnie porównać skrzydła, potrzebne są rzuty z góry.';
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
// Przycisk ze starego interfejsu również otwiera tryb porównania.
byId('compare').onclick = () => setMode(viewMode === 'list' ? 'side' : 'list');
byId('viewList').onclick = () => setMode('list');
byId('viewSide').onclick = () => setMode('side');
byId('viewOverlay').onclick = () => setMode('overlay');
byId('fitView').onclick = fitView;
byId('selectAll').onclick = () => {
  checked = new Set(data.map(d => d.id));
  updateCompareButton(); renderList(); renderScene(); fitView();
};
byId('clearAll').onclick = () => {
  checked.clear();
  updateCompareButton(); renderList(); renderScene(); fitView();
};
byId('overlayAlpha').addEventListener('input', e=>{
  overlapAlpha = Number(e.target.value)/100;
  if(viewMode==='overlay') renderScene();
});
[els.search, els.cat, els.metric].forEach(e => e.addEventListener(e===els.search?'input':'change', ()=>{ renderList(); renderScene(); fitView(); }));
updateCompareButton(); renderList(); renderScene();
})();
