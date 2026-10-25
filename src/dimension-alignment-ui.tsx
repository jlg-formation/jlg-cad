import {useEffect,useRef,useState} from 'react';
import {modelToPaper,type Dimension,type PaperItem,type Point,type Viewport} from './model';
import {t} from './i18n';
import {dimensionAlignment,type AlignmentState,type AlignmentGuide} from './dimension-alignment';
import {add,sub,mul,dot} from './geometry';

export function useDimensionAlignment(refresh:()=>void){
 const state=useRef<AlignmentState>({}),timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined),callback=useRef(refresh);
 callback.current=refresh;
 const [guide,setGuide]=useState<AlignmentGuide|null>(null);
 const hit=useRef<Point|null>(null);
 const reset=()=>{state.current={};hit.current=null;clearTimeout(timer.current);timer.current=undefined;setGuide(null);};
 useEffect(()=>()=>clearTimeout(timer.current),[]);
 const resolve=(p:Point,target:Dimension,items:PaperItem[],scale:number,correction?:Point)=>{
  const result=dimensionAlignment(state.current,p,target,items,scale,performance.now(),correction);
  const pendingChanged=result.state.pendingId!==state.current.pendingId;
  state.current=result.state;hit.current=result.guide?.active?result.guide.point:null;setGuide(result.guide);
  if(pendingChanged){clearTimeout(timer.current);timer.current=undefined;if(result.state.pendingId)timer.current=setTimeout(()=>callback.current(),310);}
  return result.guide?.active?result.point:null;
 };
 return {guide,hit,reset,resolve};
}

export function DimensionAlignmentGuide({guide,scale,span,viewport}:{guide:AlignmentGuide|null;scale:number;span:number;viewport?:Viewport}){
 if(!guide)return null;
 const {axis,active}=guide,project=(p:Point)=>viewport?modelToPaper(p,viewport):p;
 const a=project(guide.a),b=project(guide.b),point=project(guide.point);
 const along=dot(sub(point,a),axis),length=dot(sub(b,a),axis),extension=span/scale;
 const start=add(a,mul(axis,Math.min(0,length,along)-extension)),end=add(a,mul(axis,Math.max(0,length,along)+extension));
 return <g pointerEvents="none" aria-label={t('Guide d’alignement de cote')} fill="none" stroke="#e6b776" strokeWidth={1.5/scale}>
  <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} strokeDasharray={`${6/scale} ${4/scale}`}/>
  <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} strokeWidth={3/scale}/>
  {active&&<rect x={point.x-4/scale} y={point.y-4/scale} width={8/scale} height={8/scale}/>}
 </g>;
}
