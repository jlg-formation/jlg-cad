import {t} from './i18n';

export type WheelDiagnostic={
 count:number;horizontal:number;vertical:number;diagonal:number;pinch:number;
 samples:{time:number;x:number;y:number;unit:number;action:'pan'|'zoom'|'ignored'}[];
};
export function recordWheelDiagnostic(previous:WheelDiagnostic|null,event:Pick<WheelEvent,'deltaX'|'deltaY'|'deltaMode'|'ctrlKey'>,action:'pan'|'zoom'|'ignored',time:number):WheelDiagnostic{
 const data=previous||{count:0,horizontal:0,vertical:0,diagonal:0,pinch:0,samples:[]};
 const x=event.deltaX!==0,y=event.deltaY!==0;
 return{
  count:data.count+1,
  horizontal:data.horizontal+Number(!event.ctrlKey&&x&&!y),
  vertical:data.vertical+Number(!event.ctrlKey&&!x&&y),
  diagonal:data.diagonal+Number(!event.ctrlKey&&x&&y),
  pinch:data.pinch+Number(event.ctrlKey),
  samples:[...data.samples.slice(-11),{time,x:event.deltaX,y:event.deltaY,unit:event.deltaMode,action}],
 };
}

export function NavigationDiagnosticSettings({enabled,onChange}:{enabled:boolean;onChange:(enabled:boolean)=>void}){
 return <label className="navigation-diagnostic-toggle"><input type="checkbox" checked={enabled} onChange={event=>onChange(event.currentTarget.checked)}/>{t('Afficher le diagnostic du trackpad')}</label>;
}

export function NavigationDiagnostic({data,onReset,onClose}:{data:WheelDiagnostic|null;onReset:()=>void;onClose:()=>void}){
 return <section className="navigation-diagnostic" aria-label={t('Diagnostic du trackpad')}>
  <strong>{t('Diagnostic du trackpad')}</strong>
  <p>{t('Effacez les mesures, puis faites un geste diagonal dans le dessin.')}</p>
  <dl>
   <dt>{t('Événements reçus')}</dt><dd>{data?.count||0}</dd>
   <dt>{t('Horizontaux seuls')}</dt><dd>{data?.horizontal||0}</dd>
   <dt>{t('Verticaux seuls')}</dt><dd>{data?.vertical||0}</dd>
   <dt>{t('Deux axes ensemble')}</dt><dd>{data?.diagonal||0}</dd>
   <dt>{t('Pincements / Ctrl+molette')}</dt><dd>{data?.pinch||0}</dd>
  </dl>
  <p>{t('Les axes séparés doivent aussi produire un déplacement diagonal si les deux sont reçus.')}</p>
  {!!data?.samples.length&&<table><caption>{t('Derniers événements reçus')}</caption><thead><tr><th>ms</th><th>ΔX</th><th>ΔY</th><th>{t('Unité')}</th><th>{t('Action')}</th></tr></thead><tbody>{data.samples.map((sample,index)=><tr key={index}><td>{sample.time.toFixed(0)}</td><td>{Number(sample.x.toFixed(3))}</td><td>{Number(sample.y.toFixed(3))}</td><td>{t(sample.unit===1?'Lignes':sample.unit===2?'Pages':'Pixels')}</td><td>{t(sample.action==='pan'?'Déplacement':sample.action==='zoom'?'Zoom':'Ignoré')}</td></tr>)}</tbody></table>}
  <div><button onClick={onReset}>{t('Effacer les mesures')}</button><button onClick={onClose}>{t('Fermer le diagnostic')}</button></div>
 </section>;
}
