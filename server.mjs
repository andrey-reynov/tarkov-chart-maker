import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {makeChart} from './scripts/chart.mjs';
const root=process.cwd(); const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'};
http.createServer((req,res)=>{const url=new URL(req.url,'http://localhost');let p=decodeURIComponent(url.pathname);if(p==='/exports/armor.svg'){const svg=makeChart(Object.fromEntries(url.searchParams));res.setHeader('Content-Type','image/svg+xml');res.setHeader('Content-Disposition','attachment; filename="armor-chart.svg"');res.end(svg);return} if(p==='/')p='/index.html'; const file=path.resolve(root,'.'+p); if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return} fs.readFile(file,(err,buf)=>{if(err){res.writeHead(404).end('Not found');return} res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(buf)})}).listen(4173,()=>console.log('Open http://localhost:4173'));
