import {cp, mkdir, readFile, readdir, rm, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
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
// Pages caches assets for several minutes. Version every local module and
// iframe entry together so an update cannot mix old and new application code.
async function files(directory){
  const entries=await readdir(directory,{withFileTypes:true});
  const groups=await Promise.all(entries.map(entry=>entry.isDirectory()?files(path.join(directory,entry.name)):[path.join(directory,entry.name)]));
  return groups.flat().sort();
}
const assets=await files(output),hash=createHash('sha256');
for(const file of assets){hash.update(path.relative(output,file));hash.update(await readFile(file));}
const version=hash.digest('hex').slice(0,12);
for(const file of assets.filter(file=>/\.(?:html|m?js)$/.test(file)&&!file.includes('/vendor/'))){
  let content=await readFile(file,'utf8');
  if(file.endsWith('.html'))content=content.replace(/\b(src|href|data-tiler)=(["'])([^"']+\.(?:m?js|css))\2/g,(all,attribute,quote,url)=>/^(?:https?:|data:|\/\/)/.test(url)?all:`${attribute}=${quote}${url}?v=${version}${quote}`);
  else content=content.replace(/(\bfrom\s*|\bimport\s*)(["'])(\.{1,2}\/[^"']+\.m?js)\2/g,(_all,prefix,quote,url)=>`${prefix}${quote}${url}?v=${version}${quote}`);
  if(file===path.join(output,'earth/src/main~PFYJS5Q4.js'))content=content.replaceAll('tiler~S6BUNQ5O.js','tiler~S6BUNQ5O.js?v='+version);
  await writeFile(file,content);
}
console.log('GitHub Pages : docs/ prêt, avec le relais météo public.');
