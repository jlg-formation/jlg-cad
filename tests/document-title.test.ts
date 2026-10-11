import {expect,test} from 'bun:test';
import {documentChanged,documentLabel,nativeFileName} from '../src/document-title';
import {documentOf} from '../src/model';
import {loadTabDocumentState,saveTabDocument,tabDocumentKey} from '../src/tab-document';
test('new, opened, modified and restored documents have consistent labels',()=>{
 const saved=documentOf('Nom interne',[]),drawing={...saved,shapes:[{id:'1',type:'line' as const,a:{x:0,y:0},b:{x:100,y:0},color:'#abcdef'}]};
 expect(documentLabel(null,false)).toBe('nouveau fichier');expect(documentLabel('Maison.jlgcad',false)).toBe('Maison.jlgcad');
 expect(documentLabel('Maison.jlgcad',documentChanged(drawing,saved))).toBe('* Maison.jlgcad');
 expect(documentChanged({...saved},saved)).toBe(false);expect(documentLabel(null,true)).toBe('* nouveau fichier');
});
test('session preserves actual filename and saved baseline across reload without leaking into new tabs',()=>{
 const data=new Map<string,string>(),store={getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value);}};
 const saved=documentOf('Different internal name',[]),drawing={...saved,name:'Modified'};
 saveTabDocument(store,drawing,'Actual filename.jlgcad',saved);
 const state=loadTabDocumentState(store,'reload');expect(state.fileName).toBe('Actual filename.jlgcad');expect(documentChanged(state.drawing,state.saved)).toBe(true);
 expect(loadTabDocumentState(store,'navigate').fileName).toBeNull();expect(documentChanged(loadTabDocumentState(store,'navigate').drawing,loadTabDocumentState(store,'navigate').saved)).toBe(false);
 store.setItem(tabDocumentKey,JSON.stringify(saved));expect(loadTabDocumentState(store,'reload').drawing).toEqual(saved);
});
test('download name matches displayed filename with one native extension',()=>{
 expect(nativeFileName('Maison.jlgcad')).toBe('Maison.jlgcad');expect(nativeFileName(' Maison ')).toBe('Maison.jlgcad');expect(nativeFileName('A/B')).toBe('A_B.jlgcad');
});
