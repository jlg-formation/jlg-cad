import type {BaseShape,Drawing,Layer,PaperItem} from './model';

export const lineTypes = {CONTINUOUS:'Continu',DASHED:'Tireté',DOTTED:'Pointillé',CENTER:'Axe'} as const;
export type LineType = keyof typeof lineTypes;
export const linePatterns:Record<LineType,number[]>={CONTINUOUS:[],DASHED:[4,2],DOTTED:[.25,1.5],CENTER:[8,2,1,2]};
export const lineWeights=[0,.05,.09,.13,.15,.18,.20,.25,.30,.35,.40,.50,.53,.60,.70,.80,.90,1,1.06,1.20,1.40,1.58,2,2.11];
export const layerDefaults={linetype:'CONTINUOUS' as LineType,lineweight:.25,printable:true,transparency:0,description:''};
export function appearance(s:BaseShape,layers:Layer[]){
 const l=layers.find(l=>l.id===(s.layerId||'0'));
 return {color:s.colorByLayer?l?.color||s.color:s.color,linetype:s.linetype??l?.linetype??layerDefaults.linetype,lineweight:s.lineweight??l?.lineweight??layerDefaults.lineweight,transparency:s.transparency??l?.transparency??0};
}
export function onLayer<T extends PaperItem>(s:T,layerId:string):T{
 return {...s,layerId,colorByLayer:true,linetype:undefined,lineweight:undefined,transparency:undefined};
}
export function usedLayer(doc:Drawing,id:string){
 const uses=(s:PaperItem):boolean=>(s.layerId||'0')===id||(s.type==='block'&&s.entities.some(uses));
 return [...doc.shapes,...doc.layouts.flatMap(l=>l.items),...(doc.blocks||[]).flatMap(b=>b.shapes)].some(uses);
}
export function printable(s:PaperItem,layers:Layer[]){const l=layers.find(l=>l.id===(s.layerId||'0'));return l?.visible!==false&&l?.printable!==false;}
export function validAppearance(s:Partial<BaseShape>){return (s.colorByLayer===undefined||typeof s.colorByLayer==='boolean')&&(s.linetype===undefined||Object.hasOwn(lineTypes,s.linetype))&&(s.lineweight===undefined||Number.isFinite(s.lineweight)&&s.lineweight>=0&&s.lineweight<=2.11)&&(s.transparency===undefined||Number.isFinite(s.transparency)&&s.transparency>=0&&s.transparency<=90);}

export function appearanceFields(s:BaseShape):Pick<BaseShape,'color'|'layerId'|'colorByLayer'|'linetype'|'lineweight'|'transparency'>{return Object.fromEntries((['color','layerId','colorByLayer','linetype','lineweight','transparency'] as const).filter(k=>s[k]!==undefined).map(k=>[k,s[k]])) as ReturnType<typeof appearanceFields>;}
