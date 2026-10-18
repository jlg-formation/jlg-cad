import {useId} from 'react';
import type {ReferenceShape,ReferenceSource} from './references';
import {referenceCorners} from './references';

export function ReferenceGraphic({shape:s,source,selected=false,inert=false,preview=false,scale=1,grips=false}:{shape:ReferenceShape;source?:ReferenceSource;selected?:boolean;inert?:boolean;preview?:boolean;scale?:number;grips?:boolean}){
 const scope=useId().replace(/:/g,''),page=source?.pages.find(p=>p.page===s.page);
 if(!s.visible||!source?.loaded||!page)return null;
 const x={x:s.b.x-s.a.x,y:s.b.y-s.a.y},y={x:s.c.x-s.a.x,y:s.c.y-s.a.y},corners=referenceCorners(s);
 const pts=corners.map(p=>p.x+','+p.y).join(' ');
 const frame=selected||s.frame!==0;
 return <g data-id={!inert&&!preview?s.id:undefined}>
  <defs><clipPath id={scope+'clip'}><polygon points={pts}/></clipPath><filter id={scope+'adjust'} colorInterpolationFilters="sRGB"><feColorMatrix type="saturate" values={s.monochrome?'0':'1'}/><feComponentTransfer>{(['R','G','B'] as const).map(channel=>{const Component=({R:'feFuncR',G:'feFuncG',B:'feFuncB'} as const)[channel];const slope=Math.max(.01,s.contrast/(source.kind==='pdf'?100:50))*(1-s.fade/100);return <Component key={channel} type="linear" slope={slope} intercept={(1-Math.max(.01,s.contrast/50))*.5+(s.brightness-50)/100+s.fade/100}/>;})}</feComponentTransfer></filter></defs>
  <g clipPath={s.clipEnabled?'url(#'+scope+'clip)':undefined} pointerEvents="none">{!s.transparent&&<polygon points={[s.a,s.b,{x:s.b.x+s.c.x-s.a.x,y:s.b.y+s.c.y-s.a.y},s.c].map(p=>p.x+','+p.y).join(' ')} fill="white"/>}<image href={page.preview} width="1" height="1" preserveAspectRatio="none" transform={`matrix(${x.x} ${x.y} ${y.x} ${y.y} ${s.a.x} ${s.a.y})`} filter={`url(#${scope}adjust)`}/></g>
  {frame&&<polygon data-id={!inert&&!preview?s.id:undefined} points={pts} fill="none" stroke={selected?'#168bff':'#8299a8'} strokeWidth={1/scale} pointerEvents={inert||preview?'none':'stroke'}/>}
  {frame&&!inert&&!preview&&<polygon data-id={s.id} points={pts} fill="none" stroke="transparent" strokeWidth={8/scale} pointerEvents="stroke"/>}
  {grips&&[s.a,{x:s.b.x+s.c.x-s.a.x,y:s.b.y+s.c.y-s.a.y}].map((p,i)=><rect key={i} data-id={s.id} data-grip={i?'reference-size':'center-0'} className="object-grip" x={p.x-4/scale} y={p.y-4/scale} width={8/scale} height={8/scale} strokeWidth={1/scale}/>)}
 </g>;
}
