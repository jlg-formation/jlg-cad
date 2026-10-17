import {expect,test} from 'bun:test';
import {toolShortcut,toolTooltip} from '../src/tool-tooltip';
import {defaults} from '../src/shortcuts';
import {draftingCommands,resolveCommand} from '../src/drafting';

test('every drawing tool has a working keyboard entry, including unassigned tools',()=>{
 const bindings=defaults();
 for(const command of draftingCommands){
  const shortcut=toolShortcut(command.id,bindings);
  expect(shortcut.length).toBeGreaterThan(0);
  if(!bindings[command.id]?.length)expect(resolveCommand(shortcut.replace(' ↵',''),bindings)?.id).toBe(command.id);
  expect(toolTooltip(command.id,command.label,id=>toolShortcut(id,bindings))).toContain(shortcut);
 }
});

test('custom bindings replace defaults in tooltips',()=>{
 const bindings={...defaults(),line:['K'],polyline:['Ctrl+Shift+P'],join:['Ctrl+J']};
 expect(toolShortcut('line',bindings)).toBe('K ↵');
 expect(toolShortcut('polyline',bindings)).toBe('Ctrl+Shift+P');
 expect(toolShortcut('join',bindings)).toBe('Ctrl+J');
});
