globalThis.TarkovUI={
  safe:value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;'),
  format:value=>value!=null&&value!==''&&Number.isFinite(Number(value))?Number(value).toLocaleString('en-US'):'—',
  fuzzy(value,query){
    const normalize=text=>String(text??'').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,' ').trim();
    const text=normalize(value),needle=normalize(query);
    if(!needle||text.includes(needle))return true;
    const distance=(a,b)=>{let row=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){let diagonal=row[0];row[0]=i;for(let j=1;j<=b.length;j++){const old=row[j];row[j]=Math.min(row[j]+1,row[j-1]+1,diagonal+(a[i-1]===b[j-1]?0:1));diagonal=old}}return row[b.length]};
    return needle.split(' ').every(term=>text.split(' ').some(word=>word.includes(term)||(term.includes(word)&&word.length>=3)||distance(word,term)<=(term.length<=4?1:Math.ceil(term.length*.25))));
  },
  acquisition(raw,icons={}){
    const a=raw||{},source=a.source||'',match=source.match(/^(?:Barter · )?(.+?) LL(\d+)$/);
    const trader=a.trader||match?.[1]||null,level=a.level||match?.[2]||null;
    const kind=a.kind||(/Barter/.test(source)?'barter':trader?'trader':/Flea/.test(source)?'flea':'special');
    const name=trader?`${trader} LL${level}${kind==='barter'?' · barter':''}`:kind==='flea'?'Flea market':source||'Special / FIR';
    const icon=trader?icons[trader]:kind==='flea'?(icons['Flea market']||'/assets/flea.svg'):null;
    const img=icon?`<img class="seller-icon" src="${this.safe(icon)}" alt="">`:'<span class="seller-icon seller-fallback">◈</span>';
    return `<span class="seller">${img}<span><b>${this.safe(name)}</b><span class="price">${a.price?`${a.estimated?'~':''}${this.format(a.price)} ₽`:'—'}</span></span></span>`;
  }
};
