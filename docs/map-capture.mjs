// Composite the native same-origin map layers in their browser paint order.
// WebGL buffers are preserved by our embedded renderer for reliable snapshots.
export async function captureMap(frame,ctx,width,height,signal) {
  const doc=frame.contentDocument,win=frame.contentWindow;
  const viewport=doc?.querySelector('[data-type="geo-canvas"]');
  if(!viewport||!win)throw new Error('La carte n’est pas encore prête. Attendez son chargement.');
  await new Promise(resolve=>{let done=false;const finish=()=>{if(!done){done=true;resolve();}};win.requestAnimationFrame(finish);setTimeout(finish,250);});
  if(signal.aborted)throw new DOMException('Annulé','AbortError');
  const bounds=viewport.getBoundingClientRect();
  if(!bounds.width||!bounds.height)throw new Error('La carte n’est pas visible.');
  const layers=[...viewport.querySelectorAll('canvas')].map((canvas,index)=>({canvas,index,style:win.getComputedStyle(canvas)}))
    .filter(({canvas,style})=>canvas.width&&canvas.height&&style.display!=='none'&&style.visibility!=='hidden'&&+style.opacity>0)
    .sort((a,b)=>(parseInt(a.style.zIndex)||0)-(parseInt(b.style.zIndex)||0)||a.index-b.index);
  if(!layers.length)throw new Error('Les couches de la carte ne sont pas disponibles.');
  const scale=Math.min(width/bounds.width,height/bounds.height);
  ctx.save();ctx.beginPath();ctx.rect(0,0,width,height);ctx.clip();
  ctx.fillStyle=win.getComputedStyle(doc.body).backgroundColor||'#333';ctx.fillRect(0,0,width,height);
  ctx.translate((width-bounds.width*scale)/2,(height-bounds.height*scale)/2);ctx.scale(scale,scale);
  for(const {canvas,style} of layers){
    const box=canvas.getBoundingClientRect();
    ctx.globalAlpha=+style.opacity;
    ctx.drawImage(canvas,box.left-bounds.left,box.top-bounds.top,box.width,box.height);
  }
  ctx.restore();
}
