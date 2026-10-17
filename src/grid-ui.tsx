import {t} from './i18n';
import {useState,useRef,useEffect} from 'react';
import {displayedGrid, GRID_MAJOR_INTERVALS, type GridSettings, type DrawingGrid} from './grid';
import {displayDistance, type LengthUnit} from './drafting';
import type {Bindings} from './shortcuts';

export function GridPattern({id,g,scale,origin={x:0,y:0},coordinateScale=1,light=false}:{id:string;g:GridSettings;scale:number;origin?:{x:number;y:number};coordinateScale?:number;light?:boolean}) {
 const step=displayedGrid(g,scale), x=step.x*coordinateScale, y=step.y*coordinateScale;
 const w=x*GRID_MAJOR_INTERVALS, h=y*GRID_MAJOR_INTERVALS, color=light?'#aebbb8':'#303840';
 const stroke=.6*coordinateScale/scale;
 return <>
  <pattern id={id+'-minor'} width={x} height={y} patternUnits="userSpaceOnUse">
   {g.style==='dots'?<circle r={.8*coordinateScale/scale} fill={color}/>:<path d={`M ${x} 0 H 0 V ${y}`} fill="none" stroke={color} strokeWidth={stroke}/>}
  </pattern>
  <pattern id={id} width={w} height={h} x={origin.x} y={origin.y} patternUnits="userSpaceOnUse">
   <rect width={w} height={h} fill={`url(#${id}-minor)`}/>
   {g.style==='lines'&&<path d={`M ${w} 0 H 0 V ${h}`} fill="none" stroke={light?'#8faaa3':'#3d4852'} strokeWidth={coordinateScale/scale}/>}
  </pattern>
 </>;
}
export function GridConfiguration({value,onChange,unit,bindings,modelScale,paperScale,initialSpace}:{value:DrawingGrid;onChange:(space:'model'|'paper',patch:Partial<GridSettings>)=>void;unit:LengthUnit;bindings:Bindings;modelScale:number;paperScale:number;initialSpace:'model'|'paper'}) {
 const [space,setSpace]=useState(initialSpace);
 const g=value[space], u=space==='paper'?'mm':unit;
 const step=displayedGrid(g,space==='paper'?paperScale:modelScale).x;
 const patch=(p:Partial<GridSettings>)=>onChange(space,p);
 const keys=(id:string)=>bindings[id]?.length?<kbd>{bindings[id].join(' / ')}</kbd>:null;
 return <>
  <div className="settings-space-tabs" role="group" aria-label={t("Espace à configurer")}>
   <button aria-pressed={space==='model'} onClick={()=>setSpace('model')}>{t("Objet")}</button>
   <button aria-pressed={space==='paper'} onClick={()=>setSpace('paper')}>{t("Papier")}</button>
  </div>
  <fieldset className="grid-settings"><legend>{space==='model'?'Espace objet':'Espace papier'}</legend>
   <label><input type="checkbox" checked={g.visible} onChange={e=>patch({visible:e.target.checked})}/>{t("Afficher la grille")} {keys('grid')}</label>
   <label><input type="checkbox" checked={g.snap} onChange={e=>patch({snap:e.target.checked})}/>{t("Accrochage à la grille")} {keys('gridSnap')}</label>
   <p>{t("L’accrochage suit les graduations du zoom courant, même lorsque la grille est masquée. Les accrochages aux objets restent prioritaires.")}</p>
   <label>{t("Style")}<select value={g.style} onChange={e=>patch({style:e.target.value as GridSettings['style']})}><option value="lines">{t("Lignes")}</option><option value="dots">{t("Points")}</option></select></label>
   <label><input type="checkbox" checked={g.adaptive} onChange={e=>patch({adaptive:e.target.checked})}/>{t("Adapter la grille et l’accrochage au zoom")}</label>
   <dl className="grid-spacing-summary">
    <dt>{t("Pas minimum")}</dt><dd>{space==='model'?'1 cm':'1 mm'}</dd>
    {space===initialSpace&&<><dt>{t("Pas au zoom courant")}</dt><dd>{displayDistance(step,u)} {u}</dd></>}
    <dt>{t("Lignes majeures")}</dt><dd>{t("Tous les 5 intervalles")}{space===initialSpace&&<> ({displayDistance(step*5,u)} {u})</>}</dd>
   </dl>
   <p>{space==='model'?'Progression : 1 cm, 2 cm, 10 cm, 20 cm, 1 m, 2 m…':'Progression : 1 mm, 2 mm, 10 mm, 20 mm, 100 mm…'}</p>
  </fieldset>
 </>;
}

export function GridDimension({g,scale,origin,region,light=false}:{g:GridSettings;scale:number;origin:{x:number;y:number};region?:{x:number;y:number;width:number;height:number};light?:boolean}) {
 const ref=useRef<SVGGElement>(null);
 const [canvas,setCanvas]=useState({width:0,height:0});
 useEffect(()=>{const svg=ref.current?.ownerSVGElement;if(!svg)return;const measure=()=>{const r=svg.getBoundingClientRect();setCanvas({width:r.width,height:r.height});};measure();const observer=new ResizeObserver(measure);observer.observe(svg);return()=>observer.disconnect();},[]);
 const length=displayedGrid(g,scale).x*GRID_MAJOR_INTERVALS, spacing=length*scale;
 const left=Math.max(0,region?.x||0),top=Math.max(0,region?.y||0);
 const right=Math.min(canvas.width,region?region.x+region.width:canvas.width),bottom=Math.min(canvas.height,region?region.y+region.height:canvas.height);
 // Select complete major grid intervals inside the visible drawing area.
 const x=origin.x+Math.ceil((left+20-origin.x)/spacing)*spacing;
 const y=origin.y+Math.ceil((top+32-origin.y)/spacing)*spacing;
 const unit:LengthUnit=length>=1000?'m':length>=10?'cm':'mm';
 const label=`${displayDistance(length,unit)} ${unit}`;
 const fits=g.visible&&spacing>0&&x+spacing<=right-12&&y<=bottom-12;
 const outside=spacing<55;
 return <g ref={ref} className={`grid-dimension${light?' on-paper':''}`} pointerEvents="none">
 {fits&&<g role="img" aria-label={t(`Une graduation majeure de la grille : ${label}`)}>
  <title>{t("Distance entre deux lignes majeures :")} {t(label)}</title>
  <path d={`M ${x} ${y-8} V ${y+8} M ${x+spacing} ${y-8} V ${y+8} M ${x-(outside?12:0)} ${y} H ${x+spacing+(outside?12:0)}`} />
  <path className="dimension-arrows" d={outside?`M ${x} ${y} l-6 -3 v6 Z M ${x+spacing} ${y} l6 -3 v6 Z`:`M ${x} ${y} l6 -3 v6 Z M ${x+spacing} ${y} l-6 -3 v6 Z`} />
  <rect className="dimension-label-background" x={x+spacing/2-label.length*3.8-4} y={y-24} width={label.length*7.6+8} height="18" rx="2"/>
  <text x={x+spacing/2} y={y-11} textAnchor="middle">{t(label)}</text>
 </g>}
 </g>;
}
