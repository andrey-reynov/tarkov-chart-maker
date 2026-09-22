let helmetData={items:[]},traderIcons={},helmetMaster,helmetClass='all';
const $=selector=>document.querySelector(selector);
const {safe,format,fuzzy}=TarkovUI;
const colors={1:'#C0564E',2:'#CA7050',3:'#D28B4B',4:'#C6A849',5:'#94BE55',6:'#55D275'};
function figure(item){
  const svg=helmetMaster.cloneNode(true);
  svg.setAttribute('width','102');svg.setAttribute('height','93');svg.setAttribute('role','img');svg.setAttribute('aria-label','Helmet top, back and ear coverage');
  for(const group of svg.querySelectorAll('[data-part]')){
    const level=item[group.dataset.part],path=group.querySelector('path');
    path.setAttribute('fill',colors[level]||'#434D45');path.setAttribute('stroke',level?'#1d281e':'#A9B7A4');
  }
  return new XMLSerializer().serializeToString(svg);
}
function extras(item){
  const zones=item.zones||[],labels=[];
  if(zones.some(z=>z.includes('Eyes')))labels.push(`Eyes ${item.eyes||'—'}`);
  if(zones.some(z=>z.includes('Jaw')))labels.push(`Jaw ${item.jaw||'—'}`);
  if(zones.some(z=>z.includes('HeadCommon')))labels.push(`Face ${item.face||'—'}`);
  if(zones.some(z=>z.includes('Neck')))labels.push(`Neck ${item.neck||'—'}`);
  return labels.length?labels.map(label=>`<span class="zone-chip">${label}</span>`).join(''):'<span class="muted">No built in face protection</span>';
}
function render(){
  const search=$('#search').value,sort=$('#sort').value;
  const items=helmetData.items.filter(item=>(helmetClass==='all'||item.class===Number(helmetClass))&&fuzzy(`${item.name} ${item.acquisition?.trader||''}`,search));
  items.sort((a,b)=>sort==='name'?a.name.localeCompare(b.name):sort==='weight'?(a.weight??999)-(b.weight??999):sort==='durability'?(b.durability||0)-(a.durability||0):b.class-a.class||(b.durability||0)-(a.durability||0));
  $('#total').textContent=items.length;
  const classes=[...new Set(items.map(item=>item.class))].sort((a,b)=>b-a);
  $('#chart').innerHTML=classes.length?classes.map(cls=>{
    const group=items.filter(item=>item.class===cls);
    return `<section class="group"><div class="group-head"><h2>${cls?`CLASS ${cls}`:'UNRATED'}</h2><span class="count">${group.length} ITEMS</span><div class="rule"></div></div><div class="table-wrap"><table class="helmet-table"><thead><tr><th>HELMET</th><th>BUILT IN COVERAGE</th><th>OTHER ZONES</th><th class="numeric">DUR</th><th>DETAILS</th><th>OBTAIN</th></tr></thead><tbody>${group.map(item=>`<tr><td><div class="item"><img class="item-icon" src="${safe(item.localIcon)}" alt="" loading="lazy"><a class="itemlink" href="${safe(item.link)}" target="_blank" rel="noreferrer">${safe(item.name)}</a></div></td><td><div class="helmet-coverage">${figure(item)}<span><span>Top ${item.top||'—'}</span><span>Back ${item.back||'—'}</span><span>Ears ${item.ears||'—'}</span></span></div></td><td class="zones">${extras(item)}</td><td class="numeric">${format(item.durability)}</td><td class="details"><span>⚖ ${item.weight??'—'} kg</span><span>↗ ${item.speed??0}% speed</span><span>◈ ${item.ergo??0}% ergo</span><span>Sound: ${safe(item.deafening||'—')}</span></td><td class="obtain">${TarkovUI.acquisition(item.acquisition,traderIcons)}</td></tr>`).join('')}</tbody></table></div></section>`;
  }).join(''):'<div class="empty">No close matches.</div>';
}
async function init(){
  const embedded=globalThis.__TARKOV_RELEASE__;
  if(embedded){helmetData=embedded.helmets;traderIcons=embedded.traderIcons;helmetMaster=new DOMParser().parseFromString(embedded.helmetMaster,'image/svg+xml').documentElement}
  else{
    const responses=await Promise.all(['data/helmets.json','data/trader-icons.json','assets/helmet-coverage.svg'].map(url=>fetch(url)));
    if(responses.some(response=>!response.ok))throw Error('Helmet data unavailable. Run npm run refresh:gear.');
    helmetData=await responses[0].json();traderIcons=await responses[1].json();helmetMaster=new DOMParser().parseFromString(await responses[2].text(),'image/svg+xml').documentElement;
  }
  $('#date').textContent=new Date(helmetData.fetchedAt).toLocaleDateString();
  $('#source').textContent=`Source: ${helmetData.source} · ${helmetData.url} · Collected ${new Date(helmetData.fetchedAt).toLocaleString()}`;
  $('#classes').innerHTML=['all',6,5,4,3,2,1].map(cls=>`<button data-class="${cls}" class="${cls==='all'?'active':''}">${cls==='all'?'ALL CLASSES':`CLASS ${cls}`}</button>`).join('');
  $('#classes').onclick=event=>{const button=event.target.closest('button');if(!button)return;helmetClass=button.dataset.class;for(const item of document.querySelectorAll('.classes button'))item.classList.toggle('active',item===button);render()};
  $('#search').oninput=render;$('#sort').onchange=render;render();
}
init().catch(error=>{$('#chart').innerHTML=`<div class="empty">${safe(error.message)}</div>`});
