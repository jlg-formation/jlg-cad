import {documentOf,parseDrawing,type Drawing} from './model';

export const tabDocumentKey='jlg-cad-session';
type SessionStore=Pick<Storage,'getItem'|'setItem'>;
export type TabDocumentState={drawing:Drawing;fileName:string|null;saved:Drawing|null};
export const blankTabDocument=():TabDocumentState=>{const drawing=documentOf('Sans titre',[]);return{drawing,fileName:null,saved:drawing};};

// A newly opened/duplicated tab can inherit its opener's sessionStorage.
// Only a reload or history restoration should restore that snapshot.
export function loadTabDocument(store:SessionStore,navigationType:string):Drawing {
 return loadTabDocumentState(store,navigationType).drawing;
}
export function loadTabDocumentState(store:SessionStore,navigationType:string):TabDocumentState {
 if(navigationType==='reload'||navigationType==='back_forward'){
  try{const text=store.getItem(tabDocumentKey);if(text){
   const value=JSON.parse(text);
   if(value?.format==='jlg-cad-tab'&&value.version===1){
    const drawing=parseDrawing(JSON.stringify(value.drawing));
    return{drawing,fileName:typeof value.fileName==='string'&&value.fileName?value.fileName:null,saved:value.saved?parseDrawing(JSON.stringify(value.saved)):null};
   }
   return{drawing:parseDrawing(text),fileName:null,saved:documentOf('Sans titre',[])};
  }}catch{/* Keep the editor usable when storage is unavailable or corrupted. */}
 }
 return blankTabDocument();
}

export function saveTabDocument(store:SessionStore,drawing:Drawing,fileName:string|null=null,saved:Drawing|null=null):void {
 store.setItem(tabDocumentKey,JSON.stringify({format:'jlg-cad-tab',version:1,drawing,fileName,saved}));
}
