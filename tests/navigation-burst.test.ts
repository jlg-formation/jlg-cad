import {test,expect} from 'bun:test';
import {createLiveNavigation,listenCanvasWheel,panByWheel,zoomAt} from '../src/navigation';
import {panCursorPosition} from '../src/cursor';

test('des axes livrés séparément avant le prochain rendu ne s’écrasent pas',()=>{
 const canvas=new EventTarget(),live=createLiveNavigation(),staleRender={x:20,y:30,scale:.01};
 const frame={width:900,height:700};let next=staleRender,pointer={x:470,y:340};
 live.write('model',staleRender);
 const stop=listenCanvasWheel(canvas,event=>{
  const current=live.read('model',staleRender);
  next=panByWheel(current,event,frame);
  pointer=panCursorPosition(pointer,current,next);
  live.write('model',next);
 });
 // A single native listener and the same stale React render serve the whole burst.
 for(const [deltaX,deltaY] of [[10,0],[0,20],[-2,0],[0,-5],[.5,.25]]){
  canvas.dispatchEvent(Object.assign(new Event('wheel',{cancelable:true}),{deltaX,deltaY,deltaMode:0}));
 }
 expect(next).toEqual({x:11.5,y:14.75,scale:.01});
 expect(pointer).toEqual({x:461.5,y:324.75});
 expect((pointer.x-next.x)/next.scale).toBe((470-staleRender.x)/staleRender.scale);
 expect((pointer.y-next.y)/next.scale).toBe((340-staleRender.y)/staleRender.scale);
 expect(staleRender).toEqual({x:20,y:30,scale:.01});
 stop();
});

test('pan et zoom consécutifs utilisent immédiatement le dernier cadrage',()=>{
 const live=createLiveNavigation(),stale={x:20,y:30,scale:1},frame={width:900,height:700};
 const pan=panByWheel(live.read('model',stale),{deltaX:10,deltaY:20,deltaMode:0},frame);
 live.write('model',pan);
 const zoom=zoomAt(live.read('model',stale),{x:100,y:100},2);
 live.write('model',zoom);
 const next=panByWheel(live.read('model',stale),{deltaX:5,deltaY:10,deltaMode:0},frame);
 expect(next).toEqual({x:-85,y:-90,scale:2});
});

test('le cumul isole les espaces et se synchronise avec un nouveau cadrage validé',()=>{
 const live=createLiveNavigation(),model={x:20,y:30,scale:1},viewport={x:3,y:4,scale:.1};
 live.write('model',model);
 expect(live.read('layout:viewport',viewport)).toEqual(viewport);
 live.write('layout:viewport',{x:8,y:9,scale:.1});
 expect(live.read('model',model)).toEqual(model);
 const fit={x:50,y:60,scale:3};
 live.write('model',fit);
 expect(live.read('model',model)).toEqual(fit);
});
