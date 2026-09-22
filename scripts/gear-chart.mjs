import fs from 'node:fs';

const esc=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const fmt=value=>value==null?'—':Number(value).toLocaleString('en-US');
const cut=(value,n)=>value.length>n?value.slice(0,n-1)+'…':value;
const colors={1:'#C0564E',2:'#CA7050',3:'#D28B4B',4:'#C6A849',5:'#94BE55',6:'#55D275'};
const imageCache=new Map();
function image(location){
  if(!location)return null;
  if(!imageCache.has(location)){
    const extension=location.endsWith('.svg')?'svg+xml':'png';
    imageCache.set(location,`data:image/${extension};base64,${fs.readFileSync('.'+location).toString('base64')}`);
  }
  return imageCache.get(location);
}
const icons=JSON.parse(fs.readFileSync('data/trader-icons.json','utf8'));
function seller(acquisition,y,x){
  const a=acquisition||{},name=a.trader?`${a.trader} LL${a.level}${a.kind==='barter'?' · barter':''}`:a.kind==='flea'?'Flea market':'Special / FIR';
  const location=a.trader?icons[a.trader]:a.kind==='flea'?'/assets/flea.svg':null;
  return `${location?`<image x="${x}" y="${y+20}" width="39" height="39" href="${image(location)}"/>`:''}<text x="${x+48}" y="${y+39}" class="seller">${esc(cut(name,26))}</text><text x="${x+48}" y="${y+59}" class="price">${a.price?(a.estimated?'~':'')+fmt(a.price)+' ₽':'—'}</text>`;
}
function frame(title,sub,columns,body,height,footerY){
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="${height}" viewBox="0 0 1800 ${height}"><style>text{font-family:Arial,sans-serif}.title{font-size:47px;font-weight:900;fill:#e9eee6}.sub{font-size:16px;fill:#b9c4b5}.head{font-size:14px;font-weight:700;fill:#c3d09f}.group{font-size:25px;font-weight:900;fill:#e7edde}.count{font-size:15px;fill:#b5c3b0}.name{font-size:20px;font-weight:800;fill:#e9ede4}.small{font-size:14px;fill:#b4c2b0}.value{font-size:19px;font-weight:700;fill:#e0c677}.seller{font-size:16px;font-weight:700;fill:#dce5d5}.price{font-size:15px;fill:#e0c677}.foot{font-size:14px;fill:#aebcad}</style><rect width="100%" height="100%" fill="#151b16"/><rect width="100%" height="8" fill="#a2bd76"/><text x="28" y="70" class="title">${esc(title)}</text><text x="29" y="101" class="sub">${esc(sub)}</text><rect y="120" width="1800" height="42" fill="#34412f"/>${columns.map(([label,x])=>`<text x="${x}" y="148" class="head">${esc(label)}</text>`).join('')}${body}<rect y="${footerY}" width="1800" height="${height-footerY}" fill="#283226"/><text x="28" y="${footerY+37}" class="foot">Unofficial fan project. Escape from Tarkov and its game content and imagery © Battlestate Games and their respective rights holders.</text><text x="28" y="${footerY+67}" class="foot">Generated from Tarkov.dev data; game values can change. The live game is authoritative.</text></svg>`;
}
const helmetMasters=Object.fromEntries(['front','back'].map(view=>[view,[...fs.readFileSync(`assets/helmet-${view}.svg`,'utf8').matchAll(/<g id="[^"]+" data-part="([^"]+)">([\s\S]*?)<\/g>/g)]]));
function helmetLevel(item,part){
  if(part.startsWith('ears-'))return item.ears;
  if(part==='face-jaw')return item.face&&item.face===item.jaw?item.face:null;
  return {top:item.top,back:item.back,eyes:item.eyes,throat:item.throat,'neck-back':item.backNeck}[part]||null;
}
function helmetShape(item,view,y,x){
  const parts=helmetMasters[view].map(([,part,markup])=>{
    const level=helmetLevel(item,part);
    return `<g id="${item.id}-${view}-${part}" data-part="${part}">${markup.replace('fill="#434D45"',`fill="${colors[level]||'#434D45'}"`).replace('stroke="#A9B7A4"',`stroke="${level?'#1d281e':'#A9B7A4'}"`)}</g>`;
  }).join('');
  return `<g transform="translate(${x} ${y+12}) scale(2.30)">${parts}</g><text x="${x+32}" y="${y+103}" text-anchor="middle" class="head">${view.toUpperCase()}</text>`;
}
export function makeHelmetChart(){
  const data=JSON.parse(fs.readFileSync('data/helmets.json','utf8'));
  const items=[...data.items].sort((a,b)=>b.class-a.class||b.durability-a.durability||a.name.localeCompare(b.name));
  const columns=[['HELMET',52],['FRONT / BACK',680],['DUR',900],['ZONES',990],['DETAILS',1280],['OBTAIN',1530]];
  let y=162,body='';
  for(const cls of [...new Set(items.map(item=>item.class))]){
    const group=items.filter(item=>item.class===cls),color=colors[cls];
    body+=`<rect y="${y}" width="1800" height="46" fill="#2b3527"/><rect y="${y}" width="32" height="46" fill="${color}"/><text x="50" y="${y+31}" class="group">CLASS ${cls}<tspan dx="24" class="count">${group.length} ${group.length===1?'ITEM':'ITEMS'}</tspan></text>`;y+=46;
    for(const [index,item] of group.entries()){
      const faceZones=[['Eyes',item.eyes],['Face',item.face],['Jaw',item.jaw]].filter(([,value])=>value).map(([name,value])=>`${name} ${value}`).join(' · ');
      const neckZones=[['Throat',item.throat],['Back neck',item.backNeck]].filter(([,value])=>value).map(([name,value])=>`${name} ${value}`).join(' · ');
      const zoneLines=[`Top ${item.top||'—'} · Back ${item.back||'—'} · Ears ${item.ears||'—'}`,faceZones,neckZones].filter(Boolean);
      const zoneText=zoneLines.map((line,lineIndex)=>`<text x="990" y="${y+39+lineIndex*25}" class="small">${esc(line)}</text>`).join('');
      const hearing={None:'Clear',Low:'Slightly muffled',High:'Heavily muffled'}[item.deafening]||'Unknown';
      body+=`<g id="helmet-${esc(item.id)}"><rect y="${y}" width="1800" height="112" fill="${index%2?'#1b221b':'#222a20'}"/><rect y="${y}" width="32" height="112" fill="${color}"/><text x="16" y="${y+67}" text-anchor="middle" font-size="21" font-weight="900" fill="#16231a">${cls}</text><image x="52" y="${y+11}" width="88" height="88" preserveAspectRatio="xMidYMid meet" href="${image(item.localIcon)}"/><text x="155" y="${y+57}" class="name">${esc(cut(item.name,47))}</text>${helmetShape(item,'front',y,680)}${helmetShape(item,'back',y,770)}<text x="900" y="${y+59}" class="value">${fmt(item.durability)}</text>${zoneText}<text x="1280" y="${y+32}" class="small">⚖ ${fmt(item.weight)} kg<tspan x="1280" dy="22">↗ ${item.speed}% speed</tspan><tspan x="1280" dy="22">◈ ${item.ergo}% ergo</tspan><tspan x="1280" dy="22">Hearing: ${esc(hearing)}</tspan></text>${seller(item.acquisition,y,1530)}</g>`;
      y+=112;
    }
    body+=`<rect y="${y}" width="1800" height="40" fill="#34412f"/>${columns.map(([label,x])=>`<text x="${x}" y="${y+26}" class="head">${label}</text>`).join('')}`;y+=40;
  }
  return frame('HELMETS',`${items.length} protective headwear items · ${data.fetchedAt.slice(0,10)} · built-in armor only`,columns,body,y+95,y);
}
const caliberNames={'1143x23ACP':'.45 ACP','127x33':'.50 AE','127x55':'12.7×55','127x99':'12.7×99','12g':'12 Gauge','20g':'20 Gauge','20x1mm':'20×1 mm','23x75':'23×75','366TKM':'.366 TKM','40mmRU':'40 mm VOG','40x46':'40×46','46x30':'4.6×30','545x39':'5.45×39','556x45NATO':'5.56×45 NATO','57x28':'5.7×28','58x42':'5.8×42','68x51':'6.8×51','762x25TT':'7.62×25 TT','762x35':'.300 Blackout','762x39':'7.62×39','762x51':'7.62×51 NATO','762x54R':'7.62×54 R','784x49':'7.84×49','86x70':'.338 Lapua Magnum','93x64':'9.3×64','9x18PM':'9×18 PM','9x19PARA':'9×19','9x21':'9×21','9x33R':'.357 Magnum','9x39':'9×39'};
const penColor=(penetration,level)=>{const difference=penetration-level*10;return difference>=10?'#55B96F':difference>=0?'#A3BF54':difference>=-8?'#C9A550':'#AE4D43'};
export function makeAmmoChart(options={}){
  const data=JSON.parse(fs.readFileSync('data/ammo.json','utf8'));
  const items=data.items.filter(item=>!options.caliber||item.caliber===options.caliber).sort((a,b)=>a.caliber.localeCompare(b.caliber,undefined,{numeric:true})||b.penetration-a.penetration||b.damage-a.damage);
  const columns=[['ROUND',52],['PEN',670],['DAMAGE',755],['ARMOR DMG',875],['SPEED',1010],['ARMOR CLASS · PEN THRESHOLD',1160],['OBTAIN',1530]];
  let y=162,body='';
  for(const caliber of [...new Set(items.map(item=>item.caliber))]){
    const group=items.filter(item=>item.caliber===caliber);
    body+=`<rect y="${y}" width="1800" height="44" fill="#2b3527"/><rect y="${y}" width="32" height="44" fill="#a2bd76"/><text x="52" y="${y+30}" class="group">${esc(caliberNames[caliber]||caliber)}<tspan dx="24" class="count">${group.length} ROUNDS</tspan></text>`;y+=44;
    for(const [index,item] of group.entries()){
      body+=`<g id="ammo-${esc(item.id)}"><rect y="${y}" width="1800" height="73" fill="${index%2?'#1b221b':'#222a20'}"/><image x="52" y="${y+7}" width="58" height="58" href="${image(item.localIcon)}"/><text x="122" y="${y+45}" class="name">${esc(cut(item.name,45))}</text><text x="670" y="${y+45}" class="value">${fmt(item.penetration)}</text><text x="755" y="${y+45}" class="value">${fmt(item.damage)}${item.projectiles>1?` ×${item.projectiles}`:''}</text><text x="875" y="${y+45}" class="value">${fmt(item.armorDamage)}%</text><text x="1010" y="${y+45}" class="value">${fmt(item.velocity)}</text>${[1,2,3,4,5,6].map(level=>`<rect x="${1155+(level-1)*56}" y="${y+20}" width="47" height="35" fill="${penColor(item.penetration,level)}"/><text x="${1178+(level-1)*56}" y="${y+44}" text-anchor="middle" font-size="18" font-weight="bold" fill="#132014">${level}</text>`).join('')}${seller(item.acquisition,y,1530)}</g>`;
      y+=73;
    }
    body+=`<rect y="${y}" width="1800" height="40" fill="#34412f"/>${columns.map(([label,x])=>`<text x="${x}" y="${y+26}" class="head">${label}</text>`).join('')}`;y+=40;
  }
  return frame(options.caliber?`AMMO · ${caliberNames[options.caliber]||options.caliber}`:'AMMUNITION',`${items.length} rounds · ${data.fetchedAt.slice(0,10)} · cells compare penetration with class × 10`,columns,body,y+95,y);
}
