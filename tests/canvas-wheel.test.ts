import {test,expect,spyOn} from 'bun:test';
import {listenCanvasWheel,zoomAt,createWheelNavigationDetector,panByWheel,wheelZoomFactor,defaultTrackpadZoomSpeed} from '../src/navigation';

const wheel=(deltaY:number,ctrlKey=false)=>Object.assign(new Event('wheel',{cancelable:true}),{deltaX:0,deltaY,deltaMode:0,ctrlKey,clientX:470,clientY:340});

test('le gestionnaire natif autorise explicitement le blocage du zoom navigateur',()=>{
 const canvas=new EventTarget(),listen=spyOn(canvas,'addEventListener');
 const stop=listenCanvasWheel(canvas,()=>{});
 expect(listen).toHaveBeenCalledWith('wheel',expect.any(Function),{passive:false});
 stop();
 listen.mockRestore();
});

test('le pincement bloque le zoom navigateur et zoome le dessin autour du pointeur',()=>{
 const canvas=new EventTarget(),initial={x:20,y:30,scale:.01};
 let view=initial;
 const stop=listenCanvasWheel(canvas,event=>{
  expect(event.defaultPrevented).toBe(true);
  view=zoomAt(view,{x:event.clientX,y:event.clientY},wheelZoomFactor(event,700,defaultTrackpadZoomSpeed));
 });
 const pinch=wheel(-80,true);
 expect(canvas.dispatchEvent(pinch)).toBe(false);
 expect(view.scale).toBeGreaterThan(initial.scale);
 expect((470-view.x)/view.scale).toBeCloseTo((470-initial.x)/initial.scale);
 expect((340-view.y)/view.scale).toBeCloseTo((340-initial.y)/initial.scale);
 canvas.dispatchEvent(wheel(80,true));
 expect(view.scale).toBeCloseTo(initial.scale);
 stop();
});

test('les événements natifs déplacent la vue puis pincent sans zoomer la page',()=>{
 const canvas=new EventTarget(),detect=createWheelNavigationDetector(),frame={width:900,height:700};
 let view={x:20,y:30,scale:.01};
 const stop=listenCanvasWheel(canvas,event=>{
  view=detect(event,'trackpad',0)==='pan'?panByWheel(view,event,frame):zoomAt(view,{x:event.clientX,y:event.clientY},wheelZoomFactor(event,frame.height,defaultTrackpadZoomSpeed));
 });
 const slide=Object.assign(wheel(25),{deltaX:-10});
 expect(canvas.dispatchEvent(slide)).toBe(false);
 expect(view).toEqual({x:30,y:5,scale:.01});
 const before={...view},pinch=wheel(-2,true);
 expect(canvas.dispatchEvent(pinch)).toBe(false);
 expect(view.scale).toBeGreaterThan(before.scale);
 expect((470-view.x)/view.scale).toBeCloseTo((470-before.x)/before.scale);
 expect((340-view.y)/view.scale).toBeCloseTo((340-before.y)/before.scale);
 stop();
});

test('la molette est transmise et le navigateur reste bloqué même si la navigation est ignorée',()=>{
 const canvas=new EventTarget();
 let calls=0;
 const stop=listenCanvasWheel(canvas,()=>{calls++;});
 const event=wheel(100);
 canvas.dispatchEvent(event);
 expect(event.defaultPrevented).toBe(true);
 expect(calls).toBe(1);
 stop();
});

test('le blocage reste local au dessin et disparaît après démontage',()=>{
 const canvas=new EventTarget(),panel=new EventTarget();
 let calls=0;
 const stop=listenCanvasWheel(canvas,()=>{calls++;});
 const outside=wheel(-50,true);
 panel.dispatchEvent(outside);
 expect(outside.defaultPrevented).toBe(false);
 expect(calls).toBe(0);
 stop();
 const after=wheel(-50,true);
 canvas.dispatchEvent(after);
 expect(after.defaultPrevented).toBe(false);
 expect(calls).toBe(0);
});
