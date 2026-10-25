import type {Point} from './model';
export type NavigationView={x:number;y:number;scale:number};
export function createLiveNavigation(){
 let latest:{key:string;view:NavigationView}|null=null;
 return{
  read:(key:string,fallback:NavigationView)=>latest?.key===key?latest.view:fallback,
  write:(key:string,view:NavigationView)=>{latest={key,view};},
 };
}
export type Box={x:number;y:number;width:number;height:number};
export const minZoom=1e-8,maxZoom=30;
export type NavigationMode='auto'|'trackpad'|'mouse';
export const navigationModeStorageKey='jlg-cad-navigation-mode';
export function readNavigationMode(raw:string|null):NavigationMode{return raw==='trackpad'||raw==='mouse'?raw:'auto';}
type WheelMotion=Pick<WheelEvent,'deltaX'|'deltaY'|'deltaMode'|'ctrlKey'>;
export function createWheelNavigationDetector(){
 let lastTime=-Infinity,lastMode:NavigationMode='auto',device:'trackpad'|'mouse'='mouse';
 return(event:WheelMotion,mode:NavigationMode,now:number):'pan'|'zoom'=>{
  if(mode!==lastMode){lastTime=-Infinity;lastMode=mode;}
  // Pinch (or Ctrl+wheel) always zooms, independently of device detection.
  if(event.ctrlKey)return 'zoom';
  if(mode!=='auto')return mode==='trackpad'?'pan':'zoom';
  if(!event.deltaX&&!event.deltaY)return device==='trackpad'?'pan':'zoom';
  // Keep a gesture's interpretation stable while its speed and inertia change.
  if(now-lastTime>250){
   const fine=event.deltaX!==0||!Number.isInteger(event.deltaY)||Math.abs(event.deltaY)<50;
   device=event.deltaMode===0&&fine?'trackpad':'mouse';
  }
  lastTime=now;
  return device==='trackpad'?'pan':'zoom';
 };
}
export function panByWheel(view:NavigationView,event:Pick<WheelEvent,'deltaX'|'deltaY'|'deltaMode'>,frame:{width:number;height:number}):NavigationView{
 const unitX=event.deltaMode===1?16:event.deltaMode===2?frame.width:1;
 const unitY=event.deltaMode===1?16:event.deltaMode===2?frame.height:1;
 return{...view,x:view.x-event.deltaX*unitX,y:view.y-event.deltaY*unitY};
}
export const trackpadZoomStorageKey='jlg-cad-trackpad-zoom-speed';
export const defaultTrackpadZoomSpeed=10,minTrackpadZoomSpeed=.5,maxTrackpadZoomSpeed=20;
export function readTrackpadZoomSpeed(raw:string|null):number{
 const value=raw===null||raw.trim()===''?NaN:Number(raw);
 return Number.isFinite(value)&&value>=minTrackpadZoomSpeed&&value<=maxTrackpadZoomSpeed?value:defaultTrackpadZoomSpeed;
}
export function wheelZoomFactor(event:Pick<WheelEvent,'deltaY'|'deltaMode'|'ctrlKey'>,frameHeight:number,trackpadSpeed:number){
 const delta=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?frameHeight:1);
 const speed=event.ctrlKey?trackpadSpeed:1;
 return Math.exp(-Math.max(-1000,Math.min(1000,delta))*.001*speed);
}
export function listenCanvasWheel(canvas:EventTarget,onWheel:(event:WheelEvent)=>void){
 // React's delegated wheel listener is passive: use a native listener to cancel browser pinch zoom.
 const listener=(event:Event)=>{event.preventDefault();onWheel(event as WheelEvent);};
 canvas.addEventListener('wheel',listener,{passive:false});
 return()=>canvas.removeEventListener('wheel',listener);
}
export function zoomAt(view:NavigationView,point:Point,factor:number):NavigationView{
 if(!Number.isFinite(factor)||factor<=0)throw new Error('Le facteur de zoom doit être un nombre positif.');
 const scale=Math.max(minZoom,Math.min(maxZoom,view.scale*factor));
 return {scale,x:point.x-(point.x-view.x)*scale/view.scale,y:point.y-(point.y-view.y)*scale/view.scale};
}
export function fitBoxes(boxes:Box[],width:number,height:number,padding=24):NavigationView{
 if(!boxes.length)throw new Error('Aucun objet à cadrer.');
 const left=Math.min(...boxes.map(b=>b.x)),top=Math.min(...boxes.map(b=>b.y));
 const right=Math.max(...boxes.map(b=>b.x+b.width)),bottom=Math.max(...boxes.map(b=>b.y+b.height));
 const scale=Math.max(minZoom,Math.min(maxZoom,Math.max(1,width-2*padding)/Math.max(.001,right-left),Math.max(1,height-2*padding)/Math.max(.001,bottom-top)));
 return {scale,x:width/2-(left+right)/2*scale,y:height/2-(top+bottom)/2*scale};
}
export function rememberView(history:NavigationView[],view:NavigationView){const last=history.at(-1);return last&&last.x===view.x&&last.y===view.y&&last.scale===view.scale?history:[...history.slice(-49),{...view}];}
export function windowBox(a:Point,b:Point):Box{return{x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),width:Math.abs(b.x-a.x),height:Math.abs(b.y-a.y)};}
