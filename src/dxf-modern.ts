import type {Layer,Point,Shape} from './model';
import {segments,flatten,dimensionGeometry} from './geometry';
import {hatchDxf} from './hatch-dxf';

export function toModernDxf(shapes:Shape[],layers:Layer[],displayUnit:'m'|'cm'|'mm'){
 const pairs:(string|number)[]=[],add=(...p:(string|number)[])=>pairs.push(...p);
 let next=0x10;const handle=()=> (next++).toString(16).toUpperCase();
 const ltypeTable=handle(),layerTable=handle(),styleTable=handle(),blockTable=handle(),modelSpace=handle(),paperSpace=handle();
 const names=new Map(layers.map((l,i)=>[l.id,l.id==='0'?'0':`${l.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,80)}_${i}`]));
 add(0,'SECTION',2,'HEADER',9,'$ACADVER',1,'AC1018',9,'$INSUNITS',70,4,9,'$MEASUREMENT',70,1,0,'ENDSEC');
 add(0,'SECTION',2,'TABLES');
 const table=(name:string,id:string,count:number)=>add(0,'TABLE',2,name,5,id,330,'0',100,'AcDbSymbolTable',70,count);
 table('LTYPE',ltypeTable,1);add(0,'LTYPE',5,handle(),330,ltypeTable,100,'AcDbSymbolTableRecord',100,'AcDbLinetypeTableRecord',2,'CONTINUOUS',70,0,3,'Solid line',72,65,73,0,40,0,0,'ENDTAB');
 table('LAYER',layerTable,layers.length);for(const l of layers)add(0,'LAYER',5,handle(),330,layerTable,100,'AcDbSymbolTableRecord',100,'AcDbLayerTableRecord',2,names.get(l.id)!,70,l.locked?4:0,62,l.visible?7:-7,6,'CONTINUOUS');add(0,'ENDTAB');
 table('STYLE',styleTable,1);add(0,'STYLE',5,handle(),330,styleTable,100,'AcDbSymbolTableRecord',100,'AcDbTextStyleTableRecord',2,'STANDARD',70,0,40,0,41,1,50,0,71,0,42,2.5,3,'txt',4,'',0,'ENDTAB');
 table('BLOCK_RECORD',blockTable,2);for(const [name,id] of [['*Model_Space',modelSpace],['*Paper_Space',paperSpace]])add(0,'BLOCK_RECORD',5,id,330,blockTable,100,'AcDbSymbolTableRecord',100,'AcDbBlockTableRecord',2,name);add(0,'ENDTAB',0,'ENDSEC');
 add(0,'SECTION',2,'BLOCKS');for(const [name,id] of [['*Model_Space',modelSpace],['*Paper_Space',paperSpace]])add(0,'BLOCK',5,handle(),330,id,100,'AcDbEntity',8,'0',100,'AcDbBlockBegin',2,name,70,0,10,0,20,0,30,0,3,name,1,'',0,'ENDBLK',5,handle(),330,id,100,'AcDbEntity',8,'0',100,'AcDbBlockEnd');add(0,'ENDSEC',0,'SECTION',2,'ENTITIES');
 const ordered=[...shapes.filter(s=>s.type==='hatch'),...shapes.filter(s=>s.type!=='hatch')];
 let layer='0',color='#ffffff';
 const entity=(type:string,subclass:string)=>add(0,type,5,handle(),330,modelSpace,100,'AcDbEntity',8,layer,420,parseInt(color.slice(1),16),100,subclass);
 const point=(code:number,p:Point)=>add(code,p.x,code+10,-p.y,code+20,0);
 const line=(a:Point,b:Point)=>{entity('LINE','AcDbLine');point(10,a);point(11,b);};
 const polyline=(ps:{p:Point;bulge?:number}[],closed:boolean)=>{entity('LWPOLYLINE','AcDbPolyline');add(90,ps.length,70,closed?1:0);for(const n of ps)add(10,n.p.x,20,-n.p.y,42,-(n.bulge||0));};
 // R2004 text is ASCII with Unicode escapes, independent of the browser's UTF-8 download.
 const textValue=(value:string)=>value.replace(/[^\x20-\x7e]|[\\{}]/g,c=>'\\U+'+c.charCodeAt(0).toString(16).toUpperCase().padStart(4,'0'));
 for(const s of ordered){layer=names.get(s.layerId||'0')||'0';color=s.color;
  if(s.type==='hatch'){const data=hatchDxf(s,layer,handle());data.splice(4,0,330,modelSpace);add(...data);}
  else if(s.type==='text'){
   if(s.text.includes('\n')){entity('MTEXT','AcDbMText');const angle=(s.rotation||0)*Math.PI/180,baseline=s.vertical==='baseline',origin=baseline?{x:s.a.x+Math.sin(angle)*s.height*.8,y:s.a.y-Math.cos(angle)*s.height*.8}:s.a;point(10,origin);add(40,s.height,41,0,71,(s.vertical==='middle'?3:s.vertical==='bottom'?6:0)+(s.align==='center'?2:s.align==='right'?3:1),1,s.text.split('\n').map(textValue).join('\\P'),7,'STANDARD',11,Math.cos(angle),21,-Math.sin(angle),31,0);}
   else{entity('TEXT','AcDbText');point(10,s.a);add(40,s.height,1,textValue(s.text),50,-(s.rotation||0),7,'STANDARD',72,s.align==='center'?1:s.align==='right'?2:0);point(11,s.a);add(100,'AcDbText',73,s.vertical==='top'||!s.vertical?3:s.vertical==='middle'?2:s.vertical==='bottom'?1:0);}
  }
  else if(s.type==='line')line(s.a,s.b);
  else if(s.type==='arc'){const arc=segments(s)[0];if(arc.kind!=='arc')continue;entity('ARC','AcDbCircle');point(10,arc.center);add(40,arc.radius,100,'AcDbArc');const start=arc.sweep<0?arc.start:arc.start+arc.sweep,end=arc.sweep<0?arc.start+arc.sweep:arc.start;const degrees=(a:number)=>((-a*180/Math.PI)%360+360)%360;add(50,degrees(start),51,degrees(end));}
  else if(s.type==='circle'){entity('CIRCLE','AcDbCircle');point(10,s.a);add(40,Math.hypot(s.b.x-s.a.x,s.b.y-s.a.y));}
  else if(s.type==='rect')polyline([{p:s.a},{p:{x:s.b.x,y:s.a.y}},{p:s.b},{p:{x:s.a.x,y:s.b.y}}],true);
  else if(s.type==='polyline')polyline(s.nodes,s.closed);
  else if(s.type==='bezier'){const nodes=segments(s).flatMap((seg,i)=>flatten(seg,.1).slice(i?1:0).map(n=>({p:n.p})));if(s.closed)nodes.pop();polyline(nodes,s.closed);}
  else if(s.type==='dimension'){const d=dimensionGeometry(s,displayUnit);d.lines.forEach(([a,b])=>line(a,b));d.arrows.forEach(ps=>{entity('SOLID','AcDbTrace');point(10,ps[0]);point(11,ps[1]);point(12,ps[2]);point(13,ps[2]);});entity('TEXT','AcDbText');point(10,d.label);add(40,s.height,1,d.text.replace('Ø','%%c'),50,d.angle,7,'STANDARD',72,1);point(11,d.label);add(100,'AcDbText',73,0);}
 }
 add(0,'ENDSEC',0,'EOF');return pairs.join('\r\n')+'\r\n';
}
