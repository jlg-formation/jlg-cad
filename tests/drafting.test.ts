import {describe,test,expect} from 'bun:test';
import {readUnit,displayDistance,lengthInMillimeters,exactEndpoint,resolveCommand,commandSuggestions,dynamicFieldPosition,closedPolylineNodes} from '../src/drafting';
import {segments} from '../src/geometry';
test('ferme une polyligne sans dupliquer le premier sommet',()=>{
 const input=[{p:{x:0,y:0}},{p:{x:100,y:0}},{p:{x:100,y:80}}];
 const nodes=closedPolylineNodes(input);
 const edges=segments({id:'closed',type:'polyline',color:'#fff',a:nodes[0].p,b:nodes[2].p,nodes,closed:true});
 expect(nodes.length).toBe(3);expect(edges.length).toBe(3);expect(edges[2].b).toEqual(input[0].p);
 nodes[0].p.x=10;expect(input[0].p.x).toBe(0);
 expect(()=>closedPolylineNodes(input.slice(0,2))).toThrow();
});
import {parseLength,distance} from '../src/geometry';

describe('Commandes de dessin',()=>{
 test('distingue L et PL et accepte les noms complets',()=>{
  expect(resolveCommand('l')?.id).toBe('line');
  for(const value of ['PL','pline','polyline','polyligne'])expect(resolveCommand(value)?.id).toBe('polyline');
  expect(resolveCommand('p')).toBeUndefined();
  expect(resolveCommand('inconnue')).toBeUndefined();
  expect(commandSuggestions('PL')[0].id).toBe('polyline');
  expect(commandSuggestions('pol').some(c=>c.id==='polyline')).toBe(true);
  expect(commandSuggestions('')).toEqual([]);
  expect(commandSuggestions('mur')).toEqual([]);
 });
 test('comprend les noms français accentués et les alias usuels',()=>{
  expect(resolveCommand('déplacer')?.id).toBe('move');
  expect(resolveCommand('CO')?.id).toBe('copy');
  expect(commandSuggestions('dé')[0].id).toBe('move');
 });
 test('conserve les alias personnalisés sans interpréter les combinaisons clavier comme des commandes',()=>{
  expect(resolveCommand('Q',{line:['Q']})?.id).toBe('line');
  expect(commandSuggestions('Q',{line:['Q']})[0].id).toBe('line');
  expect(resolveCommand('Ctrl+Q',{line:['Ctrl+Q']})).toBeUndefined();
 });
});
describe('Unités et saisie dynamique',()=>{
 test('utilise les mètres par défaut et restaure uniquement les unités valides',()=>{
  for(const raw of [null,'m','km',''])expect(readUnit(raw)).toBe('m');
  expect(readUnit('cm')).toBe('cm');expect(readUnit('mm')).toBe('mm');
  expect(parseLength('2,5','m')).toBe(2500);
  expect(parseLength('25','cm')).toBe(250);
  expect(parseLength('250','mm')).toBe(250);
  expect(parseLength('250 mm','m')).toBe(250);
  expect(parseLength('2 m','cm')).toBe(2000);
  expect(parseLength('2')).toBe(2);
 });
 test('affiche sans modifier les dimensions internes et convertit les valeurs de panneau',()=>{
  expect(displayDistance(2500,'m')).toBe('2,5');
  expect(displayDistance(2500,'cm')).toBe('250');
  expect(displayDistance(2500,'mm')).toBe('2500');
  expect(lengthInMillimeters('2,5','m')).toBe('2500 mm');
  expect(lengthInMillimeters('','m')).toBe('');
 });
 test('place plusieurs segments de longueurs indépendantes en ORTHO',()=>{
  const a={x:40,y:70};
  const b=exactEndpoint(a,{x:120,y:90},'2,5','m',true);
  expect(b).toEqual({x:2540,y:70});
  const c=exactEndpoint(b,{x:2540,y:-100},'75','cm',true);
  expect(distance(b,c)).toBeCloseTo(750);expect(c.x).toBe(b.x);
 });
 test('respecte les directions libres, les angles explicites et le guidage polaire',()=>{
  const a={x:0,y:0};const b=exactEndpoint(a,{x:3,y:4},'5','mm',false);
  expect(b.x).toBeCloseTo(3);expect(b.y).toBeCloseTo(4);
  const c=exactEndpoint(a,{x:9,y:1},'1','m',true,0,'90');
  expect(c.x).toBeCloseTo(0);expect(c.y).toBe(-1000);
  const d=exactEndpoint(a,{x:10,y:-8},'1','m',false,45);
  expect(d.x).toBeCloseTo(-d.y);expect(distance(a,d)).toBeCloseTo(1000);
 });
 test('refuse les distances invalides et une direction absente sans créer de segment',()=>{
  for(const value of ['0','-2','abc','2 km','999999999'])expect(()=>exactEndpoint({x:0,y:0},{x:1,y:0},value,'m',true)).toThrow();
  expect(()=>exactEndpoint({x:0,y:0},{x:0,y:0},'1','m',true)).toThrow();
 });
 test('maintient le champ dynamique dans les limites du dessin',()=>{
  expect(dynamicFieldPosition({x:990,y:790},1000,800)).toEqual({x:847,y:738});
  expect(dynamicFieldPosition({x:0,y:0},1000,800)).toEqual({x:22,y:8});
 });
});

import {radiusEndpoint} from '../src/drafting';
test('rayon précis indépendant de la direction, unités et rayons invalides',()=>{
 expect(radiusEndpoint({x:20,y:30},'1,5','m')).toEqual({x:1520,y:30});
 expect(radiusEndpoint({x:20,y:30},'25 mm','m')).toEqual({x:45,y:30});
 for(const text of ['0','-2','abc'])expect(()=>radiusEndpoint({x:0,y:0},text,'cm')).toThrow();
 expect(resolveCommand('C')?.id).toBe('circle');
});

import {lineEndpoint,copyEndpoint} from '../src/drafting';

describe('Copie par direction et distance',()=>{
 const base={x:120,y:80};
 test('distance précise dans les quatre directions, indépendante du point de base',()=>{
  for(const [pointer,expected] of [
   [{x:200,y:90},{x:620,y:80}],
   [{x:0,y:90},{x:-380,y:80}],
   [{x:130,y:200},{x:120,y:580}],
   [{x:130,y:-100},{x:120,y:-420}],
  ]){
   const end=copyEndpoint(base,pointer,'50 cm','m',true);
   expect(end.x).toBeCloseTo(expected.x);expect(end.y).toBeCloseTo(expected.y);
  }
 });
 test('saisie prioritaire sur un accrochage, unités et décimales françaises',()=>{
  const end=copyEndpoint(base,{x:123,y:84},'0,5','m',false,0,true);
  expect(end.x).toBeCloseTo(420);expect(end.y).toBeCloseTo(480);
  expect(copyEndpoint(base,{x:200,y:90},'','mm',true,0,true)).toEqual({x:200,y:90});
 });
 test('guidage polaire et copies successives depuis la même base',()=>{
  const first=copyEndpoint(base,{x:130,y:72},'100','mm',false,45);
  expect(first.x-base.x).toBeCloseTo(base.y-first.y);expect(distance(base,first)).toBeCloseTo(100);
  const second=copyEndpoint(base,{x:200,y:80},'200','mm',true);
  expect(second).toEqual({x:320,y:80});expect(base).toEqual({x:120,y:80});
 });
 test('refuse une distance invalide ou une direction absente',()=>{
  for(const text of ['0','-1','abc'])expect(()=>copyEndpoint(base,{x:200,y:80},text,'m',true)).toThrow();
  expect(()=>copyEndpoint(base,base,'1','m',true)).toThrow('direction');
 });
});
test('ligne : valide une longueur sans mouvement, conserve directions et angles explicites',()=>{
 const a={x:20,y:30};
 expect(lineEndpoint(a,a,'2,5','m',false)).toEqual({x:2520,y:30});
 const vertical=lineEndpoint(a,{x:20,y:50},'10 cm','m',false);expect(vertical.x).toBeCloseTo(20);expect(vertical.y).toBeCloseTo(130);
 expect(lineEndpoint(a,a,'100','mm',true,0,'90').y).toBeCloseTo(-70);
 for(const text of ['0','-1','abc'])expect(()=>lineEndpoint(a,a,text,'m',false)).toThrow();
});
