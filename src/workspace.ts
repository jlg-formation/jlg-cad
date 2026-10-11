import {parseDrawing,type Drawing} from './model';
export type DrawingFile={format:'jlg-cad-workspace';version:1;name:string;drawings:Drawing[];activeDrawing:number};
export function drawingFile(name:string,drawings:Drawing[],activeDrawing=0):DrawingFile{
 if(!drawings.length)throw new Error('Le fichier doit contenir au moins un dessin.');
 return{format:'jlg-cad-workspace',version:1,name,drawings,activeDrawing:Math.max(0,Math.min(drawings.length-1,activeDrawing))};
}
export function parseDrawingFile(text:string):DrawingFile{
 const value=JSON.parse(text);
 if(value?.format!=='jlg-cad-workspace'){const doc=parseDrawing(text);return drawingFile(doc.name,[doc]);}
 if(value.version!==1||!Array.isArray(value.drawings)||!value.drawings.length)throw new Error('Fichier de dessins invalide.');
 const drawings=value.drawings.map((doc:unknown)=>parseDrawing(JSON.stringify(doc)));
 return drawingFile(typeof value.name==='string'?value.name:'Dessins',drawings,Number.isInteger(value.activeDrawing)?value.activeDrawing:0);
}
export function nextDrawingName(drawings:Drawing[]):string{const names=new Set(drawings.map(d=>d.name));let n=1;while(names.has('Drawing '+n))n++;return 'Drawing '+n;}
