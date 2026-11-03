import test from 'node:test';
import assert from 'node:assert/strict';
import { recolorSockPixels, recolorStaticSockPixels } from '../src/sock-skin.js';
import { SOCK_PATTERNS } from '../src/sock-customization.js';

function sourceSheet() {
    const source=new Uint8ClampedArray(1024*512*4);
    for(let y=40;y<470;y++)for(let x=90;x<420;x++) {
        const toe=x<210&&y<170;
        const shade=Math.floor(y/30);
        source.set(toe?[210,62,55,255]:[242-shade,230-shade,216-shade,255],(y*1024+x)*4);
    }
    return source;
}
function firstFrame(pixels) {
    const frame=new Uint8ClampedArray(512*512*4);
    for(let y=0;y<512;y++)frame.set(pixels.subarray(y*1024*4,(y*1024+512)*4),y*512*4);
    return frame;
}

test('historical frame matches the live renderer for every pattern without mutating source or live output',()=>{
    const source=sourceSheet(),original=new Uint8ClampedArray(source);
    for(const {id} of SOCK_PATTERNS) {
        const style={bodyColor:'#ed81b1',accentColor:'#182c60',patternColor:'#f3cf4b',patternId:id,toesEnabled:id!=='dots',cuffEnabled:id!=='stars'};
        const live=recolorSockPixels(source,1024,512,style);
        const before=new Uint8ClampedArray(live);
        const historical=recolorStaticSockPixels(source,1024,512,style);
        assert.equal(historical.length,512*512*4);
        assert.deepEqual(historical,firstFrame(live));
        assert.deepEqual(live,before);
        assert.deepEqual(source,original);
    }
});
