import type {Point} from './model';
import {distance} from './geometry';

export function isTrimDrag(start:Point,current:Point){return distance(start,current)>=4;}

/** Clip individual fence edges without connecting separate visits to the viewport. */
export function clipTrimEdge(a:Point,b:Point,box:{x:number;y:number;width:number;height:number}):Point[]{
 let lo=0,hi=1;const dx=b.x-a.x,dy=b.y-a.y;
 for(const [p,q] of [[-dx,a.x-box.x],[dx,box.x+box.width-a.x],[-dy,a.y-box.y],[dy,box.y+box.height-a.y]]){
  if(Math.abs(p)<1e-12){if(q<0)return[];continue;}
  const t=q/p;if(p<0)lo=Math.max(lo,t);else hi=Math.min(hi,t);if(lo>hi)return[];
 }
 return [{x:a.x+lo*dx,y:a.y+lo*dy},{x:a.x+hi*dx,y:a.y+hi*dy}];
}
