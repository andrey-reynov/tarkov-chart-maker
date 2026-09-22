import fs from 'node:fs';
import { createRequire } from 'node:module';
import { pilotPresets } from './plate-presets.mjs';

const require = createRequire(import.meta.url);
let sharp;
try { sharp = require('sharp'); }
catch { sharp = require('C:/Users/drop/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp'); }

const data = JSON.parse(fs.readFileSync('data/armor.json', 'utf8'));
// Ordinal ramp: each step gets lighter on the dark chart; the first fill clears 3:1.
const colors = { 1:'#C0564E', 2:'#CA7050', 3:'#D28B4B', 4:'#C6A849', 5:'#94BE55', 6:'#55D275' };
const neutral = '#434D45';
const neutralStroke = '#A9B7A4';
const escapeXml = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');

// The two user-edited master silhouettes have distinct necks and lower panels.
// Preserve every path, stroke, opacity and drawing order; change only fills.
function readMaster(file, expected) {
  const source=fs.readFileSync(file,'utf8');
  const groups=[...source.matchAll(/<g id="([^"]+)" data-part="([^"]+)">(<path\b[^>]*?\/>)[\s]*<\/g>/g)];
  if (groups.length!==expected.length || groups.some((m,i)=>m[2]!==expected[i])) throw Error(`Unexpected parts in ${file}`);
  return groups.map(m=>({name:m[2],path:m[3]}));
}
const masters={
  front:readMaster('assets/armor-front.svg',['shoulder_left','shoulder_right','side_left','side_right','plate','butt_cover_fill','butt_cover_outline','groin','neck']),
  back:readMaster('assets/armor-back.svg',['shoulder_left','shoulder_right','neck','side_left','side_right','plate','groin'])
};

function part(entry, fill, prefix) {
  let path=entry.name.startsWith('butt_cover_') ? entry.path : entry.path.replace(/ fill="[^"]*"/,` fill="${fill}"`);
  const border=fill===neutral ? neutralStroke : fill;
  path=path.replace(/ stroke="[^"]*"/,` stroke="${border}"`);
  return `<g id="${prefix}-${entry.name}" data-part="${entry.name}">${path}</g>`;
}

function figure(face, preset, prefix) {
  const plateClass = face === 'front' ? preset.front : preset.back;
  const sideFill = preset.side ? colors[preset.side] : neutral;
  return `<g id="${prefix}" data-view="${face}">`
    + masters[face].map(entry=>part(entry,entry.name==='plate' && plateClass ? colors[plateClass]
      : entry.name.startsWith('side_') ? sideFill
      : neutral,prefix)).join('')
    + '</g>';
}

const W=1560, header=155, row=143, footer=108, H=header+row*pilotPresets.length+footer;
let rows='';
for (const [i,preset] of pilotPresets.entries()) {
  const item=data.items.find(x=>x.id===preset.id);
  if (!item) throw Error('Missing item '+preset.id);
  const y=header+i*row;
  const icon=fs.readFileSync('.'+item.localIcon).toString('base64');
  const label=item.name==='Slick'?'Slick (Black)':item.name==='AVS'?'AVS (MultiCam)':item.name==='Korund-VM'?'Korund-VM (Black)':item.name==='6B2'?'6B2 (Flora)':item.name;
  rows+=`<g id="equipment-${i+1}" data-item-id="${escapeXml(item.id)}"><rect x="0" y="${y}" width="${W}" height="${row}" fill="${i%2?'#1b221b':'#222a20'}"/><image x="20" y="${y+19}" width="104" height="104" href="data:image/png;base64,${icon}"/><text x="148" y="${y+70}" class="item">${escapeXml(label)}</text><text x="148" y="${y+94}" class="tag">${item.category==='rig'?'ARMORED RIG':'BODY ARMOR'}</text><g transform="translate(544 ${y+8}) scale(2.35)">${figure('front',preset,`item-${i+1}-front`)}</g><g transform="translate(769 ${y+8}) scale(2.35)">${figure('back',preset,`item-${i+1}-back`)}</g><text x="1090" y="${y+72}" class="built-in">BUILT-IN ${preset.soft}</text></g>`;
}

const legend=[1,2,3,4,5,6].map((n,i)=>`<rect x="${263+i*43}" y="${H-87}" width="35" height="20" fill="${colors[n]}"/><text x="${280+i*43}" y="${H-71}" text-anchor="middle" class="legend-num">${n}</text>`).join('');
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><style>text{font-family:Arial,sans-serif}.title{font-size:47px;font-weight:900;letter-spacing:2px;fill:#e8ede4}.subtitle{font-size:15px;fill:#a8b9a8}.head{font-size:13px;font-weight:bold;letter-spacing:1px;fill:#b7c891}.item{font-size:21px;font-weight:bold;fill:#e5eadd}.tag{font-size:12px;letter-spacing:1px;fill:#9eaf9b}.built-in{font-size:22px;font-weight:bold;fill:#9cbed5}.foot{font-size:13px;fill:#a6b2a5}.legend-num{font-size:13px;font-weight:bold;fill:#fff;paint-order:stroke;stroke:#152014;stroke-width:2px}</style><rect width="100%" height="100%" fill="#131913"/><rect width="100%" height="8" fill="#a3bd76"/><text x="25" y="68" class="title">PLATE COVERAGE / DESIGN PREVIEW</text><text x="28" y="97" class="subtitle">Default loadouts · verified examples · schematic plate areas</text><rect x="0" y="119" width="${W}" height="36" fill="#303c2b"/><text x="26" y="143" class="head">EQUIPMENT</text><text x="578" y="143" class="head">FRONT</text><text x="803" y="143" class="head">BACK</text><text x="1090" y="143" class="head">BUILT-IN ARMOR</text>${rows}<rect x="0" y="${H-footer}" width="${W}" height="${footer}" fill="#293326"/><rect x="27" y="${H-87}" width="15" height="15" fill="${neutral}"/><text x="50" y="${H-74}" class="foot">No plate shown</text>${legend}<text x="545" y="${H-72}" class="foot">Plate class: low → high</text><text x="27" y="${H-35}" class="foot">Pilot only. Default plates can be changed. Gray does not imply no built-in armor. Shapes are schematic, not aim points.</text></svg>`;

fs.writeFileSync('outputs/plate-coverage-preview.svg',svg);
await sharp(Buffer.from(svg)).png().toFile('outputs/plate-coverage-preview.png');

const template=`<svg xmlns="http://www.w3.org/2000/svg" width="270" height="150" viewBox="0 0 270 150"><title>Editable armor coverage parts</title><desc>Each named group is a separate editable shape. The ids and data-part names match assets/armor-front.svg and assets/armor-back.svg.</desc><rect width="270" height="150" fill="#202820"/><g transform="translate(12 9) scale(2.35)">${figure('front',{front:6,side:4},'front')}</g><g transform="translate(132 9) scale(2.35)">${figure('back',{back:5,side:4},'back')}</g></svg>`;
fs.writeFileSync('outputs/armor-coverage-editable.svg',template);
console.log('outputs/plate-coverage-preview.png, outputs/plate-coverage-preview.svg, outputs/armor-coverage-editable.svg');
