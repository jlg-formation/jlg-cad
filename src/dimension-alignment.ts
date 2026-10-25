import type {Dimension,PaperItem,Point} from './model';
import {add,sub,mul,dot,cross,distance} from './geometry';

/** Mathematical dimension line, without text offsets or decorative extensions. */
export function dimensionLine(item:PaperItem){
 if(item.type!=='dimension'||item.points||item.paperHidden||item.kind&&item.kind!=='linear')return null;
 const angle=item.linearAngle??Math.atan2(item.b.y-item.a.y,item.b.x-item.a.x);
 const axis={x:Math.cos(angle),y:Math.sin(angle)},normal={x:-axis.y,y:axis.x};
 const a=add(item.a,mul(normal,item.offset)),b=add(a,mul(axis,dot(sub(item.b,item.a),axis)));
 return distance(a,b)>1e-8?{a,b,axis,normal}:null;
}

export type AlignmentState={referenceId?:string;pendingId?:string;since?:number;snapped?:boolean};
export type AlignmentGuide={a:Point;b:Point;point:Point;axis:Point;active:boolean};
export function dimensionAlignment(state:AlignmentState,p:Point,target:Dimension,items:PaperItem[],scale:number,now:number,correction:Point={x:0,y:0}){
 const targetLine=dimensionLine(target);
 const compatible=items.flatMap(item=>{
  const line=dimensionLine(item);
  return item.id!==target.id&&line&&targetLine&&Math.abs(cross(line.axis,targetLine.axis))<1e-8?[{id:item.id,...line}]:[];
 });
 const nearby=compatible.map(line=>{
  const length=distance(line.a,line.b),u=mul(sub(line.b,line.a),1/length);
  const nearest=add(line.a,mul(u,Math.max(0,Math.min(length,dot(sub(p,line.a),u)))));
  return {line,distance:distance(p,nearest)*scale};
 }).filter(c=>c.distance<=8).sort((a,b)=>a.distance-b.distance||a.line.id.localeCompare(b.line.id))[0]?.line;
 const next={...state};
 if(nearby&&nearby.id!==state.referenceId){
  if(state.pendingId!==nearby.id){next.pendingId=nearby.id;next.since=now;}
  if(now-(next.since??now)>=300){next.referenceId=nearby.id;next.pendingId=undefined;next.since=undefined;next.snapped=false;}
 }else{next.pendingId=undefined;next.since=undefined;}
 const source=compatible.find(line=>line.id===next.referenceId);
 if(!source){next.referenceId=undefined;next.snapped=false;return {state:next,guide:null,point:p};}
 const placement=sub(p,correction),point=add(source.a,mul(source.axis,dot(sub(placement,source.a),source.axis)));
 next.snapped=distance(placement,point)*scale<=(next.snapped?12:8);
 const guide:AlignmentGuide={a:source.a,b:source.b,axis:source.axis,point,active:!!next.snapped};
 return {state:next,guide,point:next.snapped?add(point,correction):p};
}
