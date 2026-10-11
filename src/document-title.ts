import {type Drawing} from './model';
export function documentChanged(drawing:Drawing,saved:Drawing|null):boolean {
 return !saved||JSON.stringify(drawing)!==JSON.stringify(saved);
}
export function documentLabel(fileName:string|null,changed:boolean):string {
 return `${changed?'* ':''}${fileName||'nouveau fichier'}`;
}
export function nativeFileName(name:string):string {
 return (name.trim().replace(/\.jlgcad$/i,'').replace(/[\\/:*?"<>|]/g,'_')||'dessin')+'.jlgcad';
}
