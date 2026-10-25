import type { Tool } from './architecture';
import type {Point} from './model';

export function panCursorPosition(point:Point,before:Point,after:Point):Point{
 return{x:point.x+after.x-before.x,y:point.y+after.y-before.y};
}

export type CursorMode = 'idle' | 'point' | 'object' | 'text' | 'pan';
export function cursorMode(state: {
 tool: Tool; hasSource: boolean; selectingDimension: boolean;
 choosingBoundaries: boolean; positioning: boolean; editingText: boolean;
}): CursorMode {
 if(state.editingText)return 'text';
 if(state.positioning)return 'point';
 if(state.tool==='pan')return 'pan';
 if(state.choosingBoundaries)return 'object';
 if(state.tool==='select')return 'idle';
 if(['trim','extend','join','fillet'].includes(state.tool))return 'object';
 if(['offset','move','copy','scale','rotate','mirror','diameter','radius','arcDimension','jogged'].includes(state.tool))return state.hasSource?'point':'object';
 if((state.tool==='dimension'||state.tool==='linearDimension'||state.tool==='alignedDimension')&&state.selectingDimension)return 'object';
 return 'point';
}
