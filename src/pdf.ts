import {synchronizeDrawing} from './associations';
import {hatchLines} from './hatch';
import { jsPDF } from 'jspdf';
import { bounds, modelToPaper, paperSize, visibleShapes,textLineOffset, type Drawing, type Layout, type Shape, type TextItem } from './model';
import { mapItem, segments, arcCubics, dimensionGeometry } from './geometry';

export function createPdf(drawing: Drawing, layouts: Layout[],displayUnit:'m'|'cm'|'mm'='mm') {
  const resolved=synchronizeDrawing(drawing);layouts=layouts.map(l=>resolved.layouts.find(r=>r.id===l.id)||l);drawing=resolved;
  if (!layouts.length) throw new Error('Créez une présentation avant d’exporter.');
  const size = paperSize(layouts[0]);
  const pdf = new jsPDF({ unit:'mm', format:[size.x,size.y], orientation:layouts[0].orientation, compress:true });
  pdf.setProperties({title:drawing.name,creator:'JLG CAD'});
  for (const [index,layout] of layouts.entries()) {
    const size=paperSize(layout);
    if(index) pdf.addPage([size.x,size.y],layout.orientation);
    pdf.saveGraphicsState();
    pdf.rect(0,0,size.x,size.y,null);pdf.clip();pdf.discardPath();
    const draw=(s:Shape|TextItem,dimensionLabel?:string)=>{
      if(s.type==='dimension'&&s.paperHidden)return;
      const color=layout.monochrome?'#17242a':s.color;
      pdf.setDrawColor(color);pdf.setTextColor(color);pdf.setLineWidth(.25);
      if(s.type==='text'){const offset=textLineOffset(s),angle=(s.rotation||0)*Math.PI/180;pdf.setFont('helvetica');pdf.setFontSize(s.height*72/25.4);pdf.text(s.text,s.a.x-Math.sin(angle)*offset,s.a.y+Math.cos(angle)*offset,{baseline:s.vertical==='baseline'?'alphabetic':s.vertical==='middle'?'middle':s.vertical==='bottom'?'bottom':'top',align:s.align||'left',angle:-(s.rotation||0),lineHeightFactor:1.2});}
      else if(s.type==='hatch'){
        if(s.pattern==='SOLID'){pdf.setFillColor(color);for(const r of s.regions){pdf.path(r.loops.flatMap(loop=>[{op:'m',c:[loop[0].x,loop[0].y]},...loop.slice(1).map(p=>({op:'l',c:[p.x,p.y]})),{op:'h',c:[]}]));pdf.fillEvenOdd();}}
        else hatchLines(s).forEach(([a,b])=>pdf.line(a.x,a.y,b.x,b.y));
      }
      else if(s.type==='line')pdf.line(s.a.x,s.a.y,s.b.x,s.b.y);
      else if(s.type==='circle')pdf.circle(s.a.x,s.a.y,Math.hypot(s.b.x-s.a.x,s.b.y-s.a.y),'S');
      else if(s.type==='dimension'){const d=dimensionGeometry(s,displayUnit,dimensionLabel);d.lines.forEach(([a,b])=>pdf.line(a.x,a.y,b.x,b.y));pdf.setFillColor(color);d.arrows.forEach(ps=>pdf.triangle(ps[0].x,ps[0].y,ps[1].x,ps[1].y,ps[2].x,ps[2].y,'F'));pdf.setFontSize(s.height*72/25.4);const label=dimensionLabel||d.text;if(label.startsWith('⌒ ')){const x=d.label.x-pdf.getTextWidth(label.slice(2))/2-s.height*.8,y=d.label.y-s.height*.3;pdf.path([{op:'m',c:[x-s.height*.3,y]},{op:'c',c:[x-s.height*.2,y-s.height*.5,x+s.height*.2,y-s.height*.5,x+s.height*.3,y]}]);pdf.stroke();}pdf.text(label.replace(/^⌒ /,''),d.label.x,d.label.y,{align:'center',angle:d.angle});}
      else if(s.type==='arc'||s.type==='polyline'||s.type==='bezier'){
        const parts=segments(s);if(!parts.length)return;const path:{op:string;c:number[]}[]=[{op:'m',c:[parts[0].a.x,parts[0].a.y]}];
        for(const part of parts){for(const seg of part.kind==='arc'?arcCubics(part):[part])path.push(seg.kind==='line'?{op:'l',c:[seg.b.x,seg.b.y]}:{op:'c',c:[seg.c1.x,seg.c1.y,seg.c2.x,seg.c2.y,seg.b.x,seg.b.y]});}if('closed'in s&&s.closed)path.push({op:'h',c:[]});pdf.path(path);pdf.stroke();
      }
      else {const r=bounds(s);pdf.rect(r.x,r.y,r.width,r.height,'S');}
    };
    // Match the editor: model windows are behind paper annotations.
    const ordered=[...layout.items.filter(s=>s.type==='viewport'),...layout.items.filter(s=>s.type==='hatch'),...layout.items.filter(s=>s.type!=='viewport'&&s.type!=='hatch')];
    for(const item of ordered) {
      if(item.type!=='viewport'){draw(item);continue;}
      const r=bounds(item);
      pdf.saveGraphicsState();pdf.rect(r.x,r.y,r.width,r.height,null);pdf.clip();pdf.discardPath();
      for(const s of [...visibleShapes(drawing).filter(s=>s.type==='hatch'),...visibleShapes(drawing).filter(s=>s.type!=='hatch')]){draw(mapItem(s,p=>modelToPaper(p,item),1/item.denominator),s.type==='dimension'?dimensionGeometry(s,displayUnit).text:undefined);}
      pdf.restoreGraphicsState();
      if(item.printBorder){pdf.setDrawColor(layout.monochrome?'#17242a':item.color);pdf.setLineWidth(.25);pdf.rect(r.x,r.y,r.width,r.height,'S');}
    }
    pdf.restoreGraphicsState();
  }
  return pdf;
}
