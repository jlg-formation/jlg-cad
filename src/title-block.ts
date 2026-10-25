import {paperSize,type Drawing,type Shape,type TextItem} from './model';
import {insertBlock} from './blocks';
import {spaceDrawing,replaceSpaceDrawing} from './paper-space';

export function addTitleBlock(doc:Drawing,layoutId:string,makeId:()=>string,layerId='0'):Drawing {
 const layout=doc.layouts.find(l=>l.id===layoutId);
 if(!layout)throw new Error('Choisissez une présentation.');
 const size=paperSize(layout),base={color:'#17242a',colorByLayer:true,layerId:'0'};
 let definition=doc.blocks?.find(b=>b.name==='Cartouche cabinet');
 if(!definition){
  const line=(x:number,y:number,x2:number,y2:number):Shape=>({...base,id:makeId(),type:'line',a:{x,y},b:{x:x2,y:y2}});
  const field=(tag:string,label:string,x:number,y:number,height=3,text=label,source?:'scales'):TextItem=>({...base,id:makeId(),type:'text',a:{x,y},b:{x,y},text,height,attribute:{tag,label,source}});
  definition={id:makeId(),name:'Cartouche cabinet',shapes:[
   {...base,id:makeId(),type:'rect',a:{x:0,y:0},b:{x:170,y:60}},
   line(0,20,170,20),line(0,32,170,32),line(0,44,170,44),line(55,44,55,60),line(115,44,115,60),
   field('CABINET','Nom du cabinet',4,3,4),field('COORDONNEES','Adresse, téléphone et courriel',4,10,2.5),
   field('PROJET','Projet et adresse du chantier',4,23),field('TITRE','Titre de la feuille',4,35),
   field('NUMERO','Numéro / indice',4,47,2.5),field('DATE','Date',59,47,2.5),field('ECHELLES','Échelles',119,47,2.5,'À renseigner','scales'),
  ]};
 }
 const working=spaceDrawing({...doc,blocks:doc.blocks?.some(b=>b.id===definition.id)?doc.blocks:[...(doc.blocks||[]),definition]},layoutId);
 const next=insertBlock(working,definition.id,{x:size.x-180,y:size.y-70},1,0,makeId,layerId);
 const inserted=next.shapes.at(-1)!;
 if(inserted.type==='block')inserted.attributes={PROJET:doc.name,TITRE:layout.name,DATE:new Date().toLocaleDateString('fr-FR')};
 return replaceSpaceDrawing(doc,next,layoutId);
}
