import {test,expect} from 'bun:test';
import {renderToStaticMarkup} from 'react-dom/server';
import {readSectionOpen,SidebarSection,ToolHeading,type SidebarSectionId} from '../src/right-side-bar';

test('sidebar defaults keep help and controls open, objects closed; saved choices override defaults',()=>{
 const ids:SidebarSectionId[]=['help','settings','selection','layers','objects','layout'];
 for(const id of ids){
  expect(readSectionOpen(id,null)).toBe(id!=='objects');
  expect(readSectionOpen(id,'true')).toBe(true);
  expect(readSectionOpen(id,'false')).toBe(false);
  for(const invalid of ['', 'null','{}','1'])expect(readSectionOpen(id,invalid)).toBe(id!=='objects');
 }
});

test('accordion headings expose their state and control hidden content with stable accessible relationships',()=>{
 const closed=renderToStaticMarkup(<SidebarSection id="objects" title="Objets du dessin" count={3}><p>Liste</p></SidebarSection>);
 expect(closed).toContain('aria-expanded="false"');
 expect(closed).toContain('hidden=""');
 expect(closed).toContain('sidebar-section-count">3');
 const controls=closed.match(/aria-controls="([^"]+)"/)![1];
 expect(closed).toContain(`id="${controls}"`);
 const open=renderToStaticMarkup(<SidebarSection id="help" title="Aide contextuelle"><p>Instruction</p></SidebarSection>);
 expect(open).toContain('aria-expanded="true"');
 expect(open).not.toContain('hidden=""');
 expect(renderToStaticMarkup(<ToolHeading tool="mirror"/>)).toContain('sidebar-tool-title');
});
