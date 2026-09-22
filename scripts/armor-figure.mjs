import fs from 'node:fs';

export const plateColors={1:'#C0564E',2:'#CA7050',3:'#D28B4B',4:'#C6A849',5:'#94BE55',6:'#55D275'};
const neutral='#434D45',neutralStroke='#A9B7A4';

function readMaster(file,expected) {
  const source=fs.readFileSync(file,'utf8');
  const groups=[...source.matchAll(/<g id="([^"]+)" data-part="([^"]+)">(<path\b[^>]*?\/>)[\s]*<\/g>/g)];
  if(groups.length!==expected.length || groups.some((m,i)=>m[2]!==expected[i])) throw Error(`Unexpected parts in ${file}`);
  return groups.map(m=>({name:m[2],path:m[3]}));
}
const masters={
  front:readMaster('assets/armor-front.svg',['shoulder_left','shoulder_right','side_left','side_right','plate','butt_cover_fill','butt_cover_outline','groin','neck']),
  back:readMaster('assets/armor-back.svg',['shoulder_left','shoulder_right','neck','side_left','side_right','plate','groin'])
};

export function armorFigure(face,plate,prefix) {
  const classes=plate||{};
  const center=classes[face];
  const sideLeft=classes.side||classes.sideLeft;
  const sideRight=classes.side||classes.sideRight;
  const groin=face==='front'?classes.groinFront:classes.groinBack;
  const parts=masters[face].map(entry=>{
    const fill=entry.name==='plate' && center ? plateColors[center]
      : entry.name==='side_left' && sideLeft ? plateColors[sideLeft]
      : entry.name==='side_right' && sideRight ? plateColors[sideRight]
      : entry.name==='groin' && groin ? plateColors[groin]
      : entry.name==='neck' && classes.neck ? plateColors[classes.neck]
      : entry.name==='shoulder_left' && classes.shoulderLeft ? plateColors[classes.shoulderLeft]
      : entry.name==='shoulder_right' && classes.shoulderRight ? plateColors[classes.shoulderRight]
      : neutral;
    let path=entry.name.startsWith('butt_cover_') ? entry.path : entry.path.replace(/ fill="[^"]*"/,` fill="${fill}"`);
    const border=fill===neutral ? neutralStroke : fill;
    path=path.replace(/ stroke="[^"]*"/,` stroke="${border}"`);
    return `<g id="${prefix}-${entry.name}" data-part="${entry.name}">${path}</g>`;
  }).join('');
  const unknown=classes.status==='unknown' ? '<text x="28" y="31" text-anchor="middle" font-family="Arial" font-size="12" font-weight="bold" fill="#e5eadd">?</text>' : '';
  return `<g id="${prefix}" data-view="${face}">${parts}${unknown}</g>`;
}
