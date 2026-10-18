import {test,expect} from 'bun:test';
import {makeDimension} from '../src/dimension-kinds';
import {dimensionGeometry,distance,mapItem} from '../src/geometry';
import {projectPaperDimension} from '../src/paper-dimensions';
import {documentOf,toDxf,type Point,type Dimension,type Viewport} from '../src/model';
import {createPdf} from '../src/pdf';
import {inflateSync} from 'node:zlib';

const zero={x:0,y:0},base={id:'dimension',a:zero,b:zero,color:'#abcdef'},options={direction:'',axis:'auto' as const,datum:zero};
function baselineClearance(d:Dimension){
 const g=dimensionGeometry(d),[a,b]=g.lines[2],middle={x:(a.x+b.x)/2,y:(a.y+b.y)/2},phi=-g.angle*Math.PI/180,up={x:Math.sin(phi),y:-Math.cos(phi)};
 return (g.label.x-middle.x)*up.x+(g.label.y-middle.y)*up.y-d.height*.23;
}
test('aligned text clears the line for all inclinations, both offset sides and both click orders',()=>{
 for(const degrees of [-180,-150,-90,-60,-26.565,0,26.565,60,90,150,180])for(const side of [-1,1]){
  const phi=degrees*Math.PI/180,b={x:Math.cos(phi)*5000,y:Math.sin(phi)*5000},p={x:b.x/2-Math.sin(phi)*1000*side,y:b.y/2+Math.cos(phi)*1000*side};
  const d=makeDimension('alignedDimension',[zero,b],p,base,100,options),reversed=makeDimension('alignedDimension',[b,zero],p,base,100,options);
  expect(baselineClearance(d)).toBeGreaterThanOrEqual(26.999999);expect(baselineClearance(reversed)).toBeGreaterThanOrEqual(26.999999);
  const g=dimensionGeometry(d),r=dimensionGeometry(reversed);expect(distance(g.label,r.label)).toBeLessThan(1e-7);expect(g.angle).toBeCloseTo(r.angle);expect(Math.abs(g.angle)).toBeLessThanOrEqual(90);
 }
});
test('legacy dimensions and paper projection use the same clearance, proportional to printed height',()=>{
 const d=makeDimension('alignedDimension',[zero,{x:4000,y:-2000}],{x:1000,y:-2000},base,150,options),legacy={...d,kind:undefined};
 expect(baselineClearance(legacy)).toBeCloseTo(40.5);
 const v:Viewport={...base,id:'view',type:'viewport',a:{x:10,y:10},b:{x:210,y:160},center:zero,denominator:50,locked:true,printBorder:false};
 const paper=projectPaperDimension(d,v,3);expect(baselineClearance(paper)).toBeCloseTo(.81);expect(dimensionGeometry(paper,'m').text).toBe(dimensionGeometry(d,'m').text);
 const smaller=mapItem(d,p=>({x:p.x/100,y:p.y/100}),.01);expect(baselineClearance(smaller)).toBeCloseTo(.405);
});
test('horizontal angular and arc-length text boxes stay outside the arc in every quadrant',()=>{
 for(const middle of [0,Math.PI/4,Math.PI/2,Math.PI*3/4,Math.PI,Math.PI*5/4,Math.PI*3/2,Math.PI*7/4])for(const tool of ['angularDimension','arcDimension'] as const){
  const radial=(a:number,r:number)=>({x:Math.cos(a)*r,y:Math.sin(a)*r}),ps=[zero,radial(middle-Math.PI/6,1000),radial(middle+Math.PI/6,1000)];
  const d=makeDimension(tool,ps,radial(middle,300),base,30,options,Math.PI/3),g=dimensionGeometry(d),halfWidth=g.text.length*d.height*.65/2;
  for(const x of [-halfWidth,halfWidth])for(const y of [-d.height*.8,d.height*.23]){
   const projection=(g.label.x+x)*Math.cos(middle)+(g.label.y+y)*Math.sin(middle);
   expect(projection).toBeGreaterThanOrEqual(300+8.1-1e-7);
  }
  expect(g.angle).toBe(0);
 }
});
test('layout and viewport labels reserve space for the real displayed value',()=>{
 const model=makeDimension('arcDimension',[zero,{x:1000000,y:0},{x:0,y:1000000}],{x:1000000,y:1000000},base,300,options,Math.PI/2);
 const v:Viewport={...base,id:'view',type:'viewport',a:zero,b:{x:210,y:297},center:zero,denominator:100,locked:true,printBorder:false},paper=projectPaperDimension(model,v,3);
 const label=dimensionGeometry(model).text,g=dimensionGeometry(paper),unlinked=dimensionGeometry({...paper,paperLink:undefined}),explicit=dimensionGeometry({...paper,paperLink:undefined},'mm',label);
 expect(g.text).toBe(label);expect(distance(g.label,explicit.label)).toBeLessThan(1e-8);expect(distance(g.label,unlinked.label)).toBeGreaterThan(.1);
});
test('PDF and DXF use the corrected placement and retain the measurement',()=>{
 const d=makeDimension('alignedDimension',[zero,{x:80,y:-40}],{x:20,y:-30},base,3,options),g=dimensionGeometry(d),dxf=toDxf([d]);
 expect(dxf).toContain(g.text);expect(dxf).toContain(String(g.label.x));expect(dxf).toContain(String(-g.label.y));
 const layout={id:'sheet',name:'Plan',format:'A4' as const,orientation:'landscape' as const,monochrome:true,items:[d]},doc=documentOf('Clearance',[],[layout]);
 const raw=createPdf(doc,[layout]).output(),stream=inflateSync(Buffer.from(raw.match(/stream\n([\s\S]*?)\nendstream/)![1],'latin1')).toString('latin1');
 expect(stream).toContain(g.text);expect(raw).not.toContain('/Subtype /Image');
});
