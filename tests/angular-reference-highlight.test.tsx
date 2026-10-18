import {test,expect} from 'bun:test';
import {renderToStaticMarkup} from 'react-dom/server';
import {AngularReferenceHighlight} from '../src/angular-reference-highlight';
import {modelToPaper,type Shape,type Viewport} from '../src/model';

const shape:Shape={id:'rectangle',type:'rect',a:{x:0,y:0},b:{x:5000,y:3000},color:'#abcdef'};
const first={id:shape.id,segment:0,position:.5},second={id:shape.id,segment:1,position:.5};
const viewport:Viewport={id:'plan',type:'viewport',a:{x:20,y:30},b:{x:220,y:180},center:{x:2500,y:1500},denominator:50,color:'#17242a',locked:true,printBorder:false};

test('angular command highlights only its chosen segments without selecting the rectangle',()=>{
 const before=JSON.stringify(shape);
 const render=(references:typeof first[])=>renderToStaticMarkup(<AngularReferenceHighlight tool="angularDimension" references={references} shapes={[shape]}/>);
 const one=render([first]);expect(one.match(/<line /g)).toHaveLength(1);expect(one).toContain('x1="0" y1="0" x2="5000" y2="0"');
 const two=render([first,second]);expect(two.match(/<line /g)).toHaveLength(2);expect(two).not.toContain('<rect');expect(two).not.toContain('data-grip');expect(two).not.toContain('data-id=');
 expect(two).toContain('stroke="#168bff"');expect(two).toContain('pointer-events="none"');expect(two).toContain('non-scaling-stroke');expect(JSON.stringify(shape)).toBe(before);
});
test('paper feedback is projected only into the reference viewport, including locked windows',()=>{
 const render=(v:Viewport)=>renderToStaticMarkup(<AngularReferenceHighlight tool="angularDimension" references={[first]} shapes={[shape]} viewport={v} referenceViewportId="plan"/>);
 const projected=render(viewport),a=modelToPaper(shape.a,viewport),b=modelToPaper({x:5000,y:0},viewport);
 expect(projected).toContain(`x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"`);
 expect(render({...viewport,id:'detail'})).toBe('');
 expect(renderToStaticMarkup(<AngularReferenceHighlight tool="angularDimension" references={[first]} shapes={[shape]} referenceViewportId="plan"/>)).toBe('');
});
test('ending the command or clearing its references removes feedback; stale sources are ignored',()=>{
 expect(renderToStaticMarkup(<AngularReferenceHighlight tool="select" references={[first,second]} shapes={[shape]}/>)).toBe('');
 const cleared=renderToStaticMarkup(<AngularReferenceHighlight tool="angularDimension" references={[]} shapes={[shape]}/>);expect(cleared).not.toContain('<line');
 const stale=renderToStaticMarkup(<AngularReferenceHighlight tool="angularDimension" references={[{...first,id:'deleted'},{...first,segment:99}]} shapes={[shape]}/>);expect(stale).not.toContain('<line');
});
