import {validateMarkers,MAX_MARKERS} from './marker-config.mjs?v=ef0c00002c00';
export function createMarkersUI(frame,{toast,isBusy}){
  const $=id=>document.getElementById(id);
  let points=[],picking=false,bridge=null;
  function sync(){
    const candidate=frame.contentWindow?.beroueizhMarkers;
    if(candidate!==bridge){bridge=candidate;bridge?.setMarkers(points);bridge?.setPicking(picking);}
    bridge?.refresh();
    const data=bridge?.snapshot();
    $('markerLayer').textContent=data?.title||'Paramètre coloré de la carte';
    for(let i=0;i<points.length;i++){
      const value=data?.points[i],row=$('markerList').children[i];
      if(!row)continue;
      row.querySelector('output').textContent=value?.text||'Chargement…';
      row.querySelector('.marker-swatch').style.background=value?.color||'#93a3a6';
      row.querySelector('output').style.borderLeft='4px solid '+(value?.color||'#93a3a6');
      row.querySelector('input').disabled=isBusy();row.querySelector('button').disabled=isBusy();
    }
    $('addMarker').disabled=isBusy()||points.length>=MAX_MARKERS;$('clearMarkers').disabled=isBusy()||!points.length;
  }
  function setPicking(value){picking=value;$('addMarker').setAttribute('aria-pressed',String(value));$('addMarker').textContent=value?'Terminer les marqueurs':'＋ Ajouter des marqueurs';$('markerHint').textContent=value?'Cliquez dans la carte pour ajouter des points (6 maximum). Glissez pour déplacer la carte.':'Les points restent fixes. Valeurs et couleurs suivent la couche et les dates, y compris dans le GIF.';bridge?.setPicking(value);}
  function render(){
    $('markerList').replaceChildren();
    points.forEach((p,index)=>{
      const row=document.createElement('div');row.className='marker-row';
      const swatch=document.createElement('span');swatch.className='marker-swatch';swatch.textContent=index+1;
      const label=document.createElement('input');label.value=p.label;label.maxLength=32;label.setAttribute('aria-label','Nom du marqueur '+(index+1));label.title=`${p.lat.toFixed(3)}°, ${p.lon.toFixed(3)}°`;
      label.oninput=()=>{p.label=label.value.trim()||'Point '+(index+1);bridge?.setMarkers(points);};
      label.onchange=()=>{label.value=p.label;};
      const value=document.createElement('output');value.textContent='Chargement…';
      const remove=document.createElement('button');remove.type='button';remove.textContent='×';remove.setAttribute('aria-label','Supprimer le marqueur '+(index+1));remove.onclick=()=>{if(isBusy())return;points.splice(index,1);render();};
      row.append(swatch,label,value,remove);$('markerList').append(row);
    });
    bridge?.setMarkers(points);sync();
  }
  function attach(){bridge=null;const win=frame.contentWindow;win.addEventListener('beroueizh:ready',sync);win.addEventListener('beroueizh:pick',event=>{
    if(!picking||isBusy())return;
    if(points.length>=MAX_MARKERS){setPicking(false);return;}
    try{points=validateMarkers([...points,{...event.detail,label:'Point '+(points.length+1)}]);render();if(points.length===MAX_MARKERS)setPicking(false);}catch(error){toast(error.message);}
  });sync();}
  frame.addEventListener('load',attach);
  $('addMarker').onclick=()=>{if(isBusy())return;setPicking(!picking);if(picking)toast('Cliquez sur les lieux à suivre dans la carte.');};
  $('clearMarkers').onclick=()=>{if(!isBusy()){points=[];setPicking(false);render();}};
  return {set(value){points=validateMarkers(value);render();},get:()=>validateMarkers(points),refresh:sync,stop:()=>setPicking(false)};
}
