import type {BaseShape,Dimension,Point,Shape} from './model';
import {add,sub,mul,distance,dot,cross,segments,nearestPart,linearDimension} from './geometry';

export const specializedDimensionTools=['alignedDimension','angularDimension','arcDimension','radius','ordinate','jogged'] as const;
export type SpecializedDimensionTool=typeof specializedDimensionTools[number];
export const isSpecializedDimension=(tool:string):tool is SpecializedDimensionTool=>specializedDimensionTools.includes(tool as SpecializedDimensionTool);
const tau=Math.PI*2;
const positive=(n:number)=>(n%tau+tau)%tau;
const direction=(a:Point,b:Point)=>mul(sub(b,a),1/(distance(a,b)||1));
const normal=(p:Point)=>({x:-p.y,y:p.x});
export type DimensionOptions={direction:string;axis:'auto'|'x'|'y';datum:Point};

export function circularDefinition(shape:Shape,p:Point){
 if(shape.type==='circle'){const start={x:shape.a.x+distance(shape.a,shape.b),y:shape.a.y};return {points:[shape.a,start,start],sweep:tau};}
 const part=nearestPart(shape,p).segment;
 if(part.kind!=='arc')throw new Error('Choisissez un cercle ou un arc circulaire.');
 return {points:[part.center,part.a,part.b],sweep:part.sweep};
}

export function makeDimension(tool:SpecializedDimensionTool|'diameter',points:Point[],pointer:Point,base:BaseShape,height:number,options:DimensionOptions,sweep?:number):Dimension {
 if(!Number.isFinite(height)||height<=0||height>1e5)throw new Error('Hauteur de cote invalide.');
 if(tool==='alignedDimension'){
  if(distance(points[0],points[1])<.001)throw new Error('Choisissez deux points distincts.');
  return {...base,type:'dimension',kind:'linear',a:points[0],b:points[1],height,offset:cross(sub(points[1],points[0]),sub(pointer,points[0]))/distance(points[0],points[1])};
 }
 if(tool==='ordinate'){
  const axis=options.axis==='auto'?(Math.abs(pointer.y-points[0].y)>Math.abs(pointer.x-points[0].x)?'x':'y'):options.axis;
  return {...base,type:'dimension',kind:'ordinate',a:points[0],b:pointer,points:[options.datum,points[0],pointer],axis,basis:{x:1,y:0},height,offset:0};
 }
 if(points.length<3||distance(points[0],points[1])<.001)throw new Error('Définissez une géométrie valide avant de placer la cote.');
 const kind=tool==='angularDimension'?'angular':tool==='arcDimension'?'arcLength':tool;
 if(kind==='angular'&&(distance(points[0],points[2])<.001||Math.abs(cross(sub(points[1],points[0]),sub(points[2],points[0])))<1e-8&&dot(sub(points[1],points[0]),sub(points[2],points[0]))>0))throw new Error('Les deux directions doivent former un angle.');
 if(kind==='arcLength'&&(!sweep||Math.abs(sweep)>=tau-1e-8))throw new Error('Choisissez un arc ouvert, pas un cercle complet.');
 return {...base,type:'dimension',kind,a:points[0],b:points[1],points:[...points.slice(0,3),pointer,...points.slice(3)],sweep,height,offset:0};
}

export function directedLinearDimension(a:Point,b:Point,p:Point,base:BaseShape,height:number,degrees?:number){
 const d=linearDimension(a,b,p,base,height);
 if(degrees===undefined)return d;
 const angle=-degrees*Math.PI/180,n={x:-Math.sin(angle),y:Math.cos(angle)};
 return {...d,linearAngle:angle,offset:dot(sub(p,a),n)};
}

/** Shared vector geometry used by the canvas, hit testing, PDF and DXF. */
export function specializedDimensionGeometry(s:Dimension,displayUnit:'m'|'cm'|'mm'){
 const ps=s.points!,h=s.height,lines:[Point,Point][]=[],arrows:Point[][]=[];
 const lengthText=(value:number)=>Number((value/({m:1000,cm:10,mm:1}[displayUnit])).toFixed(4)).toLocaleString('fr-FR',{maximumFractionDigits:4,useGrouping:false})+' '+displayUnit;
 const arrow=(tip:Point,toward:Point)=>{const u=direction(tip,toward),base=add(tip,mul(u,h*.8)),v=mul(normal(u),h*.16);arrows.push([tip,add(base,v),sub(base,v)]);};
 let label:Point,text:string,angle=0;
 if(s.kind==='ordinate'){
  const [origin,feature,placement]=ps,axis=s.axis||'x',basis=s.basis||{x:1,y:0},leader=axis==='x'?normal(basis):basis,elbow=add(feature,mul(leader,dot(sub(placement,feature),leader)));
  lines.push([feature,elbow],[elbow,placement]);label=add(placement,{x:h*.2,y:-h*.3});text=lengthText(dot(sub(feature,origin),axis==='x'?basis:mul(normal(basis),-(s.basisHandedness||1))));
 }else{
  const [center,start,end,placement,jog]=ps,r=distance(center,start),u=direction(center,placement);
  if(s.kind==='radius'||s.kind==='jogged'||s.kind==='diameter'){
   const tip=add(center,mul(u,r));text=(s.kind==='diameter'?'Ø':'R')+lengthText(r*(s.kind==='diameter'?2:1));
   if(s.kind==='jogged'){
    const fake=jog||center,knee=ps[5]||mul(add(fake,placement),.5),v=mul(normal(u),h*.6);
    lines.push([fake,sub(knee,v)],[sub(knee,v),add(knee,v)],[add(knee,v),placement],[placement,tip]);arrow(tip,placement);
   }else if(s.kind==='diameter'){
    const opposite=sub(center,mul(u,r));lines.push([opposite,tip],[tip,placement]);arrow(tip,center);arrow(opposite,center);
   }else{lines.push([center,tip],[tip,placement]);arrow(tip,center);}
   label=add(placement,{x:0,y:-h*.35});
  }else{
   const first=Math.atan2(start.y-center.y,start.x-center.x),last=Math.atan2(end.y-center.y,end.x-center.x);
   let sweep=s.sweep||positive(last-first),begin=first;
   if(s.kind==='angular'){
    const cursorAngle=Math.atan2(placement.y-center.y,placement.x-center.x),positiveSweep=positive(last-first);
    sweep=positive(cursorAngle-first)<=positiveSweep?positiveSweep:positiveSweep-tau;
    if(s.angleSources||s.angularQuadrants){
     const bounds=[positive(first),positive(last),positive(first+Math.PI),positive(last+Math.PI)].sort((a,b)=>a-b),cursor=positive(cursorAngle);
     let best=tau;
     for(let i=0;i<4;i++){const a=bounds[i],b=i===3?bounds[0]+tau:bounds[i+1],c=cursor<a-1e-9?cursor+tau:cursor;if(c>=a-1e-9&&c<=b+1e-9&&b-a<best){begin=a;sweep=b-a;best=sweep;}}
    }
   }
   let radius=distance(center,placement);if(radius<.001)radius=h*2;
   const count=Math.max(8,Math.ceil(Math.abs(sweep)*32)),arc=Array.from({length:count+1},(_,i)=>add(center,{x:Math.cos(begin+sweep*i/count)*radius,y:Math.sin(begin+sweep*i/count)*radius}));
   for(let i=1;i<arc.length;i++)lines.push([arc[i-1],arc[i]]);
   const extension=(source:Point,tip:Point)=>lines.push([source,add(tip,mul(direction(center,tip),h*.3))]);
   const angularSource=(tip:Point)=>Math.abs(cross(direction(center,start),direction(center,tip)))<Math.abs(cross(direction(center,end),direction(center,tip)))?start:end;
   extension(s.kind==='angular'?angularSource(arc[0]):start,arc[0]);extension(s.kind==='angular'?angularSource(arc[count]):end,arc[count]);
   const outside=radius*Math.abs(sweep)<h*5,sign=outside?-1:1;
   const tangent=(a:number)=>({x:-Math.sin(a)*Math.sign(sweep)*sign,y:Math.cos(a)*Math.sign(sweep)*sign});
   arrow(arc[0],add(arc[0],tangent(begin)));arrow(arc[count],sub(arc[count],tangent(begin+sweep)));
   label=add(center,{x:Math.cos(begin+sweep/2)*(radius+h*.7),y:Math.sin(begin+sweep/2)*(radius+h*.7)});
   text=s.kind==='angular'?Number((Math.abs(sweep)*180/Math.PI).toFixed(2)).toLocaleString('fr-FR',{maximumFractionDigits:2})+'°':'⌒ '+lengthText(r*Math.abs(sweep));
  }
 }
 return {lines,arrows,label,text,angle};
}

export function lineAngleDefinition(first:Shape,second:Shape,p:Point,q:Point):Point[]{
 const a=nearestPart(first,p).segment,b=nearestPart(second,q).segment;
 if(a.kind!=='line'||b.kind!=='line')throw new Error('Choisissez deux segments droits.');
 const u=sub(a.b,a.a),v=sub(b.b,b.a),den=cross(u,v);
 if(Math.abs(den)<1e-8)throw new Error('Les lignes parallèles ne définissent pas un angle à coter.');
 const center=add(a.a,mul(u,cross(sub(b.a,a.a),v)/den));
 const firstPoint=nearestPart(first,p).point,secondPoint=nearestPart(second,q).point;
 return [center,distance(firstPoint,center)>.001?firstPoint:distance(a.a,center)>distance(a.b,center)?a.a:a.b,distance(secondPoint,center)>.001?secondPoint:distance(b.a,center)>distance(b.b,center)?b.a:b.b];
}
