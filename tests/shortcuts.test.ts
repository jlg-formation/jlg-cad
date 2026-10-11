import {describe,test,expect} from 'bun:test';
import {chord,defaults,readBindings,conflict,reserved} from '../src/shortcuts';
describe('Raccourcis personnalisés',()=>{
 test('rétablit avec les deux combinaisons usuelles',()=>{expect(defaults().redo).toEqual(['Ctrl+Y','Ctrl+Shift+Z']);});
 test('normalise la touche et les modificateurs',()=>{expect(chord({key:'z',ctrlKey:true,metaKey:false,shiftKey:true,altKey:false})).toBe('Ctrl+Shift+Z');expect(chord({key:'Control',ctrlKey:true,metaKey:false,shiftKey:false,altKey:false})).toBe('');});
 test('conserve modifications et raccourcis retirés après sérialisation',()=>{const b=defaults();b.line=['Q'];b.redo=[];expect(readBindings(JSON.stringify(b))).toEqual(b);});
 test('détecte un conflit et les combinaisons réservées',()=>{expect(conflict(defaults(),'line','V')?.[0]).toBe('select');expect(reserved('Ctrl+W')).toBe(true);expect(reserved('Ctrl+Shift+Z')).toBe(false);});
 test('tolère des préférences corrompues et ignore des entrées invalides',()=>{expect(readBindings('oops')).toEqual(defaults());expect(readBindings('{"line":[null]}').line).toEqual(['L']);expect(readBindings('{"line":["Ctrl+W"]}').line).toEqual(['L']);});
});
