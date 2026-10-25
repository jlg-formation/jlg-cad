import type {BaseShape,Drawing,PaperItem,Point,Shape} from './model';

export type ReferencePage={page:number;width:number;height:number;pixelWidth:number;pixelHeight:number;preview:string;snaps?:import('./pdf-snaps').PdfSnap[]};
export type ReferenceSource={id:string;name:string;kind:'image'|'pdf';data:string;pages:ReferencePage[];loaded:boolean};
// a is the visual top left; b and c define the two oriented image axes.
export type ReferenceShape=BaseShape&{type:'reference';sourceId:string;page:number;c:Point;visible:boolean;frame:0|1|2;fade:number;contrast:number;brightness:number;monochrome:boolean;transparent:boolean;clip?:Point[];clipEnabled:boolean;front:boolean;pdfSnap:boolean};
export const referencePreferenceKey='jlg-cad-transmission-skip-warning';
export const maxReferenceBytes=20_000_000;
export function referencePoint(s:ReferenceShape,p:Point):Point{return{x:s.a.x+(s.b.x-s.a.x)*p.x+(s.c.x-s.a.x)*p.y,y:s.a.y+(s.b.y-s.a.y)*p.x+(s.c.y-s.a.y)*p.y};}
export function referenceLocal(s:ReferenceShape,p:Point):Point{const x={x:s.b.x-s.a.x,y:s.b.y-s.a.y},y={x:s.c.x-s.a.x,y:s.c.y-s.a.y},d=x.x*y.y-x.y*y.x;return{x:((p.x-s.a.x)*y.y-(p.y-s.a.y)*y.x)/d,y:(x.x*(p.y-s.a.y)-x.y*(p.x-s.a.x))/d};}
export function referenceCorners(s:ReferenceShape):Point[]{return (s.clipEnabled&&s.clip?s.clip:[{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}]).map(p=>referencePoint(s,p));}
export function referenceSize(s:ReferenceShape){return{width:Math.hypot(s.b.x-s.a.x,s.b.y-s.a.y),height:Math.hypot(s.c.x-s.a.x,s.c.y-s.a.y)};}
export function validReferenceClip(points:Point[]):boolean{
 if(points.length<3||points.length>1000||points.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<0||p.x>1||p.y<0||p.y>1))return false;
 const area=points.reduce((n,p,i)=>{const q=points[(i+1)%points.length];return n+p.x*q.y-q.x*p.y;},0);
 if(Math.abs(area)<1e-10)return false;
 const cross=(a:Point,b:Point,c:Point)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
 for(let i=0;i<points.length;i++){
  const a=points[i],b=points[(i+1)%points.length];if(Math.hypot(a.x-b.x,a.y-b.y)<1e-9)return false;
  for(let j=i+2;j<points.length;j++){if(i===0&&j===points.length-1)continue;const c=points[j],d=points[(j+1)%points.length];
   if(cross(a,b,c)*cross(a,b,d)<=0&&cross(c,d,a)*cross(c,d,b)<=0&&Math.max(Math.min(a.x,b.x),Math.min(c.x,d.x))<=Math.min(Math.max(a.x,b.x),Math.max(c.x,d.x))+1e-10&&Math.max(Math.min(a.y,b.y),Math.min(c.y,d.y))<=Math.min(Math.max(a.y,b.y),Math.max(c.y,d.y))+1e-10)return false;
  }
 }return true;
}
export function makeReference(source:ReferenceSource,page:ReferencePage,a:Point,factor:number,angle:number,layerId:string,id:string):ReferenceShape{
 if(!Number.isFinite(factor)||factor<=0||!Number.isFinite(angle))throw new Error('Échelle ou rotation invalide.');
 const r=-angle*Math.PI/180,c=Math.cos(r),s=Math.sin(r),w=page.width*factor,h=page.height*factor;
 // The user places the visual bottom left, matching AutoCAD's insertion point.
 const top={x:a.x+s*h,y:a.y-c*h};
 return{id,type:'reference',sourceId:source.id,page:page.page,a:top,b:{x:top.x+c*w,y:top.y+s*w},c:a,color:'#b5ddd6',colorByLayer:true,layerId,visible:true,frame:2,fade:0,contrast:source.kind==='pdf'?100:50,brightness:50,monochrome:false,transparent:true,clipEnabled:false,front:false,pdfSnap:source.kind==='pdf'};
}
export function referenceShapes(doc:Drawing):ReferenceShape[]{return [...doc.shapes,...doc.layouts.flatMap(l=>l.items)].filter((s):s is ReferenceShape=>s.type==='reference');}
export function referenceSource(doc:Drawing,s:ReferenceShape){return doc.references?.find(r=>r.id===s.sourceId);}
export function referenceDisplayed(doc:Drawing,s:ReferenceShape){return s.visible&&referenceSource(doc,s)?.loaded===true;}
export function orderDrawing<T extends PaperItem>(items:T[]):T[]{return [...items.filter(s=>s.type==='reference'&&!s.front),...items.filter(s=>s.type==='hatch'),...items.filter(s=>s.type!=='hatch'&&s.type!=='reference'),...items.filter(s=>s.type==='reference'&&s.front)];}
export function detachReference(doc:Drawing,sourceId:string):Drawing{return{...doc,references:doc.references?.filter(r=>r.id!==sourceId),shapes:doc.shapes.filter(s=>s.type!=='reference'||s.sourceId!==sourceId),layouts:doc.layouts.map(l=>({...l,items:l.items.filter(s=>s.type!=='reference'||s.sourceId!==sourceId)}))};}
export function replaceReference(doc:Drawing,sourceId:string,next:ReferenceSource):Drawing{
 const old=doc.references?.find(r=>r.id===sourceId);if(!old||old.kind!==next.kind)throw new Error('Choisissez un fichier du même type.');
 if(referenceShapes(doc).some(s=>s.sourceId===sourceId&&!next.pages.some(p=>p.page===s.page)))throw new Error('Le document de remplacement ne contient pas toutes les pages utilisées.');
 return{...doc,references:doc.references?.map(r=>r.id===sourceId?{...next,id:sourceId,loaded:r.loaded}:r)};
}
export function validateReferences(doc:Drawing):boolean{
 const refs=doc.references||[];if(!Array.isArray(refs)||refs.length>200||new Set(refs.map(r=>r.id)).size!==refs.length)return false;
 let size=0;for(const r of refs){if(!r||typeof r.id!=='string'||!r.id||typeof r.name!=='string'||!r.name||r.name.length>255||!['image','pdf'].includes(r.kind)||typeof r.loaded!=='boolean'||typeof r.data!=='string'||!/^data:(image\/(png|jpeg)|application\/pdf);base64,[A-Za-z0-9+/]*={0,2}$/.test(r.data)||!r.data.startsWith(r.kind==='pdf'?'data:application/pdf;':'data:image/')||!Array.isArray(r.pages)||!r.pages.length||r.pages.length>200||new Set(r.pages.map(p=>p.page)).size!==r.pages.length)return false;
 size+=r.data.length;
 for(const p of r.pages){if(!Number.isSafeInteger(p.page)||p.page<1||![p.width,p.height,p.pixelWidth,p.pixelHeight].every(n=>Number.isFinite(n)&&n>0&&n<=1e7)||typeof p.preview!=='string'||!/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]*={0,2}$/.test(p.preview)||p.snaps&&(!Array.isArray(p.snaps)||p.snaps.length>50000||!p.snaps.every(q=>Number.isFinite(q.x)&&Number.isFinite(q.y)&&q.x>=0&&q.x<=1&&q.y>=0&&q.y<=1)))return false;size+=p.preview.length;}
 }
 if(size>150_000_000)return false;
 return !(doc.blocks||[]).some(b=>b.shapes.some(s=>s.type==='reference'))&&referenceShapes(doc).every(s=>refs.some(r=>r.id===s.sourceId&&r.pages.some(p=>p.page===s.page)));
}
export function validReferenceShape(s:ReferenceShape):boolean{
 if(!s.c||![s.c.x,s.c.y].every(n=>Number.isFinite(n)&&Math.abs(n)<=1e7)||typeof s.sourceId!=='string'||!Number.isInteger(s.page)||s.page<1||![0,1,2].includes(s.frame)||![s.visible,s.monochrome,s.transparent,s.clipEnabled,s.front,s.pdfSnap].every(v=>typeof v==='boolean')||![s.fade,s.contrast,s.brightness].every(n=>Number.isFinite(n)&&n>=0&&n<=100))return false;
 const x={x:s.b.x-s.a.x,y:s.b.y-s.a.y},y={x:s.c.x-s.a.x,y:s.c.y-s.a.y},w=Math.hypot(x.x,x.y),h=Math.hypot(y.x,y.y);
 return w>=1e-6&&h>=1e-6&&Math.abs(x.x*y.x+x.y*y.y)<=w*h*1e-6&&(!s.clip||Array.isArray(s.clip)&&validReferenceClip(s.clip));
}
export function exportReferenceShapes(doc:Drawing):Shape[]{return doc.shapes.filter(s=>s.type==='reference'||doc.layers.find(l=>l.id===(s.layerId||'0'))?.visible!==false);}

export function referenceSnap(doc:Drawing,p:Point,tolerance:number,kinds:readonly string[],excludeId?:string){
 let best:{point:Point;kind:'Extrémité'|'Milieu'}|null=null,distance=tolerance;
 for(const s of doc.shapes){if(s.type!=='reference'||s.id===excludeId||!s.pdfSnap||!referenceDisplayed(doc,s)||doc.layers.find(l=>l.id===(s.layerId||'0'))?.visible===false)continue;const page=referenceSource(doc,s)?.pages.find(o=>o.page===s.page);
 for(const snap of page?.snaps||[]){if(!kinds.includes(snap.kind))continue;if(s.clipEnabled&&s.clip&&!insideClip(snap,s.clip))continue;const point=referencePoint(s,snap),d=Math.hypot(p.x-point.x,p.y-point.y);if(d<distance){distance=d;best={point,kind:snap.kind};}}
 }return best;
}
function insideClip(p:Point,clip:Point[]){for(let i=0;i<clip.length;i++){const a=clip[i],b=clip[(i+1)%clip.length];if(Math.abs((b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x))<1e-9&&p.x>=Math.min(a.x,b.x)-1e-9&&p.x<=Math.max(a.x,b.x)+1e-9&&p.y>=Math.min(a.y,b.y)-1e-9&&p.y<=Math.max(a.y,b.y)+1e-9)return true;}let inside=false;for(let i=0,j=clip.length-1;i<clip.length;j=i++){const a=clip[i],b=clip[j];if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)inside=!inside;}return inside;}
