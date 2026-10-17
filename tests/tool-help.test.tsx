import {test,expect} from 'bun:test';
import {renderToStaticMarkup} from 'react-dom/server';
import {labels,CommandPanel,initialSettings} from '../src/architecture';
import {toolHelp,type HelpState} from '../src/tool-help';
import {ToolHelp} from '../src/right-side-bar';
import {setLanguage,getLanguage} from '../src/i18n';

test('every tool has distinct French and English help without a generic fallback',()=>{
 for(const tool of Object.keys(labels) as HelpState['tool'][]){
  const fr=toolHelp({tool},'fr'),en=toolHelp({tool},'en');
  expect(fr.description.length).toBeGreaterThan(15);
  expect(fr.instruction.length).toBeGreaterThan(15);
  expect(en.description).not.toBe(fr.description);
  expect(en.instruction).not.toBe(fr.instruction);
 }
});

test('mirror and preselected transformations advance through source, base and endpoint',()=>{
 expect(toolHelp({tool:'mirror'}).instruction).toContain('Sélectionnez');
 expect(toolHelp({tool:'mirror',hasSource:true}).instruction).toContain('premier point de l’axe');
 expect(toolHelp({tool:'mirror',hasSource:true,points:1}).instruction).toContain('second point de l’axe');
 expect(toolHelp({tool:'move',hasSource:true,selection:2}).instruction).toContain('point de base');
 expect(toolHelp({tool:'copy',hasSource:true,points:1}).instruction).toContain('destination');
});

test('construction steps and submodes follow confirmed state',()=>{
 expect(toolHelp({tool:'rect',hasDraft:true}).instruction).toContain('coin opposé');
 expect(toolHelp({tool:'circle',hasDraft:true}).instruction).toContain('rayon');
 const arc=[0,1,2].map(points=>toolHelp({tool:'arc',points}).instruction);
 expect(new Set(arc).size).toBe(3);
 expect(toolHelp({tool:'polyline',nodes:2,segment:'arc'}).instruction).toContain('sommet de l’arc');
 expect(toolHelp({tool:'offset'}).instruction).toContain('distance');
 expect(toolHelp({tool:'offset',offsetReady:true}).instruction).toContain('Sélectionnez');
 expect(toolHelp({tool:'offset',offsetReady:true,hasSource:true}).instruction).toContain('côté');
 expect(toolHelp({tool:'trim',choosingBoundaries:true}).instruction).toContain('limites');
 expect(toolHelp({tool:'trim',sweeping:true}).instruction).toContain('Relâchez');
 expect(toolHelp({tool:'hatch',hatchOrigin:true}).instruction).toContain('origine');
 expect(toolHelp({tool:'hatch',hatchMode:'objects'}).instruction).toContain('îlots');
 expect(toolHelp({tool:'join',joinTargets:true}).instruction).toContain('source');
 expect(toolHelp({tool:'linearDimension',linearSelectObject:true}).instruction).toContain('côté');
 expect(toolHelp({tool:'diameter',sourceIsCircle:true}).instruction).toContain('placer');
 expect(toolHelp({tool:'measure',measurement:true,points:2}).instruction).toContain('nouvelle mesure');
});

test('escape hints describe preservation and sweep cancellation accurately',()=>{
 const escape=(state:HelpState)=>toolHelp(state).hints.find(h=>h.key==='escape')!.text;
 expect(escape({tool:'line',hasDraft:true})).toContain('conservant');
 expect(escape({tool:'polyline',nodes:2})).toContain('conservant');
 expect(escape({tool:'circle',hasDraft:true})).toContain('annuler le cercle');
 expect(escape({tool:'trim',sweeping:true})).toContain('annuler le balayage');
});

test('rendered help follows customized shortcuts and interface language',()=>{
 const previous=getLanguage();try{
  setLanguage('en');
  const html=renderToStaticMarkup(<ToolHelp state={{tool:'line'}} shortcut={id=>id==='finish'?'F12':id==='escape'?'F11':''}/>);
  expect(html).toContain('Click the first point.');
  expect(html).toContain('<kbd>F12</kbd>');expect(html).toContain('<kbd>F11</kbd>');
  expect(html).toContain('aria-live="polite"');
  expect(html).not.toContain('Propriétés');
 }finally{setLanguage(previous);}
});

test('tool actions require a source and enough vertices for a closed path',()=>{
 const render=(tool:HelpState['tool'],hasSource=false,points=0,closed=false)=>renderToStaticMarkup(<CommandPanel tool={tool} settings={{...initialSettings,closed}} setSettings={()=>{}} shortcut={()=>''} onApply={()=>{}} onFinish={()=>{}} points={points} measurement="" boundaries={0} choosing={false} onBoundaries={()=>{}} hasSource={hasSource}/>);
 expect(render('rotate')).toContain('disabled=""');
 expect(render('rotate',true)).not.toContain('disabled=""');
 expect(render('polyline',false,2,true)).toContain('disabled=""');
 expect(render('polyline',false,3,true)).not.toContain('disabled=""');
});
