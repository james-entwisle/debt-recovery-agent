import {execFileSync} from 'node:child_process';
import {mkdir,mkdtemp,rename} from 'node:fs/promises';
import {resolve,dirname,join} from 'node:path';
const input=resolve(process.argv[2] || '');
if(!process.argv[2] || !input.endsWith('.mp4')) throw new Error('Usage: master-audio.mjs output.mp4');
await mkdir(join(dirname(input),'attempts'),{recursive:true});
const temporary=await mkdtemp(join(dirname(input),'attempts/audio-master-'));
const output=join(temporary,'mastered.mp4');
execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-i',input,'-c:v','copy','-af','loudnorm=I=-16:TP=-1.5:LRA=9','-c:a','aac','-b:a','192k','-ar','48000','-movflags','+faststart',output],{stdio:'inherit'});
await rename(input,join(temporary,'original.mp4'));
try {await rename(output,input);} catch(error) {await rename(join(temporary,'original.mp4'),input); throw error;}
console.log('Narration mastered to -16 LUFS with a -1.5 dB true-peak limit; original preserved.');
