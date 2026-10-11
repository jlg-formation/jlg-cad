import {type PaperItem,type Point} from './model';
import {at,closestSegment,distance,intersections,segments,type Segment} from './geometry';

export type SelectionPreferences={lasso:boolean;blue:boolean;green:boolean};
export const selectionStorageKey='jlg-cad-selection';
export function readSelectionPreferences(raw:string|null):SelectionPreferences {
 const defaults={lasso:false,blue:true,green:true};
 try{const value=JSON.parse(raw||'null');for(const key of ['lasso','blue','green'] as const)if(typeof value?.[key]==='boolean')defaults[key]=value[key];}catch{}
 return defaults;
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
 if(item.type==='text'){
  const lines=item.text.split('\n'),width=Math.max(...lines.map(l=>l.length),1)*item.height*.65;
  return segments({...item,type:'rect',b:{x:item.a.x+width,y:item.a.y+lines.length*item.height*1.2}});
 }
 return segments(item);
}
export function itemInSelection(item:PaperItem,polygon:Point[],crossing:boolean,measuredGeometry?:Segment[]):boolean {
 if(polygon.length<3)return false;
 const border=edges(polygon),geometry=measuredGeometry||selectionSegments(item);
 if(crossing)return geometry.some(s=>pointInSelection(s.a,polygon)||pointInSelection(s.b,polygon)||border.some(e=>touches(s,e)));
 return geometry.every(s=>{
  // Split at every boundary intersection: endpoints alone are insufficient in a concave lasso.
  const ts=[0,1,...border.flatMap(e=>intersections(s,e).map(p=>closestSegment(p,s).t))].sort((a,b)=>a-b);
  return ts.every(t=>pointInSelection(at(s,t),polygon))&&ts.slice(1).every((t,i)=>pointInSelection(at(s,(ts[i]+t)/2),polygon));
 });
}
