import {type BaseShape,type Node,type PathShape,type PaperItem,bounds} from './model';
import {smoothNodes} from './geometry';

// Only confirmed nodes are supplied here; the pointer preview is not a vertex.
export function completedPath(type:'polyline'|'bezier',base:BaseShape,nodes:Node[],closed=false):PathShape|null {
 if(nodes.length<2)return null;
 if(closed&&nodes.length<3)throw new Error('Placez au moins trois points pour fermer le contour.');
 let points=nodes.map(n=>({...n,p:{...n.p},...(n.in?{in:{...n.in}}:{}),...(n.out?{out:{...n.out}}:{})}));
 if(type==='bezier')points=smoothNodes(points,closed);
 return {...base,type,nodes:points,a:points[0].p,b:points[points.length-1].p,closed};
}

export function constructedItem(item:PaperItem):boolean {
 if(item.type==='hatch')return item.regions.length>0;
 if(item.type==='text'||item.type==='polyline'||item.type==='bezier')return true;
 if(item.type==='viewport'){const box=bounds(item);return box.width>=1&&box.height>=1;}
 if(item.type==='rect')return Math.abs(item.b.x-item.a.x)>.01&&Math.abs(item.b.y-item.a.y)>.01;
 return Math.hypot(item.b.x-item.a.x,item.b.y-item.a.y)>.01;
}
