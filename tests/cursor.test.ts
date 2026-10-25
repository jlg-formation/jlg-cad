import {test,expect} from 'bun:test';
import {cursorMode,panCursorPosition} from '../src/cursor';
import {panByWheel} from '../src/navigation';
import type {Tool} from '../src/architecture';
const state=(tool:Tool)=>({tool,hasSource:false,selectingDimension:false,choosingBoundaries:false,positioning:false,editingText:false});

test('le curseur suit exactement le dessin pendant les deux axes du pan au trackpad',()=>{
 const view={x:20,y:30,scale:.01},pointer={x:470,y:340};
 const next=panByWheel(view,{deltaX:-12,deltaY:40,deltaMode:0},{width:900,height:700});
 const cursor=panCursorPosition(pointer,view,next);
 expect(cursor).toEqual({x:482,y:300});
 expect((cursor.x-next.x)/next.scale).toBeCloseTo((pointer.x-view.x)/view.scale);
 expect((cursor.y-next.y)/next.scale).toBeCloseTo((pointer.y-view.y)/view.scale);
 expect(pointer).toEqual({x:470,y:340});
});

test('les événements successifs et leur inertie cumulent le déplacement sans retour au pointeur système',()=>{
 const origin={x:20,y:30,scale:2},pointer={x:470,y:340},frame={width:900,height:700};
 let view=origin,cursor=pointer;
 for(const [deltaX,deltaY] of [[10,20],[30,-5],[.5,.25]]){
  const next=panByWheel(view,{deltaX,deltaY,deltaMode:0},frame);
  cursor=panCursorPosition(cursor,view,next);view=next;
 }
 expect(cursor).toEqual({x:429.5,y:324.75});
 expect((cursor.x-view.x)/view.scale).toBe((pointer.x-origin.x)/origin.scale);
 expect((cursor.y-view.y)/view.scale).toBe((pointer.y-origin.y)/origin.scale);
 expect(panCursorPosition(cursor,view,origin)).toEqual(pointer);
});
test('idle, point placement and object selection have distinct cursors',()=>{
 expect(cursorMode(state('select'))).toBe('idle');
 for(const tool of ['line','circle','rect','polyline','bezier','measure','text','viewport'] as Tool[])expect(cursorMode(state(tool))).toBe('point');
 for(const tool of ['trim','extend','join'] as Tool[])expect(cursorMode({...state(tool),hasSource:true})).toBe('object');
});
test('commands switch from object selection to point placement',()=>{
 for(const tool of ['offset','move','copy','rotate','mirror','diameter'] as Tool[]){
  expect(cursorMode(state(tool))).toBe('object');
  expect(cursorMode({...state(tool),hasSource:true})).toBe('point');
 }
 for(const tool of ['dimension','linearDimension'] as Tool[]){
  expect(cursorMode({...state(tool),selectingDimension:true})).toBe('object');
  expect(cursorMode(state(tool))).toBe('point');
 }
});
test('temporary activities override the idle tool',()=>{
 expect(cursorMode({...state('select'),positioning:true})).toBe('point');
 expect(cursorMode({...state('extend'),choosingBoundaries:true})).toBe('object');
 expect(cursorMode({...state('select'),editingText:true})).toBe('text');
 expect(cursorMode(state('pan'))).toBe('pan');
});
