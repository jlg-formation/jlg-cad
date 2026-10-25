import {describe,expect,test} from 'bun:test';
import {inflateSync} from 'node:zlib';
import {analyzeBoundaries,createHatch,defaultHatchStyle,detachHatch,hatchContains,hatchLines,islandLoops,patternFamilies,pickRegion,polygonArea,selectedRegions,synchronizeHatches} from '../src/hatch';
import {documentOf,parseDrawing,toDxf,visibleShapes,type HatchShape,type Shape,type Point} from '../src/model';
import {distance,mapItem,mirrorShape,rotateShape,translateItem} from '../src/geometry';
import {synchronizeDrawing} from '../src/associations';
import {decodeClipboard,encodeClipboard,pasteClipboard} from '../src/clipboard';
import {itemInSelection,rectangleSelection} from '../src/selection';
import {createPdf} from '../src/pdf';
import {resolveCommand} from '../src/drafting';
import {resolvePaletteCommand} from '../src/command-palette';
import {applyHatchRegions,initialHatchSelection} from '../src/hatch-session';
import {hatchDxf} from '../src/hatch-dxf';

const base={a:{x:0,y:0},b:{x:100,y:100},color:'#abcdef'};
const rect=(id='r',a={x:0,y:0},b={x:100,y:100}):Shape=>({...base,id,type:'rect',a,b});
const line=(id:string,a:Point,b:Point):Shape=>({...base,id,type:'line',a,b});
const circle=(id:string,center:Point,radius:number):Shape=>({...base,id,type:'circle',a:center,b:{x:center.x+radius,y:center.y}});
const hatch=(shapes:Shape[],point={x:10,y:10},style={})=>createHatch({...base,id:'h'},[pickRegion(analyzeBoundaries(shapes),point,(style as HatchShape).islands)],{...defaultHatchStyle,...style});
const area=(s:HatchShape)=>s.regions.reduce((sum,r)=>sum+r.loops.reduce((n,l,i)=>n+(i===0?1:-1)*Math.abs(polygonArea(l)),0),0);
const pdfStream=(pdf:string)=>inflateSync(Buffer.from(pdf.match(/stream\n([\s\S]*?)\nendstream/)![1],'latin1')).toString('latin1');

describe('Hachures : reconnaissance des surfaces',()=>{
 test('polyligne fermée concave et rectangle, sans changer les sources',()=>{
  const shape:Shape={...base,id:'p',type:'polyline',closed:true,nodes:[{p:{x:0,y:0}},{p:{x:100,y:0}},{p:{x:100,y:30}},{p:{x:30,y:30}},{p:{x:30,y:100}},{p:{x:0,y:100}}]};
  const before=JSON.stringify(shape),h=hatch([shape]);expect(area(h)).toBeCloseTo(5100);expect(hatchContains(h,{x:50,y:50})).toBe(false);expect(JSON.stringify(shape)).toBe(before);expect(area(hatch([rect()]))).toBe(10000);
 });
 test('lignes qui dépassent aux coins, sans joindre ni découper les originaux',()=>{
  const shapes=[line('top',{x:-20,y:0},{x:120,y:0}),line('bottom',{x:-20,y:100},{x:120,y:100}),line('left',{x:0,y:-20},{x:0,y:120}),line('right',{x:100,y:-20},{x:100,y:120})];
  const before=JSON.stringify(shapes),analysis=analyzeBoundaries(shapes);expect(analysis.faces).toHaveLength(1);expect(area(hatch(shapes))).toBeCloseTo(10000);expect(JSON.stringify(shapes)).toBe(before);expect(analysis.gaps).toHaveLength(8);
 });
 test('ligne traversante : compartiment contenant le point, branches intérieures ignorées',()=>{
  const shapes=[rect(),line('split',{x:50,y:-20},{x:50,y:120}),line('branch',{x:0,y:20},{x:15,y:20})];
  const left=hatch(shapes),right=hatch(shapes,{x:75,y:25});expect(area(left)).toBe(5000);expect(area(right)).toBe(5000);expect(hatchContains(left,{x:75,y:25})).toBe(false);expect(left.regions[0].sourceIds).not.toContain('branch');
 });
 test('T-junctions, intersections croisées et diagonales choisissent les petites faces',()=>{
  const shapes=[rect(),line('v',{x:50,y:0},{x:50,y:100}),line('h',{x:0,y:50},{x:100,y:50}),line('d',{x:0,y:0},{x:100,y:100})];
  expect(analyzeBoundaries(shapes).faces).toHaveLength(6);expect(area(hatch(shapes,{x:30,y:10}))).toBe(1250);expect(area(hatch(shapes,{x:70,y:20}))).toBe(2500);
 });
 test('doublons et recouvrements colinéaires ne créent pas de fausses faces',()=>{
  const shapes=[rect(),rect('duplicate'),line('overlap',{x:-10,y:0},{x:60,y:0}),line('same',{x:100,y:0},{x:0,y:0})];expect(analyzeBoundaries(shapes).faces).toHaveLength(1);expect(area(hatch(shapes))).toBe(10000);
 });
 test('contour ouvert, point extérieur et point sur une limite sont refusés',()=>{
  const shapes=[line('a',{x:0,y:0},{x:100,y:0}),line('b',{x:100,y:0},{x:100,y:100}),line('c',{x:100,y:100},{x:0,y:100}),line('d',{x:0,y:100},{x:0,y:.001})];
  expect(()=>hatch(shapes)).toThrow('Aucun contour fermé');expect(analyzeBoundaries(shapes).gaps).toHaveLength(2);expect(()=>hatch([rect()],{x:101,y:50})).toThrow();expect(()=>hatch([rect()],{x:0,y:10})).toThrow('sur le contour');
 });
 test('une coïncidence numérique ne transforme pas une ouverture réelle en fermeture',()=>{
  const shapes=[line('a',{x:0,y:0},{x:100,y:0}),line('b',{x:100,y:0},{x:100,y:100}),line('c',{x:100,y:100},{x:0,y:100}),line('d',{x:0,y:100},{x:0,y:1e-8})];expect(area(hatch(shapes))).toBeCloseTo(10000);
 });
 test('cercle et polyligne avec arc circulaire, approximation bornée',()=>{
  const c=hatch([circle('c',{x:0,y:0},100)],{x:0,y:0});expect(Math.abs(area(c)-Math.PI*100**2)).toBeLessThan(100*.05*2*Math.PI);
  const arc:Shape={...base,id:'arc',type:'polyline',closed:true,nodes:[{p:{x:-100,y:0},bulge:1},{p:{x:100,y:0}}]};expect(area(hatch([arc],{x:0,y:-10}))).toBeCloseTo(area(c)/2,2);
 });
 test('Bézier fermée et polyligne auto-intersectée en mode point',()=>{
  const curve:Shape={...base,id:'b',type:'bezier',closed:true,nodes:[{p:{x:0,y:0},out:{x:0,y:-50}},{p:{x:100,y:0},in:{x:100,y:-50}},{p:{x:100,y:100}},{p:{x:0,y:100}}]};const h=hatch([curve],{x:50,y:0});expect(hatchContains(h,{x:50,y:-20})).toBe(true);
  const bow:Shape={...base,id:'bow',type:'polyline',closed:true,nodes:[{p:{x:0,y:0}},{p:{x:100,y:100}},{p:{x:0,y:100}},{p:{x:100,y:0}}]};expect(area(hatch([bow],{x:50,y:10}))).toBe(2500);
 });
 test('les calques masqués sont exclus à la détection, les limites verrouillées acceptées',()=>{
  const doc=documentOf('Plan',[{...rect(),layerId:'0'}]);doc.layers[0].locked=true;expect(area(hatch(visibleShapes(doc)))).toBe(10000);doc.layers[0].visible=false;expect(()=>hatch(visibleShapes(doc))).toThrow();
 });
});

describe('Hachures : îlots, sélection et motifs',()=>{
 const shapes=[rect(),rect('island',{x:20,y:20},{x:80,y:80}),rect('inner',{x:40,y:40},{x:60,y:60})];
 test('Normal alterne trois niveaux ; Extérieur et Ignorer sont distincts',()=>{
  const normal=hatch(shapes),outer=hatch(shapes,undefined,{islands:'outer'}),ignore=hatch(shapes,undefined,{islands:'ignore'});
  expect(normal.regions[0].loops).toHaveLength(3);expect(outer.regions[0].loops).toHaveLength(2);expect(ignore.regions[0].loops).toHaveLength(1);
  expect(hatchContains(normal,{x:30,y:30})).toBe(false);expect(hatchContains(normal,{x:50,y:50})).toBe(true);expect(hatchContains(outer,{x:50,y:50})).toBe(false);expect(hatchContains(ignore,{x:30,y:30})).toBe(true);
 });
 test('cliquer dans un îlot choisit cet îlot comme nouvelle surface',()=>{const h=hatch(shapes,{x:30,y:30});expect(h.regions[0].loops).toHaveLength(2);expect(hatchContains(h,{x:10,y:10})).toBe(false);});
 test('Sélectionner des objets utilise exclusivement les contours fournis',()=>{
  const all=selectedRegions(analyzeBoundaries(shapes)),only=selectedRegions(analyzeBoundaries([shapes[0]]));expect(all).toHaveLength(1);expect(all[0].loops).toHaveLength(3);expect(only[0].loops).toHaveLength(1);expect(hatchContains(createHatch({...base,id:'s'},all),all[0].seed)).toBe(true);
 });
 test('plusieurs surfaces disjointes peuvent constituer un seul objet',()=>{const regions=selectedRegions(analyzeBoundaries([rect(),rect('two',{x:200,y:0},{x:300,y:100})]));const h=createHatch({...base,id:'h'},regions);expect(h.regions).toHaveLength(2);expect(hatchContains(h,{x:250,y:50})).toBe(true);expect(hatchContains(h,{x:150,y:50})).toBe(false);});
 test('les traits sont découpés aux contours et aux trous pour tous les motifs',()=>{
  for(const pattern of ['ANSI31','CROSS','BRICK','CONCRETE','USER'] as const){const h=hatch(shapes,undefined,{pattern,angle:17,scale:2});const lines=hatchLines(h);expect(lines.length).toBeGreaterThan(0);for(const [a,b] of lines){expect(hatchContains(h,{x:(a.x+b.x)/2,y:(a.y+b.y)/2})).toBe(true);expect(distance(a,b)).toBeGreaterThan(0);}}
 });
 test('angle relatif au motif, espacement utilisateur et double réseau',()=>{
  expect(patternFamilies({...defaultHatchStyle,angle:10})[0].angle).toBe(55);const h=hatch([rect()],undefined,{pattern:'USER',spacing:10,angle:0});expect(hatchLines(h)).toHaveLength(10);expect(hatchLines(h).every(([a,b])=>Math.abs(a.y-b.y)<1e-8)).toBe(true);expect(hatchLines({...h,double:true})).toHaveLength(20);
 });
 test('origine stable et échelle indépendante du zoom, limites de densité explicites',()=>{
  const h=hatch([rect()],undefined,{pattern:'USER',spacing:10});expect(hatchLines({...h,origin:{x:0,y:3}})[0][0].y).toBe(3);expect(hatchLines({...h,scale:2})).toHaveLength(5);expect(()=>hatch([rect()],undefined,{scale:0})).toThrow();expect(()=>hatch([rect()],undefined,{scale:1e-8})).toThrow('dense');expect(hatchLines(hatch([rect()],undefined,{pattern:'SOLID'}))).toHaveLength(0);
 });
 test('selection verte détecte une surface pleine même sans toucher son contour ; un trou reste vide',()=>{
  const h=hatch(shapes);expect(itemInSelection(h,rectangleSelection({x:5,y:5},{x:15,y:15}),true)).toBe(true);expect(itemInSelection(h,rectangleSelection({x:25,y:25},{x:35,y:35}),true)).toBe(false);expect(itemInSelection(h,rectangleSelection({x:-1,y:-1},{x:101,y:101}),false)).toBe(true);
 });
 test('les aliases français et anglais sont disponibles sans prendre H (déplacement de vue)',()=>{for(const name of ['HATCH','HACHURES','HACHURE','HA']){expect(resolveCommand(name)?.id).toBe('hatch');expect(resolvePaletteCommand(name)?.id).toBe('hatch');}expect(resolveCommand('H')?.id).toBe('pan');});
});

describe('Hachures : associativité, transformations et fichiers',()=>{
 test('déformation du contour et îlot recouvrant le point initial gardent la surface extérieure',()=>{
  const r=rect(),c=circle('c',{x:50,y:50},10),h=hatch([r,c],{x:30,y:30});const changed=synchronizeHatches([r,{...c,b:{x:85,y:50}},h],[r,c,h])[2] as HatchShape;
  expect(changed.associative).toBe(true);expect(changed.a).toEqual({x:0,y:0});expect(hatchContains(changed,{x:10,y:10})).toBe(true);expect(hatchContains(changed,{x:30,y:30})).toBe(false);
  const p:Shape={...base,id:'p',type:'polyline',closed:true,nodes:[{p:{x:0,y:0}},{p:{x:100,y:0}},{p:{x:100,y:100}},{p:{x:0,y:100}}]},hp=hatch([p],{x:90,y:90});const shrunk={...p,nodes:[{p:{x:0,y:0}},{p:{x:20,y:0}},{p:{x:20,y:20}},{p:{x:0,y:20}}]};const next=synchronizeHatches([shrunk,hp],[p,hp])[1] as HatchShape;expect(next.associative).toBe(true);expect(area(next)).toBe(400);
 });
 test('rotation et miroir transforment aussi le motif et conservent une enveloppe correcte',()=>{
  const h=hatch([rect()]),rotated=rotateShape(h,{x:0,y:0},30) as HatchShape,mirrored=mirrorShape(h,{x:0,y:0},{x:100,y:0}) as HatchShape;
  expect(patternFamilies(rotated)[0].angle).toBeCloseTo(75);expect(patternFamilies(mirrored)[0].angle).toBeCloseTo(-45);expect(rotated.a.y).toBeCloseTo(-50);expect(rotated.b.x).toBeCloseTo(136.60254);expect(mirrored.a.y).toBe(-100);
  const source=rect(),next=synchronizeHatches([mirrorShape(source,{x:0,y:0},{x:100,y:0}),h],[source,h])[1] as HatchShape;expect(next.associative).toBe(true);expect(hatchContains(next,{x:10,y:-10})).toBe(true);
 });
 test('redimensionner le contour et changer le rayon recalcule la surface',()=>{
  const r=rect(),h=hatch([r]);const next=synchronizeHatches([{...r,b:{x:150,y:100}},h],[r,h])[1] as HatchShape;expect(next.associative).toBe(true);expect(area(next)).toBe(15000);
  const c=circle('c',{x:50,y:50},20),hole=hatch([r,c]);const changed=synchronizeHatches([r,{...c,b:{x:80,y:50}},hole],[r,c,hole])[2] as HatchShape;expect(changed.associative).toBe(true);expect(hatchContains(changed,{x:75,y:50})).toBe(false);
 });
 test('translation et rotation des limites transportent le point de recherche',()=>{
  const r=rect(),h=hatch([r]);const moved=synchronizeHatches([translateItem(r,200,300),h],[r,h])[1] as HatchShape;expect(moved.associative).toBe(true);expect(hatchContains(moved,{x:210,y:310})).toBe(true);
  const rotated=synchronizeHatches([rotateShape(r,{x:0,y:0},90),h],[r,h])[1] as HatchShape;expect(rotated.associative).toBe(true);expect(hatchContains(rotated,{x:10,y:-10})).toBe(true);
 });
 test('déplacer ensemble hachure et contour conserve leur liaison sans double déplacement',()=>{
  const r=rect(),h=hatch([r]),doc=documentOf('Plan',[r,h]);const next=synchronizeDrawing({...doc,shapes:[translateItem(r,200,300),translateItem(h,200,300)]},doc).shapes[1] as HatchShape;expect(next.associative).toBe(true);expect(next.a).toEqual({x:200,y:300});expect(next.regions[0].seed).toEqual({x:210,y:310});
 });
 test('déplacer uniquement la hachure la détache ; ouvrir ou supprimer une limite conserve le dernier état',()=>{
  const r=rect(),h=hatch([r]),moved=synchronizeHatches([r,translateItem(h,200,0)],[r,h])[1] as HatchShape;expect(moved.associative).toBe(false);expect(moved.a.x).toBe(200);
  const deleted=synchronizeHatches([h],[r,h])[0] as HatchShape;expect(deleted.associative).toBe(false);expect(deleted.regions[0].loops).toEqual(h.regions[0].loops);expect(deleted.detachedReason).toContain('conservée');
  const p:Shape={...base,id:'p',type:'polyline',closed:true,nodes:[{p:{x:0,y:0}},{p:{x:100,y:0}},{p:{x:100,y:100}},{p:{x:0,y:100}}]},hp=hatch([p]);const opened=synchronizeHatches([{...p,closed:false},hp],[p,hp])[1] as HatchShape;expect(opened.associative).toBe(false);expect(opened.regions[0].loops).toEqual(hp.regions[0].loops);
 });
 test('nouvelle ligne ne redécoupe pas les hachures existantes ; propriétés et îlots restent éditables',()=>{
  const r=rect(),hole=rect('hole',{x:20,y:20},{x:80,y:80}),h=hatch([r,hole]);const next=synchronizeHatches([r,hole,h,line('new',{x:50,y:0},{x:50,y:100})],[r,hole,h])[2];expect(next).toBe(h);
  const ignore=synchronizeHatches([r,hole,{...h,islands:'ignore'}],[r,hole,h])[2] as HatchShape;expect(ignore.associative).toBe(true);expect(hatchContains(ignore,{x:50,y:50})).toBe(true);
  const independent=detachHatch(h);expect(islandLoops(independent.regions[0].boundaryLoops!,'ignore')).toHaveLength(1);
 });
 test('copie seule indépendante ; copie avec tous les contours recrée des liens valides',()=>{
  const r=rect(),h=hatch([r]),doc=documentOf('Plan',[r,h]);let i=0;
  const alone=pasteClipboard(doc,decodeClipboard(encodeClipboard(doc,[h])),{x:200,y:200},()=>`copy-${++i}`).shapes.at(-1) as HatchShape;expect(alone.associative).toBe(false);expect(alone.regions[0].sourceIds).toEqual([]);
  const next=pasteClipboard(doc,decodeClipboard(encodeClipboard(doc,[r,h])),{x:200,y:200},()=>`copy-${++i}`),pair=next.shapes.slice(-2);expect((pair[1] as HatchShape).associative).toBe(true);expect((pair[1] as HatchShape).regions[0].sourceIds).toEqual([pair[0].id]);expect(hatchContains(pair[1] as HatchShape,{x:210,y:210})).toBe(true);expect(pair[0].a).toEqual({x:200,y:200});
 });
 test('format natif v5 roundtrip, anciens fichiers et validation des paramètres / liaisons',()=>{
  const r=rect(),h=hatch([r]),doc=documentOf('Plan',[r,h]);expect(parseDrawing(JSON.stringify(doc))).toEqual(doc);expect(parseDrawing(JSON.stringify({...documentOf('Old',[r]),version:4})).version).toBe(13);
  for(const bad of [{...h,scale:0},{...h,pattern:'INVALID'},{...h,origin:{x:1e9,y:0}},{...h,regions:[{...h.regions[0],loops:[[{x:0,y:0},{x:1,y:0},{x:2,y:0}]]}]},{...h,regions:[{...h.regions[0],sourceIds:['missing']}]}])expect(()=>parseDrawing(JSON.stringify(documentOf('Bad',[r,bad as HatchShape])))).toThrow();
 });
 test('présentations : hachures papier, liaisons et motif à l’échelle des fenêtres',()=>{
  const r=rect(),h=hatch([r]),paper={id:'sheet',name:'Layout 1',format:'A4' as const,orientation:'landscape' as const,monochrome:true,items:[r,h]},doc=documentOf('Plan',[],[paper]);expect(parseDrawing(JSON.stringify(doc))).toEqual(doc);const scaled=mapItem(h,p=>({x:p.x/50,y:p.y/50}),1/50);expect(scaled.scale).toBe(.02);expect(scaled.b).toEqual({x:2,y:2});expect(hatchLines(scaled).length).toBe(hatchLines(h).length);
 });
 test('PDF : traits vectoriels, remplissage pair/impair et ordre derrière les contours',()=>{
  const r=rect(),hole=rect('hole',{x:20,y:20},{x:80,y:80}),h=hatch([r,hole],undefined,{pattern:'SOLID'}),layout={id:'s',name:'Sheet',format:'A4' as const,orientation:'landscape' as const,monochrome:true,items:[r,h]},doc=documentOf('Plan',[],[layout]);const text=pdfStream(createPdf(doc,[layout]).output());expect(text).toContain('f*');expect(text.indexOf('f*')).toBeLessThan(text.indexOf(' re\nS'));
  const lines=createPdf(documentOf('Lines',[],[{...layout,items:[hatch([r,hole])]}]),[{...layout,items:[hatch([r,hole])]}]).output();expect(pdfStream(lines)).toContain(' l\nS');expect(lines).not.toContain('/Subtype /Image');
 });
 test('DXF moderne : entité HATCH éditable, boucles et motifs, autres objets conservés',()=>{
  const r=rect(),hole=rect('hole',{x:20,y:20},{x:80,y:80}),h=hatch([r,hole],undefined,{angle:15,scale:2}),text=toDxf([r,hole,h,circle('c',{x:200,y:0},10)]);
  expect(text).toContain('AC1018');expect(text).toContain('0\r\nHATCH\r\n');expect(text).toContain('100\r\nAcDbHatch\r\n');expect(text).toContain('91\r\n2\r\n');expect(text).toContain('53\r\n60\r\n');expect(text).toContain('0\r\nLWPOLYLINE\r\n');expect(text).toContain('0\r\nCIRCLE\r\n');expect(text.indexOf('HATCH')).toBeLessThan(text.indexOf('LWPOLYLINE'));expect(text.endsWith('0\r\nEOF\r\n')).toBe(true);expect(toDxf([r])).toContain('AC1018');
 });
 test('DXF béton : le décalage des grains tient compte de Y inversé, même hors des motifs symétriques',()=>{
  const tags=hatchDxf(hatch([rect()],undefined,{pattern:'CONCRETE'}),'0','100');let grain=-1;for(let i=0;i<tags.length;i+=2)if(tags[i]===53&&tags[i+1]===45)grain=i;expect(grain).toBeGreaterThan(0);
  const family=tags.slice(grain,grain+16),offset=(code:number)=>{for(let i=0;i<family.length;i+=2)if(family[i]===code)return Number(family[i+1]);throw new Error('Code DXF absent');};expect(offset(45)).toBeCloseTo(26.8700576851,8);expect(offset(46)).toBeCloseTo(-16.9705627485,8);
 });
});

describe('Hachures : commande, regroupement et redéfinition',()=>{
 const r=rect(),r2=rect('two',{x:200,y:0},{x:300,y:100}),analysis=analyzeBoundaries([r,r2]),regions=selectedRegions(analysis);
 const options=(separate:boolean,ids:string[]=[])=>{let i=0;return{separate,sessionIds:ids,editable:()=>true,makeBase:()=>({...base,id:`h-${++i}`})};};
 test('la présélection reprend les contours et ignore hachures, cotations et objets papier sans contour',()=>{
  const h=hatch([r]),dimension:Shape={...base,id:'d',type:'dimension',height:5,offset:10};expect(initialHatchSelection([r,r2,h,dimension],['h','d','r','two'])).toEqual(['r','two']);expect(initialHatchSelection([r,h],['h'])).toEqual([]);
 });
 test('une sélection multiple produit un objet groupé ou plusieurs objets indépendants',()=>{
  const grouped=applyHatchRegions([r,r2],regions,defaultHatchStyle,options(false)),separate=applyHatchRegions([r,r2],regions,defaultHatchStyle,options(true));expect(grouped.items).toHaveLength(3);expect((grouped.items[2] as HatchShape).regions).toHaveLength(2);expect(separate.items).toHaveLength(4);expect(separate.ids).toHaveLength(2);
 });
 test('un deuxième clic ajoute une zone au groupe sans perdre son associativité ; un doublon ne crée rien',()=>{
  const first=applyHatchRegions([r,r2],[regions[0]],defaultHatchStyle,options(false)),second=applyHatchRegions(first.items,[regions[1]],defaultHatchStyle,options(false,first.ids)),doc=documentOf('Plan',first.items as Shape[]),resolved=synchronizeDrawing({...doc,shapes:second.items as Shape[]},doc).shapes[2] as HatchShape;expect(resolved.associative).toBe(true);expect(resolved.regions).toHaveLength(2);
  const repeated=applyHatchRegions(second.items,[regions[0]],defaultHatchStyle,options(false,second.ids));expect(repeated.duplicate).toBe(true);expect(repeated.items).toBe(second.items);expect(first.items).toHaveLength(3);expect((first.items[2] as HatchShape).regions).toHaveLength(1);
 });
 test('redéfinir remplace la surface du même objet, rétablit les liens et efface le message de détachement',()=>{
  const original={...detachHatch(hatch([r])),detachedReason:'Limite ouverte'},doc=documentOf('Plan',[r,r2,original]);const result=applyHatchRegions(doc.shapes,[regions[1]],defaultHatchStyle,{...options(true),redefineId:original.id}),next=synchronizeDrawing({...doc,shapes:result.items as Shape[]},doc).shapes[2] as HatchShape;expect(result.redefined).toBe(true);expect(next.id).toBe(original.id);expect(next.associative).toBe(true);expect(next.regions[0].sourceIds).toEqual(['two']);expect(next.detachedReason).toBeUndefined();expect(next.a.x).toBe(200);
 });
 test('redéfinir un compartiment avec les mêmes limites conserve la nouvelle zone',()=>{
  const divider=line('d',{x:50,y:0},{x:50,y:100}),a=analyzeBoundaries([r,divider]),old=createHatch({...base,id:'h'},[pickRegion(a,{x:10,y:10})]),doc=documentOf('Plan',[r,divider,old]),result=applyHatchRegions(doc.shapes,[pickRegion(a,{x:75,y:10})],defaultHatchStyle,{...options(true),redefineId:'h'}),next=synchronizeDrawing({...doc,shapes:result.items as Shape[]},doc).shapes[2] as HatchShape;expect(next.associative).toBe(true);expect(hatchContains(next,{x:75,y:10})).toBe(true);expect(hatchContains(next,{x:10,y:10})).toBe(false);
 });
 test('les objets verrouillés sont protégés et une création trop dense est atomique',()=>{
  const h=hatch([r]),items=[r,h];expect(()=>applyHatchRegions(items,[regions[1]],defaultHatchStyle,{...options(true),redefineId:h.id,editable:()=>false})).toThrow();expect(()=>applyHatchRegions(items,regions,{...defaultHatchStyle,scale:1e-8},options(true))).toThrow();expect(items).toHaveLength(2);
 });
 test('réutiliser les propriétés d’une hachure ne réutilise jamais son identifiant ou son calque',()=>{
  const source=hatch([r]),created=createHatch({...base,id:'new',layerId:'murs'},[regions[1]],source);expect(created.id).toBe('new');expect(created.layerId).toBe('murs');expect(created.a.x).toBe(200);
 });
});
