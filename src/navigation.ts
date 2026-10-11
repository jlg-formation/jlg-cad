import type {Point} from './model';
export type NavigationView={x:number;y:number;scale:number};
export type Box={x:number;y:number;width:number;height:number};
export const minZoom=1e-8,maxZoom=30;
export function zoomAt(view:NavigationView,point:Point,factor:number):NavigationView{
 if(!Number.isFinite(factor)||factor<=0)throw new Error('Le facteur de zoom doit être un nombre positif.');
 const scale=Math.max(minZoom,Math.min(maxZoom,view.scale*factor));
 return {scale,x:point.x-(point.x-view.x)*scale/view.scale,y:point.y-(point.y-view.y)*scale/view.scale};
}
export function fitBoxes(boxes:Box[],width:number,height:number,padding=24):NavigationView{
 if(!boxes.length)throw new Error('Aucun objet à cadrer.');
 const left=Math.min(...boxes.map(b=>b.x)),top=Math.min(...boxes.map(b=>b.y));
 const right=Math.max(...boxes.map(b=>b.x+b.width)),bottom=Math.max(...boxes.map(b=>b.y+b.height));
 const scale=Math.max(minZoom,Math.min(maxZoom,Math.max(1,width-2*padding)/Math.max(.001,right-left),Math.max(1,height-2*padding)/Math.max(.001,bottom-top)));
 return {scale,x:width/2-(left+right)/2*scale,y:height/2-(top+bottom)/2*scale};
}
export function rememberView(history:NavigationView[],view:NavigationView){const last=history.at(-1);return last&&last.x===view.x&&last.y===view.y&&last.scale===view.scale?history:[...history.slice(-49),{...view}];}
export function windowBox(a:Point,b:Point):Box{return{x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),width:Math.abs(b.x-a.x),height:Math.abs(b.y-a.y)};}
