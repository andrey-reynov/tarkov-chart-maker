let ammoData={items:[]},traderIcons={};
const $=selector=>document.querySelector(selector);
const {safe,format,fuzzy}=TarkovUI;
const caliberNames={
  '1143x23ACP':'.45 ACP','127x33':'.50 AE','127x55':'12.7×55','127x99':'12.7×99',
  '12g':'12 Gauge','20g':'20 Gauge','20x1mm':'20×1 mm','23x75':'23×75',
  '366TKM':'.366 TKM','40mmRU':'40 mm VOG','40x46':'40×46','46x30':'4.6×30',
  '545x39':'5.45×39','556x45NATO':'5.56×45 NATO','57x28':'5.7×28','58x42':'5.8×42',
  '68x51':'6.8×51','762x25TT':'7.62×25 TT','762x35':'.300 Blackout',
  '762x39':'7.62×39','762x51':'7.62×51 NATO','762x54R':'7.62×54 R',
  '784x49':'7.84×49','86x70':'.338 Lapua Magnum','93x64':'9.3×64',
  '9x18PM':'9×18 PM','9x19PARA':'9×19','9x21':'9×21','9x33R':'.357 Magnum','9x39':'9×39'
};
const caliberLabel=caliber=>caliberNames[caliber]||caliber.replaceAll('x','×');
const quality=(penetration,level)=>{const difference=penetration-level*10;return difference>=10?'excellent':difference>=0?'good':difference>=-8?'mixed':'poor'};
function render(){
  const search=$('#search').value,caliber=$('#caliber').value,sort=$('#sort').value;
  const items=ammoData.items.filter(item=>(caliber==='all'||item.caliber===caliber)&&fuzzy(`${item.name} ${item.caliber} ${item.acquisition?.trader||''}`,search));
  items.sort((a,b)=>a.caliber.localeCompare(b.caliber)||(sort==='name'?a.name.localeCompare(b.name):sort==='damage'?b.damage-a.damage:sort==='armor'?b.armorDamage-a.armorDamage:b.penetration-a.penetration));
  $('#total').textContent=items.length;
  const calibers=[...new Set(items.map(item=>item.caliber))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
  $('#chart').innerHTML=calibers.length?calibers.map(cal=>{
    const group=items.filter(item=>item.caliber===cal);
    return `<section class="group"><div class="group-head"><h2>${safe(caliberLabel(cal))}</h2><span class="count">${group.length} ROUNDS</span><div class="rule"></div></div><div class="table-wrap"><table class="ammo-table"><thead><tr><th>ROUND</th><th class="numeric">PEN</th><th class="numeric">DAMAGE</th><th class="numeric">ARMOR DMG</th><th class="numeric">SPEED</th><th colspan="6" class="class-columns">ARMOR CLASS · PEN THRESHOLD</th><th>OBTAIN</th></tr></thead><tbody>${group.map(item=>`<tr><td><div class="item"><img class="item-icon" src="${safe(item.localIcon)}" alt="" loading="lazy"><a class="itemlink" href="${safe(item.link)}" target="_blank" rel="noreferrer">${safe(item.name)}</a></div></td><td class="numeric effective">${format(item.penetration)}</td><td class="numeric">${format(item.damage)}${item.projectiles>1?` ×${item.projectiles}`:''}</td><td class="numeric">${format(item.armorDamage)}%</td><td class="numeric">${format(item.velocity)} m/s</td>${[1,2,3,4,5,6].map(level=>`<td class="pen-cell ${quality(item.penetration,level)}" title="Class ${level}: penetration ${item.penetration} against threshold ${level*10}">${level}</td>`).join('')}<td class="obtain">${TarkovUI.acquisition(item.acquisition,traderIcons)}</td></tr>`).join('')}</tbody></table></div></section>`;
  }).join(''):'<div class="empty">No close matches.</div>';
}
async function init(){
  const embedded=globalThis.__TARKOV_RELEASE__;
  if(embedded){ammoData=embedded.ammo;traderIcons=embedded.traderIcons}
  else{
    const responses=await Promise.all(['data/ammo.json','data/trader-icons.json'].map(url=>fetch(url)));
    if(responses.some(response=>!response.ok))throw Error('Ammo data unavailable. Run npm run refresh:gear.');
    ammoData=await responses[0].json();traderIcons=await responses[1].json();
  }
  $('#date').textContent=new Date(ammoData.fetchedAt).toLocaleDateString();
  $('#source').textContent=`Source: ${ammoData.source} · ${ammoData.url} · Collected ${new Date(ammoData.fetchedAt).toLocaleString()}`;
  const calibers=[...new Set(ammoData.items.map(item=>item.caliber))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
  $('#caliber').innerHTML='<option value="all">All calibers</option>'+calibers.map(cal=>`<option value="${safe(cal)}">${safe(caliberLabel(cal))}</option>`).join('');
  $('#search').oninput=render;$('#caliber').onchange=render;$('#sort').onchange=render;render();
}
init().catch(error=>{$('#chart').innerHTML=`<div class="empty">${safe(error.message)}</div>`});
