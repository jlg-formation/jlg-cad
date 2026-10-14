import {hatchBounds} from './hatch';
import { type Point, type Shape, type PathShape, type Node, type PaperItem, type Dimension, type BaseShape } from './model';

const EPS=1e-8;
export const add=(a:Point,b:Point):Point=>({x:a.x+b.x,y:a.y+b.y});
export const sub=(a:Point,b:Point):Point=>({x:a.x-b.x,y:a.y-b.y});
export const mul=(p:Point,k:number):Point=>({x:p.x*k,y:p.y*k});
export const dot=(a:Point,b:Point)=>a.x*b.x+a.y*b.y;
export const cross=(a:Point,b:Point)=>a.x*b.y-a.y*b.x;
export const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
export const lerp=(a:Point,b:Point,t:number)=>add(a,mul(sub(b,a),t));
const unit=(p:Point)=>mul(p,1/(Math.hypot(p.x,p.y)||1));
const normal=(p:Point)=>({x:-p.y,y:p.x});
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const tau=Math.PI*2;
const angleDelta=(a:number,b:number,sign:number)=>sign>=0?((b-a)%tau+tau)%tau:-((a-b)%tau+tau)%tau;

export function parseLength(value:string,defaultUnit:'mm'|'cm'|'m'='mm'):number {
 const match=value.trim().toLowerCase().replace(',','.').match(/^([+-]?(?:\d+(?:\.\d*)?|\.\d+))\s*(mm|cm|m)?$/);
 if(!match)throw new Error('Saisissez une distance, par exemple 100 mm, 10 cm ou 0,1 m.');
 const n=Number(match[1])*({mm:1,cm:10,m:1000}[match[2]||defaultUnit]!);
 if(!Number.isFinite(n)||Math.abs(n)>1e7)throw new Error('Distance trop grande.');return n;
}
export function parseAngle(value:string):number {
 const n=Number(value.trim().replace(',','.').replace(/°$/,''));
 if(!value.trim()||!Number.isFinite(n))throw new Error('Saisissez un angle en degrés.');return n;
}
export const formatLength=(n:number)=>`${Number(n.toFixed(2)).toLocaleString('fr-FR').replace(/[\u202f\u00a0]/g,' ')} mm`;

export type Segment = {kind:'line';a:Point;b:Point} | {kind:'arc';a:Point;b:Point;center:Point;radius:number;start:number;sweep:number} | {kind:'cubic';a:Point;b:Point;c1:Point;c2:Point};
export function arcSegment(a:Point,b:Point,bulge:number):Segment {
 if(Math.abs(bulge)<EPS||distance(a,b)<EPS)return{kind:'line',a,b};
 const d=sub(b,a),center=add(lerp(a,b,.5),mul(normal(d),(1-bulge*bulge)/(4*bulge)));
 return{kind:'arc',a,b,center,radius:distance(a,center),start:Math.atan2(a.y-center.y,a.x-center.x),sweep:4*Math.atan(bulge)};
}
// One exact circular segment, oriented through the intermediate point.
export function threePointArc(a:Point,through:Point,b:Point,base:BaseShape):PathShape {
 const u=sub(through,a),v=sub(b,a),det=cross(u,v),scale=Math.max(dot(u,u),dot(v,v),distance(through,b)**2);
 if(!scale||Math.min(distance(a,through),distance(a,b),distance(through,b))<.001)throw new Error('Choisissez trois points distincts.');
 if(Math.abs(det)<=scale*1e-10)throw new Error('Les trois points sont alignés : choisissez un autre point.');
 const center=add(a,{x:(dot(u,u)*v.y-dot(v,v)*u.y)/(2*det),y:(u.x*dot(v,v)-v.x*dot(u,u))/(2*det)});
 const start=Math.atan2(a.y-center.y,a.x-center.x),end=Math.atan2(b.y-center.y,b.x-center.x);
 const sweep=angleDelta(start,end,det),bulge=Math.tan(sweep/4);
 if(!Number.isFinite(bulge)||Math.abs(bulge)>=1e4)throw new Error('Arc trop proche d’un cercle complet.');
 return {...base,type:'polyline',a,b,closed:false,nodes:[{p:a,bulge},{p:b}]};
}
export function segments(shape:Shape):Segment[] {
 if(shape.type==='text')return[];
 if(shape.type==='hatch')return shape.regions.flatMap(r=>r.loops.flatMap(loop=>loop.map((a,i):Segment=>({kind:'line',a,b:loop[(i+1)%loop.length]}))));
 if(shape.type==='line')return[{kind:'line',a:shape.a,b:shape.b}];
 if(shape.type==='rect'){const {a,b}=shape,c={x:b.x,y:a.y},d={x:a.x,y:b.y};return[{kind:'line',a,b:c},{kind:'line',a:c,b},{kind:'line',a:b,b:d},{kind:'line',a:d,b:a}];}
 if(shape.type==='circle'){const r=distance(shape.a,shape.b),a={x:shape.a.x+r,y:shape.a.y},b={x:shape.a.x-r,y:shape.a.y};return[arcSegment(a,b,1),arcSegment(b,a,1)];}
 if(shape.type==='dimension')return dimensionGeometry(shape).lines.map(([a,b])=>({kind:'line',a,b}));
 const result:Segment[]=[];
 for(let i=0;i<shape.nodes.length-(shape.closed?0:1);i++){
   const n=shape.nodes[i],next=shape.nodes[(i+1)%shape.nodes.length];
   result.push(shape.type==='bezier'?{kind:'cubic',a:n.p,b:next.p,c1:n.out||n.p,c2:next.in||next.p}:arcSegment(n.p,next.p,n.bulge||0));
 }
 return result;
}
export function at(s:Segment,t:number):Point {
 if(s.kind==='line')return lerp(s.a,s.b,t);
 if(s.kind==='arc'){const a=s.start+s.sweep*t;return add(s.center,{x:s.radius*Math.cos(a),y:s.radius*Math.sin(a)});}
 const u=1-t;return add(add(mul(s.a,u*u*u),mul(s.c1,3*u*u*t)),add(mul(s.c2,3*u*t*t),mul(s.b,t*t*t)));
}
export function portion(s:Segment,from:number,to:number):Segment {
 if(s.kind==='line')return{kind:'line',a:at(s,from),b:at(s,to)};
 if(s.kind==='arc')return{...s,a:at(s,from),b:at(s,to),start:s.start+s.sweep*from,sweep:s.sweep*(to-from)};
 const split=(s:Extract<Segment,{kind:'cubic'}>,t:number)=>{const p=lerp(s.a,s.c1,t),q=lerp(s.c1,s.c2,t),r=lerp(s.c2,s.b,t),u=lerp(p,q,t),v=lerp(q,r,t),w=lerp(u,v,t);return[{kind:'cubic' as const,a:s.a,c1:p,c2:u,b:w},{kind:'cubic' as const,a:w,c1:v,c2:r,b:s.b}];};
 if(from>=1-EPS)return{kind:'line',a:s.b,b:s.b};
 return split(split(s,from)[1],(to-from)/(1-from))[0];
}
export function flatten(s:Segment,tolerance=.1):{p:Point;t:number}[] {
 const result=[{p:s.a,t:0}];
 const recurse=(from:number,to:number,depth:number)=>{
   const a=at(s,from),b=at(s,to),p=at(s,(from+to)/2),q=at(s,from+(to-from)/3),r=at(s,from+(to-from)*2/3);
   const deviation=(p:Point)=>distance(p,closestLine(p,a,b).point);
   if(depth<16&&Math.max(deviation(p),deviation(q),deviation(r))>tolerance){recurse(from,(from+to)/2,depth+1);recurse((from+to)/2,to,depth+1);}else result.push({p:b,t:to});
 };recurse(0,1,0);return result;
}
export function closestLine(p:Point,a:Point,b:Point){const d=sub(b,a),t=clamp(dot(sub(p,a),d)/(dot(d,d)||1));return{point:lerp(a,b,t),t};}
export function closestSegment(p:Point,s:Segment){
 if(s.kind==='line')return closestLine(p,s.a,s.b);
 if(s.kind==='arc'){const angle=Math.atan2(p.y-s.center.y,p.x-s.center.x),t=angleDelta(s.start,angle,s.sweep)/s.sweep;const candidates=[{point:s.a,t:0},{point:s.b,t:1},...(t>=0&&t<=1?[{point:at(s,t),t}]:[])];return candidates.sort((a,b)=>distance(p,a.point)-distance(p,b.point))[0];}
 const points=flatten(s,.05);let best={point:s.a,t:0},dist=Infinity;for(let i=1;i<points.length;i++){const c=closestLine(p,points[i-1].p,points[i].p),d=distance(p,c.point);if(d<dist){dist=d;best={point:c.point,t:points[i-1].t+(points[i].t-points[i-1].t)*c.t};}}return best;
}
function lineIntersection(a:Point,b:Point,c:Point,d:Point,infinite=false):Point[]{
 const u=sub(b,a),v=sub(d,c),den=cross(u,v);if(Math.abs(den)<EPS)return[];const t=cross(sub(c,a),v)/den,k=cross(sub(c,a),u)/den;
 return infinite||(t>=-EPS&&t<=1+EPS&&k>=-EPS&&k<=1+EPS)?[lerp(a,b,t)]:[];
}
function lineCircle(a:Point,b:Point,c:Point,r:number,infinite=false):Point[]{
 const d=sub(b,a),f=sub(a,c),aa=dot(d,d);if(aa<EPS)return[];const bb=2*dot(f,d),cc=dot(f,f)-r*r,disc=bb*bb-4*aa*cc;if(disc<-EPS)return[];
 const root=Math.sqrt(Math.max(0,disc)),ts=[(-bb-root)/(2*aa),(-bb+root)/(2*aa)];return ts.filter((t,i)=> (infinite||t>=-EPS&&t<=1+EPS)&&(i===0||Math.abs(t-ts[0])>EPS)).map(t=>lerp(a,b,t));
}
function circleCircle(a:Point,ra:number,b:Point,rb:number):Point[]{
 const d=distance(a,b);if(d<EPS||d>ra+rb+EPS||d<Math.abs(ra-rb)-EPS)return[];const x=(ra*ra-rb*rb+d*d)/(2*d),h=Math.sqrt(Math.max(0,ra*ra-x*x)),u=unit(sub(b,a)),p=add(a,mul(u,x));return h<EPS?[p]:[add(p,mul(normal(u),h)),add(p,mul(normal(u),-h))];
}
function onSegment(p:Point,s:Segment){return distance(p,closestSegment(p,s).point)<.001;}
export function intersections(a:Segment,b:Segment,infinite=false):Point[]{
 if(a.kind==='cubic'||b.kind==='cubic'){
   const aa=a.kind==='cubic'?flatten(a,.05):[{p:a.a,t:0},{p:a.b,t:1}],bb=b.kind==='cubic'?flatten(b,.05):[{p:b.a,t:0},{p:b.b,t:1}];
   if(a.kind!=='cubic'){return bb.slice(1).flatMap((p,i)=>intersections(a,{kind:'line',a:bb[i].p,b:p.p},infinite));}
   if(b.kind!=='cubic'){return aa.slice(1).flatMap((p,i)=>intersections({kind:'line',a:aa[i].p,b:p.p},b,infinite));}
   return aa.slice(1).flatMap((p,i)=>bb.slice(1).flatMap((q,j)=>lineIntersection(aa[i].p,p.p,bb[j].p,q.p)));
 }
 let points:Point[];
 if(a.kind==='line'&&b.kind==='line')points=lineIntersection(a.a,a.b,b.a,b.b,infinite);
 else if(a.kind==='arc'&&b.kind==='arc')points=circleCircle(a.center,a.radius,b.center,b.radius);
 else{const l=a.kind==='line'?a:b as Extract<Segment,{kind:'line'}>,c=a.kind==='arc'?a:b as Extract<Segment,{kind:'arc'}>;points=lineCircle(l.a,l.b,c.center,c.radius,infinite);}
 return infinite?points:points.filter(p=>onSegment(p,a)&&onSegment(p,b));
}
const uniquePoints=(ps:Point[])=>ps.filter((p,i)=>!ps.slice(0,i).some(q=>distance(p,q)<.001));
export function nearestPart(shape:Shape,p:Point){
 return segments(shape).map((s,index)=>({...closestSegment(p,s),index,segment:s})).sort((a,b)=>distance(a.point,p)-distance(b.point,p))[0];
}
export function shapeFromSegments(source:Shape,segs:Segment[],closed=false):Shape {
 if(segs.length===1&&segs[0].kind==='line'&&source.type==='line')return{...source,a:segs[0].a,b:segs[0].b};
 const cubic=segs.some(s=>s.kind==='cubic');
 const nodes:Node[]=segs.map(s=>({p:s.a,...(s.kind==='arc'?{bulge:Math.tan(s.sweep/4)}:{}),...(s.kind==='cubic'?{out:s.c1}:{} )}));
 segs.forEach((s,i)=>{if(s.kind==='cubic'){if(i+1<nodes.length)nodes[i+1].in=s.c2;else if(closed)nodes[0].in=s.c2;}});
 if(!closed){const last=segs[segs.length-1];nodes.push({p:last.b,...(last.kind==='cubic'?{in:last.c2}:{})});}
 return{id:source.id,type:cubic?'bezier':'polyline',a:nodes[0].p,b:nodes[nodes.length-1].p,color:source.color,layerId:source.layerId,nodes,closed};
}
export function trimShape(shape:Shape,boundaries:Shape[],click:Point,preview=false):Shape[]{
 if(shape.type==='text')throw new Error('Cette opération ne s’applique pas aux textes.');
 if(shape.type==='hatch')throw new Error('Cette opération ne s’applique pas aux hachures. Modifiez leur contour.');
 if(shape.type==='dimension')throw new Error('Les cotations ne se découpent pas.');
 const all=segments(shape),hit=nearestPart(shape,click);if(!hit)throw new Error('Aucun segment à ajuster.');
 const closed=shape.type==='circle'||shape.type==='rect'||('closed'in shape&&shape.closed);
 const limiting=boundaries.filter(s=>s.id!==shape.id&&s.type!=='dimension'&&s.type!=='hatch').flatMap(segments),count=all.length;
 const external=all.flatMap((s,i)=>limiting.flatMap(b=>intersections(s,b)).map(p=>i+closestSegment(p,s).t));
 const internal:number[]=[];
 if(shape.type==='polyline')for(let i=0;i<count;i++)for(let j=i+1;j<count;j++){
   for(const p of intersections(all[i],all[j])){
     // Ordinary shared vertices are not cutting boundaries. Endpoint-to-interior
     // contacts still count, including the contact left after trimming one tail.
     const a=closestSegment(p,all[i]).t,b=closestSegment(p,all[j]).t;
     const endA=a<EPS||a>1-EPS,endB=b<EPS||b>1-EPS;
     if(endA&&endB)continue;
     internal.push(i+a,j+b);
   }
 }
 const raw=[...external,...internal].map(t=>closed&&Math.abs(t-count)<EPS?0:t).sort((a,b)=>a-b);
 const cuts=raw.filter((t,i)=>!i||Math.abs(t-raw[i-1])>1e-6);
 if(!cuts.length)throw new Error('Aucune intersection : choisissez une limite de coupe.');
 if(closed&&cuts.length<2)throw new Error('Deux intersections sont nécessaires pour découper ce contour fermé.');
 const position=hit.index+hit.t;
 const lo=[...cuts].reverse().find(t=>t<=position+EPS)??(closed?cuts[cuts.length-1]-count:0);
 const hi=cuts.find(t=>t>position+EPS)??(closed?cuts[0]+count:count);
 const slice=(from:number,to:number)=>{const ss:Segment[]=[];for(let i=Math.floor(from);i<Math.ceil(to);i++){const a=Math.max(0,from-i),b=Math.min(1,to-i);if(b-a>EPS)ss.push(portion(all[(i%count+count)%count],a,b));}return ss;};
 if(preview)return[shapeFromSegments(shape,slice(lo,hi))];
 const parts=closed?[slice(hi,lo+count)]:[slice(0,lo),slice(hi,count)];
 return parts.filter(ss=>ss.length&&ss.some(s=>distance(s.a,s.b)>EPS||s.kind!=='line')).map((ss,i)=>({...shapeFromSegments(shape,ss),id:i?crypto.randomUUID():shape.id}));
}
export function extendShape(shape:Shape,boundaries:Shape[],click:Point):Shape {
 if(shape.type==='text')throw new Error('Cette opération ne s’applique pas aux textes.');
 if(shape.type==='hatch')throw new Error('Cette opération ne s’applique pas aux hachures. Modifiez leur contour.');
 if(shape.type==='dimension'||shape.type==='circle'||shape.type==='rect'||('closed'in shape&&shape.closed))throw new Error('Prolonger exige une ligne ou un chemin ouvert.');
 const all=segments(shape),first=distance(click,all[0].a)<distance(click,all[all.length-1].b),index=first?0:all.length-1,s=all[index],end=first?s.a:s.b;
 const candidates=boundaries.filter(b=>b.id!==shape.id&&b.type!=='dimension'&&b.type!=='hatch').flatMap(b=>segments(b));
 let replacement:Segment;
 if(s.kind==='arc'){
   const points=uniquePoints(candidates.flatMap(b=>intersections(s,b,true))).filter(p=>candidates.some(b=>onSegment(p,b))&&distance(p,end)>.001);
   const angle=Math.atan2(end.y-s.center.y,end.x-s.center.x),sign=s.sweep*(first?-1:1);
   const possible=points.map(p=>({p,delta:angleDelta(angle,Math.atan2(p.y-s.center.y,p.x-s.center.x),sign)})).filter(v=>Math.abs(s.sweep)+Math.abs(v.delta)<tau-.001).sort((a,b)=>Math.abs(a.delta)-Math.abs(b.delta));
   if(!possible.length)throw new Error('Aucune limite atteignable pour cet arc.');const delta=possible[0].delta;
   replacement=first?{...s,a:possible[0].p,start:s.start+delta,sweep:s.sweep-delta}:{...s,b:possible[0].p,sweep:s.sweep+delta};
 }else{
   const tangent=s.kind==='cubic'?(first?sub(s.a,s.c1):sub(s.b,s.c2)):first?sub(s.a,s.b):sub(s.b,s.a);
   const direction=unit(Math.hypot(tangent.x,tangent.y)>EPS?tangent:first?sub(s.a,s.b):sub(s.b,s.a));
   const ray:Segment={kind:'line',a:end,b:add(end,mul(direction,1e8))};
   const pts=uniquePoints(candidates.flatMap(b=>intersections(ray,b))).filter(p=>dot(sub(p,end),direction)>.001).sort((a,b)=>distance(a,end)-distance(b,end));
   if(!pts.length)throw new Error('Aucune limite dans le sens du prolongement.');
   if(s.kind==='cubic'){const line=first?{kind:'cubic' as const,a:pts[0],b:end,c1:lerp(pts[0],end,1/3),c2:lerp(pts[0],end,2/3)}:{kind:'cubic' as const,a:end,b:pts[0],c1:lerp(end,pts[0],1/3),c2:lerp(end,pts[0],2/3)};return shapeFromSegments(shape,first?[line,...all]:[...all,line]);}
   replacement={...s,...(first?{a:pts[0]}:{b:pts[0]})};
 }
 return shapeFromSegments(shape,all.map((s,i)=>i===index?replacement:s));
}
export function joinCorner(a:Shape,b:Shape,clickA:Point,clickB:Point):[Shape,Shape] {
 if(a.type!=='line'||b.type!=='line')throw new Error('Raccorder : choisissez deux lignes droites.');
 const p=lineIntersection(a.a,a.b,b.a,b.b,true)[0];if(!p)throw new Error('Ces lignes sont parallèles.');
 const end=(s:Shape,click:Point)=>distance(click,s.a)<distance(click,s.b)?{...s,a:p}:{...s,b:p};
 const result:[Shape,Shape]=[end(a,clickA),end(b,clickB)];if(result.some(s=>distance(s.a,s.b)<EPS))throw new Error('Ce raccord supprimerait une ligne entière.');return result;
}

export function offsetShape(shape:Shape,amount:number,side:Point,tolerance=.1):Shape {
 if(shape.type==='text')throw new Error('Cette opération ne s’applique pas aux textes.');
 if(shape.type==='hatch')throw new Error('Cette opération ne s’applique pas aux hachures. Modifiez leur contour.');
 if(amount<=0||!Number.isFinite(amount))throw new Error('Le décalage doit être positif.');
 if(shape.type==='dimension')throw new Error('Décalez une ligne ou un contour.');
 if(shape.type==='circle'){const radius=distance(shape.a,shape.b)+(distance(side,shape.a)<distance(shape.a,shape.b)?-amount:amount);if(radius<=EPS)throw new Error('Le décalage supprimerait le cercle.');return{...shape,b:add(shape.a,{x:radius,y:0})};}
 const source=segments(shape),hit=nearestPart(shape,side),tangent=sub(at(hit.segment,Math.min(1,hit.t+.001)),at(hit.segment,Math.max(0,hit.t-.001))),signed=cross(tangent,sub(side,hit.point))>=0?amount:-amount;
 // Coincident polyline endpoints form a contour even without the explicit C flag.
 const closed=shape.type==='rect'||('closed'in shape&&shape.closed)||(shape.type==='polyline'&&shape.nodes.length>=3&&distance(shape.nodes[0].p,shape.nodes[shape.nodes.length-1].p)<.001);
 const chain=(shape.type==='bezier'?source.flatMap(s=>{const ps=flatten(s,tolerance);return ps.slice(1).map((p,i):Segment=>({kind:'line',a:ps[i].p,b:p.p}));}):source).filter(s=>distance(s.a,s.b)>EPS);
 if(chain.length>5000)throw new Error('Courbe trop détaillée pour ce décalage.');
 const shifted=chain.map((s):Segment=>{
   if(s.kind==='line'){const n=mul(normal(unit(sub(s.b,s.a))),signed);return{kind:'line',a:add(s.a,n),b:add(s.b,n)};}
   if(s.kind==='arc'){const radius=s.radius-Math.sign(s.sweep)*signed;if(radius<=EPS)throw new Error('Le décalage supprimerait un arc.');return{...s,radius,a:add(s.center,mul(sub(s.a,s.center),radius/s.radius)),b:add(s.center,mul(sub(s.b,s.center),radius/s.radius))};}
   throw new Error('Segment non pris en charge.');
 });
 if(!shifted.length)throw new Error('Ce contour est vide.');
 const setEnd=(s:Segment,p:Point,start:boolean):Segment=>{
   if(s.kind!=='arc')return{...s,...(start?{a:p}:{b:p})};const angle=Math.atan2(p.y-s.center.y,p.x-s.center.x);
   return start?{...s,a:p,start:angle,sweep:angleDelta(angle,s.start+s.sweep,s.sweep)}:{...s,b:p,sweep:angleDelta(s.start,angle,s.sweep)};
 };
 const bridges=new Map<number,Segment>();
 for(let i=0;i<shifted.length-(closed?0:1);i++){
   const j=(i+1)%shifted.length,a=shifted[i],b=shifted[j];if(distance(a.b,b.a)<.001)continue;
   const candidate=intersections(a,b,true).sort((p,q)=>distance(p,chain[i].b)-distance(q,chain[i].b))[0];
   if(candidate&&distance(candidate,chain[i].b)<=amount*10+.001){shifted[i]=setEnd(a,candidate,false);shifted[j]=setEnd(b,candidate,true);}
   else bridges.set(i,{kind:'line',a:a.b,b:b.a});
 }
 const result=shifted.flatMap((s,i)=>[s,...(bridges.has(i)?[bridges.get(i)!]:[])]);
 if(shifted.some((s,i)=>s.kind==='line'&&dot(sub(s.b,s.a),sub(chain[i].b,chain[i].a))<=EPS))throw new Error('Le décalage écrase ou inverse un segment : réduisez la distance.');
 // Refuse folded offsets instead of storing a misleading wall contour.
 for(let i=0;i<result.length;i++)for(let j=i+2;j<result.length;j++){if(closed&&i===0&&j===result.length-1)continue;if(intersections(result[i],result[j]).some(p=>distance(p,result[i].a)>.001&&distance(p,result[i].b)>.001))throw new Error('Ce décalage crée un croisement : réduisez la distance ou découpez le contour.');}
 return shapeFromSegments(shape,result,closed);
}

export function mapItem<T extends PaperItem>(shape:T,fn:(p:Point)=>Point,scale=1,flip=false):T {
 const common={...shape,a:fn(shape.a),b:fn(shape.b)};
 if(shape.type==='hatch'){
  const origin=fn(shape.origin),angle=-shape.angle*Math.PI/180,axis=fn({x:shape.origin.x+Math.cos(angle),y:shape.origin.y+Math.sin(angle)}),mappedAngle=-Math.atan2(axis.y-origin.y,axis.x-origin.x)*180/Math.PI;
  const regions=shape.regions.map(r=>({...r,seed:fn(r.seed),boundaryLoops:r.boundaryLoops?.map(loop=>loop.map(fn)),loops:r.loops.map(loop=>loop.map(fn))}));
  return {...common,...hatchBounds(regions),origin,angle:mappedAngle,mirrored:flip?!shape.mirrored:shape.mirrored,scale:shape.scale*scale,regions} as T;
 }

 if(shape.type==='polyline'||shape.type==='bezier'){const nodes=shape.nodes.map(n=>({...n,p:fn(n.p),in:n.in?fn(n.in):undefined,out:n.out?fn(n.out):undefined,bulge:n.bulge!==undefined?n.bulge*(flip?-1:1):undefined}));return{...common,a:nodes[0].p,b:nodes[nodes.length-1].p,nodes} as T;}
 if(shape.type==='dimension'){const angle=shape.linearAngle,axis=angle===undefined?undefined:sub(fn(add(shape.a,{x:Math.cos(angle),y:Math.sin(angle)})),fn(shape.a));return{...common,...(axis?{linearAngle:Math.atan2(axis.y,axis.x)}:{}),offset:shape.offset*scale*(flip&&shape.kind!=='diameter'?-1:1),height:shape.height*scale} as T;}
 if(shape.type==='text'){const angle=(shape.rotation||0)*Math.PI/180,axis=sub(fn(add(shape.a,{x:Math.cos(angle),y:Math.sin(angle)})),fn(shape.a));return{...common,height:shape.height*scale,rotation:Math.atan2(axis.y,axis.x)*180/Math.PI} as T;}
 return common;
}
export const translateItem=<T extends PaperItem>(s:T,dx:number,dy:number)=>mapItem(s,p=>add(p,{x:dx,y:dy}));
export function rotateShape(s:Shape,center:Point,degrees:number):Shape {
 const angle=-degrees*Math.PI/180,cos=Math.cos(angle),sin=Math.sin(angle),source=s.type==='rect'?shapeFromSegments(s,segments(s),true):s;
 return mapItem(source,p=>{const d=sub(p,center);return add(center,{x:d.x*cos-d.y*sin,y:d.x*sin+d.y*cos});});
}
export function mirrorShape(s:Shape,a:Point,b:Point):Shape {
 if(distance(a,b)<EPS)throw new Error('Choisissez deux points distincts pour l’axe du miroir.');
 const u=unit(sub(b,a)),source=s.type==='rect'?shapeFromSegments(s,segments(s),true):s;
 return mapItem(source,p=>{const d=sub(p,a);return add(a,sub(mul(u,2*dot(d,u)),d));},1,true);
}
export function diameterDimension(circle:Extract<Shape,{type:'circle'}>,pointer:Point,base:BaseShape,height:number):Dimension{
 const radius=distance(circle.a,circle.b);if(radius<.001)throw new Error('Le cercle doit avoir un rayon positif.');
 if(!Number.isFinite(height)||height<=0||height>1e5)throw new Error('Hauteur de cote invalide.');
 const direction=distance(circle.a,pointer)<EPS?{x:-1,y:0}:unit(sub(pointer,circle.a));
 return {...base,type:'dimension',kind:'diameter',a:add(circle.a,mul(direction,radius)),b:sub(circle.a,mul(direction,radius)),offset:Math.max(distance(circle.a,pointer)-radius,height*5),height};
}
export function linearDimension(a:Point,b:Point,pointer:Point,base:BaseShape,height:number):Dimension{
 if(distance(a,b)<.001)throw new Error('Choisissez deux points distincts.');
 const minX=Math.min(a.x,b.x),maxX=Math.max(a.x,b.x),minY=Math.min(a.y,b.y),maxY=Math.max(a.y,b.y);
 const outsideX=Math.max(minX-pointer.x,0,pointer.x-maxX),outsideY=Math.max(minY-pointer.y,0,pointer.y-maxY);
 const horizontal=Math.abs(b.y-a.y)<.001||Math.abs(b.x-a.x)>=.001&&(outsideY>outsideX||outsideY===outsideX&&Math.abs(b.x-a.x)>=Math.abs(b.y-a.y));
 const linearAngle=horizontal?0:Math.PI/2,n={x:-Math.sin(linearAngle),y:Math.cos(linearAngle)};
 return {...base,type:'dimension',kind:'linear',a,b,linearAngle,offset:dot(sub(pointer,a),n),height};
}
export function dimensionGeometry(s:Dimension,displayUnit:'m'|'cm'|'mm'='mm'){
 const axis=s.linearAngle===undefined?unit(sub(s.b,s.a)):{x:Math.cos(s.linearAngle),y:Math.sin(s.linearAngle)},length=s.kind==='diameter'?distance(s.a,s.b):Math.abs(dot(sub(s.b,s.a),axis));
 const measuredText=displayUnit==='mm'?formatLength(length):Number((length/({m:1000,cm:10,mm:1}[displayUnit])).toFixed(4)).toLocaleString('fr-FR',{maximumFractionDigits:4,useGrouping:false})+' '+displayUnit;
 if(s.kind==='diameter'){
  const u=unit(sub(s.b,s.a)),n=normal(u),text='Ø'+measuredText,extension=Math.max(Math.abs(s.offset),s.height*5),arrowLength=s.height*.8;
  const arrow=(tip:Point,outward:Point):Point[]=>{const base=add(tip,mul(outward,arrowLength)),side=mul(normal(outward),s.height*.16);return[tip,add(base,side),sub(base,side)];};
  let angle=-Math.atan2(u.y,u.x)*180/Math.PI;if(angle>90)angle-=180;if(angle<-90)angle+=180;
  const up={x:Math.sin(-angle*Math.PI/180),y:-Math.cos(-angle*Math.PI/180)};
  return {lines:[[sub(s.a,mul(u,extension)),add(s.b,mul(u,arrowLength*2))]] as [Point,Point][],arrows:[arrow(s.a,mul(u,-1)),arrow(s.b,u)],label:add(sub(s.a,mul(u,extension/2)),mul(up,s.height*.5)),text,angle};
 }

 const u=axis,n=normal(u),a=add(s.a,mul(n,s.offset)),b=add(s.b,mul(n,s.offset-dot(sub(s.b,s.a),n))),tick=mul(add(u,n),s.height*.4);
 if(s.linearAngle!==undefined){const forward=dot(sub(b,a),u)>=0?u:mul(u,-1),arrow=(tip:Point,direction:Point):Point[]=>{const base=add(tip,mul(direction,s.height*.8)),side=mul(n,s.height*.16);return[tip,add(base,side),sub(base,side)];};return{arrows:[arrow(a,forward),arrow(b,mul(forward,-1))],lines:[[s.a,add(a,mul(n,Math.sign(s.offset)*s.height*.3))],[s.b,add(b,mul(n,Math.sign(s.offset-dot(sub(s.b,s.a),n))*s.height*.3))],[a,b]] as [Point,Point][],label:sub(lerp(a,b,.5),mul(n,s.height*.25)),text:measuredText,angle:-Math.atan2(u.y,u.x)*180/Math.PI};}
 return{arrows:[] as Point[][],lines:[[s.a,add(a,mul(n,Math.sign(s.offset)*s.height*.3))],[s.b,add(b,mul(n,Math.sign(s.offset)*s.height*.3))],[a,b],[sub(a,tick),add(a,tick)],[sub(b,tick),add(b,tick)]] as [Point,Point][],label:sub(lerp(a,b,.5),mul(n,s.height*.25)),text:measuredText,angle:-Math.atan2(u.y,u.x)*180/Math.PI};
}
export function smoothNodes(nodes:Node[],closed=false):Node[]{return nodes.map((n,i)=>{const prev=nodes[i-1]?.p||(closed?nodes[nodes.length-1].p:n.p),next=nodes[i+1]?.p||(closed?nodes[0].p:n.p),t=mul(sub(next,prev),1/6);return{...n,in:sub(n.p,t),out:add(n.p,t),smooth:true};});}
export function syncPath(s:PathShape):PathShape{return{...s,a:s.nodes[0].p,b:s.nodes[s.nodes.length-1].p};}
export function moveNode(s:PathShape,index:number,p:Point,handle:'point'|'in'|'out'='point'):PathShape {
 const nodes=s.nodes.map((n,i)=>{if(i!==index)return n;if(handle==='point'){const d=sub(p,n.p);return{...n,p,in:n.in?add(n.in,d):undefined,out:n.out?add(n.out,d):undefined};}
   const other=handle==='in'?'out':'in',old=n[other]||n.p,d=sub(p,n.p);return{...n,[handle]:p,...(n.smooth?{[other]:sub(n.p,mul(unit(d),distance(old,n.p)))}:{})};
 });return syncPath({...s,nodes});
}
export function insertNode(s:PathShape,index:number):PathShape {
 const all=segments(s);if(index>=all.length)throw new Error('Choisissez un segment qui possède un point suivant.');const seg=all[index],left=portion(seg,0,.5),right=portion(seg,.5,1);return shapeFromSegments(s,[...all.slice(0,index),left,right,...all.slice(index+1)],s.closed) as PathShape;
}
export function deleteNode(s:PathShape,index:number):PathShape {
 if(s.nodes.length<=(s.closed?3:2))throw new Error('Ce chemin doit conserver suffisamment de sommets.');
 const nodes=s.nodes.filter((_,i)=>i!==index).map(n=>({...n}));if(s.type==='polyline'){const before=(index-1+nodes.length)%nodes.length;nodes[before].bulge=0;}return syncPath({...s,nodes});
}
export function svgPath(shape:Shape):string {
 const ss=segments(shape);if(!ss.length)return'';return `M ${ss[0].a.x} ${ss[0].a.y} `+ss.map(s=>s.kind==='line'?`L ${s.b.x} ${s.b.y}`:s.kind==='cubic'?`C ${s.c1.x} ${s.c1.y} ${s.c2.x} ${s.c2.y} ${s.b.x} ${s.b.y}`:`A ${s.radius} ${s.radius} 0 ${Math.abs(s.sweep)>Math.PI?1:0} ${s.sweep>0?1:0} ${s.b.x} ${s.b.y}`).join(' ')+((shape.type==='rect'||shape.type==='circle'||('closed'in shape&&shape.closed))?' Z':'');
}
export function arcCubics(s:Extract<Segment,{kind:'arc'}>):Extract<Segment,{kind:'cubic'}>[] {
 const count=Math.ceil(Math.abs(s.sweep)/(Math.PI/2)),out:Extract<Segment,{kind:'cubic'}>[]=[];
 for(let i=0;i<count;i++){const a=at(s,i/count),b=at(s,(i+1)/count),start=s.start+s.sweep*i/count,end=s.start+s.sweep*(i+1)/count,k=4/3*Math.tan((end-start)/4)*s.radius;out.push({kind:'cubic',a,b,c1:add(a,{x:-Math.sin(start)*k,y:Math.cos(start)*k}),c2:sub(b,{x:-Math.sin(end)*k,y:Math.cos(end)*k})});}return out;
}

export type Snap = {point:Point;kind:'Extrémité'|'Milieu'|'Centre'|'Intersection'};
export function snapPoint(p:Point,shapes:Shape[],tolerance:number,kinds:readonly Snap['kind'][]=['Extrémité','Milieu','Centre','Intersection']):Snap|null {
 const candidates:Snap[]=[],nearby:Segment[]=[];
 for(const shape of shapes){if(shape.type==='dimension'||shape.type==='hatch')continue;if(shape.type==='circle')candidates.push({point:shape.a,kind:'Centre'});
   for(const s of segments(shape)){candidates.push({point:s.a,kind:'Extrémité'},{point:s.b,kind:'Extrémité'},{point:at(s,.5),kind:'Milieu'});if(s.kind==='arc')candidates.push({point:s.center,kind:'Centre'});if(distance(closestSegment(p,s).point,p)<=tolerance*2)nearby.push(s);}
 }
 for(let i=0;i<nearby.length;i++)for(let j=i+1;j<nearby.length;j++)for(const point of intersections(nearby[i],nearby[j]))candidates.push({point,kind:'Intersection'});
 return candidates.filter(c=>kinds.includes(c.kind)&&distance(c.point,p)<=tolerance).sort((a,b)=>distance(a.point,p)-distance(b.point,p)||(a.kind==='Intersection'?-1:1))[0]||null;
}
export function constrainedEnd(start:Point,p:Point,length:string,angle:string,ortho:boolean,polar:number,objectSnap=false):Point {
 if(objectSnap&&!length.trim()&&!angle.trim())return p;
 if(ortho&&!angle.trim()&&!length.trim())return Math.abs(p.x-start.x)>=Math.abs(p.y-start.y)?{x:p.x,y:start.y}:{x:start.x,y:p.y};
 let a=Math.atan2(-(p.y-start.y),p.x-start.x),r=distance(start,p);
 if(angle.trim())a=parseAngle(angle)*Math.PI/180;
 else if(ortho)a=Math.round(a/(Math.PI/2))*Math.PI/2;
 else if(polar)a=Math.round(a/(polar*Math.PI/180))*polar*Math.PI/180;
 if(length.trim()){r=parseLength(length);if(r<=0)throw new Error('La longueur doit être positive.');}
 return add(start,{x:r*Math.cos(a),y:-r*Math.sin(a)});
}
