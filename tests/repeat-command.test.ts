import {expect,test} from 'bun:test';
import {defaults} from '../src/shortcuts';
import {isRepeatKey,repeatableHistory,repeatKeys} from '../src/repeat-command';

const key=(value:string,modifiers={})=>({key:value,ctrlKey:false,metaKey:false,altKey:false,shiftKey:false,...modifiers});

test('idle repeat shares Enter with finish, while modified keys keep their own actions',()=>{
 const bindings=defaults();
 expect(isRepeatKey(key('Enter'),bindings)).toBe(true);
 expect(isRepeatKey(key(' '),bindings)).toBe(true);
 for(const modifier of ['ctrlKey','metaKey','altKey','shiftKey']){
  expect(isRepeatKey(key(' ',{[modifier]:true}),bindings)).toBe(false);
  expect(isRepeatKey(key('Enter',{[modifier]:true}),bindings)).toBe(false);
 }
 expect(isRepeatKey(key('Escape'),bindings)).toBe(false);
});

test('custom assignments take precedence without modifying saved preferences',()=>{
 const bindings=defaults();bindings.line=['Enter'];bindings.circle=[' '];bindings.finish=[];
 const saved=JSON.stringify(bindings);
 expect(repeatKeys(bindings)).toEqual([]);
 expect(isRepeatKey(key('Enter'),bindings)).toBe(false);
 expect(JSON.stringify(bindings)).toBe(saved);
 bindings.line=[];
 expect(repeatKeys(bindings)).toEqual(['Enter']);
});

test('space changes fall back to the last compatible tool and preserve the history',()=>{
 const history=['viewport','move','join','text','line','select','pan'];
 const modelOnly=['move','join'];
 expect(repeatableHistory(history,false,modelOnly)).toEqual(['move','join','line']);
 expect(repeatableHistory(history,true,modelOnly)).toEqual(['viewport','join','text','line']);
 expect(history[0]).toBe('viewport');
 expect(repeatableHistory(['move'],true,modelOnly)).toEqual([]);
 expect(repeatableHistory([],false,modelOnly)).toEqual([]);
});
