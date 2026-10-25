export type GridSettings = {
 visible: boolean;
 snap: boolean;
 minimum: number;
 style: 'lines' | 'dots';
 adaptive: boolean;
};
export type DrawingGrid = {model: GridSettings; paper: GridSettings};
export const GRID_MAJOR_INTERVALS = 5;
const spaceGrid = (minimum: number): GridSettings => ({visible:false, snap:false, minimum, style:'lines', adaptive:true});
export const defaultGrid = (): DrawingGrid => ({model:spaceGrid(10), paper:spaceGrid(1)});

// Older drawings can contain independent snap steps and arbitrary major intervals.
// Preserve their switches and style while applying the new shared spacing rules.
export function readGrid(raw: unknown): DrawingGrid {
 const result = defaultGrid();
 if (!raw || typeof raw !== 'object') return result;
 for (const space of ['model','paper'] as const) {
  const saved = (raw as DrawingGrid)[space];
  if (!saved || typeof saved !== 'object') continue;
  for (const key of ['visible','snap','adaptive'] as const) {
   if (typeof saved[key] === 'boolean') result[space][key] = saved[key];
  }
  if (saved.style === 'lines' || saved.style === 'dots') result[space].style = saved.style;
 }
 return result;
}

// 1, 2, 10, 20, 100, 200... gives major lines at 5, 10, 50, 100...
export function naturalGridStep(target: number): number {
 const power = 10 ** Math.floor(Math.log10(target));
 const normalized = target / power;
 const tolerance = 1e-10;
 return (normalized <= 1 + tolerance ? 1 : normalized <= 2 + tolerance ? 2 : 10) * power;
}
export function displayedGrid(g: GridSettings, scale: number) {
 const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
 const step = g.adaptive ? naturalGridStep(Math.max(g.minimum, 12 / safeScale)) : g.minimum;
 return {x:step, y:step};
}
export function gridSnap(p:{x:number;y:number}, g:GridSettings, scale:number) {
 const step = displayedGrid(g, scale);
 return {x:Math.round(p.x / step.x) * step.x, y:Math.round(p.y / step.y) * step.y};
}
