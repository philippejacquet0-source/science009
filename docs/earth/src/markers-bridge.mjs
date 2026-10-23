import {validateMarkers,sampleMarker} from '../../marker-config.mjs';

export function installMarkersBridge({handles,agents,events,unitFor}){
  const viewport=document.querySelector('[data-type="geo-canvas"]');
  if(!viewport)return;
  const canvas=document.createElement('canvas');
  canvas.dataset.name='beroueizh-markers';canvas.setAttribute('aria-hidden','true');
  Object.assign(canvas.style,{position:'absolute',inset:'0',width:'100%',height:'100%',pointerEvents:'none',zIndex:'100'});
  viewport.append(canvas);
  const ctx=canvas.getContext('2d');
  let points=[],picking=false,queued=false;
  function plain(html){const node=document.createElement('div');node.innerHTML=html||'';return node.textContent||'';}
  function snapshot(){
    const product=agents.activeProductAgent.value();
    const unavailable=Number(document.documentElement.dataset.weatherPending)>0||document.documentElement.dataset.weatherError||handles.status.get()||handles.error.get();
    const unit=unitFor(product,handles.selected_units.get());
    return {title:plain(product?.descriptionHTML?.name)||'Paramètre coloré',points:points.map(p=>({...p,...sampleMarker(unavailable?null:product,unit,handles.interpolation_type.get(),p)}))};
  }
  function render(){
    queued=false;
    const {width:w,height:h}=viewport.getBoundingClientRect(),dpr=window.devicePixelRatio||1;
    if(!w||!h)return;
    const pw=Math.round(w*dpr),ph=Math.round(h*dpr);
    if(canvas.width!==pw||canvas.height!==ph){canvas.width=pw;canvas.height=ph;}
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
    if(!points.length)return;
    const data=snapshot(),globe=agents.globeAgent.value(),view=agents.viewboxAgent.value();
    ctx.textBaseline='middle';ctx.font='bold 13px sans-serif';
    data.points.forEach((p,index)=>{
      // A projection stream clips the far side of the globe, unlike projection().
      const pixel=globe?.projection?.([p.lon,p.lat]);
      if(!pixel?.every(Number.isFinite))return;
      const [x,y]=pixel,back=globe.projection.invert(pixel);
      const delta=back?Math.abs(((back[0]-p.lon+540)%360)-180):180;
      if(!back||delta>0.01||Math.abs(back[1]-p.lat)>0.01||!globe.globeMask(view).isDefinedAt(Math.round(x),Math.round(y)))return;
      ctx.beginPath();ctx.arc(x,y,10,0,Math.PI*2);ctx.fillStyle=p.color;ctx.fill();ctx.lineWidth=2;ctx.strokeStyle='#fff';ctx.stroke();
      ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='#101b22';ctx.strokeText(String(index+1),x,y);ctx.fillStyle='#fff';ctx.fillText(String(index+1),x,y);
    });
    const boxWidth=Math.min(280,w-24),x=w-boxWidth-12,y=12;
    ctx.fillStyle='rgba(7,20,25,.9)';ctx.fillRect(x,y,boxWidth,46+data.points.length*31);
    ctx.textAlign='left';ctx.fillStyle='#eaf4ee';ctx.font='bold 13px sans-serif';ctx.fillText(data.title,x+12,y+18,boxWidth-24);
    ctx.fillStyle='#a8bfbc';ctx.font='10px sans-serif';ctx.fillText('Valeurs du paramètre coloré · points fixes',x+12,y+35,boxWidth-24);
    data.points.forEach((p,index)=>{
      const row=y+59+index*31;
      ctx.fillStyle=p.color;ctx.fillRect(x+12,row-6,10,10);ctx.lineWidth=1;ctx.strokeStyle='#bbccc5';ctx.strokeRect(x+12,row-6,10,10);
      ctx.font='12px sans-serif';ctx.fillStyle='#f0f6f3';ctx.fillText(`${index+1} · ${p.label}`,x+30,row,boxWidth*.48-20);
      ctx.font='bold 12px sans-serif';ctx.textAlign='right';ctx.fillStyle='#f0f6f3';ctx.fillText(p.text,x+boxWidth-12,row,boxWidth*.49);ctx.textAlign='left';
    });
    canvas.dataset.values=JSON.stringify(data);
  }
  function refresh(){if(!queued){queued=true;requestAnimationFrame(render);}}
  window.beroueizhMarkers={setMarkers(value){points=validateMarkers(value);refresh();},setPicking(value){picking=!!value;viewport.style.cursor=picking?'crosshair':'';},refresh,snapshot};
  events.on('click.beroueizh',(_pixel,coords)=>{
    if(!picking||!coords?.every(Number.isFinite)||handles.show_menu.get())return;
    window.dispatchEvent(new CustomEvent('beroueizh:pick',{detail:{lon:((coords[0]+540)%360)-180,lat:coords[1]}}));
  });
  events.on('move.beroueizh',refresh);events.on('moveEnd.beroueizh',refresh);events.on('reorient.beroueizh',refresh);
  agents.activeProductAgent.on('update.beroueizh',refresh);agents.globeAgent.on('update.beroueizh',refresh);agents.viewboxAgent.on('update.beroueizh',refresh);
  handles.selected_units.on('change.beroueizh',refresh);handles.interpolation_type.on('change.beroueizh',refresh);
  new ResizeObserver(refresh).observe(viewport);
  window.dispatchEvent(new Event('beroueizh:ready'));
}
