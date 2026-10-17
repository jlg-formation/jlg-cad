import type {PaperItem,Point,Shape} from './model';
import {add,sub,distance,at,segments,translateItem,threePointArc,moveNode,syncPath,dimensionGeometry,diameterDimension} from './geometry';

export type Grip={key:string;point:Point;kind:'vertex'|'segment'|'center'|'radius'|'control';index:number;angle?:number};
// Interior vertices use the incoming segment; the first open vertex uses the outgoing one.
export function gripLengthOrigin(s:PaperItem,key:string):Point|undefined{
 if(s.type==='line')return key==='vertex-0'?s.b:key==='vertex-1'?s.a:undefined;
 if(s.type!=='polyline')return undefined;
 if(key.startsWith('segment-'))return objectGrips(s).find(g=>g.key===key)?.point;
 if(!key.startsWith('vertex-'))return undefined;
 const index=Number(key.slice(7));
 if(!s.nodes[index])return undefined;
 return s.nodes[index===0?(s.closed?s.nodes.length-1:1):index-1]?.p;
}
// Convert chord length to path length for a curved polyline segment.
export function gripLengthFactor(s:PaperItem,key:string):number{
 if(s.type!=='polyline'||!key.startsWith('vertex-'))return 1;
 const index=Number(key.slice(7)),segment=segments(s)[index===0?(s.closed?s.nodes.length-1:0):index-1];
 if(segment?.kind!=='arc')return 1;
 return segment.radius*Math.abs(segment.sweep)/distance(segment.a,segment.b);
}
export function objectGrips(s:PaperItem):Grip[]{
 if(s.type==='polyline'||s.type==='bezier'){
  const vertices=s.nodes.map((n,index):Grip=>({key:`vertex-${index}`,point:n.p,kind:'vertex',index}));
  const mids=s.type==='polyline'?segments(s).map((seg,index):Grip=>({key:`segment-${index}`,point:at(seg,.5),kind:'segment',index,angle:(seg.kind==='arc'?seg.start+seg.sweep/2+Math.PI/2:Math.atan2(seg.b.y-seg.a.y,seg.b.x-seg.a.x))*180/Math.PI})):[];
  return [...mids,...vertices];
 }
 if(s.type==='arc'){const arc=segments(s)[0];return [{key:'vertex-0',kind:'vertex',index:0,point:s.a},{key:'vertex-1',kind:'vertex',index:1,point:s.b},{key:'control-0',kind:'control',index:0,point:at(arc,.5)},{key:'center-0',kind:'center',index:0,point:arc.kind==='arc'?arc.center:s.a}];}
 if(s.type==='hatch')return [{key:'center-0',kind:'center',index:0,point:{x:(s.a.x+s.b.x)/2,y:(s.a.y+s.b.y)/2}}];
 if(s.type==='line')return [{key:'segment-0',kind:'segment',index:0,point:{x:(s.a.x+s.b.x)/2,y:(s.a.y+s.b.y)/2}},{key:'vertex-0',kind:'vertex',index:0,point:s.a},{key:'vertex-1',kind:'vertex',index:1,point:s.b}];
 if(s.type==='rect')return [s.a,{x:s.b.x,y:s.a.y},s.b,{x:s.a.x,y:s.b.y}].map((point,index)=>({key:`vertex-${index}`,kind:'vertex',index,point}));
 if(s.type==='circle'){const r=distance(s.a,s.b);return [{key:'center-0',kind:'center',index:0,point:s.a},...[{x:r,y:0},{x:0,y:r},{x:-r,y:0},{x:0,y:-r}].map((v,index):Grip=>({key:`radius-${index}`,kind:'radius',index,point:add(s.a,v)}))];}
 if(s.type==='text')return [{key:'center-0',kind:'center',index:0,point:s.a}];
 if(s.type==='dimension'&&s.circleId)return [{key:'placement-0',kind:'control',index:0,point:dimensionGeometry(s).label}];
 if(s.type==='dimension')return [s.a,s.b].map((point,index)=>({key:`vertex-${index}`,kind:'vertex',index,point}));
 return [];
}
export function moveGrip(s:PaperItem,key:string,p:Point):PaperItem{
 const grip=objectGrips(s).find(g=>g.key===key);if(!grip)throw new Error('Poignée inconnue.');
 const delta=sub(p,grip.point);
 if(s.type==='dimension'&&s.circleId){const center={x:(s.a.x+s.b.x)/2,y:(s.a.y+s.b.y)/2};return {...diameterDimension({id:s.circleId,type:'circle',a:center,b:s.a,color:s.color},p,s,s.height),circleId:s.circleId};}
 if(grip.kind==='center'||s.type==='line'&&grip.kind==='segment')return translateItem(s,delta.x,delta.y);
 if(s.type==='arc'){const middle=at(segments(s)[0],.5);return threePointArc(grip.kind==='vertex'&&grip.index===0?p:s.a,grip.kind==='control'?p:middle,grip.kind==='vertex'&&grip.index===1?p:s.b,s);}
 if(s.type==='polyline'||s.type==='bezier'){
  if(grip.kind==='vertex')return moveNode(s,grip.index,p);
  const next=(grip.index+1)%s.nodes.length;
  return syncPath({...s,nodes:s.nodes.map((n,i)=>i===grip.index||i===next?{...n,p:add(n.p,delta),in:n.in?add(n.in,delta):undefined,out:n.out?add(n.out,delta):undefined}:n)});
 }
 if(s.type==='line'||s.type==='dimension')return {...s,[grip.index===0?'a':'b']:p};
 if(s.type==='rect'){
  if(grip.index===0)return {...s,a:p};if(grip.index===2)return {...s,b:p};
  return grip.index===1?{...s,a:{x:s.a.x,y:p.y},b:{x:p.x,y:s.b.y}}:{...s,a:{x:p.x,y:s.a.y},b:{x:s.b.x,y:p.y}};
 }
 if(s.type==='circle'){if(distance(s.a,p)<.001)throw new Error('Le rayon doit être positif.');return {...s,b:p};}
 return s;
}
