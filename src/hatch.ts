import type {BaseShape, HatchShape, HatchRegion, HatchStyle, Point, Shape} from './model';
import {closestLine, distance, flatten, segments} from './geometry';

// Drawing units (mm), independent of zoom. Only numerical coincidence is merged.
export const hatchTolerance = .05;
const EPS = 1e-6;
export const defaultHatchStyle: HatchStyle = {pattern:'ANSI31',scale:1,angle:0,spacing:10,double:false,origin:{x:0,y:0},islands:'normal',associative:true};
export function hatchStyleOf(s:HatchStyle):HatchStyle {const {pattern,scale,angle,spacing,double,origin,islands,associative,mirrored}=s;return {pattern,scale,angle,spacing,double,origin,islands,associative,...(mirrored!==undefined?{mirrored}:{})};}
export const hatchPatterns = ['SOLID','ANSI31','CROSS','BRICK','CONCRETE','USER'] as const;
export const hatchPatternLabels = {SOLID:'Uni',ANSI31:'ANSI31 — diagonales',CROSS:'Croisé',BRICK:'Brique',CONCRETE:'Béton',USER:'Lignes personnalisées'};
export const boundaryShape = (s:Shape) => s.type!=='hatch' && s.type!=='dimension' && s.type!=='text';
export const polygonArea = (ps:Point[]) => ps.reduce((sum,p,i)=>{const q=ps[(i+1)%ps.length];return sum+p.x*q.y-q.x*p.y;},0)/2;
export function polygonContains(p:Point,ps:Point[],border=true):boolean {
 let inside=false;
 for(let i=0;i<ps.length;i++){const a=ps[i],b=ps[(i+1)%ps.length];if(distance(p,closestLine(p,a,b).point)<EPS)return border;if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)inside=!inside;}
 return inside;
}
export function regionContains(r:HatchRegion,p:Point):boolean {return r.loops.reduce((n,loop)=>n+Number(polygonContains(p,loop)),0)%2===1;}
export const hatchContains=(s:HatchShape,p:Point)=>s.regions.some(r=>regionContains(r,p));
export function interiorPoint(loop:Point[]):Point {
 // Scan between vertex levels; unlike a centroid, this works on concave polygons.
 const ys=[...new Set(loop.map(p=>p.y))].sort((a,b)=>a-b);
 for(let i=1;i<ys.length;i++){const y=(ys[i-1]+ys[i])/2,xs:number[]=[];loop.forEach((a,j)=>{const b=loop[(j+1)%loop.length];if((a.y>y)!==(b.y>y))xs.push(a.x+(y-a.y)*(b.x-a.x)/(b.y-a.y));});xs.sort((a,b)=>a-b);for(let j=1;j<xs.length;j+=2)if(xs[j]-xs[j-1]>EPS)return{x:(xs[j-1]+xs[j])/2,y};}
 throw new Error('Contour dégénéré : aucune surface à hachurer.');
}

type Edge={a:Point;b:Point;ids:string[];cuts:Set<number>};
export type BoundaryFace={loop:Point[];sourceIds:string[];parent:number;area:number};
export type BoundaryAnalysis={faces:BoundaryFace[];gaps:Point[]};
export function analyzeBoundaries(shapes:Shape[]):BoundaryAnalysis {
 const edges:Edge[]=[];
 for(const s of shapes.filter(boundaryShape))for(const seg of segments(s)){const ps=flatten(seg,hatchTolerance);for(let i=1;i<ps.length;i++)if(distance(ps[i-1].p,ps[i].p)>EPS){edges.push({a:ps[i-1].p,b:ps[i].p,ids:[s.id],cuts:new Set([0,1])});if(edges.length>12000)throw new Error('Contour trop complexe : utilisez Sélectionner des objets pour limiter la recherche.');}}
 // Sweep on X eliminates distant pairs before intersection tests.
 const sorted=edges.map(e=>({e,min:Math.min(e.a.x,e.b.x),max:Math.max(e.a.x,e.b.x)})).sort((a,b)=>a.min-b.min);
 let checks=0,cuts=0;
 const addCut=(edge:Edge,t:number)=>{if(!edge.cuts.has(t)){edge.cuts.add(t);if(++cuts>100000)throw new Error('Contour trop complexe : sélectionnez un ensemble de limites plus petit.');}};
 for(let i=0;i<sorted.length;i++)for(let j=i+1;j<sorted.length&&sorted[j].min<=sorted[i].max+EPS;j++){
  const a=sorted[i].e,b=sorted[j].e;
  if(Math.max(a.a.y,a.b.y)+EPS<Math.min(b.a.y,b.b.y)||Math.max(b.a.y,b.b.y)+EPS<Math.min(a.a.y,a.b.y))continue;
  if(++checks>2_000_000)throw new Error('Trop d’intersections : sélectionnez les objets du contour.');
  const u={x:a.b.x-a.a.x,y:a.b.y-a.a.y},v={x:b.b.x-b.a.x,y:b.b.y-b.a.y},d={x:b.a.x-a.a.x,y:b.a.y-a.a.y},den=u.x*v.y-u.y*v.x;
  if(Math.abs(den)>EPS*EPS){const t=(d.x*v.y-d.y*v.x)/den,k=(d.x*u.y-d.y*u.x)/den;if(t>=0&&t<=1&&k>=0&&k<=1){addCut(a,t);addCut(b,k);}}
  // Also split collinear overlaps, duplicates and T junctions.
  for(const [edge,p] of [[a,b.a],[a,b.b],[b,a.a],[b,a.b]] as [Edge,Point][]){const c=closestLine(p,edge.a,edge.b);if(distance(p,c.point)<=EPS)addCut(edge,c.t);}
 }
 const vertices:Point[]=[],cells=new Map<string,number[]>(),adj:number[][]=[],links=new Map<string,Set<string>>();
 const vertex=(p:Point)=>{const x=Math.floor(p.x/EPS),y=Math.floor(p.y/EPS);for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(const i of cells.get(`${x+dx},${y+dy}`)||[])if(distance(vertices[i],p)<=EPS)return i;const i=vertices.length;vertices.push(p);adj.push([]);const key=`${x},${y}`;cells.set(key,[...(cells.get(key)||[]),i]);return i;};
 const key=(a:number,b:number)=>a<b?`${a}:${b}`:`${b}:${a}`;
 for(const e of edges){const ts=[...new Set(e.cuts)].sort((a,b)=>a-b);for(let i=1;i<ts.length;i++){const at=(t:number)=>({x:e.a.x+(e.b.x-e.a.x)*t,y:e.a.y+(e.b.y-e.a.y)*t}),a=vertex(at(ts[i-1])),b=vertex(at(ts[i]));if(a===b)continue;const k=key(a,b);if(!links.has(k)){links.set(k,new Set());adj[a].push(b);adj[b].push(a);}e.ids.forEach(id=>links.get(k)!.add(id));}}
 adj.forEach((list,i)=>list.sort((a,b)=>Math.atan2(vertices[a].y-vertices[i].y,vertices[a].x-vertices[i].x)-Math.atan2(vertices[b].y-vertices[i].y,vertices[b].x-vertices[i].x)));
 const visited=new Set<string>(),faces:BoundaryFace[]=[],unique=new Set<string>();
 for(let start=0;start<adj.length;start++)for(const neighbor of adj[start]){
  if(visited.has(`${start}:${neighbor}`))continue;
  let a=start,b=neighbor;const walk:number[]=[];
  do{visited.add(`${a}:${b}`);walk.push(a);const list=adj[b],next=list[(list.indexOf(a)+list.length-1)%list.length];a=b;b=next;}while((a!==start||b!==neighbor)&&walk.length<=links.size*2+1);
  // Repeated vertices separate dangling branches and articulation-connected loops.
  const stack:number[]=[],positions=new Map<number,number>();
  for(const v of [...walk,walk[0]]){const pos=positions.get(v);if(pos!==undefined){const cycle=stack.slice(pos),loop=cycle.map(i=>vertices[i]),area=polygonArea(loop);if(cycle.length>=3&&area>EPS){const signature=cycle.map((n,i)=>key(n,cycle[(i+1)%cycle.length])).sort().join('|');if(!unique.has(signature)){unique.add(signature);const sourceIds=[...new Set(cycle.flatMap((n,i)=>[...links.get(key(n,cycle[(i+1)%cycle.length]))!]))];faces.push({loop,sourceIds,parent:-1,area});}}for(const old of stack.splice(pos+1))positions.delete(old);}else{positions.set(v,stack.length);stack.push(v);}}
 }
 for(let i=0;i<faces.length;i++){const f=faces[i],p=interiorPoint(f.loop);let size=Infinity;for(let j=0;j<faces.length;j++){const candidate=faces[j];if(candidate.area>f.area+EPS&&candidate.area<size&&polygonContains(p,candidate.loop,false)&&f.loop.every(v=>polygonContains(v,candidate.loop))){f.parent=j;size=candidate.area;}}}
 return {faces,gaps:vertices.filter((_,i)=>adj[i].length===1)};
}
function faceRegion(analysis:BoundaryAnalysis,index:number,islands:HatchStyle['islands'],seed?:Point):HatchRegion {
 const {faces}=analysis,descendants=[index];
 for(let cursor=0;cursor<descendants.length;cursor++){const parent=descendants[cursor];faces.forEach((f,i)=>{if(f.parent===parent)descendants.push(i);});}
 const boundaryLoops=descendants.map(i=>faces[i].loop),region={loops:islandLoops(boundaryLoops,islands),boundaryLoops,outerSourceIds:faces[index].sourceIds,sourceIds:[...new Set(descendants.flatMap(i=>faces[i].sourceIds))],seed:seed||interiorPoint(faces[index].loop)};
 if(!seed&&!regionContains(region,region.seed)){
  // Find a scan-line midpoint in the filled region rather than an interior island.
  const ys=[...new Set(region.loops.flat().map(p=>p.y))].sort((a,b)=>a-b);
  outer:for(let i=1;i<ys.length;i++){const y=(ys[i-1]+ys[i])/2,xs:number[]=[];for(const loop of region.loops)loop.forEach((a,j)=>{const b=loop[(j+1)%loop.length];if((a.y>y)!==(b.y>y))xs.push(a.x+(y-a.y)*(b.x-a.x)/(b.y-a.y));});xs.sort((a,b)=>a-b);for(let j=1;j<xs.length;j+=2)if(xs[j]-xs[j-1]>EPS){region.seed={x:(xs[j-1]+xs[j])/2,y};break outer;}}
 }
 return region;
}
export function islandLoops(loops:Point[][],mode:HatchStyle['islands']):Point[][] {
 if(mode==='ignore')return loops.slice(0,1);
 if(mode==='normal')return loops;
 return loops.filter((loop,i)=>i===0||!loops.some((parent,j)=>j>0&&j!==i&&Math.abs(polygonArea(parent))>Math.abs(polygonArea(loop))+EPS&&polygonContains(interiorPoint(loop),parent,false)));
}
export function pickRegion(analysis:BoundaryAnalysis,p:Point,islands:HatchStyle['islands']='normal'):HatchRegion {
 if(analysis.faces.some(f=>f.loop.some((a,i)=>distance(p,closestLine(p,a,f.loop[(i+1)%f.loop.length]).point)<EPS)))throw new Error('Le point est sur le contour : cliquez à l’intérieur.');
 const candidates=analysis.faces.map((f,i)=>({f,i})).filter(({f})=>polygonContains(p,f.loop,false)).sort((a,b)=>a.f.area-b.f.area);
 if(!candidates.length)throw new Error('Aucun contour fermé autour de ce point. Vérifiez les ouvertures ou sélectionnez les objets.');
 return faceRegion(analysis,candidates[0].i,islands,p);
}
export const selectedRegions=(analysis:BoundaryAnalysis,islands:HatchStyle['islands']='normal')=>analysis.faces.flatMap((f,i)=>f.parent<0?[faceRegion(analysis,i,islands)]:[]);
export function hatchBounds(regions:HatchRegion[]){const ps=regions.flatMap(r=>r.loops.flat());return {a:{x:Math.min(...ps.map(p=>p.x)),y:Math.min(...ps.map(p=>p.y))},b:{x:Math.max(...ps.map(p=>p.x)),y:Math.max(...ps.map(p=>p.y))}};}
export function createHatch(base:BaseShape,regions:HatchRegion[],style:HatchStyle=defaultHatchStyle):HatchShape {
 if(!regions.length)throw new Error('Sélectionnez des objets formant un contour fermé.');
 if(regions.length>1000||regions.reduce((sum,r)=>sum+r.loops.flat().length+(r.boundaryLoops?.flat().length||0),0)>100000)throw new Error('Hachure trop complexe : créez des hachures séparées.');
 validateHatchStyle(style);
 const shape:HatchShape={...base,...hatchStyleOf(style),type:'hatch',regions,boundaryVersion:((base as HatchShape).boundaryVersion||0)+1,detachedReason:undefined,...hatchBounds(regions)};
 hatchLines(shape); // Reject unreasonably dense patterns before committing.
 return shape;
}
export function validateHatchStyle(s:HatchStyle){if(!hatchPatterns.includes(s.pattern)||!['normal','outer','ignore'].includes(s.islands)||![s.scale,s.spacing,s.angle,s.origin?.x,s.origin?.y].every(Number.isFinite)||s.scale<=0||s.spacing<=0||s.scale>1e6||s.spacing>1e7||typeof s.double!=='boolean'||typeof s.associative!=='boolean'||s.mirrored!==undefined&&typeof s.mirrored!=='boolean')throw new Error('Paramètres de hachure invalides : échelle et espacement doivent être positifs.');}
export const hatchPath=(s:HatchShape)=>s.regions.map(r=>r.loops.map(loop=>'M '+loop.map(p=>`${p.x} ${p.y}`).join(' L ')+' Z').join(' ')).join(' ');
export function detachHatch(s:HatchShape):HatchShape{return {...s,associative:false,regions:s.regions.map(r=>({...r,sourceIds:[],outerSourceIds:[]}))};}

export type HatchFamily={angle:number;spacing:number;shift?:number;dashes?:number[];base?:Point};
export function patternFamilies(s:HatchStyle):HatchFamily[]{
 const families:HatchFamily[]=s.pattern==='USER'?[{angle:0,spacing:s.spacing},...(s.double?[{angle:90,spacing:s.spacing}]:[])]:s.pattern==='ANSI31'?[{angle:45,spacing:3.175}]:s.pattern==='CROSS'?[{angle:45,spacing:3.175},{angle:135,spacing:3.175}]:s.pattern==='BRICK'?[{angle:0,spacing:20},{angle:90,spacing:40,shift:20,dashes:[20,20]}]:s.pattern==='CONCRETE'?[
  // A triangular aggregate lattice plus dispersed short grain marks.
  {angle:0,spacing:10*Math.sqrt(3),shift:10,dashes:[3,17]},
  {angle:120,spacing:10*Math.sqrt(3),shift:10,dashes:[3,17],base:{x:3,y:0}},
  {angle:240,spacing:10*Math.sqrt(3),shift:10,dashes:[3,17],base:{x:1.5,y:1.5*Math.sqrt(3)}},
  {angle:45,spacing:31,shift:7,dashes:[1,24],base:{x:10,y:10}},
  {angle:0,spacing:25,shift:8,dashes:[.6,19.4],base:{x:9,y:8}},
 ]:[];
 const a=s.angle*Math.PI/180,cos=Math.cos(a),sin=Math.sin(a);
 return families.map(f=>{const x=(f.base?.x||0)*s.scale,y=(f.base?.y||0)*s.scale*(s.mirrored?-1:1);return {...f,base:{x:x*cos-y*sin,y:x*sin+y*cos},angle:f.angle*(s.mirrored?-1:1)+s.angle,spacing:f.spacing*s.scale,shift:(f.shift||0)*s.scale*(s.mirrored?-1:1),dashes:f.dashes?.map(n=>n*s.scale)};});
}
const lineCache=new WeakMap<HatchShape,[Point,Point][]>();
export function hatchLines(s:HatchShape):[Point,Point][]{
 const cached=lineCache.get(s);if(cached)return cached;
 const result:[Point,Point][]=[];let rows=0;
 for(const f of patternFamilies(s)){
  const angle=-f.angle*Math.PI/180,snapTrig=(v:number)=>Math.abs(v)<1e-12?0:Math.abs(Math.abs(v)-1)<1e-12?Math.sign(v):v,u={x:snapTrig(Math.cos(angle)),y:snapTrig(Math.sin(angle))},n={x:-u.y,y:u.x};
  const origin={x:s.origin.x+(f.base?.x||0),y:s.origin.y-(f.base?.y||0)};
  const local=(p:Point)=>({x:(p.x-origin.x)*u.x+(p.y-origin.y)*u.y,y:(p.x-origin.x)*n.x+(p.y-origin.y)*n.y});
  const world=(x:number,y:number)=>({x:origin.x+u.x*x+n.x*y,y:origin.y+u.y*x+n.y*y});
  for(const region of s.regions){const loops=region.loops.map(l=>l.map(local)),ys=loops.flat().map(p=>p.y),lo=Math.ceil((Math.min(...ys)-EPS)/f.spacing),hi=Math.floor((Math.max(...ys)+EPS)/f.spacing);
   if((rows+=hi-lo+1)>20000)throw new Error('Hachure trop dense : augmentez l’échelle ou l’espacement.');
   for(let row=lo;row<=hi;row++){const y=row*f.spacing,xs:number[]=[];for(const loop of loops)for(let i=0;i<loop.length;i++){const a=loop[i],b=loop[(i+1)%loop.length];if((a.y>y)!==(b.y>y))xs.push(a.x+(y-a.y)*(b.x-a.x)/(b.y-a.y));}xs.sort((a,b)=>a-b);
    for(let i=1;i<xs.length;i+=2){const from=xs[i-1],to=xs[i];if(to-from<EPS)continue;
     if(!f.dashes)result.push([world(from,y),world(to,y)]);
     else{const period=f.dashes.reduce((a,b)=>a+b,0),phase=row*(f.shift||0);if((to-from)/period>20000)throw new Error('Hachure trop dense : augmentez l’échelle.');for(let k=Math.floor((from-phase)/period);k<=Math.floor((to-phase)/period);k++){let x=phase+k*period;f.dashes.forEach((d,j)=>{if(j%2===0&&Math.min(to,x+d)-Math.max(from,x)>EPS)result.push([world(Math.max(from,x),y),world(Math.min(to,x+d),y)]);x+=d;});}}
     if(result.length>50000)throw new Error('Hachure trop dense : augmentez l’échelle ou l’espacement.');
    }
   }
  }
 }
 lineCache.set(s,result);return result;
}

export function synchronizeHatches(shapes:Shape[],previous:Shape[]=[]):Shape[]{
 const byId=new Map(shapes.map(s=>[s.id,s])),oldById=new Map(previous.map(s=>[s.id,s]));
 return shapes.map(s=>{
  if(s.type!=='hatch'||!s.associative)return s;
  const old=oldById.get(s.id);
  // Explicitly moving just the hatch detaches it; property edits keep the links.
  const sourcesUnchanged=s.regions.every(r=>r.sourceIds.every(id=>byId.get(id)===oldById.get(id)));
  const redefined=old?.type==='hatch'&&old.boundaryVersion!==s.boundaryVersion;
  if(old?.type==='hatch'&&!redefined&&old.islands===s.islands&&sourcesUnchanged&&JSON.stringify(old.regions.map(r=>r.loops))!==JSON.stringify(s.regions.map(r=>r.loops)))return detachHatch(s);
  if(sourcesUnchanged&&old?.type==='hatch'&&old.islands===s.islands&&!redefined)return s;
  try{
   const regions=s.regions.map((r,index)=>{
    const sources=r.sourceIds.map(id=>byId.get(id));if(!sources.length||sources.some(s=>!s||!boundaryShape(s)))throw new Error('Limite supprimée');
    let seed=!redefined&&old?.type==='hatch'?old.regions[index]?.seed||r.seed:r.seed;
    // Transport a pick point with a common translation/rotation/reflection of all limits.
    const anchors=(shape:Shape):Point[]=>shape.type==='rect'?[shape.a,{x:shape.b.x,y:shape.a.y},shape.b,{x:shape.a.x,y:shape.b.y}]:shape.type==='polyline'||shape.type==='bezier'?shape.nodes.map(n=>n.p):[shape.a,shape.b];
    const pairs=redefined?[]:sources.flatMap(source=>{const oldSource=oldById.get(source!.id);if(!oldSource)return[];const oldPoints=anchors(oldSource),newPoints=anchors(source!);return oldPoints.length===newPoints.length?oldPoints.map((p,i)=>[p,newPoints[i]] as [Point,Point]):[];});
    if(pairs.length){const [p,q]=pairs[0],second=pairs.find(([a])=>distance(a,p)>EPS);if(second){const [p2,q2]=second,dx=p2.x-p.x,dy=p2.y-p.y,vx=q2.x-q.x,vy=q2.y-q.y,den=dx*dx+dy*dy;for(const reflected of [false,true]){const a=(dx*vx+(reflected?-dy:dy)*vy)/den,b=(dx*vy-(reflected?-dy:dy)*vx)/den;const transform=(v:Point)=>{const x=v.x-p.x,y=(v.y-p.y)*(reflected?-1:1);return{x:q.x+a*x-b*y,y:q.y+b*x+a*y};};if(pairs.every(([x,y])=>distance(transform(x),y)<EPS)){seed=transform(seed);break;}}}}
    const analysis=analyzeBoundaries(sources as Shape[]);
    let region:HatchRegion;
    if(r.outerSourceIds?.length){
     const outerIds=new Set(r.outerSourceIds),candidates=analysis.faces.map((f,i)=>({f,i})).filter(({f})=>f.sourceIds.length===outerIds.size&&f.sourceIds.every(id=>outerIds.has(id)));
     const chosen=candidates.filter(({f})=>polygonContains(seed,f.loop,false)).sort((a,b)=>a.f.area-b.f.area)[0]||(candidates.length===1?candidates[0]:undefined);
     if(!chosen)throw new Error('Contour ouvert ou ambigu');
     region=faceRegion(analysis,chosen.i,s.islands);
     if(regionContains(region,seed))region.seed=seed;
    }else region=pickRegion(analysis,seed,s.islands);
    // Keep all original dependencies (including hidden limits); do not acquire new objects.
    return {...region,sourceIds:r.sourceIds};
   });
   return {...s,regions,...hatchBounds(regions)};
  }catch{return {...detachHatch(s),detachedReason:'Contour ouvert ou supprimé : dernière surface conservée.'};}
 });
}
