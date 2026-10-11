import { jsPDF } from 'jspdf';
import { bounds, modelToPaper, paperSize, type Drawing, type Layout, type Shape, type TextItem } from './model';

export function createPdf(drawing: Drawing, layouts: Layout[]) {
  if (!layouts.length) throw new Error('Créez une présentation avant d’exporter.');
  const size = paperSize(layouts[0]);
  const pdf = new jsPDF({ unit:'mm', format:[size.x,size.y], orientation:layouts[0].orientation, compress:true });
  pdf.setProperties({title:drawing.name,creator:'JLG CAD'});
  for (const [index,layout] of layouts.entries()) {
    const size=paperSize(layout);
    if(index) pdf.addPage([size.x,size.y],layout.orientation);
    pdf.saveGraphicsState();
    pdf.rect(0,0,size.x,size.y,null);pdf.clip();pdf.discardPath();
    const draw=(s:Shape|TextItem,scale=1)=>{
      const color=layout.monochrome?'#17242a':s.color;
      pdf.setDrawColor(color);pdf.setTextColor(color);pdf.setLineWidth(.25);
      if(s.type==='text'){pdf.setFont('helvetica');pdf.setFontSize(s.height*72/25.4);pdf.text(s.text,s.a.x,s.a.y,{baseline:'top',lineHeightFactor:1.2});}
      else if(s.type==='line')pdf.line(s.a.x,s.a.y,s.b.x,s.b.y);
      else if(s.type==='circle')pdf.circle(s.a.x,s.a.y,Math.hypot(s.b.x-s.a.x,s.b.y-s.a.y)*scale,'S');
      else {const r=bounds(s);pdf.rect(r.x,r.y,r.width,r.height,'S');}
    };
    // Match the editor: model windows are behind paper annotations.
    const ordered=[...layout.items.filter(s=>s.type==='viewport'),...layout.items.filter(s=>s.type!=='viewport')];
    for(const item of ordered) {
      if(item.type!=='viewport'){draw(item);continue;}
      const r=bounds(item);
      pdf.saveGraphicsState();pdf.rect(r.x,r.y,r.width,r.height,null);pdf.clip();pdf.discardPath();
      for(const s of drawing.shapes){const a=modelToPaper(s.a,item),b=modelToPaper(s.b,item);draw({...s,a,b});}
      pdf.restoreGraphicsState();
      if(item.printBorder){pdf.setDrawColor(layout.monochrome?'#17242a':item.color);pdf.setLineWidth(.25);pdf.rect(r.x,r.y,r.width,r.height,'S');}
    }
    pdf.restoreGraphicsState();
  }
  return pdf;
}
