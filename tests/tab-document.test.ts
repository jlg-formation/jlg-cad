import {expect,test} from 'bun:test';
import {documentOf} from '../src/model';
import {loadTabDocument,saveTabDocument,tabDocumentKey} from '../src/tab-document';
const store=()=>{const data=new Map<string,string>();return{getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value);}};};
test('new and duplicated tabs start empty even with an inherited session',()=>{
 const session=store();saveTabDocument(session,documentOf('Plan A',[{id:'1',type:'line',a:{x:0,y:0},b:{x:100,y:100},color:'#abcdef'}]));
 expect(loadTabDocument(session,'navigate')).toEqual(documentOf('Sans titre',[]));
});
test('each tab restores its own document on reload and history restoration',()=>{
 const a=store(),b=store();const first=documentOf('Plan A',[]),second=documentOf('Plan B',[]);
 saveTabDocument(a,first);saveTabDocument(b,second);
 expect(loadTabDocument(a,'reload')).toEqual(first);expect(loadTabDocument(b,'reload')).toEqual(second);
 expect(loadTabDocument(a,'back_forward')).toEqual(first);
});
test('corrupt or inaccessible session does not prevent opening an empty drawing',()=>{
 const session=store();session.setItem(tabDocumentKey,'invalid');expect(loadTabDocument(session,'reload')).toEqual(documentOf('Sans titre',[]));
 expect(loadTabDocument({getItem:()=>{throw new Error('disabled');},setItem:()=>{}},'reload')).toEqual(documentOf('Sans titre',[]));
});
