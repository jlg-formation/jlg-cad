import {test,expect} from 'bun:test';
import {renderToStaticMarkup} from 'react-dom/server';
import {ArchitectureToolbar} from '../src/architecture';
test('compact toolbar groups drawing, modification and annotation without tabs',()=>{
 const markup=renderToStaticMarkup(<ArchitectureToolbar tool="line" onTool={()=>{}} shortcut={()=>''}/>);
 expect(markup).not.toContain('role="tab');
 for(const group of ['Dessiner','Modifier','Annoter','Sélection et navigation'])expect(markup).toContain(`role="group" aria-label="${group}"`);
 expect(markup).toContain('aria-label="SCALE"');expect(markup).toContain('aria-label="TEXT"');
 expect(markup).not.toContain('>Polyligne</span>');expect(markup).toContain('Autres outils');expect(markup).not.toContain('aria-label="DIST"');
});
test('paper toolbar keeps drawing, annotation and navigation groups',()=>{
 const markup=renderToStaticMarkup(<ArchitectureToolbar tool="text" paper onTool={()=>{}} shortcut={()=>''}/>);
 expect(markup).toContain('aria-label="Dessiner"');expect(markup).toContain('aria-label="Annoter"');expect(markup).not.toContain('aria-label="Modifier"');expect(markup).not.toContain('aria-label="SCALE"');expect(markup).toContain('Autres outils');
});
