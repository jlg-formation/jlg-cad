import {test,expect} from 'bun:test';
import {initialModelView,modelGridStep} from '../src/view';
test('la vue initiale contient 50 m dans les deux directions, sans déformation',()=>{
 for(const [width,height] of [[1400,800],[900,600],[500,400]]){
  const v=initialModelView(width,height);
  expect((width-48)/v.scale).toBeGreaterThanOrEqual(50000);
  expect((height-48)/v.scale).toBeGreaterThanOrEqual(50000);
  expect(5000*v.scale).toBeLessThanOrEqual(Math.min(width,height)/10);
  expect(v.x-2500*v.scale).toBeCloseTo(24);
  expect(v.y+2500*v.scale).toBeCloseTo(height-24);
  expect((width-v.x-24)/v.scale).toBeGreaterThanOrEqual(49999.999);
  expect((v.y-24)/v.scale).toBeGreaterThanOrEqual(49999.999);
 }
});
test('la grille conserve un espacement lisible à toutes les échelles',()=>{
 for(const scale of [.0001,.01,.02,1,30]){const step=modelGridStep(scale);expect(step*scale).toBeGreaterThanOrEqual(40);expect(step*scale).toBeLessThanOrEqual(100);}
});
