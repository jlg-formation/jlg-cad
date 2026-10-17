import {commandName} from './command-language';
import {draftingCommands} from './drafting';
import type {Bindings} from './shortcuts';

export function toolShortcut(id:string,bindings:Bindings){
 const keys=bindings[id]||[];
 if(keys.length)return keys.map(key=>/^[A-Z]+$/.test(key)?key+' ↵':key).join(' / ');
 const command=draftingCommands.find(command=>command.id===id);
 if(!command)return '';
 const alias=[command.name,...command.aliases].sort((a,b)=>a.length-b.length)[0];
 return alias+' ↵';
}

export function toolTooltip(id:string,label:string,shortcut:(id:string)=>string){
 const name=commandName(id,label),description=label;
 return name+(description&&description.toLocaleUpperCase()!==name.toLocaleUpperCase()?' — '+description:'')+(shortcut(id)?' — '+shortcut(id):'');
}
