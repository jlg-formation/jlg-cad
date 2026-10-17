import {test,expect} from 'bun:test';
import {commandName,commandNames,getCommandLanguage,setCommandLanguage,readCommandLanguage,repeatCommandName} from '../src/command-language';
import {getLanguage,setLanguage} from '../src/i18n';
import {defaults,readBindings} from '../src/shortcuts';
import {resolvePaletteCommand} from '../src/command-palette';
import {draftingCommands} from '../src/drafting';
test('command language defaults to English independently of interface language',()=>{
 expect(readCommandLanguage(null)).toBe('en');expect(readCommandLanguage('fr')).toBe('fr');expect(readCommandLanguage('invalid')).toBe('en');
 const ui=getLanguage(),commands=getCommandLanguage();try{setLanguage('fr');setCommandLanguage('en');expect(commandName('move')).toBe('MOVE');expect(repeatCommandName('move')).toBe('Répéter MOVE');setLanguage('en');setCommandLanguage('fr');expect(commandName('move')).toBe('DÉPLACER');expect(repeatCommandName('move')).toBe('Repeat DÉPLACER');}finally{setLanguage(ui);setCommandLanguage(commands);}
});
test('changing either display language never changes aliases or customized shortcuts',()=>{
 const ui=getLanguage(),language=getCommandLanguage(),bindings=readBindings(JSON.stringify({...defaults(),move:['K'],copy:['Ctrl+Shift+D']}));
 const before=JSON.stringify(bindings),aliases=JSON.stringify(draftingCommands);
 try{for(const interfaceLanguage of ['fr','en'] as const)for(const commandLanguage of ['fr','en'] as const){setLanguage(interfaceLanguage);setCommandLanguage(commandLanguage);expect(JSON.stringify(bindings)).toBe(before);expect(JSON.stringify(draftingCommands)).toBe(aliases);expect(resolvePaletteCommand('K',bindings)?.id).toBe('move');for(const name of ['M','MOVE','DEPLACER'])expect(resolvePaletteCommand(name,defaults())?.id).toBe('move');for(const name of ['COPY','COPIER','CO'])expect(resolvePaletteCommand(name,defaults())?.id).toBe('copy');}}finally{setLanguage(ui);setCommandLanguage(language);}
});
test('every displayed command name remains accepted in both languages',()=>{
 for(const[id,names]of Object.entries(commandNames))for(const name of names)expect(resolvePaletteCommand(name)?.id).toBe(id);
});
