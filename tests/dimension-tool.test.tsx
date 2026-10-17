import {test,expect} from 'bun:test';
import {renderToStaticMarkup} from 'react-dom/server';
import {DimensionToolButton,isDimensionTool} from '../src/dimension-tool';
import {ArchitectureToolbar,type Tool} from '../src/architecture';
const render=(tool:Tool)=>renderToStaticMarkup(<DimensionToolButton tool={tool} onTool={()=>{}} shortcut={id=>id==='diameter'?'DDI':''}/>);
test('split button defaults to general dimension and exposes a separate menu trigger',()=>{
 const markup=render('select');expect(markup).toContain('aria-label="DIMENSION"');expect(markup).toContain('Choisir un outil de cotation');expect(markup).toContain('aria-haspopup="menu"');expect(markup).toContain('aria-expanded="false"');expect(markup.match(/<button /g)).toHaveLength(2);
});
test('active dimension commands identify the action and tooltip of the main button',()=>{
 for(const [tool,name] of [['dimension','DIMENSION'],['linearDimension','DIMLINEAR'],['diameter','DIMDIAMETER']] as const){const markup=render(tool);expect(markup).toContain(`aria-label="${name}"`);expect(markup).toContain('dimension-split-button active');expect(isDimensionTool(tool)).toBe(true);}
 expect(render('diameter')).toContain('DDI');expect(isDimensionTool('text')).toBe(false);
});
test('annotation toolbar has one dimension action, its arrow and a separate text button',()=>{
 const markup=renderToStaticMarkup(<ArchitectureToolbar tool="select" onTool={()=>{}} shortcut={()=>''}/>);
 const group=markup.split('aria-label="Annoter"')[1].split('</div>')[0];
 expect(group.match(/<button /g)).toHaveLength(3); // Text, dimension and arrow.
 expect(group).toContain('aria-label="TEXT"');expect(group).toContain('aria-label="DIMENSION"');expect(group).not.toContain('aria-label="DIMLINEAR"');expect(group).not.toContain('aria-label="DIMDIAMETER"');
 const paper=renderToStaticMarkup(<ArchitectureToolbar paper tool="text" onTool={()=>{}} shortcut={()=>''}/>);expect(paper).not.toContain('dimension-split-button');
});
