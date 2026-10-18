import type {Dimension,Shape,Viewport} from './model';
import {modelToPaper} from './model';
import {segments} from './geometry';

type References=NonNullable<Dimension['angleSources']>;

/** Command feedback only: leaves object selection, geometry and exports untouched. */
export function AngularReferenceHighlight({tool,references,shapes,viewport,referenceViewportId}:{
 tool:string;references:References;shapes:Shape[];viewport?:Viewport;referenceViewportId?:string;
}){
 if(tool!=='angularDimension'||viewport?.id!==referenceViewportId)return null;
 const byId=new Map(shapes.map(shape=>[shape.id,shape]));
 return <g className="angular-reference-highlight" aria-hidden="true" pointerEvents="none" fill="none" stroke="#168bff" strokeWidth="2" strokeLinecap="round">
  {references.map(ref=>{
   const shape=byId.get(ref.id);if(!shape||['dimension','hatch','text'].includes(shape.type))return null;
   const segment=segments(shape)[ref.segment];if(segment?.kind!=='line')return null;
   const a=viewport?modelToPaper(segment.a,viewport):segment.a,b=viewport?modelToPaper(segment.b,viewport):segment.b;
   return <line key={ref.id+':'+ref.segment} data-command-reference={ref.id} data-command-segment={ref.segment} x1={a.x} y1={a.y} x2={b.x} y2={b.y} vectorEffect="non-scaling-stroke"/>;
  })}
 </g>;
}
