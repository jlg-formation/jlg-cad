import {layerDefaults,lineTypes,type LineType} from './layers';
import {mapItem} from './geometry';
import {documentOf,parseDrawing,type Drawing,type Layer,type Node,type Point,type Shape,type BlockDefinition,type BlockShape} from './model';

// Deliberately bounded ASCII DXF reader. Unknown entities are counted, never silently accepted.
type Pair={code:number;value:string};
type Entity={type:string;pairs:Pair[];vertices?:Entity[]};
type Block={name:string;base:Point;entities:Entity[];external:boolean};
type Matrix=[number,number,number,number,number,number];
export const dxfUnits={mm:1,cm:10,m:1000,in:25.4,ft:304.8} as const;
export type DxfUnit=keyof typeof dxfUnits;
export type DxfReport={version:string;unit:string;objects:number;blocks:number;skipped:Record<string,number>;warnings:string[]};
export type DxfImport={drawing:Drawing;report:DxfReport};
const decodeUnicode=(value:string)=>value.replace(/\\U\+([0-9a-f]{4})/gi,(_,hex:string)=>String.fromCharCode(parseInt(hex,16)));
const get=(e:Entity,c:number,fallback='')=>decodeUnicode(e.pairs.find(p=>p.code===c)?.value??fallback);
const num=(e:Entity,c:number,fallback=0)=>{const value=get(e,c);const n=value===''?fallback:Number(value);if(!Number.isFinite(n))throw new Error(`Valeur numérique DXF invalide (${e.type}, code ${c}).`);return n;};
const point=(e:Entity,c=10):Point=>({x:num(e,c),y:num(e,c+10)});
const apply=(m:Matrix,p:Point):Point=>({x:m[0]*p.x+m[2]*p.y+m[4],y:m[1]*p.x+m[3]*p.y+m[5]});
const compose=(a:Matrix,b:Matrix):Matrix=>[a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];
export function aciColor(index:number):string {
 const basic=['#ffffff','#ff0000','#ffff00','#00ff00','#00ffff','#0000ff','#ff00ff','#ffffff','#808080','#c0c0c0'];
 if(index<10)return basic[index]||basic[7];
 if(index>=250)return ['#333333','#505050','#696969','#828282','#bebebe','#ffffff'][Math.min(index-250,5)];
 const hue=Math.floor((index-10)/10)*15/60,shade=(index-10)%10,v=[255,255,165,165,127,127,76,76,38,38][shade],s=shade%2?.5:1;
 const c=v*s,x=c*(1-Math.abs(hue%2-1)),offset=v-c;
 const rgb=hue<1?[c,x,0]:hue<2?[x,c,0]:hue<3?[0,c,x]:hue<4?[0,x,c]:hue<5?[x,0,c]:[c,0,x];
 return '#'+rgb.map(n=>Math.floor(n+offset+1e-10).toString(16).padStart(2,'0')).join('');
}
const color=(e:Entity,inherited:string,layer:string)=>{const rgb=num(e,420,-1),aci=Math.abs(num(e,62,256));if(rgb>=0){if(!Number.isInteger(rgb)||rgb>0xffffff)throw new Error('Couleur DXF invalide.');return '#'+rgb.toString(16).padStart(6,'0');}if(aci===0)return inherited;if(aci===256)return layer;if(!Number.isInteger(aci)||aci>255)throw new Error('Couleur DXF invalide.');return aciColor(aci);};
function read(text:string){
 if(text.length>20_000_000)throw new Error('DXF trop volumineux : limite de 20 Mo.');
 if(text.startsWith('AutoCAD Binary DXF')||text.includes('\0'))throw new Error('Le DXF binaire n’est pas pris en charge. Exportez un DXF texte (ASCII).');
 const lines=text.replace(/^\uFEFF/,'').split(/\r\n|\n|\r/);while(lines.at(-1)==='')lines.pop();
 if(lines.length%2)throw new Error('DXF incomplet : une paire code/valeur manque.');
 if(lines.length>2_000_000)throw new Error('DXF trop complexe : plus d’un million de paires.');
 const pairs:Pair[]=[];for(let i=0;i<lines.length;i+=2){if(!/^\s*\d+\s*$/.test(lines[i]))throw new Error(`Code DXF invalide à la ligne ${i+1}.`);const code=Number(lines[i]);if(code>1071)throw new Error('Code DXF hors limites.');pairs.push({code,value:lines[i+1].trimEnd()});}
 const sections=new Map<string,Pair[]>();let i=0,ended=false;
 while(i<pairs.length){const p=pairs[i++];if(p.code===999)continue;if(p.code===0&&p.value.trim()==='EOF'){ended=true;break;}if(p.code!==0||p.value.trim()!=='SECTION'||pairs[i]?.code!==2)throw new Error('Structure DXF invalide.');const name=pairs[i++].value.trim();const start=i;while(i<pairs.length&&!(pairs[i].code===0&&pairs[i].value.trim()==='ENDSEC'))i++;if(i===pairs.length||sections.has(name))throw new Error('Section DXF incomplète ou dupliquée.');sections.set(name,pairs.slice(start,i++));}
 if(!ended||!sections.has('ENTITIES')||pairs.slice(i).some(p=>p.code!==999))throw new Error('DXF incomplet : section ENTITIES ou fin EOF absente, ou données après EOF.');
 return sections;
}
function entities(pairs:Pair[]):Entity[]{
 const result:Entity[]=[];for(const p of pairs){if(p.code===0)result.push({type:p.value.trim(),pairs:[]});else if(result.length)result[result.length-1].pairs.push(p);}
 const grouped:Entity[]=[];for(let i=0;i<result.length;i++){const e=result[i];if(e.type==='POLYLINE'){e.vertices=[];while(result[i+1]?.type==='VERTEX')e.vertices.push(result[++i]);if(result[i+1]?.type!=='SEQEND')throw new Error('POLYLINE sans SEQEND.');i++;}grouped.push(e);}return grouped;
}
function headerValue(sections:Map<string,Pair[]>,key:string){const ps=sections.get('HEADER')||[],i=ps.findIndex(p=>p.code===9&&p.value.trim()===key);return i>=0?ps[i+1]?.value.trim():undefined;}
function dxfInfo(sections:Map<string,Pair[]>):{version:string;unit:DxfUnit|null}{return{version:headerValue(sections,'$ACADVER')||'inconnue',unit:({1:'in',2:'ft',4:'mm',5:'cm',6:'m'} as Record<number,DxfUnit>)[Number(headerValue(sections,'$INSUNITS'))]||null};}
export function inspectDxf(text:string){return dxfInfo(read(text));}
export function decodeDxf(bytes:ArrayBuffer):string{
 if(bytes.byteLength>20_000_000)throw new Error('DXF trop volumineux : limite de 20 Mo.');
 const raw=new TextDecoder('windows-1252').decode(bytes),version=/\$ACADVER\s*\r?\n\s*1\s*\r?\n\s*AC(\d+)/.exec(raw),cp=/\$DWGCODEPAGE\s*\r?\n\s*3\s*\r?\n\s*(\S+)/.exec(raw)?.[1];
 const utf8=Number(version?.[1])>=1021||new Uint8Array(bytes).slice(0,3).join(',')==='239,187,191';
 if(!utf8&&cp&&!cp.startsWith('ANSI_'))throw new Error(`Encodage DXF non pris en charge : ${cp}.`);
 const enc=utf8?'utf-8':cp?.startsWith('ANSI_')?`windows-${cp.slice(5)}`:'windows-1252';
 try{return new TextDecoder(enc,{fatal:true}).decode(bytes);}catch{throw new Error(`Encodage DXF non pris en charge ou invalide : ${enc}.`);}
}
export function importDxf(text:string,name:string,override?:DxfUnit):DxfImport{
 const sections=read(text),info=dxfInfo(sections),unit=override||info.unit;if(!unit)throw new Error('Choisissez l’unité du DXF avant de l’importer.');
 const factor=dxfUnits[unit],report:DxfReport={version:info.version,unit,objects:0,blocks:0,skipped:Object.create(null),warnings:[]},warnings=new Set<string>();
 const skip=(reason:string)=>{report.skipped[reason]=(report.skipped[reason]||0)+1;};
 const typeOf=(e:Entity,inherit=false):LineType|undefined=>{const name=get(e,6,inherit?'BYLAYER':'CONTINUOUS').toUpperCase();if(inherit&&name==='BYLAYER')return undefined;if(Object.hasOwn(lineTypes,name))return name as LineType;warnings.add('Type de trait '+name+' remplacé par un trait continu.');return 'CONTINUOUS';};
 const transparency=(raw:number)=>Math.min(90,Math.max(0,Math.round((1-(raw&255)/255)*100)));
 const xdata=(e:Entity,name:string)=>{const start=e.pairs.findIndex(p=>p.code===1001&&p.value===name);if(start<0)return [];const rest=e.pairs.slice(start+1),end=rest.findIndex(p=>p.code===1001);return end<0?rest:rest.slice(0,end);};
 const props=(e:Entity)=>({colorByLayer:num(e,420,-1)<0&&Math.abs(num(e,62,256))===256,linetype:typeOf(e,true),lineweight:num(e,370,-1)<0?undefined:num(e,370)/100,transparency:num(e,440,0)&0x02000000?transparency(num(e,440)):undefined});
 const layers:Layer[]=[],byName=new Map<string,Layer>();
 const ensureLayer=(name:string,e?:Entity)=>{const key=name.toUpperCase();let l=byName.get(key);if(!l){if(layers.length>=200)throw new Error('DXF trop complexe : plus de 200 calques.');const flags=e?num(e,70):0;l={id:name==='0'?'0':`dxf-layer-${layers.length}`,name,...layerDefaults,linetype:e?typeOf(e):'CONTINUOUS',lineweight:e&&num(e,370,-1)>=0?num(e,370)/100:.25,printable:!e||!!num(e,290,1),description:e?decodeUnicode(xdata(e,'AcAecLayerStandard').filter(p=>p.code===1000)[1]?.value||''):'',transparency:e?transparency(Number(xdata(e,'AcCmTransparency').find(p=>p.code===1071)?.value??0x020000ff)):0,color:e?color(e,'#ffffff','#ffffff'):'#ffffff',visible:!e||num(e,62,7)>=0&&!(flags&1),locked:!!(flags&4)};layers.push(l);byName.set(key,l);}return l;};
 for(const e of entities(sections.get('TABLES')||[]))if(e.type==='LAYER'){ensureLayer(get(e,2,'0'),e);}ensureLayer('0');
 const blocks=new Map<string,Block>(),bs=entities(sections.get('BLOCKS')||[]);
 for(let i=0;i<bs.length;i++)if(bs[i].type==='BLOCK'){const e=bs[i],block:Block={name:get(e,2),base:point(e),entities:[],external:!!(num(e,70)&(4|8|16))};while(bs[i+1]&&bs[i+1].type!=='ENDBLK')block.entities.push(bs[++i]);if(!bs[i+1])throw new Error('Bloc DXF incomplet.');i++;const key=get(e,2).toUpperCase();if(blocks.has(key))throw new Error('Nom de bloc DXF dupliqué.');blocks.set(key,block);}
 const shapes:Shape[]=[],definitions:BlockDefinition[]=[],definitionVariants=new Map<string,BlockDefinition>();let visits=0;
 const emit=(e:Entity,m:Matrix,parentLayer='0',parentColor='#ffffff',stack:string[]=[]):void=>{
  if(++visits>100000)throw new Error('DXF trop complexe : plus de 100 000 entités après développement des blocs.');
  if(num(e,67)||get(e,410)&&get(e,410)!=='Model'){skip('Espace papier');return;}
  if(e.type==='SEQEND')return;
  if(num(e,60)){skip('Entités invisibles');return;}
  if(num(e,210)!==0||num(e,220)!==0||num(e,230,1)!==1){skip(`${e.type} : plan 3D / extrusion`);return;}
  if(e.pairs.some(p=>[30,31,32,33,38,39].includes(p.code)&&Number(p.value)!==0)){skip(`${e.type} : géométrie 3D`);return;}
  const layer=ensureLayer(get(e,8,'0')==='0'?parentLayer:get(e,8,'0')),col=color(e,parentColor,layer.color);
  const required=e.type==='LINE'?[10,11]:['ARC','CIRCLE','TEXT','MTEXT','ATTRIB'].includes(e.type)?[10,40]:[];
  if(required.some(code=>!e.pairs.some(p=>p.code===code&&p.value.trim()!=='')))throw new Error(`${e.type} incomplet : coordonnées ou dimensions manquantes.`);
  if(e.type==='INSERT'){
   const key=get(e,2).toUpperCase(),block=blocks.get(key);if(!block){skip(`INSERT : bloc manquant (${key})`);return;}if(block.external){skip('INSERT : référence externe');return;}if(stack.includes(key)||stack.length>=16){skip('INSERT : bloc cyclique ou trop imbriqué');return;}
   const angle=num(e,50)*Math.PI/180,sx=num(e,41,1),sy=num(e,42,1),p=point(e),cols=num(e,70,1),rows=num(e,71,1);
   if(!sx||!sy||!Number.isInteger(cols)||!Number.isInteger(rows)||cols<1||rows<1||cols*rows>10000)throw new Error('Transformation ou répétition de bloc invalide.');
   if(!block.entities.length)skip('INSERT : bloc vide');
   const c=Math.cos(angle),s=Math.sin(angle);report.blocks++;
   for(let row=0;row<rows;row++)for(let column=0;column<cols;column++){
    const dx=column*num(e,44),dy=row*num(e,45),local:Matrix=[c*sx,s*sx,-s*sy,c*sy,p.x+c*dx-s*dy-c*sx*block.base.x+s*sy*block.base.y,p.y+s*dx+c*dy-s*sx*block.base.x-c*sy*block.base.y];
    const start=shapes.length,total=compose(m,local);
    for(const child of block.entities)emit(child,total,layer.name,col,[...stack,key]);
    // Preserve top-level uniform inserts. Nested content is retained as ordinary geometry.
    const sx0=total[0],sx1=-total[1],sy0=-total[2],sy1=total[3],det=sx0*sy1-sx1*sy0,scale=Math.hypot(sx0,sx1);
    const uniform=scale>1e-10&&Math.abs(Math.hypot(sy0,sy1)-scale)<scale*1e-8&&Math.abs(sx0*sy0+sx1*sy1)<scale*scale*1e-8;
    if(!stack.length&&uniform&&shapes.length>start){
     const content=shapes.splice(start),a={x:(total[0]*block.base.x+total[2]*block.base.y+total[4])*factor,y:-(total[1]*block.base.x+total[3]*block.base.y+total[5])*factor};
     // Color and layer inheritance are resolved per definition variant to preserve the imported appearance.
     const localShapes=content.map(child=>mapItem(child,p=>({x:((p.x-a.x)*sy1-(p.y-a.y)*sy0)/det,y:(sx0*(p.y-a.y)-sx1*(p.x-a.x))/det}),1/scale,det<0));
     const signatureOf=(items:Shape[])=>JSON.stringify(items.map(({id,...shape})=>shape),(_key,value)=>typeof value==='number'?Math.round(value*1e7)/1e7:value);
     const signature=signatureOf(localShapes);
     const variant=key+'\0'+signature;
     let definition=definitionVariants.get(variant);
     if(!definition){let name=block.name,n=2;while(definitions.some(d=>d.name===name))name=block.name+' ('+(n++)+')';definition={id:'dxf-block-'+definitions.length,name,shapes:localShapes};definitions.push(definition);definitionVariants.set(variant,definition);}
     const instance:BlockShape={id:'dxf-'+start,type:'block',definitionId:definition.id,a,b:{x:a.x+sx0,y:a.y+sx1},yAxis:{x:a.x+sy0,y:a.y+sy1},color:col,...props(e),layerId:layer.id,entities:content};shapes.push(instance);
    }else if(!stack.length&&!uniform)warnings.add('Blocs à échelles non uniformes décomposés en objets indépendants.');
   }return;
  }
  const det=m[0]*m[3]-m[1]*m[2],scale=Math.hypot(m[0],m[1]),similar=Math.abs(Math.hypot(m[2],m[3])-scale)<=scale*1e-8&&Math.abs(m[0]*m[2]+m[1]*m[3])<=scale*scale*1e-8;
  const fn=(p:Point)=>{const q=apply(m,p);return{x:q.x*factor,y:-q.y*factor};},base={id:`dxf-${shapes.length}`,layerId:layer.id,color:col,...props(e),a:fn(point(e)),b:fn(point(e,11))};let shape:Shape;
  if(e.type==='LINE')shape={...base,type:'line'};
  else if(e.type==='CIRCLE'||e.type==='ARC'){
   if(!similar){skip(`${e.type} : échelle non uniforme`);return;}const center=point(e),radius=num(e,40);if(radius<=0)throw new Error('Rayon DXF invalide.');
   if(e.type==='CIRCLE')shape={...base,type:'circle',b:{x:base.a.x+radius*scale*factor,y:base.a.y}};
   else{const start=num(e,50)*Math.PI/180,sweep=((num(e,51)-num(e,50))%360+360)%360;if(!sweep){skip('ARC : angle nul');return;}const end=start+sweep*Math.PI/180,a=fn({x:center.x+radius*Math.cos(start),y:center.y+radius*Math.sin(start)}),b=fn({x:center.x+radius*Math.cos(end),y:center.y+radius*Math.sin(end)});shape={...base,type:'arc',a,b,bulge:-Math.sign(det)*Math.tan(sweep*Math.PI/720)};}
  }else if(e.type==='LWPOLYLINE'||e.type==='POLYLINE'){
   if(num(e,70)&(8|16|64)){skip(`${e.type} : maillage ou 3D`);return;}const nodes:Node[]=[];
   if(e.vertices){for(const v of e.vertices){if(num(v,30)){skip('POLYLINE : géométrie 3D');return;}nodes.push({p:fn(point(v)),bulge:-Math.sign(det)*num(v,42)});if(num(v,40)||num(v,41))warnings.add('Largeurs de polyligne non conservées.');}}
   else {let vertex:Entity|undefined;for(const p of e.pairs){if(p.code===10){vertex={type:'VERTEX',pairs:[p]};nodes.push({p:{x:0,y:0}});}else if(vertex&&[20,42,40,41].includes(p.code))vertex.pairs.push(p);if(vertex)nodes[nodes.length-1]={p:fn(point(vertex)),bulge:-Math.sign(det)*num(vertex,42)};}if(num(e,90)!==nodes.length)throw new Error('Nombre de sommets LWPOLYLINE incohérent.');}
   if(nodes.length<2||nodes.length>5000)throw new Error('Polyligne DXF invalide ou trop détaillée (maximum 5 000 sommets).');
   if(!similar&&nodes.some(n=>n.bulge)){skip(`${e.type} : arcs avec échelle non uniforme`);return;}
   if(num(e,70)&6){skip('POLYLINE : courbe ajustée');return;}
   if(num(e,43)||e.pairs.some(p=>[40,41].includes(p.code)&&Number(p.value)))warnings.add('Largeurs de polyligne non conservées.');
   shape={...base,type:'polyline',a:nodes[0].p,b:nodes.at(-1)!.p,nodes,closed:!!(num(e,70)&1)};
  }else if(['TEXT','MTEXT','ATTRIB'].includes(e.type)){
   if(!similar||det<0){skip(`${e.type} : texte déformé ou réfléchi`);return;}
   const raw=e.type==='MTEXT'?e.pairs.filter(p=>p.code===3||p.code===1).map(p=>p.value).join(''):get(e,1);
   if(e.type==='MTEXT'&&num(e,75)){skip('MTEXT : colonnes');return;}
   const cleaned=e.type==='MTEXT'?raw.replace(/\\P/g,'\n').replace(/\\~/g,' ').replace(/\\[LlOoKk]/g,'').replace(/\\S([^;]*);/g,(_,value:string)=>value.replace(/[\^#]/g,'/')).replace(/\\[ACFHQTWacfhqtw][^;]*;/g,'').replace(/[{}]/g,''):raw;
   const content=decodeUnicode(cleaned).replace(/%%c/gi,'Ø').replace(/%%d/gi,'°').replace(/%%p/gi,'±');
   if(!content){skip(`${e.type} : texte vide`);return;}warnings.add('Polices remplacées par Arial/Helvetica ; métriques et mise en forme des textes peuvent différer.');
   const horizontal=num(e,72),vertical=num(e,e.type==='ATTRIB'?74:73),attachment=num(e,71,1),isM=e.type==='MTEXT';
   if(isM&&(!Number.isInteger(attachment)||attachment<1||attachment>9))throw new Error('Point d’attache MTEXT invalide.');
   if(!isM&&(horizontal>2||num(e,41,1)!==1||num(e,51)||num(e,71)&6)){skip(`${e.type} : texte ajusté, incliné ou réfléchi`);return;}
   const codes=e.pairs.map(p=>p.code),directionIndex=Math.max(codes.lastIndexOf(11),codes.lastIndexOf(21)),rotationIndex=codes.lastIndexOf(50);
   const source=!isM&&(horizontal||vertical)?point(e,11):point(e),a=fn(source),angle=isM?(directionIndex>rotationIndex?Math.atan2(num(e,21),num(e,11)):num(e,50)):num(e,50)*Math.PI/180,axis=apply(m,{x:source.x+Math.cos(angle),y:source.y+Math.sin(angle)}),origin=apply(m,source);
   shape={...base,type:'text',a,b:a,text:content,height:num(e,40)*scale*factor,rotation:-Math.atan2(axis.y-origin.y,axis.x-origin.x)*180/Math.PI,align:isM?(['left','center','right'] as const)[(attachment-1)%3]:horizontal===1?'center':horizontal===2?'right':'left',vertical:isM?attachment<=3?'top':attachment<=6?'middle':'bottom':vertical===1?'bottom':vertical===2?'middle':vertical===3?'top':'baseline'};
   if(isM)warnings.add('MTEXT convertis en texte simple ; retours automatiques et styles non conservés.');
   if(e.type==='ATTRIB')warnings.add('Attributs de bloc convertis en textes indépendants.');
  }else{skip(e.type);return;}
  shapes.push(shape);if(shapes.length>50000)throw new Error('DXF trop complexe : plus de 50 000 objets.');
 };
 for(const e of entities(sections.get('ENTITIES')||[]))emit(e,[1,0,0,1,0,0]);
 if(definitions.length)warnings.add('Blocs statiques conservés ; contenu des blocs imbriqués aplati.');
 if(sections.has('OBJECTS')||sections.has('CLASSES'))warnings.add('Présentations, références externes et objets personnalisés ne sont pas importés.');
 if(override)warnings.add(`Unité choisie : ${unit} (1 unité DXF = ${factor} mm).`);
 report.objects=shapes.length;report.warnings=[...warnings];
 return{drawing:parseDrawing(JSON.stringify({...documentOf(name.replace(/\.dxf$/i,''),shapes,[],layers),blocks:definitions})),report};
}
