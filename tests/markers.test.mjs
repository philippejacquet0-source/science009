import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sampleMarker,validateMarkers} from '../public/marker-config.mjs';
import {defaultConfig,shareURL,sharedConfig} from '../public/time-config.mjs';

test('les marqueurs partagés conservent coordonnées et noms, avec limites validées',()=>{
  const config={...defaultConfig(Date.UTC(2026,9,23,7)),markers:[{lon:-1.63,lat:49.451,label:'Cotentin'},{lon:2.35,lat:48.85,label:'Paris'}]};
  assert.deepEqual(sharedConfig(shareURL('https://example.github.io/science009/',config)),config);
  assert.throws(()=>validateMarkers([{lon:190,lat:49}]),/Coordonnées/);
  assert.throws(()=>validateMarkers(Array(7).fill({lon:0,lat:0})),/Six/);
  assert.throws(()=>validateMarkers([{lon:0,lat:NaN}]),/Coordonnées/);
});
test('les valeurs suivent le champ temporel et les couleurs utilisent la valeur brute',()=>{
  let time=0;
  const product={field:()=>({bilinear:(lon,lat)=>[lon+time,lat],scalarize:v=>Math.hypot(...v)}),scale:{rgba:value=>[value,20,30,255]}};
  const unit={convertScalar:v=>v*3.6,formatScalar:v=>({valueAndUnitsText:v.toFixed(1)+' km/h'})};
  const point={lon:3,lat:4};
  assert.deepEqual(sampleMarker(product,unit,'bilinear',point),{text:'18.0 km/h',color:'rgb(5,20,30)',value:5});
  time=0.5;
  assert.notEqual(sampleMarker(product,unit,'bilinear',point).text,'18.0 km/h');
  assert.equal(sampleMarker(product,unit,'nearest',point).value,null);
  assert.equal(sampleMarker(null,unit,'bilinear',point).text,'Indisponible');
});
