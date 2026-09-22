import fs from 'node:fs';
import { createRequire } from 'node:module';

const require=createRequire(import.meta.url);
let sharp;
try { sharp=require('sharp'); }
catch { sharp=require('C:/Users/drop/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp'); }

// Tarkov.dev's icon assets are 64px. The corresponding transparent base images
// are 190px and remain sharp at the chart's 104px display size.
export async function cacheIcons(items,{force=false}={}) {
  fs.mkdirSync('assets/icons',{recursive:true});
  let next=0,ok=0,highRes=0;
  async function worker() {
    while(next<items.length) {
      const item=items[next++];
      if(!item.iconLink) continue;
      const file=`assets/icons/${item.id.replace(/[^a-zA-Z0-9_-]/g,'_')}.png`;
      try {
        if(force || !fs.existsSync(file)) {
          const highResUrl=item.iconLink.replace(/-icon\.(webp|png)$/i,'-base-image.webp');
          const urls=highResUrl===item.iconLink?[item.iconLink]:[highResUrl,item.iconLink];
          let buffer,usedHighRes=false;
          for(const url of urls) {
            try {
              const response=await fetch(url);
              if(!response.ok) continue;
              buffer=Buffer.from(await response.arrayBuffer());
              await sharp(buffer).metadata();
              usedHighRes=url===highResUrl;
              break;
            } catch {}
          }
          if(!buffer) throw Error('No image available');
          await sharp(buffer).png().toFile(file);
          if(usedHighRes) highRes++;
        }
        item.localIcon='/'+file.replaceAll('\\','/');
        ok++;
      } catch(error) { console.error(`Image failed: ${item.name}: ${error.message}`); }
    }
  }
  await Promise.all(Array.from({length:6},worker));
  console.log(`Cached ${ok}/${items.length} images (${highRes} high-resolution downloads)`);
}
