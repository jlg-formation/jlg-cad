import type {Point} from './model';
import {distance,parseLength} from './geometry';
import type {LengthUnit} from './drafting';

export type ScaleReferencePhase='reference'|'referenceEnd'|'length'|'targetStart'|'targetEnd';
export type ScaleReferenceSession={
 phase:ScaleReferencePhase;
 first?:Point;
 referenceLength?:number;
 targetStart?:Point;
 defaultReference:number;
 defaultTarget:number;
};
export type ScaleReferenceResult={session:ScaleReferenceSession;factor?:number};
export const scaleOption=(text:string)=>text.trim().replace(/^_/,'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
const positive=(length:number)=>{
 if(!Number.isFinite(length)||length<=1e-8)throw new Error('La longueur doit être strictement positive.');
 return length;
};

export function beginScaleReference(defaultReference=1,defaultTarget=1):ScaleReferenceSession{
 return{phase:'reference',defaultReference:positive(defaultReference),defaultTarget:positive(defaultTarget)};
}
function reference(session:ScaleReferenceSession,length:number):ScaleReferenceResult{
 return{session:{...session,phase:'length',referenceLength:positive(length)}};
}
function target(session:ScaleReferenceSession,length:number):ScaleReferenceResult{
 const factor=positive(length)/positive(session.referenceLength!);
 if(!Number.isFinite(factor)||factor<=0)throw new Error('Le facteur d’échelle doit être strictement positif.');
 return{session,factor};
}

/** A direct new-length point is measured from the SCALE base, not the first reference point. */
export function scaleReferencePoint(session:ScaleReferenceSession,base:Point,point:Point):ScaleReferenceResult{
 switch(session.phase){
  case 'reference':return{session:{...session,phase:'referenceEnd',first:point}};
  case 'referenceEnd':return reference(session,distance(session.first!,point));
  case 'length':return target(session,distance(base,point));
  case 'targetStart':return{session:{...session,phase:'targetEnd',targetStart:point}};
  case 'targetEnd':return target(session,distance(session.targetStart!,point));
 }
}
export function scaleReferenceInput(session:ScaleReferenceSession,text:string,unit:LengthUnit):ScaleReferenceResult{
 if(session.phase==='length'&&['P','POINTS'].includes(scaleOption(text)))return{session:{...session,phase:'targetStart',targetStart:undefined}};
 if(session.phase==='targetStart')throw new Error('Cliquez le premier point de la nouvelle longueur.');
 if(session.phase==='reference'||session.phase==='referenceEnd')return reference(session,text.trim()?parseLength(text,unit):session.defaultReference);
 return target(session,text.trim()?parseLength(text,unit):session.defaultTarget);
}
export function scaleReferencePreview(session:ScaleReferenceSession,base:Point,pointer:Point,text:string,unit:LengthUnit):number{
 if(session.phase!=='length'&&session.phase!=='targetEnd')throw new Error('Définissez les points de référence avant de redimensionner.');
 return (text.trim()?scaleReferenceInput(session,text,unit):scaleReferencePoint(session,base,pointer)).factor!;
}
export function scaleReferencePrompt(session:ScaleReferenceSession):string{
 switch(session.phase){
  case 'reference':return 'SCALE · Spécifiez la longueur de référence ou cliquez son premier point.';
  case 'referenceEnd':return 'SCALE · Spécifiez le deuxième point de la longueur de référence.';
  case 'length':return 'SCALE · Spécifiez la nouvelle longueur : saisissez une distance, cliquez depuis le point de base, ou P — Points.';
  case 'targetStart':return 'SCALE · Spécifiez le premier point de la nouvelle longueur.';
  case 'targetEnd':return 'SCALE · Spécifiez le deuxième point de la nouvelle longueur.';
 }
}
export function scaleReferenceGuides(session:ScaleReferenceSession,base:Point,pointer:Point):[Point,Point][]{
 if(session.phase==='referenceEnd')return[[session.first!,pointer]];
 if(session.phase==='length')return[[base,pointer]];
 if(session.phase==='targetEnd')return[[session.targetStart!,pointer]];
 return[];
}
