import fs from 'node:fs';
import { cacheIcons } from './icons.mjs';

const url='https://json.tarkov.dev/regular/items';
const endpoints=['items','barters','crafts','tasks','traders','hideout'];
const responses=await Promise.all(endpoints.map(name=>fetch(`https://json.tarkov.dev/regular/${name}`)));
for(const [index,response] of responses.entries()) if(!response.ok) throw Error(`Tarkov.dev ${endpoints[index]}: HTTP ${response.status}`);
const [payload,barterPayload,craftPayload,taskPayload,traderPayload,hideoutPayload]=await Promise.all(responses.map(response=>response.json()));
const sourceItems=Object.values(payload.data?.items||{}).filter(item=>
  item.types?.some(type=>type==='armor'||type==='rig') && Number.isFinite(item.properties?.class));
const allItems=Object.values(payload.data?.items||{});
const sourceById=new Map(allItems.map(item=>[item.id,item]));
if(sourceItems.length<100) throw Error(`Unexpected armored item count: ${sourceItems.length}`);

const previous=fs.existsSync('data/armor.json')?JSON.parse(fs.readFileSync('data/armor.json','utf8')).items:[];
const known=new Map(previous.map(item=>[item.iconLink?.match(/\/([a-f0-9]{24})-/)?.[1],item]));
const materials=payload.data.armorMaterials||{};
const barters=barterPayload.data||[];
const crafts=craftPayload.data||[];
const tasks=Object.values(taskPayload.data?.tasks||{});
const traders=traderPayload.data||{};
const stations=hideoutPayload.data||{};
const overrides=fs.existsSync('data/acquisition-overrides.json')?JSON.parse(fs.readFileSync('data/acquisition-overrides.json','utf8')).items||{}:{};
const percent=value=>value==null?null:Math.round(value*10000)/100;
const title=value=>String(value||'').split('-').map(word=>word?word[0].toUpperCase()+word.slice(1):word).join(' ');
const traderName=id=>title(traders[id]?.normalizedName||'trader');
const acquisitionFor=item=>{
  if(overrides[item.id]) return {...overrides[item.id],reviewed:true};
  const direct=[...(item.buyFromTrader||[])].sort((a,b)=>(a.priceRUB??Infinity)-(b.priceRUB??Infinity))[0];
  if(direct) return {kind:'trader',source:`${traderName(direct.trader)} LL${direct.minTraderLevel||1}`,price:direct.priceRUB??direct.price??null,taskUnlock:direct.taskUnlock||null};
  const barterCost=entry=>(entry.requiredItems||[]).reduce((total,required)=>{const source=sourceById.get(required.item);return total+(source?.avg24hPrice||source?.lastLowPrice||source?.basePrice||0)*(required.count||1)},0)||null;
  const availableBarters=barters.filter(entry=>entry.offeredItem?.item===item.id).map(entry=>({entry,price:barterCost(entry)})).sort((a,b)=>(a.price??Infinity)-(b.price??Infinity));
  const barter=availableBarters[0];
  if(barter) return {kind:'barter',source:`Barter · ${traderName(barter.entry.trader)} LL${barter.entry.minTraderLevel||1}`,price:barter.price,taskUnlock:barter.entry.taskUnlock||null,estimated:true};
  if(!item.types?.includes('noFlea')&&(item.avg24hPrice||item.lastLowPrice)) return {kind:'flea',source:'Flea market',price:item.avg24hPrice||item.lastLowPrice};
  const craft=crafts.find(entry=>entry.productItem?.item===item.id);
  if(craft) {const price=(craft.requiredItems||[]).filter(required=>!required.attributes?.tool).reduce((total,required)=>{const source=sourceById.get(required.item);return total+(source?.avg24hPrice||source?.lastLowPrice||source?.basePrice||0)*(required.count||1)},0)||null;return {kind:'craft',source:`Craft · ${title(stations[craft.station]?.normalizedName||'hideout')} ${craft.level}`,price,estimated:true}}
  const task=tasks.find(entry=>entry.finishRewards?.items?.some(reward=>reward.item===item.id));
  if(task) return {kind:'quest',source:`Quest · ${title(task.normalizedName)}`,price:null};
  return {kind:item.types?.includes('noFlea')?'special':'fir',source:item.types?.includes('noFlea')?'FIR / special':'FIR / flea',price:null};
};
const items=sourceItems.map(item=>{
  const old=known.get(item.id);
  const properties=item.properties;
  const material=properties.material||null;
  const destructibility=materials[material]?.destructibility;
  const effective=destructibility?Math.round(properties.durability/destructibility):null;
  return {
    id:old?.id||`/armor/${item.normalizedName}`,
    tarkovId:item.id,
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
    acquisition:acquisitionFor(item),
    properties:{class:properties.class,durability:properties.durability,zones:properties.zones||[],armorSlots:properties.armorSlots||[]},
    localIcon:old?.localIcon
  };
});
await cacheIcons(items);
fs.writeFileSync('data/armor.json',JSON.stringify({source:'Tarkov.dev static JSON API',url,fetchedAt:new Date().toISOString(),items},null,2));
console.log(`Saved ${items.length} armored items from Tarkov.dev`);
