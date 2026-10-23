import {parseSource,sourceDate,atTime,embedSource} from './core.mjs';
export function createMapController(frame) {
  const mapPath=new URL('./earth/index.html',location.href).pathname;
  function state() {
    try {
      const loc=frame.contentWindow.location;
      if(loc.origin!==location.origin||loc.pathname!==mapPath)return null;
      const url=parseSource('https://earth.nullschool.net/'+loc.search+loc.hash);
      url.searchParams.delete('_build');
      const doc=frame.contentDocument;
      const dateText=doc.querySelector('#menu [data-name="date-field"]')?.textContent?.trim()||'';
      const dateMatch=dateText.match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/);
      const actual=dateMatch&&/UTC/.test(dateText)?Date.UTC(+dateMatch[1],+dateMatch[2]-1,+dateMatch[3],+dateMatch[4],+dateMatch[5]):null;
      const card=doc.querySelector('[data-name="status-card"]');
      const status=card&&!card.hidden?card.querySelector('.field')?.textContent?.trim()||'':'';
      const description=doc.querySelector('#menu [data-name="data-field"]')?.textContent?.trim()||'';
      const cursor=Date.parse(doc.documentElement.dataset.weatherCursor||'');
      return {cursor:Number.isFinite(cursor)?cursor:null,pending:Number(doc.documentElement.dataset.weatherPending||0),downloadError:doc.documentElement.dataset.weatherError||'',url:url.href,requested:sourceDate(url.href),actual,status,description,doc};
    } catch {return null;}
  }
  function utc() {const s=state();if(s&&/Local/.test(s.doc.querySelector('#menu [data-name="date-field"]')?.textContent||''))s.doc.querySelector('#change-tz')?.click();}
  function closeMenu(){const s=state();if(s?.doc.querySelector('#menu')?.hidden===false)s.doc.querySelector('[data-name="earth"]')?.click();}
  function load(url){frame.src=embedSource(url);}
  async function navigate(time,signal) {
    if(signal?.aborted)throw new DOMException('Annulé','AbortError');
    const s=state();
    if(!s)throw new Error('La carte est encore en cours de chargement. Attendez son affichage puis réessayez.');
    const next=atTime(s.url,time);
    utc();closeMenu();
    frame.contentWindow.location.hash=new URL(next).hash;
    await new Promise(resolve=>setTimeout(resolve,250));
    const started=Date.now();let stable=0,last=null;
    while(Date.now()-started<45000){
      if(signal?.aborted)throw new DOMException('Annulé','AbortError');
      utc();last=state();
      if(last?.downloadError)throw new Error('Données météo indisponibles : '+last.downloadError);
      if(last?.status&&/error|failed|not available|unavailable|not found|forbidden/i.test(last.status))throw new Error('Nullschool : '+last.status);
      if(last?.cursor===time&&last.requested===time&&last.actual!==null&&!last.status&&!last.pending){if(++stable>=3)return last;}else stable=0;
      await new Promise(resolve=>setTimeout(resolve,200));
    }
    throw new Error('Les données de cette échéance ne sont pas disponibles ou ne chargent pas. '+(last?.status||'La carte affiche une autre date.'));
  }
  return {state,utc,closeMenu,load,navigate};
}
