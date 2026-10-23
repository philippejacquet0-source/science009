export const MAX_MARKERS=6;
export function validateMarkers(value=[]){
  if(!Array.isArray(value)||value.length>MAX_MARKERS)throw new Error('Six marqueurs au maximum.');
  return value.map((p,index)=>{
    if(!p||!Number.isFinite(p.lon)||!Number.isFinite(p.lat)||p.lon < -180||p.lon>180||p.lat < -90||p.lat>90)throw new Error('Coordonnées de marqueur invalides.');
    return {lon:p.lon,lat:p.lat,label:String(p.label||'Point '+(index+1)).trim().slice(0,32)||'Point '+(index+1)};
  });
}
// Use the exact native field, interpolation, units and palette of the active
// overlay. Colours use raw data; only the displayed value is unit-converted.
export function sampleMarker(product,unit,interpolation,point){
  const missing={text:'Indisponible',color:'#93a3a6',value:null};
  try{
    const field=product?.field?.(),raw=field?.[interpolation]?.(point.lon,point.lat);
    const value=field?.scalarize?.(raw);
    if(!Number.isFinite(value)||!unit)return missing;
    const text=unit.formatScalar(unit.convertScalar(value)).valueAndUnitsText;
    const rgba=product.scale.rgba(value);
    if(!text||!rgba?.[3])return {...missing,text:text||missing.text};
    return {text,color:`rgb(${rgba[0]},${rgba[1]},${rgba[2]})`,value};
  }catch{return missing;}
}
