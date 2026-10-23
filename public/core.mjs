export const INITIAL_URL = 'https://earth.nullschool.net/?kiosk#current/wind/surface/level/orthographic=7.76,47.55,1855/loc=-1.630,49.451';
export function parseSource(value) {
  let url;
  try { url = new URL(value.trim()); } catch { throw new Error('Collez un lien Nullschool complet, commençant par https://.'); }
  if (url.protocol !== 'https:' || url.hostname !== 'earth.nullschool.net' || url.username || url.password || url.port) throw new Error('Utilisez un lien https://earth.nullschool.net/.');
  if (!url.hash) throw new Error('Le lien doit inclure les réglages de la carte après le signe #.');
  return url;
}
export function embedSource(value) {
  const url = parseSource(value);
  // Nullschool's kiosk option keeps its full menu and zoom controls inside an iframe.
  url.searchParams.set('kiosk', '');
  return './earth/index.html' + url.search + url.hash;
}
export function parseUTC(value) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error('Renseignez les deux dates en UTC.');
  const date = new Date(value + ':00Z');
  if (!Number.isFinite(+date) || date.toISOString().slice(0,16) !== value) throw new Error('Cette date est invalide.');
  return +date;
}
export const inputDate = ms => new Date(ms).toISOString().slice(0,16);
export function sourceDate(value) {
  const m = parseSource(value).hash.match(/^#(\d{4})\/(\d{2})\/(\d{2})\/(\d{2})(\d{2})Z(?:\/|$)/);
  return m ? parseUTC(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}`) : null;
}
export function atTime(value, ms) {
  const url = parseSource(value);
  const iso = new Date(ms).toISOString();
  const stamp = `${iso.slice(0,4)}/${iso.slice(5,7)}/${iso.slice(8,10)}/${iso.slice(11,13)}${iso.slice(14,16)}Z`;
  const tail = url.hash.slice(1).replace(/^(?:\d{4}\/\d{2}\/\d{2}\/\d{4}Z|current)\/?/, '');
  url.hash = stamp + '/' + tail;
  return url.href;
}
export function makePlan({url,start,end,step,maxSeconds,width,samples=4,wait=10}) {
  parseSource(url);
  const a = parseUTC(start), b = parseUTC(end), stride = Number(step)*3600000;
  if (b < a) throw new Error('La fin doit être postérieure ou égale au début.');
  if (![1,2,3,6,12,24].includes(Number(step))) throw new Error('Choisissez un pas de 1, 2, 3, 6, 12 ou 24 heures.');
  if (a % 3600000 || b % 3600000) throw new Error('Choisissez des heures entières en UTC : 07 h 00, 08 h 00…');
  if ((b-a) % stride) throw new Error('La période doit être un multiple du pas choisi pour inclure exactement la date de fin.');
  if (!Number.isFinite(+maxSeconds) || +maxSeconds < 1 || +maxSeconds > 30) throw new Error('La durée du GIF doit être comprise entre 1 et 30 secondes.');
  if (![640,960,1280].includes(+width)) throw new Error('Choisissez une largeur proposée.');
  if (![1,4].includes(+samples)) throw new Error('Choisissez un mode d’animation proposé.');
  if (!Number.isFinite(+wait) || +wait < 1 || +wait > 60) throw new Error('L’attente de chargement doit être comprise entre 1 et 60 secondes.');
  const count = Math.round((b-a)/stride)+1;
  if (count > 120) throw new Error('Limite de 120 échéances. Augmentez le pas ou raccourcissez la période.');
  const height = Math.round(+width*0.625)+44;
  const memoryLimit = Math.floor(160*1024*1024/(+width*height*4));
  const timeLimit = Math.floor(+maxSeconds*100/2);
  const actualSamples = Math.min(+samples,Math.floor(Math.min(240,memoryLimit,timeLimit)/count));
  if (actualSamples < 1) throw new Error('Trop d’images pour ces réglages. Réduisez la résolution, augmentez le pas ou allongez la durée du GIF.');
  const times = Array.from({length:count},(_,i)=>a+i*stride);
  const frames = count*actualSamples;
  const centis = Math.floor(+maxSeconds*100);
  const delays = Array.from({length:frames},(_,i)=>(Math.floor((i+1)*centis/frames)-Math.floor(i*centis/frames))*10);
  return {url:parseSource(url).href,times,samples:actualSamples,frames,delays,width:+width,height,mapHeight:height-44,wait:+wait,seconds:delays.reduce((a,b)=>a+b,0)/1000,estimatedSeconds:count*(+wait+(actualSamples-1)*0.2+0.6),reduced:actualSamples<+samples};
}
