import {extractPdfSnaps} from './pdf-snaps';
import {maxReferenceBytes,type ReferencePage,type ReferenceSource} from './references';

export function bytesData(bytes:Uint8Array,mime:string){let text='';for(let i=0;i<bytes.length;i+=32768)text+=String.fromCharCode(...bytes.subarray(i,i+32768));return `data:${mime};base64,${btoa(text)}`;}
export function dataBytes(data:string){const text=atob(data.slice(data.indexOf(',')+1));return Uint8Array.from(text,c=>c.charCodeAt(0));}
export async function readReference(file:File):Promise<ReferenceSource>{
 if(file.size>maxReferenceBytes)throw new Error('Référence trop volumineuse : limite de 20 Mo par fichier.');
 if(!file.size)throw new Error('Le fichier est vide.');
 const bytes=new Uint8Array(await file.arrayBuffer());
 const pdf=bytes[0]===37&&bytes[1]===80&&bytes[2]===68&&bytes[3]===70;
 const png=bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71;
 const jpeg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
 if(!pdf&&!png&&!jpeg)throw new Error('Choisissez une image PNG ou JPEG, ou un PDF.');
 const data=bytesData(bytes,pdf?'application/pdf':png?'image/png':'image/jpeg');
 let pages:ReferencePage[];
 if(pdf){
  const {getDocument,GlobalWorkerOptions,OPS}=await import('pdfjs-dist');
  GlobalWorkerOptions.workerSrc=new URL('pdfjs-dist/build/pdf.worker.min.mjs',import.meta.url).href;
  const task=getDocument({data:bytes,useSystemFonts:true});
  try{
   const document=await task.promise;
   if(document.numPages>100)throw new Error('PDF trop volumineux : limite de 100 pages.');
   pages=[];
   for(let n=1;n<=document.numPages;n++){
    const page=await document.getPage(n),natural=page.getViewport({scale:1});
    const viewport=page.getViewport({scale:Math.min(2,2048/Math.max(natural.width,natural.height))});
    const canvas=documentCanvas(Math.ceil(viewport.width),Math.ceil(viewport.height));
    const snaps=extractPdfSnaps(await page.getOperatorList(),OPS,natural.transform,natural.width,natural.height);
    await page.render({canvas,viewport}).promise;
    pages.push({page:n,width:natural.width*25.4/72,height:natural.height*25.4/72,pixelWidth:canvas.width,pixelHeight:canvas.height,preview:canvas.toDataURL('image/png'),snaps});
    if(pages.reduce((n,p)=>n+p.preview.length,0)>80_000_000)throw new Error('Les aperçus du PDF dépassent la limite de 80 Mo.');
    canvas.width=canvas.height=1;page.cleanup();
   }
  }catch(e){throw new Error(e instanceof Error?`PDF : ${e.message}`:'PDF illisible.');}finally{await task.destroy();}
 }else{
  const image=new Image();image.src=data;await image.decode();
  if(image.naturalWidth*image.naturalHeight>80_000_000)throw new Error('Image trop grande : limite de 80 millions de pixels.');
  // PNG pHYs / JPEG JFIF density. When absent, use the documented 96 dpi fallback.
  let dpiX=96,dpiY=96;
  if(png){const v=new DataView(bytes.buffer);for(let i=8;i+12<=bytes.length;){const len=v.getUint32(i);if(i+12+len>bytes.length)break;const type=String.fromCharCode(...bytes.subarray(i+4,i+8));if(type==='pHYs'&&len===9&&bytes[i+16]===1){dpiX=v.getUint32(i+8)*.0254;dpiY=v.getUint32(i+12)*.0254;}i+=len+12;}}
  if(jpeg&&bytes.length>18&&String.fromCharCode(...bytes.subarray(6,10))==='JFIF'){const v=new DataView(bytes.buffer),unit=bytes[13],x=v.getUint16(14),y=v.getUint16(16);if(unit===1||unit===2){dpiX=x*(unit===2?2.54:1);dpiY=y*(unit===2?2.54:1);}}
  if(dpiX<=0||dpiY<=0)dpiX=dpiY=96;
  pages=[{page:1,width:image.naturalWidth/dpiX*25.4,height:image.naturalHeight/dpiY*25.4,pixelWidth:image.naturalWidth,pixelHeight:image.naturalHeight,preview:data}];
 }
 return{id:crypto.randomUUID(),name:file.name,kind:pdf?'pdf':'image',data,pages,loaded:true};
}
function documentCanvas(width:number,height:number){const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;return canvas;}
