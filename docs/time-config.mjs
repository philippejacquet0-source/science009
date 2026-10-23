import {INITIAL_URL,parseSource,parseUTC,inputDate,atTime,makePlan} from './core.mjs';
export const PARIS_ZONE='Europe/Paris';
const fields=new Intl.DateTimeFormat('fr-CA',{timeZone:PARIS_ZONE,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
export function parisInput(time){
  const p=Object.fromEntries(fields.formatToParts(time).map(x=>[x.type,x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}
export function parisInstant(value,preferred){
  let naive;try{naive=parseUTC(value);}catch{throw new Error('Renseignez une date et une heure valides à Paris.');}
  // Remember the absolute instant set by a shortcut or shared link, including
  // the second occurrence of an hour when clocks go back in autumn.
  if(Number.isFinite(preferred)&&parisInput(preferred)===value)return preferred;
  const offsets=new Set([-36,0,36].map(h=>{const probe=naive+h*3600000;return parseUTC(parisInput(probe))-probe;}));
  const matches=[...offsets].map(offset=>naive-offset).filter(t=>parisInput(t)===value).sort((a,b)=>a-b);
  if(!matches.length)throw new Error('Cette heure n’existe pas à Paris en raison du passage à l’heure d’été.');
  return matches[0];
}
export const currentHour=(now=Date.now())=>Math.floor(now/3600000)*3600000;
export function defaultConfig(now=Date.now()){
  const start=currentHour(now);
  return {url:atTime(INITIAL_URL,start),start:inputDate(start),end:inputDate(start+24*3600000),step:3,maxSeconds:8,width:960,samples:4,wait:10};
}
export function shareURL(base,config){
  makePlan(config);
  const url=new URL(base);url.search='';url.hash='';
  for(const [key,value] of Object.entries({v:1,map:config.url,start:config.start,end:config.end,step:config.step,duration:config.maxSeconds,width:config.width,samples:config.samples,wait:config.wait}))url.searchParams.set(key,String(value));
  return url.href;
}
export function sharedConfig(value){
  const url=new URL(value),p=url.searchParams;
  if(!p.has('v'))return null;
  if(p.get('v')!=='1'||value.length>10000)throw new Error('Ce lien de configuration n’est pas pris en charge.');
  const config={url:p.get('map')||'',start:p.get('start')||'',end:p.get('end')||'',step:Number(p.get('step')),maxSeconds:Number(p.get('duration')),width:Number(p.get('width')),samples:Number(p.get('samples')),wait:Number(p.get('wait'))};
  parseSource(config.url);makePlan(config);
  return config;
}
