import type { Tool } from './architecture';

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
 if(['offset','move','copy','rotate','mirror','diameter'].includes(state.tool))return state.hasSource?'point':'object';
 if((state.tool==='dimension'||state.tool==='linearDimension')&&state.selectingDimension)return 'object';
 return 'point';
}
