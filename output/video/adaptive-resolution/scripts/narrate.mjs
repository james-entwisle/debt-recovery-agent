import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {resolve, join} from 'node:path';

const [input, output, ...flags] = process.argv.slice(2);
if (!input || !output) throw new Error('Usage: narrate.mjs script.json output-dir [--key-stdin] [--refresh] [--pronunciations file.json]');
const key = flags.includes('--key-stdin')
  ? (await new Promise(resolve => {let value = ''; process.stdin.setEncoding('utf8'); process.stdin.on('data', part => {value += part; if (value.includes('\n')) resolve(value.trim());});} ))
  : process.env.ELEVENLABS_API_KEY;
if (!key) throw new Error('ELEVENLABS_API_KEY is required');
const voice = process.env.ELEVENLABS_VOICE_ID || 'w9rPM8AIZle60Nbpw7nl';
const script = JSON.parse(await readFile(input, 'utf8'));
const pronunciationFlag=flags.indexOf('--pronunciations');
const pronunciations=pronunciationFlag<0?{}:JSON.parse(await readFile(flags[pronunciationFlag+1],'utf8'));
if(!pronunciations || Array.isArray(pronunciations) || typeof pronunciations!=='object' || Object.entries(pronunciations).some(([name,alias])=>!name || typeof alias!=='string' || !alias)) throw new Error('Expected a pronunciation map of names to spoken aliases');
if (!Array.isArray(script) || !script.length || script.some(s => !/^[a-z0-9-]+$/.test(s.id) || !s.text || !s.title) || new Set(script.map(s => s.id)).size !== script.length) throw new Error('Expected unique {id,title,text} segments');
await mkdir(output, {recursive: true});
const manifest = [];
for (const segment of script) {
  const spokenText=Object.entries(pronunciations).sort((a,b)=>b[0].length-a[0].length).reduce((value,[name,alias])=>value.replaceAll(name,alias),segment.text);
  const fingerprint = createHash('sha256').update(JSON.stringify({text: spokenText, voice, model: 'eleven_multilingual_v2', speed: 0.9})).digest('hex');
  const metaPath = join(output, `${segment.id}.json`);
  let cached;
  try {cached = JSON.parse(await readFile(metaPath, 'utf8'));} catch (error) {if (error.code !== 'ENOENT') throw error;}
  if (cached && cached.fingerprint !== fingerprint && !flags.includes('--refresh')) throw new Error(`${segment.id} changed. Use --refresh to authorise regeneration.`);
  if (!cached || cached.fingerprint !== fingerprint) {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}/with-timestamps`, {
      method: 'POST', headers: {'xi-api-key': key, 'Content-Type': 'application/json'},
      body: JSON.stringify({text: spokenText, model_id: 'eleven_multilingual_v2', voice_settings: {stability: 0.65, similarity_boost: 0.75, speed: 0.9}}),
      signal: AbortSignal.timeout(90000),
    });
    if (!response.ok) {
      const failure = await response.json().catch(() => ({}));
      const code = typeof failure.detail?.status === 'string' ? failure.detail.status : 'unknown';
      throw new Error(`Speech provider returned HTTP ${response.status} (${code}); stopped without retry.`);
    }
    const result = await response.json();
    if (typeof result.audio_base64 !== 'string') throw new Error('Missing speech audio');
    const audioPath = resolve(output, `${segment.id}.mp3`);
    await writeFile(audioPath, Buffer.from(result.audio_base64, 'base64'));
    const duration = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', audioPath], {encoding: 'utf8'}).trim());
    cached = {...segment, spokenText, fingerprint, voice, duration, alignment: result.normalized_alignment || result.alignment};
    await writeFile(metaPath, JSON.stringify(cached, null, 2));
  }
  manifest.push(cached);
  console.log(`${segment.id}: ${cached.duration.toFixed(1)}s`);
}
await writeFile(join(output, 'manifest.json'), JSON.stringify(manifest, null, 2));
process.exit(0);
