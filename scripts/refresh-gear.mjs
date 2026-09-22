import fs from 'node:fs';
import {createRequire} from 'node:module';
import {cacheIcons} from './icons.mjs';

const require=createRequire(import.meta.url);
let sharp;
try{sharp=require('sharp')}catch{sharp=require('C:/Users/drop/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp')}

const root='https://json.tarkov.dev/regular/';
const [itemResponse,traderResponse,barterResponse]=await Promise.all(['items','traders','barters'].map(name=>fetch(root+name)));
for(const response of [itemResponse,traderResponse,barterResponse])if(!response.ok)throw Error(`${response.url}: HTTP ${response.status}`);
const [itemPayload,traderPayload,barterPayload]=await Promise.all([itemResponse.json(),traderResponse.json(),barterResponse.json()]);
const all=Object.values(itemPayload.data.items),byId=new Map(all.map(item=>[item.id,item]));
const traders=traderPayload.data,barters=barterPayload.data;
const title=text=>String(text||'').split('-').map(word=>word[0]?.toUpperCase()+word.slice(1)).join(' ');
const displayName=item=>{
  try{return decodeURIComponent(new URL(item.wikiLink).pathname.split('/wiki/')[1]).replaceAll('_',' ')}catch{return title(item.normalizedName)}
};
const traderName=id=>title(traders[id]?.normalizedName||'trader');
const priceOf=required=>(required||[]).reduce((sum,part)=>sum+(byId.get(part.item)?.avg24hPrice||byId.get(part.item)?.lastLowPrice||byId.get(part.item)?.basePrice||0)*(part.count||1),0)||null;
function acquisition(item){
  const offer=[...(item.buyFromTrader||[])].sort((a,b)=>(a.priceRUB??Infinity)-(b.priceRUB??Infinity))[0];
  if(offer)return {kind:'trader',trader:traderName(offer.trader),level:offer.minTraderLevel||1,price:offer.priceRUB??null};
  const barter=barters.filter(x=>x.offeredItem?.item===item.id).map(x=>({...x,cost:priceOf(x.requiredItems)})).sort((a,b)=>(a.cost??Infinity)-(b.cost??Infinity))[0];
  if(barter)return {kind:'barter',trader:traderName(barter.trader),level:barter.minTraderLevel||1,price:barter.cost&&barter.offeredItem.count?Math.round(barter.cost/barter.offeredItem.count):barter.cost,estimated:true};
  if(!item.types?.includes('noFlea')&&(item.avg24hPrice||item.lastLowPrice))return {kind:'flea',price:item.avg24hPrice||item.lastLowPrice};
  return {kind:'special',price:null};
}
const base=item=>({id:item.id,name:displayName(item),shortName:item.normalizedName.split('-').slice(-2).join(' ').toUpperCase(),link:item.link,iconLink:item.iconLink,weight:item.weight,acquisition:acquisition(item)});
const helmets=all.filter(item=>item.properties?.propertiesType==='ItemPropertiesHelmet'&&item.properties.class>0).map(item=>{
  const slots=item.properties?.armorSlots||[];
  const zones=item.properties?.zones||[];
  const zoneClass=(key,zone)=>slots.find(part=>part.nameId?.toLowerCase()===key)?.class||slots.find(part=>part.zones?.some(value=>value.includes(zone)))?.class||(zones.some(value=>value.includes(zone))?item.properties?.class:null)||null;
  const percent=value=>Math.round((value??0)*10000)/100;
  return {...base(item),class:item.properties?.class||0,durability:item.properties?.durability||null,zones,top:zoneClass('helmet_top','ParietalHead'),back:zoneClass('helmet_back','BackHead'),ears:zoneClass('helmet_ears','Ears'),eyes:zoneClass('helmet_eyes','Eyes'),jaw:zoneClass('helmet_jaw','Jaw'),face:zoneClass('helmet_face','HeadCommon'),throat:zoneClass('helmet_neck_front','NeckFront'),backNeck:zoneClass('helmet_neck_back','NeckBack'),ricochet:item.properties?.ricochetX??null,headset:item.properties?.blocksHeadset??item.blocksHeadphones??false,deafening:item.properties?.deafening||null,speed:percent(item.properties?.speedPenalty),ergo:percent(item.properties?.ergoPenalty)};
});
const ammo=all.filter(item=>item.properties?.propertiesType==='ItemPropertiesAmmo'&&item.properties.caliber!=='Caliber26x75').map(item=>{
  const prop=item.properties;
  return {...base(item),caliber:prop.caliber.replace(/^Caliber/,''),damage:prop.damage,penetration:prop.penetrationPower,armorDamage:prop.armorDamage,fragmentation:prop.fragmentationChance,projectiles:prop.projectileCount,velocity:prop.initialSpeed,recoil:prop.recoilModifier,accuracy:prop.accuracyModifier,tracer:prop.tracer};
});
if(helmets.length<100||ammo.length<190)throw Error(`Unexpected item counts: ${helmets.length} helmets, ${ammo.length} ammo`);
await cacheIcons([...helmets,...ammo]);
fs.mkdirSync('assets/traders',{recursive:true});
const traderIcons={};
for(const trader of Object.values(traders)){
  if(!trader.imageLink)continue;
  const name=trader.normalizedName,path=`assets/traders/${name}.png`;
  if(!fs.existsSync(path)){
    const response=await fetch(trader.imageLink);
    if(!response.ok)continue;
    await sharp(Buffer.from(await response.arrayBuffer())).resize(96,96,{fit:'cover'}).png().toFile(path);
  }
  traderIcons[title(name)]='/'+path;
}
const meta={source:'Tarkov.dev static JSON API',url:root+'items',fetchedAt:new Date().toISOString()};
fs.writeFileSync('data/helmets.json',JSON.stringify({...meta,items:helmets},null,2));
fs.writeFileSync('data/ammo.json',JSON.stringify({...meta,items:ammo},null,2));
fs.writeFileSync('data/trader-icons.json',JSON.stringify(traderIcons,null,2));
console.log(`Saved ${helmets.length} helmets, ${ammo.length} ammo rounds, ${Object.keys(traderIcons).length} trader portraits`);
