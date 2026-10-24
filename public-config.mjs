import {readFile} from 'node:fs/promises';
export async function publicConfig(){
 let local='';try{const content=await readFile(new URL('./.env.local',import.meta.url),'utf8');const line=content.split(/\r?\n/).find(row=>/^\s*CARTO_API_KEY\s*=/.test(row));local=(line?.slice(line.indexOf('=')+1)||'').trim().replace(/^(['"])(.*)\1$/,'$2');}catch{}
 const key=(process.env.CARTO_API_KEY||local).trim();return {cartoApiKey:/^cb1_[A-Za-z0-9_-]+$/.test(key)?key:''};
}
export async function publicConfigScript(){return 'window.TRACKS_PUBLIC_CONFIG = '+JSON.stringify(await publicConfig())+';\n';}
