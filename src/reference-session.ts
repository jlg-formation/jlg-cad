import type {Point} from './model';
import {makeReference,type ReferenceSource,type ReferenceShape} from './references';
export type AttachOptions={pages:number[];point:Point;factor:number;angle:number;pointOnScreen:boolean;scaleOnScreen:boolean;rotationOnScreen:boolean};
export type AttachSession={source:ReferenceSource;options:AttachOptions;index:number;phase:'point'|'scale'|'rotation';point:Point;factor:number;angle:number;id:string};
export function beginAttach(source:ReferenceSource,options:AttachOptions,id:string):AttachSession{return{source,options,index:0,phase:options.pointOnScreen?'point':options.scaleOnScreen?'scale':'rotation',point:options.point,factor:options.factor,angle:options.angle,id};}
export function attachPreview(s:AttachSession,p:Point,layer:string):ReferenceShape{
 const page=s.source.pages.find(v=>v.page===s.options.pages[s.index])!;
 const point=s.phase==='point'?p:s.point;
 const factor=s.phase==='scale'?Math.max(.000001,Math.hypot(p.x-point.x,p.y-point.y)/Math.hypot(page.width,page.height)):s.factor;
 const angle=s.phase==='rotation'?-Math.atan2(p.y-point.y,p.x-point.x)*180/Math.PI:s.angle;
 return makeReference(s.source,page,point,factor,angle,layer,s.id);
}
