import {useEffect,useState} from 'react';
import type {BlockDefinition,BlockShape,TextItem} from './model';
import {t} from './i18n';

export function BlockAttributes({block,definition,onChange}:{block:BlockShape;definition?:BlockDefinition;onChange:(block:BlockShape)=>void}) {
 const fields=definition?.shapes.filter((s):s is TextItem=>s.type==='text'&&!!s.attribute)||[];
 if(!fields.length)return null;
 return <fieldset className="block-attributes"><legend>{t('Attributs de cette insertion')}</legend>{fields.map(s=>{
  const field=s.attribute!,manual=Object.hasOwn(block.attributes||{},field.tag);
  const rendered=block.entities.find(e=>e.id.endsWith(':'+s.id));
  return <div key={field.tag}><label className="text-label">{field.label||field.tag}<textarea aria-label={field.label||field.tag} maxLength={10000} value={manual?block.attributes![field.tag]:rendered?.type==='text'?rendered.text:s.text} onChange={e=>onChange({...block,attributes:{...block.attributes,[field.tag]:e.target.value}})}/></label>{field.source&&<label><input type="checkbox" checked={!manual} onChange={e=>{const attributes={...block.attributes};if(e.target.checked)delete attributes[field.tag];else attributes[field.tag]=rendered?.type==='text'?rendered.text:s.text;onChange({...block,attributes});}}/>{t('Échelles automatiques de la présentation')}</label>}</div>;
 })}</fieldset>;
}

export function AttributeDefinition({text,onChange,onError}:{text:TextItem;onChange:(text:TextItem)=>void;onError:(message:string)=>void}) {
 const [tag,setTag]=useState(text.attribute?.tag||'');
 useEffect(()=>setTag(text.attribute?.tag||''),[text.id,text.attribute?.tag]);
 return <fieldset className="attribute-definition"><legend>{t('Attribut de bloc')}</legend><label>{t('Identifiant')}<input aria-label={t('Identifiant de l’attribut')} value={tag} maxLength={64} placeholder="TITRE" onChange={e=>setTag(e.target.value.toUpperCase())} onBlur={()=>{
  if(!tag){onChange({...text,attribute:undefined});return;}
  if(!/^[A-Z][A-Z0-9_]{0,63}$/.test(tag)){onError('Identifiant : lettres A–Z, chiffres et _, avec une lettre au début.');setTag(text.attribute?.tag||'');return;}
  if(tag!==text.attribute?.tag)onChange({...text,attribute:{...text.attribute,tag,label:text.attribute?.label||tag}});
 }}/></label>{text.attribute&&<><label>{t('Libellé')}<input maxLength={255} value={text.attribute.label} onChange={e=>onChange({...text,attribute:{...text.attribute!,label:e.target.value}})}/></label><label><input type="checkbox" checked={text.attribute.source==='scales'} onChange={e=>onChange({...text,attribute:{...text.attribute!,source:e.target.checked?'scales':undefined}})}/>{t('Échelles automatiques de la présentation')}</label></>}<small>{t('Un identifiant transforme ce texte en information modifiable pour chaque insertion. Le contenu sert de valeur par défaut.')}</small></fieldset>;
}
