// LOCAL QA ONLY. Synthetic video stream: does not request or capture the screen.
(()=>{
  let handle='';
  const media={setCaptureHandleConfig:config=>{handle=config.handle;},getDisplayMedia:async()=>{
    const canvas=document.createElement('canvas');canvas.width=innerWidth;canvas.height=innerHeight;
    canvas.style.cssText='position:fixed;width:1px;height:1px;right:0;bottom:0;pointer-events:none';document.body.append(canvas);
    const ctx=canvas.getContext('2d');let count=0;
    const render=()=>{ctx.fillStyle='#113a46';ctx.fillRect(0,0,canvas.width,canvas.height);const r=document.getElementById('captureArea').getBoundingClientRect();ctx.fillStyle='#336f69';ctx.fillRect(r.x,r.y,r.width,r.height);ctx.fillStyle='#c6e3ce';ctx.font='24px sans-serif';ctx.fillText('FLUX SYNTHÉTIQUE — TEST',r.x+30,r.y+60);ctx.font='16px sans-serif';ctx.fillText(document.getElementById('earthFrame').src.split('#')[1].slice(0,17),r.x+30,r.y+100);ctx.fillStyle='#f7c27b';ctx.beginPath();ctx.arc(r.x+80+(count++%100)*3,r.y+150,20,0,Math.PI*2);ctx.fill();};
    render();const stream=canvas.captureStream(15),track=stream.getVideoTracks()[0],settings=track.getSettings.bind(track);
    track.getCaptureHandle=()=>({handle,origin:location.origin});track.getSettings=()=>({...settings(),displaySurface:'browser'});
    const interval=setInterval(()=>{if(track.readyState==='ended'){clearInterval(interval);canvas.remove();}else render();},65);
    return stream;
  }};
  Object.defineProperty(navigator,'mediaDevices',{value:media,configurable:true});
})();
