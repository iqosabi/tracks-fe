import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
const root=resolve(process.cwd());
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png'};
http.createServer(async(req,res)=>{
  try {
    const path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
    if(path!==root&&!path.startsWith(root+sep))throw Error();
    const target=path===root?resolve(root,'index.html'):path;
    if(!['.html','.js','.css','.svg','.png'].includes(extname(target)))throw Error();
    const body=await readFile(target);
    res.writeHead(200,{'Content-Type':mime[extname(target)],'X-Content-Type-Options':'nosniff','Cache-Control':'no-store'}).end(body);
  }catch{res.writeHead(404).end('Not found');}
}).listen(Number(process.env.PORT||5173),'0.0.0.0',()=>console.log('Tracks Monitor running on port '+(process.env.PORT||5173)));
