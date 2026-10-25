import {test,expect} from 'bun:test';
import {defaultGrid,readGrid,gridSnap,displayedGrid,naturalGridStep,GRID_MAJOR_INTERVALS} from '../src/grid';
import {documentOf,parseDrawing} from '../src/model';
import {defaults,readBindings} from '../src/shortcuts';

test('grid shortcuts are added to old preferences and can be customized or removed',()=>{
 const b=readBindings('{"ortho":["F8"]}');expect(b.grid).toEqual(['F7','Ctrl+G']);expect(b.gridSnap).toEqual(['F9']);expect(defaults().grid).toEqual(b.grid);
 expect(readBindings('{"grid":["F6"],"gridSnap":[]}').grid).toEqual(['F6']);expect(readBindings('{"gridSnap":[]}').gridSnap).toEqual([]);
});
test('model and paper switches survive native save and old files receive defaults',()=>{
 const d=documentOf('Grille',[]),g=defaultGrid();g.model.visible=false;g.model.snap=true;g.paper.snap=false;g.paper.style='dots';d.grid=g;
 expect(parseDrawing(JSON.stringify(d)).grid).toEqual(g);const old={...d};delete old.grid;expect(parseDrawing(JSON.stringify(old)).grid).toEqual(defaultGrid());
});
test('natural graduations keep five intervals without powers of five',()=>{
 expect([10,11,20,21,100,101,200,201,1000,1001,2000].map(naturalGridStep)).toEqual([10,20,20,100,100,200,200,1000,1000,2000,2000]);
 expect(GRID_MAJOR_INTERVALS).toBe(5);
 const g=defaultGrid().model;
 for(const step of [10,20,100,200,1000,2000,10000,20000])expect(displayedGrid(g,12/step).x).toBe(step);
 expect(displayedGrid(g,100)).toEqual({x:10,y:10});expect(displayedGrid(defaultGrid().paper,100)).toEqual({x:1,y:1});
});
test('snapping follows visible intersections through zooms and hidden grid uses same step',()=>{
 const g=defaultGrid().model,p={x:135,y:-279};
 expect(gridSnap(p,g,1)).toEqual({x:140,y:-280});
 expect(gridSnap(p,g,.06)).toEqual({x:200,y:-200});
 expect(gridSnap(p,{...g,visible:false},.06)).toEqual(gridSnap(p,g,.06));
 for(const scale of [.0001,.001,.01,.1,1,10]){const step=displayedGrid(g,scale),hit=gridSnap(p,g,scale);expect(hit.x/step.x).toBe(Math.round(hit.x/step.x));expect(hit.y/step.y).toBe(Math.round(hit.y/step.y));expect(step.x*scale).toBeGreaterThanOrEqual(12);}
 expect(gridSnap(p,{...g,adaptive:false},.001)).toEqual({x:140,y:-280});
});
test('legacy independent resolution and arbitrary major lines migrate to shared natural grid',()=>{
 const g=readGrid({model:{visible:false,snap:true,gridX:25,snapX:3,major:7,style:'dots'}}).model;
 expect(g).toEqual({...defaultGrid().model,visible:false,snap:true,style:'dots'});expect(gridSnap({x:27,y:38},g,10)).toEqual({x:30,y:40});
 expect(readGrid({model:{minimum:0,style:'bad'}})).toEqual(defaultGrid());
});
