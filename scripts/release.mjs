import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {deflateRawSync} from 'node:zlib';
import {makeChart} from './chart.mjs';

const require=createRequire(import.meta.url);
let sharp;
try{sharp=require('sharp')}catch{sharp=require('C:/Users/drop/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp')}

const releaseDir='release',splitDir=path.join(releaseDir,'charts-by-class'),sourceDir=path.join(releaseDir,'sources'),imageSourceDir=path.join(sourceDir,'images');
fs.rmSync(releaseDir,{recursive:true,force:true});
fs.mkdirSync(splitDir,{recursive:true});
fs.mkdirSync(imageSourceDir,{recursive:true});

const sourceData=JSON.parse(fs.readFileSync('data/armor.json','utf8'));
const embeddedData=structuredClone(sourceData);
for(const item of embeddedData.items){
  const iconPath='.'+item.localIcon;
  item.localIcon=`data:image/png;base64,${fs.readFileSync(iconPath).toString('base64')}`;
}

for(const file of fs.readdirSync('assets/icons')){
  if(file.toLowerCase().endsWith('.png'))fs.copyFileSync(path.join('assets/icons',file),path.join(imageSourceDir,file));
}
fs.copyFileSync('data/armor.json',path.join(sourceDir,'armor.json'));
fs.copyFileSync('data/plate-classes.json',path.join(sourceDir,'plate-classes.json'));
fs.copyFileSync('assets/armor-front.svg',path.join(sourceDir,'armor-front.svg'));
fs.copyFileSync('assets/armor-back.svg',path.join(sourceDir,'armor-back.svg'));

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

const payload={
  data:embeddedData,
  plates:JSON.parse(fs.readFileSync('data/plate-classes.json','utf8')),
  masters:{front:fs.readFileSync('assets/armor-front.svg','utf8'),back:fs.readFileSync('assets/armor-back.svg','utf8')},
  charts
};
const json=JSON.stringify(payload).replaceAll('<','\\u003c');
const css=fs.readFileSync('style.css','utf8');
const app=fs.readFileSync('app.js','utf8').replaceAll('</script>','<\\/script>');
let html=fs.readFileSync('index.html','utf8')
  .replace('<link rel="stylesheet" href="style.css">',`<style>${css}</style>`)
  .replace('<a href="/coverage.html">Coverage preview</a>','<a class="disabled">Coverage preview</a>')
  .replace('<a href="/plate-preview.html">Plate preview</a>','<a class="disabled">Plate preview</a>')
  .replace('<script type="module" src="app.js"></script>',`<script>globalThis.__TARKOV_RELEASE__=${json};</script><script>${app}</script>`);
fs.writeFileSync(path.join(releaseDir,'tarkov-armor-chart.html'),html);

const readme=`TARKOV ARMOR CHARTS\r\n\r\nOpen tarkov-armor-chart.html in a modern browser. It is a complete offline website and does not require a server or internet connection. Item artwork is embedded directly in the HTML.\r\n\r\nThe three PNG files are full charts. charts-by-class contains smaller screenshots for individual armor classes.\r\n\r\nsources/images contains separate copies of all item PNG artwork. The sources folder also contains the saved armor data, plate data, and editable front/back coverage SVG files.\r\n\r\nGenerated ${new Date().toISOString()} from the saved project data.\r\n`;
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
