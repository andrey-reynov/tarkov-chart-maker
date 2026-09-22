import fs from 'node:fs';
import { armorFigure, plateColors } from './armor-figure.mjs';

const esc=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const fmt=value=>Number.isFinite(Number(value))?Number(value).toLocaleString('en-US'):'—';
const shorten=(value,length)=>value.length>length?value.slice(0,length-1)+'…':value;
const darken=(hex,factor=.38)=>'#'+[1,3,5].map(i=>Math.round(parseInt(hex.slice(i,i+2),16)*factor).toString(16).padStart(2,'0')).join('');
const signed=value=>value==null?'—':`${value>0?'+':''}${value}%`;
const normalize=value=>String(value??'').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,' ').trim();
const editDistance=(a,b)=>{const row=Array.from({length:b.length+1},(_,index)=>index);for(let i=1;i<=a.length;i++){let diagonal=row[0];row[0]=i;for(let j=1;j<=b.length;j++){const previous=row[j];row[j]=Math.min(row[j]+1,row[j-1]+1,diagonal+(a[i-1]===b[j-1]?0:1));diagonal=previous}}return row[b.length]};
const fuzzyMatch=(value,query)=>{const text=normalize(value),needle=normalize(query);if(!needle||text.includes(needle))return true;const words=text.split(' ');return needle.split(' ').every(term=>words.some(word=>word.includes(term)||(term.includes(word)&&word.length>=3)||editDistance(word,term)<=(term.length<=4?1:Math.ceil(term.length*.25))))};

export function makeChart(options={}) {
  const data=JSON.parse(fs.readFileSync('data/armor.json','utf8'));
  const plates=JSON.parse(fs.readFileSync('data/plate-classes.json','utf8'));
  const traderIcons=JSON.parse(fs.readFileSync('data/trader-icons.json','utf8'));
  const iconData=new Map();
  const purchaseIcon=source=>{
    const trader=source.match(/^(?:Barter · )?(.+?) LL\d+$/)?.[1];
    const path=trader?traderIcons[trader]:source==='Flea market'?'/assets/flea.svg':null;
    if(!path)return null;
    if(!iconData.has(path))iconData.set(path,`data:image/${path.endsWith('.svg')?'svg+xml':'png'};base64,${fs.readFileSync('.'+path).toString('base64')}`);
    return iconData.get(path);
  };
  const eff=item=>item.effective||Math.round((item.properties.durability||0)/(item.properties.material?.destructibility||1));
  const items=data.items.filter(item=>(!options.category||options.category==='all'||item.category===options.category)
    &&(!options.cls||options.cls==='all'||Number(item.properties.class)===Number(options.cls))
    &&(!options.search||fuzzyMatch(`${item.name} ${item.shortName} ${item.acquisition?.source||''}`,options.search)));
  items.sort((a,b)=>options.sort==='name'?a.name.localeCompare(b.name)
    :options.sort==='weight'?(a.weight??999)-(b.weight??999)
    :options.sort==='effective'?eff(b)-eff(a)
    :b.properties.class-a.properties.class||eff(b)-eff(a)||a.name.localeCompare(b.name));

  const W=1750,top=164,columnHeight=44,groupHeight=50,rowHeight=140,footer=112;
  const columns=[['EQUIPMENT',50],['FRONT',520],['BACK',710],['DUR',900],['EFF. DUR',1005],['DETAILS',1130],['OBTAIN',1410]];
  const classes=[...new Set(items.map(item=>item.properties.class))].sort((a,b)=>b-a);
  const height=top+Math.max(0,classes.length-1)*columnHeight+classes.length*groupHeight+items.length*rowHeight+footer;
  let y=top,body='';
  for(const [classIndex,cls] of classes.entries()) {
    if(classIndex>0){body+=`<rect y="${y}" width="${W}" height="${columnHeight}" fill="#34412f"/>${columns.map(([label,x])=>`<text x="${x}" y="${y+28}" class="head">${label}</text>`).join('')}`;y+=columnHeight}
    const group=items.filter(item=>item.properties.class===cls);
    const classColor=plateColors[cls]||'#89a58d';
    const classInk=darken(classColor);
    body+=`<rect y="${y}" width="${W}" height="${groupHeight}" fill="#2b3527"/><rect y="${y}" width="34" height="${groupHeight}" fill="${classColor}"/><text x="50" y="${y+32}" class="group">CLASS ${cls}<tspan class="count" dx="24">${group.length} ITEMS</tspan></text>`;
    y+=groupHeight;
    for(const [index,item] of group.entries()) {
      const slots=item.properties.armorSlots||[];
      const slotClass=name=>slots.find(slot=>slot.nameId?.toLowerCase()===name)?.class||null;
      const plateRecord=plates.items[item.id]||{status:'unknown',front:null,back:null,side:null};
      const record={...plateRecord,front:plateRecord.front||slotClass('soft_armor_front'),back:plateRecord.back||slotClass('soft_armor_back'),sideLeft:slotClass('soft_armor_left'),sideRight:slotClass('soft_armor_right'),groinFront:slotClass('groin'),groinBack:slotClass('groin_back'),neck:slotClass('collar'),shoulderLeft:slotClass('shoulder_l'),shoulderRight:slotClass('shoulder_r')};
      const icon=fs.readFileSync('.'+item.localIcon).toString('base64');
      const label=shorten(item.name,30);
      const material=shorten((item.material||item.properties.material?.name||'—').replace('Ultra high molecular weight polyethylene','UHMWPE'),17);
      const variantSlug=item.id.match(/plateminus-v2-(?:plate-carrier|body-armor)-(.+)$/)?.[1];
      const variant=variantSlug?.replaceAll('-',' ').toUpperCase();
      const type=item.category==='rig'?'ARMORED RIG':'BODY ARMOR';
      const acquisition=item.acquisition||{source:'Source unavailable',price:null};
      const source=acquisition.source||'Source unavailable';
      const obtain=shorten(source.startsWith('Barter · ')?`${source.slice(9)} · barter`:source,30);
      const sellerIcon=purchaseIcon(source);
      const title=esc(variant?`${type} · ${variant}`:options.category==='all'
        ? type
        : shorten(item.link?.split('/').at(-1)?.replaceAll('-',' ')||item.name,52));
      body+=`<g id="item-${esc(item.id.replace(/[^a-zA-Z0-9_-]/g,'_'))}" data-item-id="${esc(item.id)}"><rect y="${y}" width="${W}" height="${rowHeight}" fill="${index%2?'#1b221b':'#222a20'}"/><rect y="${y}" width="34" height="${rowHeight}" fill="${classColor}"/><text x="17" y="${y+81}" text-anchor="middle" fill="${classInk}" font-size="24" font-weight="900">${cls}</text><image x="50" y="${y+18}" width="96" height="104" preserveAspectRatio="xMidYMid meet" href="data:image/png;base64,${icon}"/><text x="165" y="${y+64}" class="name">${esc(label)}</text><text x="165" y="${y+87}" class="detail">${title}</text><g transform="translate(505 ${y+15}) scale(2.06)">${armorFigure('front',record,`item-${y}-front`)}</g><g transform="translate(695 ${y+15}) scale(2.06)">${armorFigure('back',record,`item-${y}-back`)}</g><text x="900" y="${y+75}" class="stat">${fmt(item.properties.durability)}</text><text x="1005" y="${y+75}" class="accent">${fmt(eff(item))}</text><text x="1130" y="${y+49}" class="meta">⚖ ${item.weight==null?'—':item.weight+' kg'}<tspan x="1130" dy="26">↗ ${signed(item.speed)} speed</tspan><tspan x="1130" dy="26">◈ ${signed(item.ergo)} ergo</tspan></text>${sellerIcon?`<image x="1410" y="${y+48}" width="38" height="38" href="${sellerIcon}"/>`:''}<text x="1458" y="${y+61}" class="obtain">${esc(obtain)}</text><text x="1458" y="${y+85}" class="obtain-price">${acquisition.price?(acquisition.estimated?'~':'')+fmt(acquisition.price)+' ₽':'—'}</text></g>`;
      y+=rowHeight;
    }
  }
  const title=options.category==='rig'?'ARMORED RIGS':options.category==='armor'?'BODY ARMOR':'ARMOR & RIGS';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${height}" viewBox="0 0 ${W} ${height}"><style>text{font-family:Arial,sans-serif}.title{font-size:49px;font-weight:900;fill:#e8ede4;letter-spacing:2px}.sub{font-size:15px;fill:#aebba9}.head{font-size:13px;font-weight:bold;fill:#b7ca97;letter-spacing:1px}.group{font-size:25px;font-weight:900;fill:#e7edde}.count{font-size:13px;fill:#b3c0ad}.name{font-size:22px;font-weight:800;fill:#e9ede4}.detail{font-size:12px;fill:#98a998}.stat{font-size:17px;fill:#d0daca}.accent{font-size:18px;font-weight:bold;fill:#e0c677}.meta{font-size:13px;fill:#d0daca}.meta-key{fill:#8fa08b}.obtain{font-size:15px;font-weight:bold;fill:#dce5d5}.obtain-price{font-size:15px;font-weight:bold;fill:#e0c677}.foot{font-size:14px;fill:#aebcad}</style><rect width="100%" height="100%" fill="#131913"/><rect width="100%" height="8" fill="#a2bd76"/><text x="24" y="69" class="title">${esc(title)}</text><text x="25" y="101" class="sub">Armor class by region · ${items.length} items · ${esc(data.fetchedAt.slice(0,10))}</text><rect y="120" width="${W}" height="44" fill="#34412f"/>${columns.map(([label,x])=>`<text x="${x}" y="148" class="head">${label}</text>`).join('')}${body}<rect y="${height-footer}" width="${W}" height="${footer}" fill="#283226"/><text x="25" y="${height-72}" class="foot">Unofficial fan project. Escape from Tarkov and all game content and imagery © Battlestate Games and their respective rights holders.</text><text x="25" y="${height-42}" class="foot">Autogenerated using Tarkov.dev and Escape from Tarkov Wiki data (${esc(data.fetchedAt.slice(0,10))}). Sources can lag patches or be incomplete; the live game is authoritative.</text></svg>`;
}
