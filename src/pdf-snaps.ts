import type {Point} from './model';
export type PdfSnap=Point&{kind:'Extrémité'|'Milieu'};
type Matrix=number[];
function multiply(a:Matrix,b:Matrix):Matrix{return[a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];}
/** PDF.js 6 drawing operators; extracts path endpoints/midpoints, never raster pixels. */
export function extractPdfSnaps(list:{fnArray:number[];argsArray:any[]},ops:Record<string,number>,viewport:Matrix,width:number,height:number):PdfSnap[]{
 const result:PdfSnap[]=[],seen=new Set<string>(),stack:Matrix[]=[];let matrix=[1,0,0,1,0,0];
 const add=(p:Point,kind:PdfSnap['kind'])=>{const m=multiply(viewport,matrix),x=(m[0]*p.x+m[2]*p.y+m[4])/width,y=(m[1]*p.x+m[3]*p.y+m[5])/height;if(x<0||x>1||y<0||y>1||!Number.isFinite(x+y))return;const key=kind+':'+x.toFixed(7)+','+y.toFixed(7);if(!seen.has(key)&&result.length<50000){seen.add(key);result.push({x,y,kind});}};
 for(let i=0;i<list.fnArray.length;i++){
  const op=list.fnArray[i],args=list.argsArray[i];
  if(op===ops.save){stack.push([...matrix]);continue;}
  if(op===ops.restore){matrix=stack.pop()||[1,0,0,1,0,0];continue;}
  if(op===ops.transform){matrix=multiply(matrix,args);continue;}
  if(op===ops.paintFormXObjectBegin){stack.push([...matrix]);if(args[0])matrix=multiply(matrix,args[0]);continue;}
  if(op===ops.paintFormXObjectEnd){matrix=stack.pop()||[1,0,0,1,0,0];continue;}
  if(op!==ops.constructPath||args[0]===ops.endPath)continue;
  const data=args[1]?.[0];if(!data||typeof data.length!=='number')continue;
  let current:Point={x:0,y:0},start:Point=current;
  const line=(p:Point)=>{add(current,'Extrémité');add(p,'Extrémité');add({x:(current.x+p.x)/2,y:(current.y+p.y)/2},'Milieu');current=p;};
  for(let j=0;j<data.length;){const code=data[j++];if(code===0){current={x:data[j++],y:data[j++]};start=current;}else if(code===1)line({x:data[j++],y:data[j++]});else if(code===2){const c1={x:data[j++],y:data[j++]},c2={x:data[j++],y:data[j++]},end={x:data[j++],y:data[j++]};add(current,'Extrémité');add(end,'Extrémité');add({x:(current.x+3*c1.x+3*c2.x+end.x)/8,y:(current.y+3*c1.y+3*c2.y+end.y)/8},'Milieu');current=end;}else if(code===3){j+=4;}else if(code===4){line(start);}else break;}
 }
 return result;
}
