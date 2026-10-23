import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parisInput,parisInstant,currentHour,defaultConfig,shareURL,sharedConfig} from '../public/time-config.mjs';
import {sourceDate,makePlan} from '../public/core.mjs';
test('Paris est indépendant du fuseau du navigateur, en hiver et en été',()=>{
  assert.equal(parisInput(Date.parse('2026-10-23T07:00Z')),'2026-10-23T09:00');
  assert.equal(parisInstant('2026-10-23T09:00'),Date.parse('2026-10-23T07:00Z'));
  assert.equal(parisInstant('2026-12-23T09:00'),Date.parse('2026-12-23T08:00Z'));
});
test('le changement d’heure rejette une heure inexistante et conserve une occurrence explicite',()=>{
  assert.throws(()=>parisInstant('2026-03-29T02:00'),/n’existe pas/);
  const first=Date.parse('2026-10-25T00:00Z'),second=Date.parse('2026-10-25T01:00Z');
  assert.equal(parisInput(first),parisInput(second));
  assert.equal(parisInstant('2026-10-25T02:00'),first);
  assert.equal(parisInstant('2026-10-25T02:00',second),second);
  const start=Date.parse('2026-10-24T01:00Z'),end=start+24*3600000;
  assert.equal(parisInstant(parisInput(end),end)-start,24*3600000);
});
test('l’ouverture et Instant Normand utilisent l’heure courante et 24 h de période',()=>{
  const now=Date.parse('2026-10-23T07:49:12Z'),config=defaultConfig(now),p=makePlan(config);
  assert.equal(currentHour(now),Date.parse('2026-10-23T07:00Z'));
  assert.equal(sourceDate(config.url),p.times[0]);
  assert.equal(p.times.at(-1)-p.times[0],24*3600000);
  assert.match(config.url,/orthographic=7.76,47.55,1855\/loc=-1.630,49.451/);
});
test('le partage restitue les dates absolues, le cadrage et tous les réglages',()=>{
  const config={...defaultConfig(Date.parse('2026-10-25T01:00Z')),step:2,maxSeconds:12,width:640,samples:1,wait:1};
  const url=shareURL('https://example.test/?tracking=remove#old',config);
  assert.deepEqual(sharedConfig(url),config);
  assert.ok(!url.includes('tracking'));
  assert.equal(parisInstant(parisInput(makePlan(config).times[0]),makePlan(config).times[0]),Date.parse('2026-10-25T01:00Z'));
  assert.throws(()=>sharedConfig(url.replace('width=640','width=0')),/largeur/);
  assert.throws(()=>shareURL('https://example.test/',{...config,url:'https://evil.test/#current'}),/Utilisez/);
  assert.equal(sharedConfig('https://example.test/'),null);
});
