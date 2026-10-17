import {type Point,type SimpleShape} from './model';

export type Line = Extract<SimpleShape,{type:'line'}>;

// Commit one independent object and give the preview a fresh identity.
export function continueLine(draft:Line,end:Point,nextId:string):{segment:Line;preview:Line} {
 if(!Number.isFinite(end.x)||!Number.isFinite(end.y)||Math.hypot(end.x-draft.a.x,end.y-draft.a.y)<.001)throw new Error('Choisissez deux points distincts.');
 return {segment:{...draft,b:{...end}},preview:{...draft,id:nextId,a:{...end},b:{...end}}};
}

export function lineClosingPoint(segments:Line[]):Point {
 if(segments.length<2)throw new Error('Placez au moins deux segments avant de fermer.');
 return segments[0].a;
}
