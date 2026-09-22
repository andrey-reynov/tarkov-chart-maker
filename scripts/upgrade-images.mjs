import fs from 'node:fs';
import { cacheIcons } from './icons.mjs';

const path='data/armor.json';
const data=JSON.parse(fs.readFileSync(path,'utf8'));
await cacheIcons(data.items,{force:true});
fs.writeFileSync(path,JSON.stringify(data,null,2));
