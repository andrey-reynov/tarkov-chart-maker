import fs from 'node:fs';

const endpoint='https://escapefromtarkov.fandom.com/api.php';
const pages={armor:'Armor_vests',rig:'Chest_rigs'};
const normalize=value=>decodeURIComponent(String(value||'')).replaceAll('_',' ').replace(/\s+/g,' ').trim().toLowerCase();
const data=JSON.parse(fs.readFileSync('data/armor.json','utf8'));

async function wikiText(page) {
  const url=`${endpoint}?action=parse&page=${page}&prop=wikitext&format=json`;
  const response=await fetch(url);
  if(!response.ok) throw Error(`${page}: HTTP ${response.status}`);
  const payload=await response.json();
  return payload.parse?.wikitext?.['*']||'';
}
function parseTable(text) {
  const rows=new Map();
  for(const row of text.split(/^\|-/m)) {
    const names=[...row.matchAll(/^!\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/gm)]
      .map(m=>m[1]).filter(name=>!name.startsWith('File:'));
    if(!names.length) continue;
    const plateLine=row.match(/^\|(?:Front\s*[-–]|None)[^\n]*/m)?.[0]||'';
    // Protection values can wrap over several lines in wiki markup.
    const protection=(row.match(/(?:Front|Back|Sides?)\s*[-–]\s*[0-6]/gi)||[]);
    const cls=label=>{const hit=protection.find(x=>new RegExp(`^${label}\\s*[-–]`,'i').test(x));return hit?Number(hit.match(/[0-6]$/)[0]):null};
    rows.set(normalize(names[0]),{front:cls('Front'),back:cls('Back'),side:cls('Sides?'),wikiName:names[0]});
  }
  return rows;
}

const wiki={};
for(const [category,page] of Object.entries(pages)) wiki[category]=parseTable(await wikiText(page));
const api=await(await fetch('https://json.tarkov.dev/regular/items')).json();
const apiItems=api.data?.items||{};
const output={source:'Escape from Tarkov Wiki default plate tables and Tarkov.dev item IDs',fetchedAt:new Date().toISOString(),items:{}};
let verified=0,missing=0;
for(const item of data.items) {
  const tarkovId=item.iconLink?.match(/\/([a-f0-9]{24})-/)?.[1];
  const apiItem=apiItems[tarkovId];
  const title=apiItem?.wikiLink?.split('/wiki/')[1];
  const record=wiki[item.category]?.get(normalize(title));
  if(record) {
    output.items[item.id]={front:record.front,back:record.back,side:record.side,status:'verified',source:`https://escapefromtarkov.fandom.com/wiki/${pages[item.category]}`};
    verified++;
  } else {
    output.items[item.id]={front:null,back:null,side:null,status:'unknown',source:null};
    missing++;
  }
}
fs.writeFileSync('data/plate-classes.json',JSON.stringify(output,null,2));
console.log(`Default plate classes: ${verified} verified, ${missing} unknown`);
