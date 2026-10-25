import {test,expect} from 'bun:test';
import {renderToStaticMarkup} from 'react-dom/server';
import {recordWheelDiagnostic,NavigationDiagnostic} from '../src/navigation-diagnostic';
import {getLanguage,setLanguage} from '../src/i18n';

const wheel=(deltaX:number,deltaY:number,ctrlKey=false,deltaMode=0)=>({deltaX,deltaY,ctrlKey,deltaMode});

test('le diagnostic distingue axes séparés, axes simultanés et pincements',()=>{
 let data=recordWheelDiagnostic(null,wheel(10,0),'pan',100);
 data=recordWheelDiagnostic(data,wheel(0,20),'pan',101);
 data=recordWheelDiagnostic(data,wheel(3,-4),'pan',102);
 data=recordWheelDiagnostic(data,wheel(0,-2,true),'zoom',103);
 data=recordWheelDiagnostic(data,wheel(0,1,false,1),'ignored',104);
 expect(data).toMatchObject({count:5,horizontal:1,vertical:2,diagonal:1,pinch:1});
 expect(data.samples[0]).toEqual({time:100,x:10,y:0,unit:0,action:'pan'});
 expect(data.samples[4]).toEqual({time:104,x:0,y:1,unit:1,action:'ignored'});
});

test('les mesures ne perdent aucun événement rapide et la trace reste bornée',()=>{
 let data=recordWheelDiagnostic(null,wheel(0,0),'ignored',0);
 for(let i=1;i<=100;i++)data=recordWheelDiagnostic(data,wheel(i,0),'pan',i);
 expect(data.count).toBe(101);expect(data.horizontal).toBe(100);
 expect(data.samples).toHaveLength(12);expect(data.samples[0].time).toBe(89);
 expect(recordWheelDiagnostic(null,wheel(0,4),'pan',200).count).toBe(1);
});

test('le panneau présente les événements bruts et les contrôles dans les deux langues',()=>{
 const previous=getLanguage();try{
  for(const language of ['fr','en'] as const){
   setLanguage(language);
   const html=renderToStaticMarkup(<NavigationDiagnostic data={recordWheelDiagnostic(null,wheel(3,4),'pan',100)} onReset={()=>{}} onClose={()=>{}}/>);
   expect(html).toContain(language==='fr'?'Deux axes ensemble':'Both axes together');
   expect(html).toContain(language==='fr'?'Effacer les mesures':'Clear measurements');
   expect(html).toContain('ΔX');expect(html).toContain('ΔY');
  }
 }finally{setLanguage(previous);}
});
