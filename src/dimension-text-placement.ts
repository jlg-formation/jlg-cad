import type {Point} from './model';

// Alphabetic baselines leave room below the baseline for descending glyphs.
// Keep the same conservative metrics for SVG, Helvetica PDF and DXF text.
const descent=.23,ascent=.8,gap=.27;
export function dimensionTextFrame(axis:Point){
 let radians=Math.atan2(axis.y,axis.x);
 if(Math.abs(Math.abs(radians)-Math.PI/2)<1e-12)radians=-Math.PI/2;
 else if(radians>Math.PI/2)radians-=Math.PI;
 else if(radians<-Math.PI/2)radians+=Math.PI;
 return {angle:-radians*180/Math.PI,up:{x:Math.sin(radians),y:-Math.cos(radians)}};
}
export function dimensionTextAbove(anchor:Point,height:number,axis:Point){
 const {up,angle}=dimensionTextFrame(axis),offset=height*(gap+descent);
 return {label:{x:anchor.x+up.x*offset,y:anchor.y+up.y*offset},angle};
}
export function dimensionTextOutsideArc(center:Point,radius:number,middle:number,text:string,height:number):Point{
 const u={x:Math.cos(middle),y:Math.sin(middle)},halfWidth=text.length*height*.65/2;
 // Put the whole horizontal text box beyond the arc's tangent plane,
 // including at the sides and below the arc, rather than just its baseline.
 const offset=height*gap+Math.abs(u.x)*halfWidth+height*(u.y>=0?ascent*u.y:-descent*u.y);
 return {x:center.x+u.x*(radius+offset),y:center.y+u.y*(radius+offset)};
}
