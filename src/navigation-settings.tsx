import {t} from './i18n';
import {defaultTrackpadZoomSpeed,minTrackpadZoomSpeed,maxTrackpadZoomSpeed,type NavigationMode} from './navigation';

export function NavigationModeSettings({value,onChange}:{value:NavigationMode;onChange:(value:NavigationMode)=>void}){
 return <>
  <label>{t('Mode de navigation')}<select value={value} onChange={event=>onChange(event.currentTarget.value as NavigationMode)}>
   <option value="auto">{t('Automatique')}</option><option value="trackpad">{t('Trackpad')}</option><option value="mouse">{t('Souris')}</option>
  </select></label>
  <p>{t(value==='trackpad'?'Glissez deux doigts pour déplacer la vue ; pincez pour zoomer.':value==='mouse'?'La molette zoome ; maintenez le bouton du milieu pour déplacer la vue.':'Les gestes sont reconnus automatiquement. Si le résultat ne convient pas, choisissez Trackpad ou Souris.')}</p>
  <p>{t('Le mode de navigation est conservé sur cet appareil.')}</p>
 </>;
}

export function TrackpadZoomSettings({value,onChange}:{value:number;onChange:(value:number)=>void}){
 return <>
  <label>{t('Vitesse du zoom au trackpad')}<input type="range" min={minTrackpadZoomSpeed} max={maxTrackpadZoomSpeed} step={.5} value={value} aria-valuetext={`×${value}`} onChange={event=>onChange(event.currentTarget.valueAsNumber)}/></label>
  <div className="trackpad-zoom-scale"><span>{t('Doux')}</span><output aria-live="polite">×{value}</output><span>{t('Rapide')}</span></div>
  <p>{t('Un pincement zoome plus fort lorsque cette valeur augmente. Le réglage est conservé sur cet appareil et ne modifie pas la molette de souris.')}</p>
  <button type="button" disabled={value===defaultTrackpadZoomSpeed} onClick={()=>onChange(defaultTrackpadZoomSpeed)}>{t('Rétablir la vitesse par défaut')}</button>
 </>;
}
