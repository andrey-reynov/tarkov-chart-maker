import fs from 'node:fs';
import { armorFigure, plateColors } from './armor-figure.mjs';

const esc=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const fmt=value=>Number.isFinite(Number(value))?Number(value).toLocaleString('en-US'):'—';
const shorten=(value,length)=>value.length>length?value.slice(0,length-1)+'…':value;
const darken=(hex,factor=.38)=>'#'+[1,3,5].map(i=>Math.round(parseInt(hex.slice(i,i+2),16)*factor).toString(16).padStart(2,'0')).join('');

export function makeChart(options={}) {
  const data=JSON.parse(fs.readFileSync('data/armor.json','utf8'));
  const plates=JSON.parse(fs.readFileSync('data/plate-classes.json','utf8'));
  const eff=item=>item.effective||Math.round((item.properties.durability||0)/(item.properties.material?.destructibility||1));
  const items=data.items.filter(item=>(!options.category||options.category==='all'||item.category===options.category)
    &&(!options.cls||options.cls==='all'||Number(item.properties.class)===Number(options.cls))
    &&(!options.search||item.name.toLowerCase().includes(options.search.toLowerCase())));
  items.sort((a,b)=>options.sort==='name'?a.name.localeCompare(b.name)
    :options.sort==='weight'?(a.weight??999)-(b.weight??999)
    :options.sort==='effective'?eff(b)-eff(a)
    :b.properties.class-a.properties.class||eff(b)-eff(a)||a.name.localeCompare(b.name));

  const W=1750,top=164,columnHeight=44,groupHeight=50,rowHeight=140,footer=112;
  const columns=[['EQUIPMENT',50],['FRONT',611],['BACK',825],['DUR',1000],['EFF. DUR',1115],['MATERIAL',1240],['WEIGHT',1460],['SPEED',1575],['ERGO',1670]];
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
      const title=esc(variant?`${type} · ${variant}`:options.category==='all'
        ? type
        : shorten(item.link?.split('/').at(-1)?.replaceAll('-',' ')||item.name,52));
      body+=`<g id="item-${esc(item.id.replace(/[^a-zA-Z0-9_-]/g,'_'))}" data-item-id="${esc(item.id)}"><rect y="${y}" width="${W}" height="${rowHeight}" fill="${index%2?'#1b221b':'#222a20'}"/><rect y="${y}" width="34" height="${rowHeight}" fill="${classColor}"/><text x="17" y="${y+81}" text-anchor="middle" fill="${classInk}" font-size="24" font-weight="900">${cls}</text><image x="50" y="${y+18}" width="104" height="104" href="data:image/png;base64,${icon}"/><text x="177" y="${y+64}" class="name">${esc(label)}</text><text x="177" y="${y+87}" class="detail">${title}</text><g transform="translate(584 ${y+7}) scale(2.24)">${armorFigure('front',record,`item-${y}-front`)}</g><g transform="translate(798 ${y+7}) scale(2.24)">${armorFigure('back',record,`item-${y}-back`)}</g><text x="1000" y="${y+75}" class="stat">${fmt(item.properties.durability)}</text><text x="1115" y="${y+75}" class="accent">${fmt(eff(item))}</text><text x="1240" y="${y+75}" class="stat">${esc(material)}</text><text x="1460" y="${y+75}" class="stat">${item.weight==null?'—':item.weight+' kg'}</text><text x="1575" y="${y+75}" class="stat">${item.speed==null?'—':item.speed+'%'}</text><text x="1670" y="${y+75}" class="stat">${item.ergo==null?'—':item.ergo+'%'}</text></g>`;
      y+=rowHeight;
    }
  }
  const title=options.category==='rig'?'ARMORED RIGS':options.category==='armor'?'BODY ARMOR':'ARMOR & RIGS';
  const legend=[1,2,3,4,5,6].map((n,i)=>`<rect x="${237+i*42}" y="${height-92}" width="34" height="22" fill="${plateColors[n]}"/><text x="${254+i*42}" y="${height-75}" text-anchor="middle" class="legend-num">${n}</text>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${height}" viewBox="0 0 ${W} ${height}"><style>text{font-family:Arial,sans-serif}.title{font-size:49px;font-weight:900;fill:#e8ede4;letter-spacing:2px}.sub{font-size:15px;fill:#aebba9}.head{font-size:13px;font-weight:bold;fill:#b7ca97;letter-spacing:1px}.group{font-size:25px;font-weight:900;fill:#e7edde}.count{font-size:13px;fill:#b3c0ad}.name{font-size:22px;font-weight:800;fill:#e9ede4}.detail{font-size:12px;fill:#98a998}.stat{font-size:17px;fill:#d0daca}.accent{font-size:18px;font-weight:bold;fill:#e0c677}.foot{font-size:14px;fill:#aebcad}.legend-num{font-size:14px;font-weight:bold;fill:#fff;paint-order:stroke;stroke:#192018;stroke-width:2px}</style><rect width="100%" height="100%" fill="#131913"/><rect width="100%" height="8" fill="#a2bd76"/><text x="24" y="69" class="title">${esc(title)}</text><text x="25" y="101" class="sub">Armor class by region · ${items.length} items · ${esc(data.fetchedAt.slice(0,10))}</text><rect y="120" width="${W}" height="44" fill="#34412f"/>${columns.map(([label,x])=>`<text x="${x}" y="148" class="head">${label}</text>`).join('')}${body}<rect y="${height-footer}" width="${W}" height="${footer}" fill="#283226"/><rect x="25" y="${height-91}" width="17" height="17" fill="#434D45"/><text x="50" y="${height-76}" class="foot">No plate</text>${legend}<text x="526" y="${height-75}" class="foot">Armor class</text><text x="735" y="${height-75}" class="foot">?  Default plates unverified</text><text x="25" y="${height-35}" class="foot">Default plates: Escape from Tarkov Wiki (${esc(plates.fetchedAt.slice(0,10))}); soft armor, stats and art: Tarkov.dev. Plates take precedence in the preview.</text></svg>`;
}
