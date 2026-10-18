import type {Drawing,Layout} from './model';
import type {jsPDF} from 'jspdf';
import {referenceShapes,referenceDisplayed,referenceSource,referenceCorners,type ReferenceShape} from './references';
import {referenceSize} from './references';
import {dataBytes} from './reference-files';

export async function prepareReferencePrints(doc:Drawing,layouts:Layout[]=doc.layouts):Promise<Map<string,string>>{
 const result=new Map<string,string>();
 const pdfs=new Map<string,import('pdfjs-dist').PDFDocumentProxy>();
 try{
 for(const s of referenceShapes(doc)){
  if(!referenceDisplayed(doc,s))continue;
  const source=referenceSource(doc,s),page=source?.pages.find(p=>p.page===s.page);if(!page)throw new Error('Référence manquante.');
  const canvas=document.createElement('canvas');
  let image:HTMLImageElement|undefined;
  if(source?.kind==='pdf'){
   let document=pdfs.get(source.id);
   if(!document){const {getDocument,GlobalWorkerOptions}=await import('pdfjs-dist');GlobalWorkerOptions.workerSrc=new URL('pdfjs-dist/build/pdf.worker.min.mjs',import.meta.url).href;document=await getDocument({data:dataBytes(source.data),useSystemFonts:true}).promise;pdfs.set(source.id,document);}
   const pdfPage=await document.getPage(s.page),natural=pdfPage.getViewport({scale:1}),size=referenceSize(s);
   const denominators=layouts.flatMap(l=>l.items.some(i=>i.id===s.id)?[1]:doc.shapes.some(i=>i.id===s.id)?l.items.filter(i=>i.type==='viewport').map(v=>v.type==='viewport'?v.denominator:1):[]);
   if(!denominators.length)continue;
   const width=size.width/Math.min(...denominators),height=size.height/Math.min(...denominators);
   const factor=Math.min(Math.max(width/natural.width,height/natural.height)*300/25.4,8192/Math.max(natural.width,natural.height),Math.sqrt(32_000_000/(natural.width*natural.height)));
   const viewport=pdfPage.getViewport({scale:Math.max(.01,factor)});canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
   await pdfPage.render({canvas,viewport}).promise;
  }else{image=new Image();image.src=page.preview;await image.decode();canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;}
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Préparation des images impossible.');
  if(image&&!s.transparent){ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);}
  if(image)ctx.drawImage(image,0,0);
  const pixels=ctx.getImageData(0,0,canvas.width,canvas.height),slope=Math.max(.01,s.contrast/(source?.kind==='pdf'?100:50)),fade=s.fade/100;
  for(let i=0;i<pixels.data.length;i+=4){if(s.monochrome){const gray=pixels.data[i]*.2126+pixels.data[i+1]*.7152+pixels.data[i+2]*.0722;pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=gray;}for(let c=0;c<3;c++){const v=((pixels.data[i+c]/255-.5)*slope+.5+(s.brightness-50)/100)*(1-fade)+fade;pixels.data[i+c]=Math.max(0,Math.min(255,v*255));}}
  ctx.putImageData(pixels,0,0);result.set(s.id,canvas.toDataURL('image/png'));canvas.width=canvas.height=1;
 }
 }finally{for(const pdf of pdfs.values())await pdf.loadingTask.destroy();}
 return result;
}

export function printReference(pdf:jsPDF,s:ReferenceShape,doc:Drawing,prepared:Map<string,string>){
 if(!referenceDisplayed(doc,s))return;
 const source=referenceSource(doc,s),page=source?.pages.find(p=>p.page===s.page);if(!page)return;
 const corners=referenceCorners(s);
 pdf.advancedAPI(p=>{
  p.saveGraphicsState();
  if(s.clipEnabled&&s.clip){p.path(corners.map((q,i)=>({op:i?'l':'m',c:[q.x,q.y]})).concat([{op:'h',c:[]}]));p.clip();p.discardPath();}
  const x={x:s.b.x-s.a.x,y:s.b.y-s.a.y},y={x:s.c.x-s.a.x,y:s.c.y-s.a.y};
  p.setCurrentTransformationMatrix(p.Matrix(x.x,x.y,y.x,y.y,s.a.x,s.a.y));
  p.addImage(prepared.get(s.id)||page.preview,'PNG',0,0,1,1,undefined,'FAST');p.restoreGraphicsState();
 });
 if(s.frame===1){pdf.setLineWidth(.25);pdf.setDrawColor(s.color);pdf.path(corners.map((q,i)=>({op:i?'l':'m',c:[q.x,q.y]})).concat([{op:'h',c:[]}]));pdf.stroke();}
}
