let helmetData={items:[]},traderIcons={},helmetMasters={},helmetClass='all';
const $=selector=>document.querySelector(selector);
const {safe,format,fuzzy}=TarkovUI;
const colors={1:'#C0564E',2:'#CA7050',3:'#D28B4B',4:'#C6A849',5:'#94BE55',6:'#55D275'};
function coverageLevel(item,part){
  if(part.startsWith('ears-'))return item.ears;
  if(part==='face-jaw')return item.face&&item.face===item.jaw?item.face:null;
  return {top:item.top,back:item.back,eyes:item.eyes,throat:item.throat,'neck-back':item.backNeck}[part]||null;
}
function figure(item,view){
  const svg=helmetMasters[view].cloneNode(true);
  svg.setAttribute('width','66');svg.setAttribute('height','78');svg.setAttribute('role','img');svg.setAttribute('aria-label',`${view} helmet coverage`);
  for(const group of svg.querySelectorAll('[data-part]')){
    const level=coverageLevel(item,group.dataset.part),shape=group.querySelector('path,rect');
    shape.setAttribute('fill',colors[level]||'#434D45');shape.setAttribute('stroke',group.dataset.part==='eyes'?'#E3EBDF':level?'#1d281e':'#A9B7A4');
    if(group.dataset.part==='eyes')shape.setAttribute('stroke-width','1.1');
  }
  return `<span class="helmet-view">${new XMLSerializer().serializeToString(svg)}<small>${view.toUpperCase()}</small></span>`;
}
function zoneSummary(item){
  const labels=[['Top',item.top],['Back',item.back],['Ears',item.ears],['Eyes',item.eyes],['Face',item.face],['Jaw',item.jaw],['Throat',item.throat],['Back neck',item.backNeck]];
  return labels.filter(([name,level])=>level||['Top','Back','Ears'].includes(name)).map(([name,level])=>`${name} ${level??'?'}`).join(' · ');
}
const hearing=value=>({None:'Clear',Low:'Slightly muffled',High:'Heavily muffled'}[value]||'Unknown');
function render(){
  const search=$('#search').value,sort=$('#sort').value;
  const items=helmetData.items.filter(item=>(helmetClass==='all'||item.class===Number(helmetClass))&&fuzzy(`${item.name} ${item.acquisition?.trader||''}`,search));
  items.sort((a,b)=>sort==='name'?a.name.localeCompare(b.name):sort==='weight'?(a.weight??999)-(b.weight??999):sort==='durability'?(b.durability||0)-(a.durability||0):b.class-a.class||(b.durability||0)-(a.durability||0));
  $('#total').textContent=items.length;
  const classes=[...new Set(items.map(item=>item.class))].sort((a,b)=>b-a);
  $('#chart').innerHTML=classes.length?classes.map(cls=>{
    const group=items.filter(item=>item.class===cls);
    return `<section class="group"><div class="group-head"><h2>CLASS ${cls}</h2><span class="count">${group.length} ITEMS</span><div class="rule"></div></div><div class="table-wrap"><table class="helmet-table"><thead><tr><th class="helmet-class-cell"></th><th>HELMET</th><th>FRONT / BACK</th><th class="numeric">DUR</th><th>ZONES</th><th>DETAILS</th><th>OBTAIN</th></tr></thead><tbody>${group.map(item=>`<tr><td class="helmet-class-cell" style="background:${colors[cls]}">${cls}</td><td><div class="item"><img class="item-icon" src="${safe(item.localIcon)}" alt="" loading="lazy"><a class="itemlink" href="${safe(item.link)}" target="_blank" rel="noreferrer">${safe(item.name)}</a></div></td><td><div class="helmet-coverage">${figure(item,'front')}${figure(item,'back')}</div></td><td class="numeric helmet-dur">${format(item.durability)}</td><td class="helmet-zones">${safe(zoneSummary(item))}</td><td class="details"><span>⚖ ${item.weight??'—'} kg</span><span>↗ ${item.speed??0}% speed</span><span>◈ ${item.ergo??0}% ergo</span><span>Hearing: ${hearing(item.deafening)}</span></td><td class="obtain">${TarkovUI.acquisition(item.acquisition,traderIcons)}</td></tr>`).join('')}</tbody></table></div></section>`;
  }).join(''):'<div class="empty">No close matches.</div>';
}
async function init(){
  const embedded=globalThis.__TARKOV_RELEASE__;
  if(embedded){helmetData=embedded.helmets;traderIcons=embedded.traderIcons;helmetMasters=Object.fromEntries(Object.entries(embedded.helmetMasters).map(([view,svg])=>[view,new DOMParser().parseFromString(svg,'image/svg+xml').documentElement]))}
  else{
    const responses=await Promise.all(['data/helmets.json','data/trader-icons.json','assets/helmet-front.svg','assets/helmet-back.svg'].map(url=>fetch(url)));
    if(responses.some(response=>!response.ok))throw Error('Helmet data unavailable. Run npm run refresh:gear.');
    helmetData=await responses[0].json();traderIcons=await responses[1].json();helmetMasters={front:new DOMParser().parseFromString(await responses[2].text(),'image/svg+xml').documentElement,back:new DOMParser().parseFromString(await responses[3].text(),'image/svg+xml').documentElement};
  }
  $('#date').textContent=new Date(helmetData.fetchedAt).toLocaleDateString();
  $('#source').textContent=`Source: ${helmetData.source} · ${helmetData.url} · Collected ${new Date(helmetData.fetchedAt).toLocaleString()}`;
  $('#classes').innerHTML=['all',6,5,4,3,2,1].map(cls=>`<button data-class="${cls}" class="${cls==='all'?'active':''}">${cls==='all'?'ALL CLASSES':`CLASS ${cls}`}</button>`).join('');
  $('#classes').onclick=event=>{const button=event.target.closest('button');if(!button)return;helmetClass=button.dataset.class;for(const item of document.querySelectorAll('.classes button'))item.classList.toggle('active',item===button);render()};
  $('#search').oninput=render;$('#sort').onchange=render;render();
}
init().catch(error=>{$('#chart').innerHTML=`<div class="empty">${safe(error.message)}</div>`});
