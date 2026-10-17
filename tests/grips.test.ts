import {describe,test,expect} from 'bun:test';
import {objectGrips,moveGrip,gripLengthOrigin,gripLengthFactor} from '../src/grips';
import {lineEndpoint} from '../src/drafting';
import {distance,snapPoint,segments} from '../src/geometry';
import type {Shape,PathShape} from '../src/model';
const line:Shape={id:'l',type:'line',a:{x:0,y:0},b:{x:100,y:0},color:'#fff'};
const path:PathShape={...line,type:'polyline',b:{x:100,y:100},closed:false,nodes:[{p:{x:0,y:0}},{p:{x:100,y:0}},{p:{x:100,y:100}}]};
describe('Poignées de modification',()=>{
 test('une longueur saisie est la longueur totale depuis le point fixe, pour les deux extrémités',()=>{
  for(const key of ['vertex-0','vertex-1']){
   const fixed=gripLengthOrigin(line,key)!;
   const edited=moveGrip(line,key,lineEndpoint(fixed,{x:fixed.x,y:fixed.y+40},'0,25 m','mm',true));
   expect(distance(edited.a,edited.b)).toBeCloseTo(250);
   expect(key==='vertex-0'?edited.b:edited.a).toEqual(fixed);
   const moved=key==='vertex-0'?edited.a:edited.b;
   expect(moved.x).toBeCloseTo(fixed.x,8);
   expect(moved.y).toBeCloseTo(fixed.y+250,8);
  }
  expect(gripLengthOrigin(line,'segment-0')).toBeUndefined();
  expect(gripLengthOrigin(path,'vertex-1')).toEqual(path.nodes[0].p);
  expect(line.b).toEqual({x:100,y:0});
 });
 test('longueurs précises aux extrémités et au sommet intérieur d’une polyligne',()=>{
  for(const key of ['vertex-0','vertex-1','vertex-2']){
   const origin=gripLengthOrigin(path,key)!;
   const end=lineEndpoint(origin,{x:origin.x,y:origin.y+1},'25 cm','mm',true);
   const result=moveGrip(path,key,end) as PathShape;
   const index=Number(key.slice(7));
   expect(distance(origin,result.nodes[index].p)).toBeCloseTo(250);
   for(let i=0;i<path.nodes.length;i++)if(i!==index)expect(result.nodes[i]).toEqual(path.nodes[i]);
  }
  expect(gripLengthOrigin({...path,closed:true},'vertex-0')).toEqual(path.nodes[2].p);
 });
 test('la distance de la poignée du milieu translate les deux sommets sans changer la longueur',()=>{
  const origin=gripLengthOrigin(path,'segment-0')!;
  const end=lineEndpoint(origin,{x:50,y:10},'2 cm','mm',true);
  const result=moveGrip(path,'segment-0',end) as PathShape;
  expect(result.nodes.map(n=>n.p)).toEqual([{x:0,y:20},{x:100,y:20},{x:100,y:100}]);
  expect(distance(result.nodes[0].p,result.nodes[1].p)).toBe(100);
 });
 test('la longueur d’un segment courbe tient compte de l’arc et non de sa corde',()=>{
  const curved:PathShape={...path,nodes:[{p:{x:0,y:0},bulge:1},{p:{x:100,y:0}}],b:{x:100,y:0}};
  const origin=gripLengthOrigin(curved,'vertex-1')!;
  const end=lineEndpoint(origin,{x:1,y:0},`${200/gripLengthFactor(curved,'vertex-1')} mm`,'mm',false);
  const result=moveGrip(curved,'vertex-1',end) as PathShape;
  const arc=segments(result)[0];
  expect(arc.kind).toBe('arc');
  if(arc.kind==='arc')expect(arc.radius*Math.abs(arc.sweep)).toBeCloseTo(200);
 });
 test('les poignées du milieu suivent la direction des segments et les sommets restent carrés',()=>{
  const diagonal:PathShape={...path,nodes:[...path.nodes,{p:{x:150,y:150}}],b:{x:150,y:150}};
  const grips=objectGrips(diagonal);
  expect(grips.filter(g=>g.kind==='segment').map(g=>g.angle)).toEqual([0,90,45]);
  expect(grips.filter(g=>g.kind==='vertex').every(g=>g.angle===undefined)).toBe(true);
  const curved:PathShape={...path,nodes:[{p:{x:0,y:0},bulge:1},{p:{x:100,y:0}}],b:{x:100,y:0}};
  const angle=objectGrips(curved).find(g=>g.kind==='segment')!.angle!;
  expect(Math.abs(Math.sin(angle*Math.PI/180))).toBeCloseTo(0);
 });
 test('affiche extrémités, sommets et milieux sans doublon de fermeture',()=>{
  expect(objectGrips(line).length).toBe(3);expect(objectGrips(path).length).toBe(5);
  expect(objectGrips({...path,closed:true}).length).toBe(6);
 });
 test('déplace une extrémité en préservant l’autre et l’original',()=>{
  const edited=moveGrip(line,'vertex-1',{x:150,y:20});expect(edited.a).toEqual(line.a);expect(edited.b).toEqual({x:150,y:20});expect(line.b.x).toBe(100);
 });
 test('déplace une ligne par son milieu',()=>{
  const edited=moveGrip(line,'segment-0',{x:80,y:40});expect(edited.a).toEqual({x:30,y:40});expect(edited.b).toEqual({x:130,y:40});
 });
 test('déplace uniquement le sommet choisi de la polyligne',()=>{
  const edited=moveGrip(path,'vertex-1',{x:120,y:10}) as PathShape;expect(edited.nodes[1].p).toEqual({x:120,y:10});expect(edited.nodes[0]).toEqual(path.nodes[0]);expect(edited.nodes[2]).toEqual(path.nodes[2]);
 });
 test('déplace les deux sommets du segment, même à la fermeture',()=>{
  const edited=moveGrip(path,'segment-0',{x:50,y:20}) as PathShape;expect(edited.nodes.map(n=>n.p)).toEqual([{x:0,y:20},{x:100,y:20},{x:100,y:100}]);
  const closed={...path,closed:true};const g=objectGrips(closed).find(g=>g.key==='segment-2')!;const result=moveGrip(closed,g.key,{x:g.point.x+10,y:g.point.y+20}) as PathShape;
  expect(result.nodes[0].p).toEqual({x:10,y:20});expect(result.nodes[2].p).toEqual({x:110,y:120});expect(result.nodes[1]).toEqual(path.nodes[1]);
 });
 test('préserve le sens et la courbure des arcs lors du déplacement du segment',()=>{
  const arc={...path,nodes:[{p:{x:0,y:0},bulge:1},{p:{x:100,y:0}}],b:{x:100,y:0}};const g=objectGrips(arc).find(g=>g.kind==='segment')!;
  const edited=moveGrip(arc,g.key,{x:g.point.x+5,y:g.point.y+10}) as PathShape;expect(edited.nodes[0].bulge).toBe(1);expect(edited.a).toEqual({x:5,y:10});expect(edited.b).toEqual({x:105,y:10});
 });
 test('modifie les coins du rectangle et le centre ou le rayon du cercle',()=>{
  const rect:Shape={...line,type:'rect',b:{x:100,y:80}};const edited=moveGrip(rect,'vertex-1',{x:120,y:-20});expect(edited.a).toEqual({x:0,y:-20});expect(edited.b).toEqual({x:120,y:80});
  const circle:Shape={...line,type:'circle'};const moved=moveGrip(circle,'center-0',{x:20,y:30});expect(distance(moved.a,moved.b)).toBe(100);
  const resized=moveGrip(circle,'radius-1',{x:0,y:200});expect(distance(resized.a,resized.b)).toBe(200);expect(()=>moveGrip(circle,'radius-0',circle.a)).toThrow();
 });
 test('les points remarquables restent accrochables sans sélection',()=>{
  expect(snapPoint({x:50,y:1},[line],3)?.kind).toBe('Milieu');expect(snapPoint({x:100,y:99},[path],3)?.kind).toBe('Extrémité');
 });
 test('les sommets Bézier entraînent leurs poignées',()=>{
  const curve:PathShape={...path,type:'bezier',nodes:[{p:{x:0,y:0},out:{x:20,y:30}},{p:{x:100,y:100}}]};const edited=moveGrip(curve,'vertex-0',{x:10,y:5}) as PathShape;expect(edited.nodes[0].out).toEqual({x:30,y:35});
 });
});
