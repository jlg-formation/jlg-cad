import {test,expect} from 'bun:test';
import {renderToStaticMarkup} from 'react-dom/server';
import {createWheelNavigationDetector,panByWheel,readNavigationMode,type NavigationMode} from '../src/navigation';
import {NavigationModeSettings} from '../src/navigation-settings';
import {getLanguage,setLanguage} from '../src/i18n';

const wheel=(deltaY=100,patch:Partial<WheelEvent>={})=>({deltaX:0,deltaY,deltaMode:0,ctrlKey:false,...patch});

test('le mode est mémorisable et Automatique est le défaut',()=>{
 for(const mode of ['auto','trackpad','mouse'])expect(readNavigationMode(mode)).toBe(mode);
 for(const value of [null,'','invalid','MOUSE'])expect(readNavigationMode(value)).toBe('auto');
});

test('les modes explicites priment sur les caractéristiques du défilement',()=>{
 const detect=createWheelNavigationDetector();
 expect(detect(wheel(100),'trackpad',0)).toBe('pan');
 expect(detect(wheel(.5,{deltaX:12}),'mouse',10)).toBe('zoom');
 for(const mode of ['auto','trackpad','mouse'] as const)expect(detect(wheel(-2,{ctrlKey:true}),mode,20)).toBe('zoom');
});

test('Automatique reconnaît les gestes fins ou horizontaux et les molettes à crans',()=>{
 for(const event of [wheel(3),wheel(.5),wheel(90.25),wheel(80,{deltaX:10}),wheel(0,{deltaX:-10})])expect(createWheelNavigationDetector()(event,'auto',0)).toBe('pan');
 for(const event of [wheel(100),wheel(-120),wheel(3,{deltaMode:1}),wheel(1,{deltaMode:2})])expect(createWheelNavigationDetector()(event,'auto',0)).toBe('zoom');
});

test('un geste garde son comportement pendant accélération et inertie puis permet de changer de périphérique',()=>{
 const detect=createWheelNavigationDetector();
 expect(detect(wheel(5),'auto',0)).toBe('pan');
 expect(detect(wheel(100),'auto',20)).toBe('pan');
 expect(detect(wheel(.25),'auto',70)).toBe('pan');
 expect(detect(wheel(120),'auto',400)).toBe('zoom');
 expect(detect(wheel(12),'auto',420)).toBe('zoom');
 expect(detect(wheel(-1.25),'auto',750)).toBe('pan');
});

test('un changement de mode relance la détection, et un pincement ne classe pas la molette suivante',()=>{
 const detect=createWheelNavigationDetector();
 expect(detect(wheel(2),'auto',0)).toBe('pan');
 expect(detect(wheel(2),'mouse',10)).toBe('zoom');
 expect(detect(wheel(100),'auto',20)).toBe('zoom');
 const fresh=createWheelNavigationDetector();
 expect(fresh(wheel(-2,{ctrlKey:true}),'auto',0)).toBe('zoom');
 expect(fresh(wheel(100),'auto',20)).toBe('zoom');
});

test('le déplacement suit les deux axes sans changer échelle ou vue source',()=>{
 const view={x:20,y:30,scale:.01},frame={width:900,height:600};
 expect(panByWheel(view,wheel(40,{deltaX:-12}),frame)).toEqual({x:32,y:-10,scale:.01});
 expect(view).toEqual({x:20,y:30,scale:.01});
 expect(panByWheel(view,wheel(2,{deltaX:1,deltaMode:1}),frame)).toEqual({x:4,y:-2,scale:.01});
 expect(panByWheel(view,wheel(1,{deltaX:-1,deltaMode:2}),frame)).toEqual({x:920,y:-570,scale:.01});
});

test('les paramètres exposent trois modes avec une aide adaptée dans les deux langues',()=>{
 const previous=getLanguage();
 try{
  for(const language of ['fr','en'] as const){
   setLanguage(language);
   for(const mode of ['auto','trackpad','mouse'] as NavigationMode[]){
    const html=renderToStaticMarkup(<NavigationModeSettings value={mode} onChange={()=>{}}/>);
    expect(html.match(/<option /g)).toHaveLength(3);
    expect(html).toContain(`value="${mode}" selected=""`);
    expect(html).toContain(language==='fr'?'Mode de navigation':'Navigation mode');
    expect(html).toContain(language==='fr'?'conservé sur cet appareil':'saved on this device');
   }
  }
 }finally{setLanguage(previous);}
});
