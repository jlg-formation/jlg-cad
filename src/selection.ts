import {hatchContains} from './hatch';
import {type PaperItem,type Point,textCorners} from './model';
import {at,closestSegment,distance,intersections,segments,type Segment} from './geometry';

export type SelectionPreferences={lasso:boolean;blue:boolean;green:boolean};
export const selectionStorageKey='jlg-cad-selection';
export function readSelectionPreferences(raw:string|null):SelectionPreferences {
 const defaults={lasso:true,blue:true,green:true};
 try{const value=JSON.parse(raw||'null');for(const key of ['lasso','blue','green'] as const)if(typeof value?.[key]==='boolean'&&(key!=='lasso'||value?.version===2))defaults[key]=value[key];}catch{}
 return defaults;
}
// A moving quick click still opens a two-click window. Only a held gesture drags.
export const selectionHoldMs=200;
export type SelectionDrag={points:Point[];startedAt:number;phase:'pending'|'lasso'|'rectangle'|'dragRectangle';crossing:boolean;remove:boolean;previous:string[]};
export function startSelection(p:Point,previous:string[],remove:boolean,now=performance.now()):SelectionDrag {
 return {points:[p],startedAt:now,phase:'pending',crossing:false,remove,previous:[...previous]};
}
export function moveSelection(selection:SelectionDrag,p:Point,lassoEnabled:boolean,now=performance.now()):void {
 const start=selection.points[0];
 if(selection.phase==='pending'){
  if(now-selection.startedAt<selectionHoldMs||distance(start,p)<4){
   selection.points=[start,p];selection.crossing=p.x<start.x;return;
  }
  selection.phase=lassoEnabled?'lasso':'dragRectangle';
  selection.crossing=p.x<start.x;
 }
 if(selection.phase==='lasso'){
  if(distance(selection.points.at(-1)!,p)>=3&&selection.points.length<1500)selection.points.push(p);
 }else{selection.points=[start,p];selection.crossing=p.x<start.x;}
}
export function combineSelection(previous:string[],ids:string[],remove:boolean):string[]{
 return remove?previous.filter(id=>!ids.includes(id)):[...new Set([...previous,...ids])];
}
export function releaseSelection(selection:SelectionDrag,p:Point,lassoEnabled:boolean,now=performance.now()):boolean {
 if(selection.phase==='rectangle')return false;
 moveSelection(selection,p,lassoEnabled,now);
 if(selection.phase==='pending'){selection.phase='rectangle';return false;}
 return true;
}
const edges=(polygon:Point[]):Segment[]=>polygon.map((a,i)=>({kind:'line',a,b:polygon[(i+1)%polygon.length]}));
export function signedArea(polygon:Point[]):number {
 return polygon.reduce((sum,a,i)=>{const b=polygon[(i+1)%polygon.length];return sum+a.x*b.y-b.x*a.y;},0)/2;
}
export function rectangleSelection(a:Point,b:Point):Point[]{return[a,{x:b.x,y:a.y},b,{x:a.x,y:b.y}];}
export function pointInSelection(p:Point,polygon:Point[]):boolean {
 let inside=false;
 for(const edge of edges(polygon)){
  if(distance(p,closestSegment(p,edge).point)<1e-7)return true;
  const {a,b}=edge;if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)inside=!inside;
 }
 return inside;
}
function touches(a:Segment,b:Segment):boolean {
 return intersections(a,b).length>0||distance(b.a,closestSegment(b.a,a).point)<1e-7||distance(b.b,closestSegment(b.b,a).point)<1e-7;
}
export function validLasso(polygon:Point[]):boolean {
 if(polygon.length<3||Math.abs(signedArea(polygon))<4)return false;
 const lines=edges(polygon);
 for(let i=0;i<lines.length;i++)for(let j=i+1;j<lines.length;j++){
  if(j===i+1||i===0&&j===lines.length-1)continue;
  if(touches(lines[i],lines[j]))return false;
 }
 return true;
}
export function selectionSegments(item:PaperItem):Segment[]{
 if(item.type==='viewport')return segments({...item,type:'rect'});
 if(item.type==='text')return edges(textCorners(item));
 return segments(item);
}
export function itemInSelection(item:PaperItem,polygon:Point[],crossing:boolean,measuredGeometry?:Segment[]):boolean {
 if(polygon.length<3)return false;
 const border=edges(polygon),geometry=measuredGeometry||selectionSegments(item);
 if(crossing&&item.type==='hatch'&&polygon.some(p=>hatchContains(item,p)))return true;
 if(crossing)return geometry.some(s=>pointInSelection(s.a,polygon)||pointInSelection(s.b,polygon)||border.some(e=>touches(s,e)));
 return geometry.every(s=>{
  // Split at every boundary intersection: endpoints alone are insufficient in a concave lasso.
  const ts=[0,1,...border.flatMap(e=>intersections(s,e).map(p=>closestSegment(p,s).t))].sort((a,b)=>a-b);
  return ts.every(t=>pointInSelection(at(s,t),polygon))&&ts.slice(1).every((t,i)=>pointInSelection(at(s,(ts[i]+t)/2),polygon));
 });
}
