import {describe,it,expect} from 'bun:test';
import {documentOf,newLayout} from '../src/model';
import {drawingFile,parseDrawingFile,nextDrawingName} from '../src/workspace';
describe('fichier avec plusieurs dessins',()=>{
 it('restaure les modèles, calques et layouts indépendants et le dessin actif',()=>{
 const a=documentOf('Maison',[{id:'line',type:'line',a:{x:0,y:0},b:{x:5000,y:0},color:'#ffffff'}],[newLayout('same','Layout 1')]);
 const b=documentOf('Église',[],[newLayout('same','Plan façade')]);b.layers[0].name='Église';
 const result=parseDrawingFile(JSON.stringify(drawingFile('Projet',[a,b],1)));
 expect(result.name).toBe('Projet');expect(result.activeDrawing).toBe(1);expect(result.drawings).toEqual([a,b]);
 result.drawings[0].layers[0].name='Modifié';expect(result.drawings[1].layers[0].name).toBe('Église');
 });
 it('ouvre les anciens fichiers avec un seul dessin',()=>{const a=documentOf('Ancien',[]);expect(parseDrawingFile(JSON.stringify(a)).drawings).toEqual([a]);});
 it('rejette une collection vide et un dessin invalide sans ouverture partielle',()=>{expect(()=>parseDrawingFile(JSON.stringify({format:'jlg-cad-workspace',version:1,drawings:[]}))).toThrow();expect(()=>parseDrawingFile(JSON.stringify({format:'jlg-cad-workspace',version:1,drawings:[documentOf('Bon',[]),{}]}))).toThrow();});
 it('borne le dessin actif et refuse une version inconnue',()=>{expect(drawingFile('Projet',[documentOf('A',[])],7).activeDrawing).toBe(0);expect(()=>parseDrawingFile(JSON.stringify({format:'jlg-cad-workspace',version:9,drawings:[documentOf('A',[])]}))).toThrow();});
 it('choisit un nom de dessin disponible',()=>{expect(nextDrawingName([documentOf('Drawing 1',[]),documentOf('Drawing 3',[])])).toBe('Drawing 2');});
});
