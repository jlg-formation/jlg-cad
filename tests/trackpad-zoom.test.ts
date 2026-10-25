import {test,expect} from 'bun:test';
import {readTrackpadZoomSpeed,defaultTrackpadZoomSpeed,wheelZoomFactor} from '../src/navigation';

test('la vitesse est mémorisable et les préférences absentes ou invalides utilisent le nouveau défaut',()=>{
 expect(defaultTrackpadZoomSpeed).toBe(10);
 for(const raw of [null,'',' ', 'abc','NaN','Infinity','0','-1','0.4','20.1'])expect(readTrackpadZoomSpeed(raw)).toBe(10);
 for(const speed of [.5,1,2.5,3,5,6,10,10.5,20])expect(readTrackpadZoomSpeed(String(speed))).toBe(speed);
});

test('un même pincement produit un zoom plus fort, réversible et réglable',()=>{
 const pinch={deltaY:-80,deltaMode:0,ctrlKey:true};
 const old=wheelZoomFactor(pinch,700,1),normal=wheelZoomFactor(pinch,700,defaultTrackpadZoomSpeed);
 expect(normal).toBeCloseTo(old**10);
 expect(normal).toBeGreaterThan(old);
 expect(wheelZoomFactor(pinch,700,20)).toBeGreaterThan(normal);
 expect(wheelZoomFactor(pinch,700,.5)).toBeLessThan(old);
 expect(normal*wheelZoomFactor({...pinch,deltaY:80},700,defaultTrackpadZoomSpeed)).toBeCloseTo(1);
});

test('la molette garde sa vitesse et normalise les unités et les deltas extrêmes',()=>{
 const wheel={deltaY:100,deltaMode:0,ctrlKey:false};
 for(const speed of [.5,3,5])expect(wheelZoomFactor(wheel,700,speed)).toBeCloseTo(Math.exp(-.1));
 expect(wheelZoomFactor({...wheel,deltaY:1,deltaMode:1},700,3)).toBeCloseTo(Math.exp(-.016));
 expect(wheelZoomFactor({...wheel,deltaY:1,deltaMode:2},700,3)).toBeCloseTo(Math.exp(-.7));
 expect(wheelZoomFactor({...wheel,deltaY:-1e10,ctrlKey:true},700,5)).toBeCloseTo(Math.exp(5));
 expect(wheelZoomFactor({...wheel,deltaY:0,ctrlKey:true},700,3)).toBe(1);
});
