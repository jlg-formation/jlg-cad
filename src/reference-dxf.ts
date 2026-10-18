import type {ReferenceShape,ReferenceSource} from './references';
import {referenceSize} from './references';
type Pair=string|number;

/** Native IMAGE / PDFUNDERLAY entities, with source definitions in OBJECTS. */
export function referenceDxf(sources:ReferenceSource[],paths:Map<string,string>){
 let next=0x1000000;const handle=()=> (next++).toString(16).toUpperCase();
 const root=handle(),images=handle(),pdfs=handle(),definitions=new Map<string,{id:string;source:ReferenceSource;page:number;reactors:string[]}>(),objects:Pair[]=[];
 const key=(source:ReferenceSource,page:number)=>source.id+(source.kind==='pdf'?':'+page:'');
 const definition=(source:ReferenceSource,page:number)=>{const k=key(source,page);let d=definitions.get(k);if(!d){d={id:handle(),source,page,reactors:[]};definitions.set(k,d);}return d;};
 const classes:Pair[]=[0,'SECTION',2,'CLASSES'];
 for(const [name,cpp,entity] of [['IMAGE','AcDbRasterImage',1],['IMAGEDEF','AcDbRasterImageDef',0],['IMAGEDEF_REACTOR','AcDbRasterImageDefReactor',0],['PDFUNDERLAY','AcDbPdfReference',1],['PDFDEFINITION','AcDbPdfDefinition',0]] as const)classes.push(0,'CLASS',1,name,2,cpp,3,name.startsWith('PDF')?'ObjectDBX Classes':'ISM',90,0,91,0,280,0,281,entity);
 classes.push(0,'ENDSEC');
 const emit=(s:ReferenceShape,owner:string,layer:string,color:string):Pair[]=>{
  const source=sources.find(r=>r.id===s.sourceId),page=source?.pages.find(p=>p.page===s.page);if(!source||!page||!paths.has(source.id))throw new Error('Référence manquante : '+(source?.name||s.sourceId));
  const d=definition(source,s.page),id=handle(),out:Pair[]=[0,source.kind==='pdf'?'PDFUNDERLAY':'IMAGE',5,id,330,owner,100,'AcDbEntity',8,layer,420,parseInt(color.slice(1),16)];
  const on=s.visible&&source.loaded,ux={x:s.b.x-s.a.x,y:-(s.b.y-s.a.y)},vy={x:-(s.c.x-s.a.x),y:s.c.y-s.a.y};
  // Both formats insert at the visual bottom left in WCS.
  const point:Pair[]=[10,s.c.x,20,-s.c.y,30,0];
  if(source.kind==='image'){
   const reactor=handle();d.reactors.push(reactor);
   out.push(100,'AcDbRasterImage',90,0,...point,11,ux.x/page.pixelWidth,21,ux.y/page.pixelWidth,31,0,12,vy.x/page.pixelHeight,22,vy.y/page.pixelHeight,32,0,13,page.pixelWidth,23,page.pixelHeight,340,d.id,70,(on?3:2)|(s.clipEnabled&&s.clip?4:0)|(s.transparent?8:0),280,s.clipEnabled&&s.clip?1:0,281,s.brightness,282,s.contrast,283,s.fade,360,reactor);
   const clip=s.clip?.map(p=>({x:p.x*page.pixelWidth-.5,y:(1-p.y)*page.pixelHeight-.5}));
   out.push(71,clip?2:1,91,clip?clip.length+1:2);
   for(const p of clip?[...clip,clip[0]]:[{x:-.5,y:-.5},{x:page.pixelWidth-.5,y:page.pixelHeight-.5}])out.push(14,p.x,24,p.y);
   out.push(290,0);
   objects.push(0,'IMAGEDEF_REACTOR',5,reactor,330,id,100,'AcDbRasterImageDefReactor',90,2,330,id);
  }else{
   const size=referenceSize(s);
   // PDF native coordinates are points (1/72 inch); the drawing uses mm.
   const factorX=size.width/(page.width*72/25.4),factorY=size.height/(page.height*72/25.4)*(ux.x*vy.y-ux.y*vy.x<0?-1:1);
   out.push(100,'AcDbUnderlayReference',340,d.id,...point,41,factorX,42,factorY,43,1,50,Math.atan2(ux.y,ux.x)*180/Math.PI,210,0,220,0,230,1,280,(s.clipEnabled&&s.clip?1:0)|(on?2:0)|(s.monochrome?4:0),281,Math.max(20,s.contrast),282,Math.min(80,s.fade));
   if(s.clip)for(const p of s.clip)out.push(11,p.x*page.width*72/25.4,21,(1-p.y)*page.height*72/25.4);
  }
  return out;
 };
 const finish=():Pair[]=>{
  const out:Pair[]=[0,'SECTION',2,'OBJECTS',0,'DICTIONARY',5,root,330,'0',100,'AcDbDictionary',281,1,3,'ACAD_IMAGE_DICT',350,images,3,'ACAD_PDFDEFINITIONS',350,pdfs];
  for(const [id,kind] of [[images,'image'],[pdfs,'pdf']]){out.push(0,'DICTIONARY',5,id,330,root,100,'AcDbDictionary',281,1);for(const [k,d] of definitions)if(d.source.kind===kind)out.push(3,k.replace(/[^a-zA-Z0-9_-]/g,'_'),350,d.id);}
  for(const d of definitions.values()){
   const source=d.source,page=source.pages.find(p=>p.page===d.page)!;
   if(source.kind==='image'){out.push(0,'IMAGEDEF',5,d.id,330,images,102,'{ACAD_REACTORS',...d.reactors.flatMap(r=>[330,r]),102,'}',100,'AcDbRasterImageDef',90,0,1,paths.get(source.id)!,10,page.pixelWidth,20,page.pixelHeight,11,page.width/page.pixelWidth,21,page.height/page.pixelHeight,280,source.loaded?1:0,281,2);}
   else out.push(0,'PDFDEFINITION',5,d.id,330,pdfs,102,'{ACAD_REACTORS',330,pdfs,102,'}',100,'AcDbUnderlayDefinition',1,paths.get(source.id)!,2,String(d.page));
  }
  out.push(...objects,0,'ENDSEC');return out;
 };
 return{classes,emit,finish};
}
