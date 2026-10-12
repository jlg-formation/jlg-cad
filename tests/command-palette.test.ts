import {test,expect} from 'bun:test';
import {paletteCommands,paletteSuggestions,resolvePaletteCommand,rememberCommand,groupPaletteCommands} from '../src/command-palette';

test('empty input opens the complete palette only on request',()=>{
 expect(paletteSuggestions('')).toEqual([]);
 expect(paletteSuggestions('',{},true)).toEqual(paletteCommands);
 expect(new Set(paletteCommands.map(c=>c.id)).size).toBe(paletteCommands.length);
 for(const id of ['line','save','open','undo','copyClip','pdfAll','settings','help:about','zoom'])expect(paletteCommands.some(c=>c.id===id)).toBe(true);
});
test('fuzzy matching searches French labels and ordered letters without accents',()=>{
 expect(paletteSuggestions('plgn')[0].id).toBe('polyline');
 expect(paletteSuggestions('paramètres')[0].id).toBe('settings');
 expect(paletteSuggestions('svgrd')[0].id).toBe('save');
 expect(paletteSuggestions('zzzz')).toEqual([]);
});
test('exact CAD aliases and customized letter bindings take priority',()=>{
 for(const [query,id]of [['L','line'],['PL','polyline'],['C','circle'],['CO','copy'],['DLI','linearDimension'],['Z','zoom']]){
  expect(paletteSuggestions(query)[0].id).toBe(id);
  expect(resolvePaletteCommand(query)?.id).toBe(id);
 }
 expect(paletteSuggestions('Q',{line:['Q']})[0].id).toBe('line');
 expect(resolvePaletteCommand('Ctrl+Q',{line:['Ctrl+Q']})).toBeUndefined();
});

test('recent commands are unique, limited to two and ordered by last use',()=>{
 let history:string[]=[];
 expect(history).toEqual([]);
 history=rememberCommand(history,'line');expect(history).toEqual(['line']);
 history=rememberCommand(history,'save');expect(history).toEqual(['save','line']);
 history=rememberCommand(history,'line');expect(history).toEqual(['line','save']);
 history=rememberCommand(history,'circle');expect(history).toEqual(['circle','line']);
});
test('recent groups filter against available matches and separate only nonempty groups',()=>{
 const matches=paletteSuggestions('',{},true);
 const empty=groupPaletteCommands(matches,[],'');
 expect(empty.separatorIndex).toBe(-1);
 expect(empty.commands.map(c=>c.name)).toEqual([...matches].sort((a,b)=>a.name.localeCompare(b.name,'fr')).map(c=>c.name));
 const two=groupPaletteCommands(matches,['save','line'],'');
 expect(two.commands.slice(0,2).map(c=>c.id)).toEqual(['save','line']);
 expect(two.separatorIndex).toBe(2);
 expect(new Set(two.commands.map(c=>c.id)).size).toBe(matches.length);
 const one=groupPaletteCommands(matches,['save'],'');expect(one.separatorIndex).toBe(1);
 const filtered=groupPaletteCommands(paletteSuggestions('plgn'),['save','line'],'plgn');
 expect(filtered.separatorIndex).toBe(-1);expect(filtered.commands.map(c=>c.id)).toEqual(['polyline']);
 const onlyRecent=groupPaletteCommands(paletteSuggestions('plgn'),['polyline'],'plgn');
 expect(onlyRecent.separatorIndex).toBe(-1);
 expect(groupPaletteCommands(matches.filter(c=>c.id!=='line'),['line'],'').separatorIndex).toBe(-1);
});
