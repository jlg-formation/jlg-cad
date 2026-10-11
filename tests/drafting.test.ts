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
