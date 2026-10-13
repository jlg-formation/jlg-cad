import type {HatchShape} from './model';
import {patternFamilies} from './hatch';

// DXF HATCH, with explicit polyline loops and native pattern definitions.
// Export the resolved surface as an editable, independent hatch. JLG CAD's
// topology dependencies are not AutoCAD's persistent boundary associations.
export function hatchDxf(s:HatchShape,layer:string,handle:string):(string|number)[]{
 const pairs:(string|number)[]=[0,'HATCH',5,handle,100,'AcDbEntity',8,layer,420,parseInt(s.color.slice(1),16),100,'AcDbHatch',10,0,20,0,30,0,210,0,220,0,230,1,2,s.pattern,70,s.pattern==='SOLID'?1:0,71,0,91,s.regions.reduce((n,r)=>n+r.loops.length,0)];
 for(const region of s.regions)for(let i=0;i<region.loops.length;i++){const loop=region.loops[i];pairs.push(92,i===0?3:2,72,0,73,1,93,loop.length);for(const p of loop)pairs.push(10,p.x,20,-p.y);pairs.push(97,0);}
 // Island rules were resolved in the stored loops: always use even/odd filling.
 pairs.push(75,0,76,s.pattern==='USER'?0:s.pattern==='ANSI31'||s.pattern==='SOLID'?1:2);
 if(s.pattern!=='SOLID'){
  const families=patternFamilies(s);pairs.push(52,s.angle,41,s.scale,77,0,78,families.length);
  // The renderer's positive row normal is in screen coordinates (Y down).
  // Reflect that whole offset vector, including its tangent shift, into DXF Y up.
  for(const f of families){const a=f.angle*Math.PI/180;pairs.push(53,f.angle,43,s.origin.x+(f.base?.x||0),44,-s.origin.y+(f.base?.y||0),45,Math.cos(a)*(f.shift||0)+Math.sin(a)*f.spacing,46,Math.sin(a)*(f.shift||0)-Math.cos(a)*f.spacing,79,f.dashes?.length||0);f.dashes?.forEach((d,i)=>pairs.push(49,i%2?-d:d));}
 }
 pairs.push(47,.05,98,s.regions.length);for(const r of s.regions)pairs.push(10,r.seed.x,20,-r.seed.y);
 return pairs;
}
