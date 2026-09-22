import fs from 'node:fs';
import { cacheIcons } from './icons.mjs';

const url='https://json.tarkov.dev/regular/items';
const response=await fetch(url);
if(!response.ok) throw Error(`Tarkov.dev items: HTTP ${response.status}`);
const payload=await response.json();
const sourceItems=Object.values(payload.data?.items||{}).filter(item=>
  item.types?.some(type=>type==='armor'||type==='rig') && Number.isFinite(item.properties?.class));
if(sourceItems.length<100) throw Error(`Unexpected armored item count: ${sourceItems.length}`);

const previous=fs.existsSync('data/armor.json')?JSON.parse(fs.readFileSync('data/armor.json','utf8')).items:[];
const known=new Map(previous.map(item=>[item.iconLink?.match(/\/([a-f0-9]{24})-/)?.[1],item]));
const materials=payload.data.armorMaterials||{};
const percent=value=>value==null?null:Math.round(value*10000)/100;
const items=sourceItems.map(item=>{
  const old=known.get(item.id);
  const properties=item.properties;
  const material=properties.material||null;
  const destructibility=materials[material]?.destructibility;
  const effective=destructibility?Math.round(properties.durability/destructibility):null;
  return {
    id:old?.id||`/armor/${item.normalizedName}`,
    name:old?.name||item.normalizedName.replaceAll('-',' '),
    shortName:old?.shortName||item.normalizedName.replaceAll('-',' '),
    iconLink:item.iconLink,
    wikiLink:item.wikiLink||null,
    link:item.link||old?.link,
    category:item.types.includes('rig')?'rig':'armor',
    weight:item.weight,
    effective,
    material,
    speed:percent(properties.speedPenalty),
    turn:percent(properties.turnPenalty),
    ergo:percent(properties.ergoPenalty),
    price:item.avg24hPrice||item.basePrice||null,
    properties:{class:properties.class,durability:properties.durability,zones:properties.zones||[],armorSlots:properties.armorSlots||[]},
    localIcon:old?.localIcon
  };
});
await cacheIcons(items);
fs.writeFileSync('data/armor.json',JSON.stringify({source:'Tarkov.dev static JSON API',url,fetchedAt:new Date().toISOString(),items},null,2));
console.log(`Saved ${items.length} armored items from Tarkov.dev`);
