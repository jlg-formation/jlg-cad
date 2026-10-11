export function initialModelView(width:number,height:number){
 const padding=24;
 const scale=Math.max(.0001,Math.min(Math.max(1,width-padding*2)/50000,Math.max(1,height-padding*2)/50000));
 return {x:padding,y:Math.max(padding,height-padding),scale};
}
export function modelGridStep(scale:number){
 const target=40/scale,power=10**Math.floor(Math.log10(target));
 return [1,2,5,10].map(n=>n*power).find(n=>n>=target)!;
}
