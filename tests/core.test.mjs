import {test} from 'node:test';
import assert from 'node:assert/strict';
import {INITIAL_URL,parseSource,parseUTC,sourceDate,atTime,makePlan} from '../public/core.mjs';
const settings={url:INITIAL_URL,start:'2026-10-22T06:00',end:'2026-10-23T06:00',step:3,maxSeconds:8,width:960,samples:4,wait:10};
test('le lien conserve les couches et la projection en changeant uniquement la date',()=>{const url=atTime(INITIAL_URL,parseUTC('2026-10-22T03:00'));assert.match(url,/#2026\/10\/22\/0300Z\/wind\/surface\/level\/orthographic=7.76,47.55,1855\/loc=-1.630,49.451$/);assert.equal(sourceDate(url),Date.UTC(2026,9,22,3));});
test('planning en UTC inclusif, indépendant du fuseau du poste, avec durée GIF exacte',()=>{const p=makePlan(settings);assert.equal(p.times.length,9);assert.equal(p.times[0],Date.UTC(2026,9,22,6));assert.equal(p.times.at(-1),Date.UTC(2026,9,23,6));assert.equal(p.frames,36);assert.equal(p.delays.reduce((a,b)=>a+b),8000);assert.ok(p.delays.every(x=>x>=20&&x%10===0));});
test('la borne finale ne peut pas être perdue ou dépassée',()=>{assert.throws(()=>makePlan({...settings,end:'2026-10-23T09:00',step:6}),/multiple du pas/);assert.throws(()=>makePlan({...settings,end:'2026-10-22T05:00'}),/fin doit/);assert.throws(()=>makePlan({...settings,end:'2026-10-23T07:00'}),/multiple du pas/);});
test('les dates impossibles et les origines externes sont refusées',()=>{assert.throws(()=>parseUTC('2026-02-30T00:00'),/invalide/);assert.throws(()=>parseSource('https://evil.example/#current/wind'),/Utilisez/);assert.throws(()=>parseSource('https://earth.nullschool.net@evil.example/#current/wind'),/Utilisez/);assert.throws(()=>parseSource('javascript:alert(1)'),/Utilisez/);});
test('le budget mémoire réduit les traînées et conserve toutes les échéances',()=>{const p=makePlan({...settings,end:'2026-10-28T06:00',maxSeconds:30,width:960});assert.equal(p.times.length,49);assert.equal(p.samples,1);assert.equal(p.times.at(-1),Date.UTC(2026,9,28,6));assert.ok(p.width*p.height*4*p.frames<=160*1024*1024);assert.ok(p.seconds<=30);});
test('une période trop dense pour la mémoire ou la durée est refusée',()=>{assert.throws(()=>makePlan({...settings,end:'2026-11-05T06:00',width:1280,maxSeconds:1}),/Trop d’images/);assert.throws(()=>makePlan({...settings,end:'2026-11-10T06:00'}),/120 échéances/);});
test('une échéance unique reste disponible pour animer les traînées',()=>{const p=makePlan({...settings,end:settings.start,maxSeconds:1.01});assert.equal(p.times.length,1);assert.equal(p.frames,4);assert.equal(p.seconds,1.01);});

test('les pas de 1 h et 2 h incluent chaque échéance depuis une heure UTC quelconque',()=>{
  for(const [step,hours] of [[1,[7,8,9,10,11]],[2,[7,9,11]]]){
    const p=makePlan({...settings,start:'2026-10-23T07:00',end:'2026-10-23T11:00',step});
    assert.deepEqual(p.times,hours.map(h=>Date.UTC(2026,9,23,h)));
    assert.equal(p.seconds,8);
    assert.match(atTime(INITIAL_URL,p.times[0]),/\/0700Z\//);
  }
  assert.throws(()=>makePlan({...settings,start:'2026-10-23T07:30',end:'2026-10-23T11:30',step:1}),/heures entières/);
});
