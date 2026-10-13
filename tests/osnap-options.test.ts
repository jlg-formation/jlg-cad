import {test,expect} from 'bun:test';
import {snapPoint} from '../src/geometry';
import type {Shape} from '../src/model';

const line:Shape={id:'line',type:'line',a:{x:0,y:0},b:{x:100,y:0},color:'#abcdef'};
test('OSnap only selects enabled kinds and supports disabling all kinds',()=>{
 expect(snapPoint({x:1,y:0},[line],5,['Extrémité'])?.kind).toBe('Extrémité');
 expect(snapPoint({x:1,y:0},[line],5,['Milieu'])).toBeNull();
 expect(snapPoint({x:50,y:1},[line],5,['Milieu'])?.kind).toBe('Milieu');
 expect(snapPoint({x:50,y:1},[line],5,[])).toBeNull();
 const crossing:Shape={...line,id:'crossing',a:{x:25,y:-50},b:{x:25,y:50}};
 expect(snapPoint({x:25,y:1},[line,crossing],5,['Intersection'])?.point).toEqual({x:25,y:0});
 const circle:Shape={...line,id:'circle',type:'circle'};
 expect(snapPoint({x:1,y:1},[circle],5,['Centre'])?.kind).toBe('Centre');
 expect(snapPoint({x:1,y:1},[circle],5,['Milieu'])).toBeNull();
});
