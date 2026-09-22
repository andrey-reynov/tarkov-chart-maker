let data={items:[]},plates={items:{}},masters={},traderIcons={},active='all';
const $=selector=>document.querySelector(selector);
const plateColors={1:'#C0564E',2:'#CA7050',3:'#D28B4B',4:'#C6A849',5:'#94BE55',6:'#55D275'};
const safe=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const fmt=value=>Number.isFinite(Number(value))?Number(value).toLocaleString():'—';
const pct=value=>value==null?'—':`${value>0?'+':''}${value}%`;
const normalize=value=>String(value??'').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,' ').trim();

function editDistance(a,b){
  const row=Array.from({length:b.length+1},(_,index)=>index);
  for(let i=1;i<=a.length;i++){
    let diagonal=row[0];
    row[0]=i;
    for(let j=1;j<=b.length;j++){
      const previous=row[j];
      row[j]=Math.min(row[j]+1,row[j-1]+1,diagonal+(a[i-1]===b[j-1]?0:1));
      diagonal=previous;
    }
  }
  return row[b.length];
}

function fuzzyMatch(value,query){
  const text=normalize(value),needle=normalize(query);
  if(!needle||text.includes(needle))return true;
  const words=text.split(' '),terms=needle.split(' ');
  return terms.every(term=>{
    if(words.some(word=>word.includes(term)||term.includes(word)&&word.length>=3))return true;
    const limit=term.length<=4?1:Math.ceil(term.length*.25);
    return words.some(word=>editDistance(word,term)<=limit);
  });
}

function armorView(face,record){
  const svg=masters[face].cloneNode(true);
  svg.setAttribute('width','70');
  svg.setAttribute('height','70');
  svg.setAttribute('aria-label',`${face} armor coverage`);
  for(const group of svg.querySelectorAll('[data-part]')){
    const name=group.getAttribute('data-part'),path=group.querySelector('path');
    if(name.startsWith('butt_cover_'))continue;
    const cls=name==='plate'?record?.[face]
      :name==='side_left'?(record?.side||record?.sideLeft)
      :name==='side_right'?(record?.side||record?.sideRight)
      :name==='groin'?record?.[face==='front'?'groinFront':'groinBack']
      :name==='neck'?record?.neck
      :name==='shoulder_left'?record?.shoulderLeft
      :name==='shoulder_right'?record?.shoulderRight:null;
    const fill=cls?plateColors[cls]:'#434D45';
    path.setAttribute('fill',fill);
    if(path.hasAttribute('stroke'))path.setAttribute('stroke',cls?fill:'#A9B7A4');
  }
  if(record?.status==='unknown'){
    const mark=document.createElementNS('http://www.w3.org/2000/svg','text');
    Object.entries({x:'28',y:'32','text-anchor':'middle',fill:'#e5eadd','font-size':'13','font-weight':'bold'}).forEach(([key,value])=>mark.setAttribute(key,value));
    mark.textContent='?';
    svg.append(mark);
  }
  return new XMLSerializer().serializeToString(svg);
}

function fields(item){
  const properties=item.properties||{},slots=properties.armorSlots||[],locked=slots.filter(slot=>Number.isFinite(slot.class));
  const cls=Math.max(properties.class||0,...locked.map(slot=>slot.class||0));
  const durability=Number(properties.durability)||locked.reduce((total,slot)=>total+(slot.durability||0),0);
  const effective=properties.material?.destructibility&&properties.durability?Math.round(properties.durability/properties.material.destructibility):Number(item.effective)||null;
  const variant=item.id.match(/plateminus-v2-(?:plate-carrier|body-armor)-(.+)$/)?.[1]?.replaceAll('-',' ');
  return {...item,variant,cls,durability,effective,material:(properties.material?.name||item.material||'—').replace('Ultra high molecular weight polyethylene','UHMWPE'),speed:properties.speedPenalty??item.speed,ergo:properties.ergoPenalty??item.ergo,acquisition:item.acquisition||{source:'Source unavailable',price:null}};
}

function recordFor(item){
  const slots=item.properties?.armorSlots||[],slotClass=name=>slots.find(slot=>slot.nameId?.toLowerCase()===name)?.class||null;
  const plateRecord=plates.items[item.id]||{};
  return {...plateRecord,front:plateRecord.front||slotClass('soft_armor_front'),back:plateRecord.back||slotClass('soft_armor_back'),sideLeft:slotClass('soft_armor_left'),sideRight:slotClass('soft_armor_right'),groinFront:slotClass('groin'),groinBack:slotClass('groin_back'),neck:slotClass('collar'),shoulderLeft:slotClass('shoulder_l'),shoulderRight:slotClass('shoulder_r')};
}

function render(){
  const query=$('#search').value,category=$('#category').value,sort=$('#sort').value;
  let items=data.items.map(fields).filter(item=>
    (category==='all'||item.category===category)
    && fuzzyMatch(`${item.name} ${item.shortName} ${item.variant||''} ${item.acquisition?.source||''}`,query)
    && (active==='all'||item.cls===Number(active))
  );
  items.sort((a,b)=>sort==='effective'?(b.effective||0)-(a.effective||0):sort==='weight'?(a.weight??999)-(b.weight??999):sort==='name'?a.name.localeCompare(b.name):b.cls-a.cls||(b.effective||0)-(a.effective||0)||a.name.localeCompare(b.name));
  const groups=[...new Set(items.map(item=>item.cls))].sort((a,b)=>b-a);
  $('#total').textContent=items.length;
  $('#chart').innerHTML=groups.length?groups.map(cls=>`<section class="group"><div class="group-head"><h2>CLASS ${cls||'UNRATED'}</h2><span class="count">${items.filter(item=>item.cls===cls).length} ITEMS</span><div class="rule"></div></div><div class="table-wrap"><table><thead><tr><th>ITEM</th><th>FRONT / BACK</th><th class="numeric">DUR</th><th class="numeric">EFF. DUR</th><th>DETAILS</th><th>OBTAIN</th></tr></thead><tbody>${items.filter(item=>item.cls===cls).map(item=>{const record=recordFor(item),source=item.acquisition?.source||'Source unavailable';return `<tr><td class="name"><div class="item"><img class="item-icon" src="${safe(item.localIcon||item.iconLink||'')}" alt="" loading="lazy"><div><a class="itemlink" href="${safe(item.link||'#')}" target="_blank" rel="noreferrer">${safe(item.shortName||item.name)}</a><small>${safe(item.variant||item.name)}</small></div></div></td><td class="coverage-cell"><span class="figures">${armorView('front',record)}${armorView('back',record)}</span></td><td class="numeric">${fmt(item.durability)}</td><td class="numeric effective">${fmt(item.effective)}</td><td class="details"><span>⚖ ${item.weight==null?'—':`${item.weight} kg`}</span><span>↗ ${pct(item.speed)} speed</span><span>◈ ${pct(item.ergo)} ergo</span></td><td class="obtain">${TarkovUI.acquisition(item.acquisition,traderIcons)}</td></tr>`}).join('')}</tbody></table></div></section>`).join(''):'<div class="empty">No close matches. Try fewer letters or another spelling.</div>';
  $('#source').textContent=`Source: ${data.source} · ${data.url} · Collected ${new Date(data.fetchedAt).toLocaleString()}`;
}

async function init(){
  const embedded=globalThis.__TARKOV_RELEASE__;
  if(embedded){
    data=embedded.data;
    plates=embedded.plates;
    masters={front:new DOMParser().parseFromString(embedded.masters.front,'image/svg+xml').documentElement,back:new DOMParser().parseFromString(embedded.masters.back,'image/svg+xml').documentElement};
    traderIcons=embedded.traderIcons||{};
  }else{
    const responses=await Promise.all(['data/armor.json','data/plate-classes.json','assets/armor-front.svg','assets/armor-back.svg','data/trader-icons.json'].map(url=>fetch(url)));
    if(responses.some(response=>!response.ok))throw Error('Could not load chart data');
    data=await responses[0].json();
    plates=await responses[1].json();
    masters={front:new DOMParser().parseFromString(await responses[2].text(),'image/svg+xml').documentElement,back:new DOMParser().parseFromString(await responses[3].text(),'image/svg+xml').documentElement};
    traderIcons=await responses[4].json();
  }
  $('#date').textContent=new Date(data.fetchedAt).toLocaleDateString();
  $('#classes').innerHTML=['all',6,5,4,3,2,1].map(cls=>`<button data-class="${cls}" class="${cls==='all'?'active':''}">${cls==='all'?'ALL CLASSES':`CLASS ${cls}`}</button>`).join('');
  $('#classes').onclick=event=>{const button=event.target.closest('button');if(!button)return;active=button.dataset.class;document.querySelectorAll('.classes button').forEach(item=>item.classList.toggle('active',item===button));render()};
  ['search','category','sort'].forEach(id=>$('#'+id).addEventListener(id==='search'?'input':'change',render));
  $('#export').onclick=()=>{
    const category=$('#category').value;
    if(embedded){
      const blob=new Blob([embedded.charts[category]],{type:'image/svg+xml'}),link=document.createElement('a');
      link.href=URL.createObjectURL(blob);
      link.download=`${category==='armor'?'body-armor':category==='rig'?'armored-rigs':'armor-and-rigs'}.svg`;
      link.click();
      setTimeout(()=>URL.revokeObjectURL(link.href),1000);
      return;
    }
    const params=new URLSearchParams({category,sort:$('#sort').value,search:$('#search').value,cls:active});
    location.href=`/exports/armor.svg?${params}`;
  };
  render();
}
init().catch(error=>{$('#chart').innerHTML=`<div class="empty">Could not load armor data: ${safe(error.message)}</div>`});
