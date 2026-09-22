import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {deflateRawSync} from 'node:zlib';
import {makeChart} from './chart.mjs';
import {makeHelmetChart,makeAmmoChart} from './gear-chart.mjs';

const require=createRequire(import.meta.url);
let sharp;
try{sharp=require('sharp')}catch{sharp=require('C:/Users/drop/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp')}

const releaseDir='release',siteDir=path.join(releaseDir,'site'),splitDir=path.join(releaseDir,'charts-by-class'),caliberDir=path.join(releaseDir,'charts-by-caliber'),sourceDir=path.join(releaseDir,'sources'),imageSourceDir=path.join(sourceDir,'images');
fs.rmSync(releaseDir,{recursive:true,force:true});
fs.mkdirSync(splitDir,{recursive:true});
fs.mkdirSync(caliberDir,{recursive:true});
fs.mkdirSync(imageSourceDir,{recursive:true});
fs.mkdirSync(path.join(siteDir,'assets'),{recursive:true});

const sourceData=JSON.parse(fs.readFileSync('data/armor.json','utf8'));
const embeddedData=structuredClone(sourceData);
for(const item of embeddedData.items){
  const iconPath='.'+item.localIcon;
  item.localIcon=`data:image/png;base64,${fs.readFileSync(iconPath).toString('base64')}`;
}

for(const file of fs.readdirSync('assets/icons')){
  if(file.toLowerCase().endsWith('.png'))fs.copyFileSync(path.join('assets/icons',file),path.join(imageSourceDir,file));
}
fs.mkdirSync(path.join(imageSourceDir,'traders'),{recursive:true});
for(const file of fs.readdirSync('assets/traders')){
  if(file.toLowerCase().endsWith('.png'))fs.copyFileSync(path.join('assets/traders',file),path.join(imageSourceDir,'traders',file));
}
fs.copyFileSync('data/armor.json',path.join(sourceDir,'armor.json'));
fs.copyFileSync('data/helmets.json',path.join(sourceDir,'helmets.json'));
fs.copyFileSync('data/ammo.json',path.join(sourceDir,'ammo.json'));
fs.copyFileSync('data/trader-icons.json',path.join(sourceDir,'trader-icons.json'));
fs.copyFileSync('data/plate-classes.json',path.join(sourceDir,'plate-classes.json'));
fs.copyFileSync('assets/armor-front.svg',path.join(sourceDir,'armor-front.svg'));
fs.copyFileSync('assets/armor-back.svg',path.join(sourceDir,'armor-back.svg'));
fs.copyFileSync('assets/helmet-front.svg',path.join(sourceDir,'helmet-front.svg'));
fs.copyFileSync('assets/helmet-back.svg',path.join(sourceDir,'helmet-back.svg'));
fs.copyFileSync('assets/flea.svg',path.join(sourceDir,'flea.svg'));

const categoryFiles={armor:'body-armor',rig:'armored-rigs',all:'armor-and-rigs'};
const charts={};
for(const [category,name] of Object.entries(categoryFiles)){
  const svg=makeChart({category});
  charts[category]=svg;
  await sharp(Buffer.from(svg)).png().toFile(path.join(releaseDir,`${name}.png`));
  const classes=[...new Set(sourceData.items.filter(item=>category==='all'||item.category===category).map(item=>item.properties.class))].sort((a,b)=>b-a);
  for(const cls of classes){
    const classSvg=makeChart({category,cls});
    await sharp(Buffer.from(classSvg)).png().toFile(path.join(splitDir,`${name}-class-${cls}.png`));
  }
}
for(const [name,svg] of [['helmets',makeHelmetChart()],['ammo',makeAmmoChart()]])await sharp(Buffer.from(svg)).png().toFile(path.join(releaseDir,`${name}.png`));
const ammoCalibers=[...new Set(JSON.parse(fs.readFileSync('data/ammo.json','utf8')).items.map(item=>item.caliber))];
for(const caliber of ammoCalibers){
  const svg=makeAmmoChart({caliber});
  await sharp(Buffer.from(svg)).png().toFile(path.join(caliberDir,`${caliber}.png`));
}

const imageData=relative=>`data:image/${path.extname(relative).slice(1)==='svg'?'svg+xml':'png'};base64,${fs.readFileSync('.'+relative).toString('base64')}`;
const embedIcons=filename=>{
  const data=JSON.parse(fs.readFileSync(filename,'utf8'));
  for(const item of data.items)item.localIcon=imageData(item.localIcon);
  return data;
};
const traderIcons=JSON.parse(fs.readFileSync('data/trader-icons.json','utf8'));
for(const [name,location] of Object.entries(traderIcons))traderIcons[name]=imageData(location);
traderIcons['Flea market']=imageData('/assets/flea.svg');
const payload={
  data:embeddedData,
  plates:JSON.parse(fs.readFileSync('data/plate-classes.json','utf8')),
  masters:{front:fs.readFileSync('assets/armor-front.svg','utf8'),back:fs.readFileSync('assets/armor-back.svg','utf8')},
  charts,
  helmets:embedIcons('data/helmets.json'),
  ammo:embedIcons('data/ammo.json'),
  helmetMasters:{front:fs.readFileSync('assets/helmet-front.svg','utf8'),back:fs.readFileSync('assets/helmet-back.svg','utf8')},
  traderIcons
};
const css=fs.readFileSync('style.css','utf8').replace(/^@import[^;]+;/m,'');
const shared=fs.readFileSync('shared.js','utf8');
const pages={};
for(const [key,filename,scriptFile] of [['armor','index.html','app.js'],['helmets','helmets.html','helmets.js'],['ammo','ammo.html','ammo.js']]){
  const fields=key==='armor'?['data','plates','masters','charts','traderIcons']:key==='helmets'?['helmets','helmetMasters','traderIcons']:['ammo','traderIcons'];
  const json=JSON.stringify(Object.fromEntries(fields.map(field=>[field,payload[field]]))).replaceAll('<','\\u003c');
  let page=fs.readFileSync(filename,'utf8').replace(/<header>[\s\S]*?<\/header>/,'<span id="date" hidden></span>');
  page=page.replace('<link rel="stylesheet" href="style.css">',`<style>${css}</style>`);
  page=page.replace('<script src="shared.js"></script>',`<script>globalThis.__TARKOV_RELEASE__=${json};</script><script>${shared.replaceAll('</script>','<\\/script>')}</script>`);
  page=page.replace(`<script src="${scriptFile}"></script>`,`<script>${fs.readFileSync(scriptFile,'utf8').replaceAll('</script>','<\\/script>')}</script>`);
  pages[key]=page;
}
const pageJson=JSON.stringify(pages).replaceAll('<','\\u003c');
const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Tarkov Gear Charts</title><style>body{margin:0;background:#151714;color:#e8e6d9;font:15px Arial,sans-serif}header{display:flex;align-items:center;gap:24px;padding:14px 24px;background:#20231e;border-bottom:1px solid #454c3b}header b{letter-spacing:.12em}nav{display:flex;gap:8px}button{padding:11px 17px;border:1px solid #596149;background:#2a3025;color:#e8e6d9;cursor:pointer;font-weight:bold}button.active{background:#71875b;color:#10150e}iframe{display:block;width:100%;height:calc(100vh - 68px);border:0}@media(max-width:600px){header{display:block}nav{margin-top:12px;flex-wrap:wrap}iframe{height:calc(100vh - 115px)}}</style></head><body><header><b>TARKOV / FIELD GUIDE</b><nav><button data-page="armor" class="active">ARMOR + RIGS</button><button data-page="helmets">HELMETS</button><button data-page="ammo">AMMO</button></nav></header><iframe id="page" title="Tarkov charts"></iframe><script>const pages=${pageJson};const frame=document.querySelector('#page');function select(key){frame.srcdoc=pages[key];document.querySelectorAll('nav button').forEach(button=>button.classList.toggle('active',button.dataset.page===key))}document.querySelector('nav').onclick=event=>{const button=event.target.closest('button[data-page]');if(button)select(button.dataset.page)};select('armor');</script></body></html>`;
fs.writeFileSync(path.join(releaseDir,'tarkov-armor-chart.html'),html);

// A normal multi-file site is the primary offline release. Local script tags load
// saved data on file://, where fetch() for JSON would otherwise be blocked.
const localPath=value=>String(value||'').replace(/^\//,'');
const localItems=data=>{
  const copy=structuredClone(data);
  for(const item of copy.items)item.localIcon=localPath(item.localIcon);
  return copy;
};
const localTraders=Object.fromEntries(Object.entries(JSON.parse(fs.readFileSync('data/trader-icons.json','utf8'))).map(([name,location])=>[name,localPath(location)]));
localTraders['Flea market']='assets/flea.svg';
const localPayloads={
  armor:{data:localItems(sourceData),plates:payload.plates,masters:payload.masters,charts,traderIcons:localTraders},
  helmets:{helmets:localItems(JSON.parse(fs.readFileSync('data/helmets.json','utf8'))),helmetMasters:payload.helmetMasters,traderIcons:localTraders},
  ammo:{ammo:localItems(JSON.parse(fs.readFileSync('data/ammo.json','utf8'))),traderIcons:localTraders}
};
fs.mkdirSync(path.join(siteDir,'data'),{recursive:true});
fs.cpSync('assets/icons',path.join(siteDir,'assets/icons'),{recursive:true});
fs.cpSync('assets/traders',path.join(siteDir,'assets/traders'),{recursive:true});
fs.copyFileSync('assets/flea.svg',path.join(siteDir,'assets/flea.svg'));
for(const file of ['shared.js','app.js','helmets.js','ammo.js'])fs.copyFileSync(file,path.join(siteDir,file));
const localCss=css.replaceAll("'Barlow Condensed'","'Barlow Condensed','Arial Narrow',Arial,sans-serif")
  .replaceAll("'IBM Plex Mono'","'IBM Plex Mono',Consolas,monospace")
  .replace(/font:([^;]*?)\bInter\b(?!,)/g,'font:$1Inter,Arial,sans-serif');
fs.writeFileSync(path.join(siteDir,'style.css'),localCss);
for(const [key,filename] of [['armor','index.html'],['helmets','helmets.html'],['ammo','ammo.html']]){
  const dataName=`data/${key}.js`;
  fs.writeFileSync(path.join(siteDir,dataName),`globalThis.__TARKOV_RELEASE__=${JSON.stringify(localPayloads[key]).replaceAll('<','\\u003c')};`);
  const page=fs.readFileSync(filename,'utf8')
    .replaceAll('href="/"','href="index.html"')
    .replaceAll('href="/helmets.html"','href="helmets.html"')
    .replaceAll('href="/ammo.html"','href="ammo.html"')
    .replace('<script src="shared.js"></script>',`<script src="${dataName}"></script><script src="shared.js"></script>`);
  fs.writeFileSync(path.join(siteDir,filename),page);
}

const readme=`TARKOV GEAR CHARTS\r\n\r\nOpen site/index.html in a modern browser. This is a plain HTML/CSS/JavaScript website with local data and artwork. The three tabs work by opening the other pages in the same folder; no server or framework is needed. Keep the whole site folder together.\r\n\r\nThe older tarkov-armor-chart.html single-file export is also included, but the site folder is the recommended version.\r\n\r\nThe root PNG files are full armor, helmet, and ammo charts. charts-by-class contains armor class charts; charts-by-caliber contains one ammo chart per caliber.\r\n\r\nsources/images contains separate copies of item PNG artwork, with trader portraits in sources/images/traders. The sources folder also has the saved data and editable coverage SVG files.\r\n\r\nGenerated ${new Date().toISOString()} from the saved project data.\r\n`;
fs.writeFileSync(path.join(releaseDir,'README.txt'),readme);

const crcTable=Array.from({length:256},(_,n)=>{let c=n;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;return c>>>0});
const crc32=buffer=>{let crc=0xffffffff;for(const byte of buffer)crc=crcTable[(crc^byte)&255]^(crc>>>8);return (crc^0xffffffff)>>>0};
const zipFiles=[];
function collect(directory,prefix=''){
  for(const entry of fs.readdirSync(directory,{withFileTypes:true})){
    if(entry.name.endsWith('.zip'))continue;
    const full=path.join(directory,entry.name),name=path.posix.join(prefix,entry.name);
    if(entry.isDirectory())collect(full,name);else zipFiles.push({name,data:fs.readFileSync(full)});
  }
}
collect(releaseDir);
const localParts=[],centralParts=[];let offset=0;
for(const file of zipFiles){
  const name=Buffer.from(file.name.replaceAll('\\','/')),compressed=deflateRawSync(file.data,{level:9}),crc=crc32(file.data);
  const local=Buffer.alloc(30);local.writeUInt32LE(0x04034b50);local.writeUInt16LE(20,4);local.writeUInt16LE(0,6);local.writeUInt16LE(8,8);local.writeUInt32LE(crc,14);local.writeUInt32LE(compressed.length,18);local.writeUInt32LE(file.data.length,22);local.writeUInt16LE(name.length,26);
  localParts.push(local,name,compressed);
  const central=Buffer.alloc(46);central.writeUInt32LE(0x02014b50);central.writeUInt16LE(20,4);central.writeUInt16LE(20,6);central.writeUInt16LE(0,8);central.writeUInt16LE(8,10);central.writeUInt32LE(crc,16);central.writeUInt32LE(compressed.length,20);central.writeUInt32LE(file.data.length,24);central.writeUInt16LE(name.length,28);central.writeUInt32LE(offset,42);
  centralParts.push(central,name);offset+=local.length+name.length+compressed.length;
}
const central=Buffer.concat(centralParts),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(zipFiles.length,8);end.writeUInt16LE(zipFiles.length,10);end.writeUInt32LE(central.length,12);end.writeUInt32LE(offset,16);
fs.writeFileSync(path.join(releaseDir,'tarkov-armor-charts-release.zip'),Buffer.concat([...localParts,central,end]));

for(const file of fs.readdirSync(releaseDir,{withFileTypes:true})){
  if(file.isFile())console.log(`${file.name} ${(fs.statSync(path.join(releaseDir,file.name)).size/1024/1024).toFixed(1)} MB`);
}
console.log(`charts-by-class: ${fs.readdirSync(splitDir).length} PNG files`);
console.log(`sources/images: ${fs.readdirSync(imageSourceDir).length} PNG files`);
