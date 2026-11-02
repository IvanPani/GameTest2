import fs from 'node:fs';
import { recolorSockPixels } from '../src/sock-skin.js';
const raw=new Uint8ClampedArray(fs.readFileSync('/tmp/sock-source.raw'));
const width=3072,height=2560;
for (const [id,style] of [
['green', {bodyColor:'#8bc78b',accentColor:'#eecb68',patternColor:'#e94370',patternId:'dots'}],
['blue',{bodyColor:'#8bbad7',accentColor:'#cc655a',patternColor:'#fce269',patternId:'stripes'}]]) {
 const start=performance.now();
 const arr=recolorSockPixels(raw,width,height,style);
 console.log(id,'generation ms:',Math.round(performance.now()-start),'alpha preserved:',arr[3]===raw[3]);
 fs.writeFileSync(`/tmp/sock-${id}.raw`,Buffer.from(arr));
}
