import fs from 'node:fs';
import {cacheIcons} from './icons.mjs';
const html=await (await fetch('https://tarkovforge.com/armor')).text();
const txt=s=>s.replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/&#x27;/g,"'").replace(/&quot;/g,'"').trim();
const items=[];
for(const section of html.split(/CLASS ([1-6])<\/span>/).slice(1).reduce((a,x,i)=>{if(i%2===0)a.push([Number(x)]);else a.at(-1).push(x);return a},[])){
 const [cls,body]=section;const table=body.match(/<table[\s\S]*?<\/table>/)?.[0];if(!table)continue;
 for(const row of table.match(/<tr class="border-b[\s\S]*?<\/tr>/g)||[]){const cells=[...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g)].map(m=>m[1]);if(cells.length<8)continue;
 const link=cells[0].match(/href="([^"]+)"/)?.[1]||'';const iconLink=cells[0].match(/<img src="([^"]+)"/)?.[1]||'';const name=txt(cells[0].match(/<a[^>]*>([\s\S]*?)<\/a>/)?.[1]||'');const type=txt(cells[0].match(/<div class="text-\[10px\][^>]*>([\s\S]*?)<\/div>/)?.[1]||'');const penalties=txt(cells[5]);const getPenalty=(label)=>Number(penalties.match(new RegExp(label+'\\s*([+-]?[\\d.]+)%'))?.[1]);const weight=Number(txt(cells[6]).match(/[\d.]+/)?.[0]);const price=Number(txt(cells[7]).replace(/[^\d]/g,''))||null;
 items.push({id:link,name,shortName:name,iconLink,link:`https://tarkovforge.com${link}`,category:type.startsWith('Rig')?'rig':'armor',weight:Number.isFinite(weight)?weight:null,effective:Number(txt(cells[2]))||null,material:txt(cells[3]),speed:getPenalty('Spd'),turn:getPenalty('Turn'),ergo:getPenalty('Ergo'),price,properties:{class:cls,durability:Number(txt(cells[1]))||0,zones:txt(cells[4]).split(',').map(x=>x.trim()).filter(Boolean)}})
 }
}
if(items.length<80)throw new Error(`Only ${items.length} rows parsed`);
await cacheIcons(items);
fs.mkdirSync('data',{recursive:true});fs.writeFileSync('data/armor.json',JSON.stringify({source:'TarkovForge armor chart (temporary bootstrap; refresh from Tarkov.dev when API is available)',url:'https://tarkovforge.com/armor',fetchedAt:new Date().toISOString(),items},null,2));console.log(`Bootstrapped ${items.length} armor items`);
