import {describe,test,expect} from 'bun:test';
import {chord,defaults,readBindings,conflict,reserved} from '../src/shortcuts';
describe('Raccourcis personnalisés',()=>{
 test('ORTHO accepte F8 et Ctrl+L et migre le raccourci standard existant',()=>{
  expect(defaults().ortho).toEqual(['F8','Ctrl+L']);
  expect(reserved('Ctrl+L')).toBe(false);
  expect(readBindings('{"ortho":["F8"]}').ortho).toEqual(['F8','Ctrl+L']);
  expect(readBindings('{"ortho":[]}').ortho).toEqual([]);
  expect(readBindings('{"ortho":["F9"]}').ortho).toEqual(['F9']);
  expect(chord({key:'l',ctrlKey:true,metaKey:false,shiftKey:false,altKey:false})).toBe('Ctrl+L');
 });
 test('rétablit avec les deux combinaisons usuelles',()=>{expect(defaults().redo).toEqual(['Ctrl+Y','Ctrl+Shift+Z']);});
 test('normalise la touche et les modificateurs',()=>{expect(chord({key:'z',ctrlKey:true,metaKey:false,shiftKey:true,altKey:false})).toBe('Ctrl+Shift+Z');expect(chord({key:'Control',ctrlKey:true,metaKey:false,shiftKey:false,altKey:false})).toBe('');});
 test('conserve modifications et raccourcis retirés après sérialisation',()=>{const b=defaults();b.line=['Q'];b.redo=[];expect(readBindings(JSON.stringify(b))).toEqual(b);});
 test('détecte un conflit et les combinaisons réservées',()=>{expect(conflict(defaults(),'line','V')?.[0]).toBe('select');expect(reserved('Ctrl+W')).toBe(true);expect(reserved('Ctrl+Shift+Z')).toBe(false);});
 test('tolère des préférences corrompues et ignore des entrées invalides',()=>{expect(readBindings('oops')).toEqual(defaults());expect(readBindings('{"line":[null]}').line).toEqual(['L']);expect(readBindings('{"line":["Ctrl+W"]}').line).toEqual(['L']);});
});

test('raccourcis presse-papiers AutoCAD disponibles et personnalisables',()=>{
 const b=defaults();expect(b.copyClip).toEqual(['Ctrl+C']);expect(b.cutClip).toEqual(['Ctrl+X']);expect(b.pasteClip).toEqual(['Ctrl+V']);expect(b.copyBase).toEqual(['Ctrl+Shift+C']);
 expect(readBindings('{"line":["L"]}').copyBase).toEqual(['Ctrl+Shift+C']);
 expect(readBindings(JSON.stringify(b))).toEqual(b);
 b.copyClip=['Ctrl+Shift+J'];expect(readBindings(JSON.stringify(b)).copyClip).toEqual(['Ctrl+Shift+J']);
});
