import {isPaperDimensionTool} from './paper-dimensions';
import {chord,type Bindings} from './shortcuts';

// Enter's default finish binding also acts as repeat when the editor is idle.
export function repeatKeys(bindings:Bindings){
 return ['Enter',' '].filter(key=>!Object.entries(bindings).some(([id,keys])=>id!=='finish'&&keys.includes(key)));
}
export function isRepeatKey(event:Pick<KeyboardEvent,'key'|'ctrlKey'|'metaKey'|'altKey'|'shiftKey'>,bindings:Bindings){
 return !event.ctrlKey&&!event.metaKey&&!event.altKey&&!event.shiftKey&&repeatKeys(bindings).includes(chord(event));
}
export function repeatableHistory<T extends string>(history:readonly T[],paper:boolean,modelOnly:readonly T[]):T[]{
 return history.filter(tool=>tool!=='select'&&tool!=='pan'&&(paper?tool==='join'||isPaperDimensionTool(tool)||!modelOnly.includes(tool):tool!=='viewport'&&tool!=='text'));
}
