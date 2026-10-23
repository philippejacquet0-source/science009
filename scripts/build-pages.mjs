import {cp, mkdir, readFile, rm, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=fileURLToPath(new URL('../',import.meta.url));
const output=path.join(root,'docs');
const relay='https://meteo-gif.philippe0.chatgpt.site/earth-data/';
await rm(output,{recursive:true,force:true});
await mkdir(output,{recursive:true});
await cp(path.join(root,'public'),output,{recursive:true});
await cp(path.join(root,'app/studio.html'),path.join(output,'index.html'));
await writeFile(path.join(output,'.nojekyll'),'');
for(const name of ['main~PFYJS5Q4.js','tiler~S6BUNQ5O.js']){
  const target=path.join(output,'earth/src',name);
  const content=await readFile(target,'utf8');
  if(!content.includes('/earth-data/'))throw new Error('Relais météo absent : '+name);
  await writeFile(target,content.replaceAll('/earth-data/',relay));
}
console.log('GitHub Pages : docs/ prêt, avec le relais météo public.');
