import { describe, expect, test } from 'bun:test';
import { documentOf, parseDrawing, toDxf, type Shape } from '../src/model';
const rect:Shape={id:'1',type:'rect',a:{x:10,y:20},b:{x:50,y:70},color:'#abcdef'};
describe('Fichiers CAD',()=>{
 test('aller-retour natif sans perte',()=>{const d=documentOf('Plan',[rect]);expect(parseDrawing(JSON.stringify(d))).toEqual(d);});
 test('rejette les fichiers invalides et les identifiants dupliqués',()=>{expect(()=>parseDrawing('{}')).toThrow();expect(()=>parseDrawing(JSON.stringify(documentOf('Plan',[rect,rect])))).toThrow();expect(()=>parseDrawing(JSON.stringify(documentOf('Plan',[{...rect,a:{x:Infinity,y:0}}])))).toThrow();});
 test('exporte le rectangle comme contour fermé et inverse Y',()=>{const text=toDxf([rect]);expect(text).toContain('LWPOLYLINE');expect(text).toContain('90\r\n4\r\n70\r\n1');expect(text).toContain('10\r\n10\r\n20\r\n-20');expect(text.endsWith('0\r\nEOF\r\n')).toBe(true);});
 test('exporte le rayon géométrique',()=>{expect(toDxf([{...rect,type:'circle',a:{x:0,y:0},b:{x:3,y:4}}])).toContain('40\r\n5\r\n');});
});
