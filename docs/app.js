import {INITIAL_URL,parseSource,parseUTC,sourceDate,inputDate,atTime,makePlan} from './core.mjs';
import {createMapController} from './map-controller.mjs';
import {createMarkersUI} from './markers-ui.mjs';
import {captureMap} from './map-capture.mjs';
import {PARIS_ZONE,parisInput,parisInstant,currentHour,defaultConfig,shareURL,sharedConfig} from './time-config.mjs';
const $ = id => document.getElementById(id);
const frame = $('earthFrame');
const map = createMapController(frame);
let navigationController=null,lastMapUrl='';
const dateFormat = new Intl.DateTimeFormat('fr-FR',{timeZone:PARIS_ZONE,day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23',timeZoneName:'short'});
const shortFormat = new Intl.DateTimeFormat('fr-FR',{timeZone:PARIS_ZONE,day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
const fmt = t => dateFormat.format(t).replace(' à ', ' · ').replace(/UTC(?:[+-]\d+(?::\d+)?)?/,'Paris ($&)');
let currentPlan, session = null, previewController = null, gifURL = null, toastTimer;
const markers=createMarkersUI(frame,{toast,isBusy:()=>!!session});
function toast(message) { $('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,5000); }
function fieldTime(id){const el=$(id);return parisInstant(el.value,el.dataset.instant===undefined?undefined:Number(el.dataset.instant));}
function setFieldTime(id,time){$(id).value=parisInput(time);$(id).dataset.instant=String(time);}
function formConfig(){return {url:$('sourceUrl').value,start:inputDate(fieldTime('startDate')),end:inputDate(fieldTime('endDate')),step:Number($('timeStep').value),maxSeconds:Number($('maxDuration').value),width:Number($('resolution').value),samples:Number($('samples').value),wait:Number($('loadWait').value),markers:markers.get()};}
function readPlan(){return makePlan(formConfig());}
function minutes(seconds){return seconds<60?Math.ceil(seconds)+' s':Math.ceil(seconds/60)+' min';}
function updatePlan() {
  try {
    const p=readPlan();currentPlan=p;
    $('formMessage').hidden=true;$('generateBtn').disabled=false;
    $('estimateFrames').textContent=`${p.frames} images · ${p.width} px`;
    $('estimateDetails').textContent=`${p.times.length} échéances · GIF ${p.seconds} s · capture ≈ ${minutes(p.estimatedSeconds)}`+(p.reduced?' · mouvement réduit pour limiter la mémoire':'');
    $('timelineStart').textContent=shortFormat.format(p.times[0]);$('timelineEnd').textContent=shortFormat.format(p.times.at(-1));
    $('timelineCount').textContent=p.times.length+' échéance'+(p.times.length>1?'s':'');
    $('scrubber').max=p.times.length-1;$('scrubber').value=Math.min(+$('scrubber').value,p.times.length-1);
    $('playBtn').disabled=false;$('scrubber').disabled=false;
    document.querySelectorAll('[data-end-hours]').forEach(button=>{const active=p.times.at(-1)-p.times[0]===Number(button.dataset.endHours)*3600000;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
    return p;
  } catch(error) {
    currentPlan=null;$('formMessage').textContent=error.message;$('formMessage').hidden=false;
    $('generateBtn').disabled=true;$('playBtn').disabled=true;$('scrubber').disabled=true;
    $('estimateFrames').textContent='Vérifiez vos réglages';$('estimateDetails').textContent='Les deux dates doivent être compatibles avec le pas météo.';
    return null;
  }
}
async function showTime(time,signal) {
  $('mapTime').textContent='Chargement · '+fmt(time);$('mapTag').textContent='CHARGEMENT DES DONNÉES';
  try { const state=await map.navigate(time,signal);$('sourceUrl').value=state.url;$('sourceLink').href=state.url;$('mapTime').textContent='Carte · '+fmt(time);$('mapTime').title='Date des données affichées : '+fmt(state.actual);return state; }
  finally {$('mapTag').textContent='CARTE INTERACTIVE';}
}
function stopPreview() {previewController?.abort();previewController=null;$('playBtn').textContent='▶';$('playBtn').setAttribute('aria-label','Parcourir les échéances');}
function abortError(){return new DOMException('Annulé','AbortError');}
function pause(ms,signal){return new Promise((resolve,reject)=>{if(signal?.aborted)return reject(abortError());const done=()=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);resolve();};const abort=()=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);reject(abortError());};const timer=setTimeout(done,ms);signal?.addEventListener('abort',abort,{once:true});});}
function check(s){if(s.controller.signal.aborted)throw abortError();if(!frame.contentDocument?.querySelector('[data-type="geo-canvas"]'))throw new Error('La carte n’est plus disponible. Rechargez la page.');}
async function countdown(seconds,s,title){for(let remaining=seconds;remaining>0;remaining--){check(s);$('recordTitle').textContent=title;$('recordDetail').textContent=`Chargement : ${remaining} s · gardez cet onglet visible`;await pause(1000,s.controller.signal);}}
async function drawFrame(s,time){
  const p=s.plan,ctx=s.ctx;
  ctx.fillStyle='#050a0d';ctx.fillRect(0,0,p.width,p.height);
  markers.refresh();
  await captureMap(frame,ctx,p.width,p.mapHeight,s.controller.signal);
  ctx.fillStyle='#10292b';ctx.fillRect(0,p.mapHeight,p.width,44);
  ctx.font=`700 ${p.width<700?20:28}px sans-serif`;ctx.textBaseline='middle';ctx.fillStyle='#f2faf6';ctx.fillText(fmt(time),16,p.mapHeight+22,p.width-(p.width<700?132:156));
  ctx.font=`${p.width<700?10:12}px sans-serif`;ctx.textAlign='right';ctx.fillStyle='#9dbcb4';ctx.fillText('earth.nullschool.net',p.width-16,p.mapHeight+22);ctx.textAlign='left';
}
function encode(s){return new Promise((resolve,reject)=>{
  const timeout=setTimeout(()=>{s.encoder.abort();cleanup();reject(new Error('L’encodage prend trop de temps. Réessayez avec une résolution plus basse.'));},120000);
  const abort=()=>{s.encoder.abort();cleanup();reject(abortError());};
  const cleanup=()=>{clearTimeout(timeout);s.controller.signal.removeEventListener('abort',abort);};
  s.encoder.on('progress',v=>{if(session===s){$('progressBar').value=80+v*20;$('recordTitle').textContent=`Encodage du GIF · ${Math.round(v*100)} %`;$('recordDetail').textContent='Encodage sur votre ordinateur.';}});
  s.encoder.on('finished',blob=>{cleanup();resolve(blob);});
  s.controller.signal.addEventListener('abort',abort,{once:true});
  s.encoder.render();
});}
function release(s){s.encoder?.frames?.splice(0);s.encoder?.activeWorkers?.forEach(w=>w.terminate());s.encoder?.freeWorkers?.forEach(w=>w.terminate());}
function finishUI(){document.body.classList.remove('exporting');$('recordDock').hidden=true;for(const el of $('settingsForm').elements)el.disabled=false;$('applySource').disabled=false;document.querySelectorAll('.preset').forEach(e=>e.disabled=false);updatePlan();}
async function generate(event){
  event.preventDefault();if(session)return;
  const plan=updatePlan();if(!plan)return;
  if(typeof GIF==='undefined'){toast('L’encodeur GIF n’a pas chargé. Rechargez la page.');return;}
  stopPreview();navigationController?.abort();navigationController=null;markers.stop();map.closeMenu();
  const s={plan,controller:new AbortController(),encoder:null,};session=s;
  document.body.classList.add('exporting');$('recordDock').hidden=false;$('progressBar').value=0;$('recordTitle').textContent='Préparation de la carte';$('recordDetail').textContent='Chargement de la première échéance…';
  for(const el of $('settingsForm').elements)el.disabled=true;$('applySource').disabled=true;document.querySelectorAll('.preset').forEach(e=>e.disabled=true);$('scrubber').disabled=true;$('playBtn').disabled=true;
  try {
    await showTime(plan.times[0],s.controller.signal);$('scrubber').value=0;
    await countdown(plan.wait,s,'Préparation de la première échéance');
    check(s);
    const captureViewport={w:innerWidth,h:innerHeight};
    s.resize=()=>{s.failure='La fenêtre a changé de taille. Relancez la capture avec un cadrage fixe.';s.controller.abort();};
    s.hidden=()=>{if(document.hidden){s.failure='L’onglet a été masqué. Relancez la capture et gardez-le visible.';s.controller.abort();}};
    window.addEventListener('resize',s.resize);document.addEventListener('visibilitychange',s.hidden);
    await pause(650,s.controller.signal);
    s.canvas=document.createElement('canvas');s.canvas.width=plan.width;s.canvas.height=plan.height;s.ctx=s.canvas.getContext('2d');
    s.encoder=new GIF({workers:2,quality:10,width:plan.width,height:plan.height,workerScript:new URL('./vendor/gif.worker.js',import.meta.url).href,repeat:0,background:'#050a0d'});
    let frameIndex=0;
    for(let i=0;i<plan.times.length;i++){
      check(s);if(innerWidth!==captureViewport.w||innerHeight!==captureViewport.h)throw new Error('Le cadrage a changé. Relancez la capture.');
      if(i>0){$('recordTitle').textContent=`Chargement · échéance ${i+1} / ${plan.times.length}`;await showTime(plan.times[i],s.controller.signal);$('scrubber').value=i;await countdown(plan.wait,s,`Échéance ${i+1} / ${plan.times.length}`);}
      for(let j=0;j<plan.samples;j++){
        check(s);$('recordTitle').textContent=`Capture · échéance ${i+1} / ${plan.times.length}`;$('recordDetail').textContent=fmt(plan.times[i]);
        if(j>0)await pause(200,s.controller.signal);
        await drawFrame(s,plan.times[i]);s.encoder.addFrame(s.ctx,{copy:true,delay:plan.delays[frameIndex++]});$('progressBar').value=80*frameIndex/plan.frames;
      }
    }
    window.removeEventListener('resize',s.resize);document.removeEventListener('visibilitychange',s.hidden);
    document.body.classList.remove('exporting');$('recordTitle').textContent='Encodage du GIF…';$('recordDetail').textContent='Encodage sur votre ordinateur.';
    const blob=await encode(s);if(s.controller.signal.aborted)throw abortError();
    if(gifURL)URL.revokeObjectURL(gifURL);gifURL=URL.createObjectURL(blob);
    $('resultImage').src=gifURL;$('downloadGif').href=gifURL;
    $('downloadGif').download=`meteo-${inputDate(plan.times[0]).replace(/[:T]/g,'-')}-${plan.times.length}echeances.gif`;
    $('resultMeta').textContent=`${plan.width} × ${plan.height} px · ${plan.seconds} s · ${plan.frames} images · ${(blob.size/1024/1024).toFixed(1)} Mo`;
    $('result').hidden=false;$('progressBar').value=100;toast('Votre GIF est prêt à télécharger.');
  } catch(error) {
    if(s.failure)toast(s.failure);
    else if(error.name==='AbortError')toast('Création annulée. Vous pouvez ajuster les réglages et relancer.');
    else toast(error.message||'La création a échoué. Réessayez avec moins d’images.');
  } finally {
    window.removeEventListener('resize',s.resize);document.removeEventListener('visibilitychange',s.hidden);release(s);session=null;finishUI();
    if(!$('result').hidden)$('result').scrollIntoView({behavior:'smooth',block:'center'});
  }
}
$('settingsForm').addEventListener('submit',generate);
$('cancelBtn').onclick=()=>session?.controller.abort();
function applyConfig(config){
  markers.set(config.markers||[]);
  $('sourceUrl').value=config.url;$('sourceLink').href=config.url;
  setFieldTime('startDate',parseUTC(config.start));setFieldTime('endDate',parseUTC(config.end));
  for(const [id,key] of Object.entries({timeStep:'step',maxDuration:'maxSeconds',resolution:'width',samples:'samples',loadWait:'wait'}))$(id).value=String(config[key]);
  updatePlan();const date=sourceDate(config.url),index=currentPlan?.times.indexOf(date);$('scrubber').value=index>=0?index:0;
  $('mapTime').textContent='Carte · '+fmt(date??currentHour());
}
let opening=defaultConfig();
try{opening=sharedConfig(location.href)||opening;}catch(error){toast('Lien de partage invalide : '+error.message);}
applyConfig(opening);
for(const id of ['startDate','endDate','timeStep','maxDuration','resolution','samples','loadWait'])$(id).addEventListener('input',()=>{if(id==='startDate'||id==='endDate')delete $(id).dataset.instant;stopPreview();updatePlan();});
$('nowBtn').onclick=()=>{
  if(session)return;stopPreview();navigationController?.abort();navigationController=null;
  const time=currentHour(),source=map.state()?.url||$('sourceUrl').value;
  setFieldTime('startDate',time);setFieldTime('endDate',time+24*3600000);
  const url=atTime(source,time);$('sourceUrl').value=url;$('sourceLink').href=url;$('scrubber').value=0;updatePlan();map.load(url);$('mapTime').textContent='Carte · '+fmt(time);toast('Instant Normand : heure courante, période de 24 h.');
};
document.querySelectorAll('[data-end-hours]').forEach(button=>button.onclick=()=>{try{stopPreview();setFieldTime('endDate',fieldTime('startDate')+Number(button.dataset.endHours)*3600000);updatePlan();}catch(error){toast(error.message);}});
$('applySource').onclick=()=>{stopPreview();try{const url=parseSource($('sourceUrl').value),date=sourceDate(url.href)??currentHour();$('sourceUrl').value=url.href;map.load(url.href);$('sourceLink').href=url.href;setFieldTime('startDate',date);setFieldTime('endDate',date+24*3600000);$('scrubber').value=0;$('mapTime').textContent='Carte · '+fmt(date);$('layerName').textContent='Carte personnalisée';document.querySelectorAll('.preset').forEach(e=>e.classList.remove('active'));updatePlan();toast('Le lien et le cadrage ont été appliqués.');}catch(e){toast(e.message);}};
$('shareBtn').onclick=()=>{if(session){toast('Attendez la fin de la création pour partager les réglages.');return;}try{const config=formConfig();config.url=map.state()?.url||config.url;$('shareUrl').value=shareURL(location.href,config);$('shareStatus').textContent='';$('shareDialog').showModal();}catch(error){toast(error.message);}};
$('closeShare').onclick=()=>$('shareDialog').close();
$('copyShare').onclick=async()=>{try{await navigator.clipboard.writeText($('shareUrl').value);$('shareStatus').textContent='Lien copié.';}catch{$('shareUrl').focus();$('shareUrl').select();$('shareStatus').textContent='Copiez le lien sélectionné avec Ctrl+C.';}};
const presets={waves:{tail:'ocean/surface/currents/overlay=primary_waves',name:'Courants & vagues'},wind:{tail:'wind/surface/level',name:'Vent de surface'},rain:{tail:'wind/surface/level/overlay=precip_3hr',name:'Précipitations sur 3 h'},water:{tail:'wind/surface/level/overlay=total_precipitable_water',name:'Eau précipitable totale'},clouds:{tail:'wind/surface/level/overlay=total_cloud_water',name:'Eau contenue dans les nuages'}};
document.querySelectorAll('.preset').forEach(button=>button.onclick=()=>{stopPreview();try{const old=parseSource(map.state()?.url||$('sourceUrl').value);const projection=old.hash.match(/(?:^|\/)((?:orthographic|equirectangular|conic_equidistant|atlantis|equal_earth|patterson|stereographic|waterman|winkel3)=[^/]+)/)?.[1]||'orthographic=-359.56,49.49,9351';const preset=presets[button.dataset.preset];const t=currentPlan?.times[+$('scrubber').value]??fieldTime('endDate');const marker=old.hash.match(/(?:^|\/)(loc=[^/]+)/)?.[1];const newUrl=atTime('https://earth.nullschool.net/#current/'+preset.tail+'/'+projection+(marker?'/'+marker:''),t);$('sourceUrl').value=newUrl;map.load(newUrl);$('sourceLink').href=newUrl;$('mapTime').textContent='Échéance demandée · '+fmt(t);$('layerName').textContent=preset.name;document.querySelectorAll('.preset').forEach(e=>e.classList.toggle('active',e===button));updatePlan();}catch(e){toast(e.message);}});
$('scrubber').oninput=()=>{stopPreview();navigationController?.abort();const controller=new AbortController();navigationController=controller;if(currentPlan)showTime(currentPlan.times[+$('scrubber').value],controller.signal).catch(e=>{if(e.name!=='AbortError')toast(e.message);}).finally(()=>{if(navigationController===controller)navigationController=null;});};
$('playBtn').onclick=async()=>{if(previewController){stopPreview();return;}navigationController?.abort();const p=updatePlan();if(!p)return;const controller=new AbortController();previewController=controller;$('playBtn').textContent='Ⅱ';$('playBtn').setAttribute('aria-label','Arrêter le parcours');try{for(let i=0;i<p.times.length;i++){if(controller.signal.aborted)break;$('scrubber').value=i;await showTime(p.times[i],controller.signal);await pause(p.wait*1000,controller.signal);}}catch(e){if(e.name!=='AbortError')toast(e.message);}finally{if(previewController===controller)stopPreview();}};
frame.addEventListener('load',()=>{map.utc();});
setInterval(()=>{markers.refresh();const state=map.state();if(!state)return;map.utc();if(state.url!==lastMapUrl){lastMapUrl=state.url;$('sourceUrl').value=state.url;$('sourceLink').href=state.url;if(state.requested!==null&&currentPlan){const index=currentPlan.times.indexOf(state.requested);if(index>=0)$('scrubber').value=index;}}if(!previewController&&!navigationController&&!session&&state.actual!==null&&!state.status&&!state.pending&&!state.downloadError){$('mapTime').textContent='Carte · '+fmt(state.requested??state.actual);$('mapTime').title='Date des données affichées : '+fmt(state.actual);}},350);
$('helpBtn').onclick=()=>{const help=$('howto');help.hidden=!help.hidden;if(!help.hidden)help.scrollIntoView({behavior:'smooth'});};
window.addEventListener('pagehide',()=>{session?.controller.abort();if(gifURL)URL.revokeObjectURL(gifURL);});

// Give the iframe its final CSS dimensions before Nullschool initializes its canvases.
requestAnimationFrame(()=>requestAnimationFrame(()=>{map.load(opening.url);}));
