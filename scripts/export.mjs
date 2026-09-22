import fs from 'node:fs';import {createRequire} from 'node:module';import {makeChart} from './chart.mjs';import {makeHelmetChart,makeAmmoChart} from './gear-chart.mjs';
const require=createRequire(import.meta.url);let sharp;try{sharp=require('sharp')}catch{sharp=require('C:/Users/drop/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp')}
const out=process.argv[2]||'outputs';fs.mkdirSync(out,{recursive:true});
for(const [category,name] of [['armor','body-armor'],['rig','armored-rigs'],['all','armor-and-rigs']]){
  const svg=makeChart({category}),base=`${out}/${name}`;
  fs.writeFileSync(base+'.svg',svg);
  for(let attempt=0;attempt<3;attempt++){
    try{await sharp(Buffer.from(svg)).png().toFile(base+'.png');break}
    catch(error){if(attempt===2)throw error;await new Promise(resolve=>setTimeout(resolve,300))}
  }
  console.log(base+'.png');
}
for(const [name,svg] of [['helmets',makeHelmetChart()],['ammo',makeAmmoChart()]]){
  const base=`${out}/${name}`;
  fs.writeFileSync(base+'.svg',svg);
  await sharp(Buffer.from(svg)).png().toFile(base+'.png');
  console.log(base+'.png');
}
