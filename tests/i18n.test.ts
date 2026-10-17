import {test,expect} from 'bun:test';
import {readLanguage,translate,setLanguage,getLanguage,t} from '../src/i18n';
import {displayDistance} from '../src/drafting';
import {resolvePaletteCommand,paletteSuggestions} from '../src/command-palette';
test('language preference accepts supported values and safely falls back to French',()=>{
 expect(readLanguage('en')).toBe('en');expect(readLanguage('fr')).toBe('fr');
 for(const value of [null,'','de','EN','{"lang":"en"}'])expect(readLanguage(value)).toBe('fr');
});
test('English translation keeps French available and preserves unknown content',()=>{
 expect(translate('Déplacer','en')).toBe('MOVE');expect(translate('Déplacer','fr')).toBe('Déplacer');
 expect(translate('Plan église Saint-Martin','en')).toBe('Plan église Saint-Martin');
 expect(translate('Polyligne — PL ↵','en')).toBe('PLINE — PL ↵');
 expect(translate('Grille — F7 · Activée','en')).toBe('Grid — F7 · On');
});
test('changing language updates repeat labels and numeric display without changing units',()=>{
 const previous=getLanguage();try{setLanguage('en');expect(t('Répéter Polyligne')).toBe('Repeat PLINE');expect(displayDistance(1234.5,'m')).toBe('1.2345');setLanguage('fr');expect(t('Répéter Polyligne')).toBe('Répéter Polyligne');expect(displayDistance(1234.5,'m')).toBe('1,2345');}finally{setLanguage(previous);}
});
test('French and English command names stay usable in either interface language',()=>{
 const previous=getLanguage();try{for(const language of ['fr','en'] as const){setLanguage(language);for(const name of ['MOVE','DEPLACER'])expect(resolvePaletteCommand(name)?.id).toBe('move');expect(resolvePaletteCommand('PLINE')?.id).toBe('polyline');expect(paletteSuggestions('Drawing navigation').some(c=>c.id==='zoom')).toBe(true);}}finally{setLanguage(previous);}
});
