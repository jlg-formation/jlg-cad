import {test,expect} from 'bun:test';
import {cursorMode} from '../src/cursor';
import type {Tool} from '../src/architecture';
const state=(tool:Tool)=>({tool,hasSource:false,selectingDimension:false,choosingBoundaries:false,positioning:false,editingText:false});
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
