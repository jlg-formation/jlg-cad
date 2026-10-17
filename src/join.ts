import {type Shape,type Point,type PaperItem,type Drawing,lockedShape} from './model';
import {segments,shapeFromSegments,distance,sub,dot,cross,mul,add,arcSegment,type Segment} from './geometry';

// Millimetres, independent of zoom, grid and object snap.
export const joinTolerance=1e-6;
const tau=2*Math.PI;
const normalAngle=(v:number)=>{const a=(v%tau+tau)%tau;return a<1e-12||tau-a<1e-12?0:a;};
type Unit={shape:Shape;parts:Segment[];ids:string[]};
export type JoinResult={items:PaperItem[];replacements:Map<string,string>;resultIds:string[];joined:number;ignored:number};
export const joinEligible=(s:PaperItem):s is Shape=>s.type==='line'||s.type==='arc'||s.type==='polyline'&&!s.closed;
const close=(a:Point,b:Point)=>distance(a,b)<=joinTolerance;
function reverse(parts:Segment[]):Segment[]{
 return [...parts].reverse().map(s=>s.kind==='arc'?{...s,a:s.b,b:s.a,start:s.start+s.sweep,sweep:-s.sweep}:s.kind==='cubic'?{...s,a:s.b,b:s.a,c1:s.c2,c2:s.c1}:{...s,a:s.b,b:s.a});
}
function collinear(a:Shape,b:Shape):boolean{
 const d=sub(a.b,a.a),length=distance(a.a,a.b);if(length<=joinTolerance)return false;
 return Math.abs(cross(d,sub(b.a,a.a)))/length<=joinTolerance&&Math.abs(cross(d,sub(b.b,a.a)))/length<=joinTolerance;
}
function sameCircle(a:Unit,b:Unit):boolean{
 const x=a.parts[0],y=b.parts[0];return x.kind==='arc'&&y.kind==='arc'&&close(x.center,y.center)&&Math.abs(x.radius-y.radius)<=joinTolerance;
}
function mergeLines(group:Unit[],owner:Shape):Unit{
 const d=sub(owner.b,owner.a),length=distance(owner.a,owner.b),axis=mul(d,1/length);
 const points=group.flatMap(u=>[u.shape.a,u.shape.b]).sort((a,b)=>dot(sub(a,owner.a),axis)-dot(sub(b,owner.a),axis));
 const shape:Shape={...owner,type:'line',a:points[0],b:points.at(-1)!};
 return {shape,parts:segments(shape),ids:group.flatMap(u=>u.ids)};
}
function mergeArcs(group:Unit[],owner:Shape,explicitSource:boolean):Unit{
 const arc=segments(owner)[0];if(arc.kind!=='arc')throw new Error('Arc invalide.');
 const sourceStart=arc.sweep<0?arc.start:arc.start+arc.sweep;
 // Angles in the usual CAD counterclockwise direction (the canvas Y axis is reversed).
 const origin=normalAngle(-sourceStart),intervals:[number,number][]=[];
 let sourceEnd=Math.abs(arc.sweep);
 for(const u of group){const s=u.parts[0];if(s.kind!=='arc')continue;
  const start=normalAngle(-(s.sweep<0?s.start:s.start+s.sweep)-origin),end=start+Math.abs(s.sweep);
  sourceEnd=Math.max(sourceEnd,end);
  if(end>tau){intervals.push([start,tau],[0,end-tau]);}else intervals.push([start,end]);
 }
 let start=0,sweep=sourceEnd;
 if(!explicitSource){
  const merged:[number,number][]=[];
  for(const interval of intervals.sort((a,b)=>a[0]-b[0])){const last=merged.at(-1);if(last&&interval[0]<=last[1]+1e-10)last[1]=Math.max(last[1],interval[1]);else merged.push([...interval]);}
  let gap=-1;
  for(let i=0;i<merged.length;i++){const end=merged[i][1],next=merged[(i+1)%merged.length][0]+(i===merged.length-1?tau:0);if(next-end>gap){gap=next-end;start=next%tau;}}
  sweep=tau-Math.max(0,gap);
 }
 const ids=group.flatMap(u=>u.ids),a=add(arc.center,{x:arc.radius*Math.cos(-origin-start),y:arc.radius*Math.sin(-origin-start)});
 if(sweep>=tau-joinTolerance/Math.max(arc.radius,1)){
  const shape:Shape={id:owner.id,color:owner.color,layerId:owner.layerId,type:'circle',a:arc.center,b:add(arc.center,{x:arc.radius,y:0})};return {shape,parts:segments(shape),ids};
 }
 const angle=-origin-start-sweep,b=add(arc.center,{x:arc.radius*Math.cos(angle),y:arc.radius*Math.sin(angle)}),bulge=Math.tan(-sweep/4);
 const shape:Shape={id:owner.id,color:owner.color,layerId:owner.layerId,type:'arc',a,b,bulge};return {shape,parts:segments(shape),ids};
}

function endpointGraph(units:Unit[]){
 const vertices:Point[]=[],buckets=new Map<string,number[]>();
 const vertex=(p:Point)=>{const x=Math.floor(p.x/joinTolerance),y=Math.floor(p.y/joinTolerance);for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(const n of buckets.get(`${x+dx}:${y+dy}`)||[])if(close(vertices[n],p))return n;const n=vertices.push(p)-1,key=`${x}:${y}`;buckets.set(key,[...(buckets.get(key)||[]),n]);return n;};
 const ends=units.map(u=>[vertex(u.parts[0].a),vertex(u.parts.at(-1)!.b)]),links=new Map<number,number[]>();
 ends.forEach(([a,b],i)=>{for(const v of [a,b])links.set(v,[...(links.get(v)||[]),i]);});
 return {ends,links};
}

/** Join only finite open 2D lines, arcs and polylines; never approximate a curve. */
export function joinItems(items:PaperItem[],selectedIds:string[],sourceId?:string,closeArc=false,allowed:(s:PaperItem)=>boolean=()=>true):JoinResult{
 const selected=[...new Set(selectedIds)],byId=new Map(items.map(s=>[s.id,s]));
 const input=selected.map(id=>byId.get(id)).filter((s):s is Shape=>!!s&&joinEligible(s)&&allowed(s));
 const source=sourceId?input.find(s=>s.id===sourceId):undefined;
 if(sourceId&&!source)throw new Error('Choisissez une source ouverte sur un calque déverrouillé.');
 let units:Unit[]=input.map(shape=>({shape,parts:segments(shape),ids:[shape.id]})).filter(u=>u.parts.length&&u.parts.every(s=>distance(s.a,s.b)>joinTolerance));
 if(source&&!units.some(u=>u.shape.id===source.id))throw new Error('Objet source trop petit ou dégénéré.');
 if(closeArc){
  if(source?.type!=='arc')throw new Error('Fermer exige un arc source.');
  const arc=arcSegment(source.a,source.b,source.bulge,true);if(arc.kind!=='arc')throw new Error('Arc invalide.');
  units=[{shape:{id:source.id,color:source.color,layerId:source.layerId,type:'circle',a:arc.center,b:add(arc.center,{x:arc.radius,y:0})},parts:[],ids:[source.id]}];
 }else if(source?.type==='line'){
  const group=units.filter(u=>u.shape.type==='line'&&collinear(source,u.shape));units=group.length>1?[mergeLines(group,source)]:[];
 }else if(source?.type==='arc'){
  const first=units.find(u=>u.shape.id===source.id)!;const group=units.filter(u=>u.shape.type==='arc'&&sameCircle(first,u));units=group.length>1?[mergeArcs(group,source,true)]:[];
 }else{
  // In source-polyline mode, gaps must remain gaps. Primitive gap filling belongs
  // exclusively to the multiple-object and matching primitive-source modes.
  if(!source){
   // Keep already connected, angled chains together. Filling a collinear gap
   // between two such chains would destroy their topology (for example wall notches).
   const graph=endpointGraph(units),seen=new Set<number>(),simple:Unit[]=[],complex:Unit[]=[];
   for(let i=0;i<units.length;i++)if(!seen.has(i)){
    const queue=[i],component:Unit[]=[];seen.add(i);
    for(let q=0;q<queue.length;q++){const n=queue[q];component.push(units[n]);for(const v of graph.ends[n])for(const j of graph.links.get(v)||[])if(!seen.has(j)){seen.add(j);queue.push(j);}}
    const first=component[0],primitive=component.every(u=>first.shape.type==='line'&&u.shape.type==='line'&&collinear(first.shape,u.shape)||first.shape.type==='arc'&&u.shape.type==='arc'&&sameCircle(first,u));
    (primitive?simple:complex).push(...component);
   }
   const remaining=[...simple],merged:Unit[]=[...complex];
   while(remaining.length){const first=remaining.shift()!,group=[first];
    if(first.shape.type==='line'||first.shape.type==='arc')for(let i=remaining.length-1;i>=0;i--){const next=remaining[i];if(first.shape.type===next.shape.type&&(first.shape.type==='line'?collinear(first.shape,next.shape):sameCircle(first,next))){group.push(next);remaining.splice(i,1);}}
    merged.push(group.length===1?first:first.shape.type==='line'?mergeLines(group,first.shape):mergeArcs(group,first.shape,false));
   }units=merged;
  }
  const open=units.filter(u=>u.shape.type!=='circle'),closed=units.filter(u=>u.shape.type==='circle');
  // Spatial endpoint index: branching vertices are never resolved by selection order.
  const {ends,links}=endpointGraph(open);
  const used=new Set<number>(),out:Unit[]=[...closed];
  const build=(index:number)=>{
   const seed=open[index];used.add(index);let count=1,parts=seed.parts,ids=[...seed.ids],left=ends[index][0],right=ends[index][1];
   const grow=(front:boolean)=>{let v=front?left:right;
    while(links.get(v)?.length===2){const next=links.get(v)!.find(i=>!used.has(i));if(next===undefined)break;used.add(next);count++;const u=open[next],[a,b]=ends[next],oriented=front?(b===v?u.parts:reverse(u.parts)):(a===v?u.parts:reverse(u.parts));parts=front?[...oriented,...parts]:[...parts,...oriented];ids.push(...u.ids);v=a===v?b:a;if(front)left=v;else right=v;if(left===right)break;}
   };
   grow(false);if(left!==right)grow(true);
   const owner=source||seed.shape;
   if(count===1){out.push(seed);return;}
   const base={...owner,type:'polyline' as const,nodes:[],closed:false};
   out.push({shape:shapeFromSegments(base,parts,left===right),parts,ids});
  };
  if(source){const index=open.findIndex(u=>u.shape.id===source.id);if(index>=0)build(index);}
  else{for(let i=0;i<open.length;i++)if(!used.has(i)&&(links.get(ends[i][0])?.length!==2||links.get(ends[i][1])?.length!==2))build(i);for(let i=0;i<open.length;i++)if(!used.has(i))build(i);}
  units=out;
 }
 const results=units.filter(u=>(u.ids.length>1||closeArc)&&!(u.shape.type==='polyline'&&u.shape.closed&&u.parts.length===2&&u.parts.every(s=>s.kind==='line'))),replacements=new Map<string,string>();
 if(results.some(u=>u.shape.type==='polyline'&&u.shape.nodes.length>5000))throw new Error('La jonction dépasserait 5 000 sommets par polyligne. Réduisez la sélection.');
 for(const u of results)for(const id of u.ids)replacements.set(id,u.shape.id);
 const owners=new Map(results.map(u=>[u.shape.id,u.shape]));
 let next=items.flatMap(s=>owners.has(s.id)?[owners.get(s.id)!]:replacements.has(s.id)?[]:[s]);
 // Update both outer and island dependencies before association synchronization.
 const remap=(ids:string[])=>[...new Set(ids.map(id=>replacements.get(id)||id))];
 next=next.map(s=>s.type==='hatch'&&s.associative&&s.regions.some(r=>r.sourceIds.some(id=>replacements.has(id)))?{...s,boundaryVersion:(s.boundaryVersion||0)+1,regions:s.regions.map(r=>({...r,sourceIds:remap(r.sourceIds),outerSourceIds:r.outerSourceIds?remap(r.outerSourceIds):undefined}))}:s);
 return {items:next,replacements,resultIds:results.map(u=>u.shape.id),joined:replacements.size,ignored:selected.length-replacements.size};
}

export function joinDrawing(drawing:Drawing,ids:string[],sourceId?:string,closeArc=false,layoutId?:string):{drawing:Drawing;result:JoinResult}{
 const layout=layoutId?drawing.layouts.find(l=>l.id===layoutId):undefined;
 if(layoutId&&!layout)throw new Error('Présentation introuvable.');
 const result=joinItems(layout?layout.items:drawing.shapes,ids,sourceId,closeArc,s=>!!layout||!lockedShape(drawing,s as Shape)&&drawing.layers.find(l=>l.id===(s.layerId||'0'))?.visible!==false);
 const next=layout?{...drawing,layouts:drawing.layouts.map(l=>l.id===layoutId?{...l,items:result.items}:l)}:{...drawing,shapes:result.items as Shape[]};
 return {drawing:next,result};
}
