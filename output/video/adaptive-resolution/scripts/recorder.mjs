import {performance} from 'node:perf_hooks';
import {writeFile} from 'node:fs/promises';

const wait = milliseconds => new Promise(resolve => setTimeout(resolve, Math.max(0, milliseconds)));

export class Recorder {
  constructor(page, audio, origin = performance.now()) {
    this.page = page;
    this.audio = audio;
    this.origin = origin;
    this.viewport = page.viewportSize();
    if (!this.viewport) throw new Error('Set an explicit recording viewport');
    this.scenes = [];
    this.active = null;
  }
  time() {return (performance.now() - this.origin) / 1000;}
  async scene(id, action) {
    const audio = this.audio.find(s => s.id === id);
    if (!audio) throw new Error(`Missing audio: ${id}`);
    const scene = {id, title: audio.title, text: audio.text, footage: 'footage/browser.webm', start: this.time(), duration: 0, audioDuration: audio.duration, lead: 0.5, events: []};
    this.active = scene;
    const shot = {
      at: async (seconds, fn) => {await wait((scene.start + seconds - this.time()) * 1000); await fn();},
      click: locator => this.click(locator),
      focus: (locator, scale = 1.5) => this.focus(locator, scale),
      wide: () => this.event({kind: 'camera', x: this.viewport.width/2, y: this.viewport.height/2, scale: 1}),
    };
    await action(shot);
    await wait((Math.max(scene.start + scene.lead + audio.duration + 1.4, this.time() + 1.4) - this.time()) * 1000);
    scene.duration = this.time() - scene.start;
    this.scenes.push(scene);
    this.active = null;
  }
  event(event) {
    if (!this.active) throw new Error('Action outside scene');
    this.active.events.push({...event, at: this.time() - this.active.start});
  }
  async box(locator) {
    await locator.waitFor({state: 'visible'});
    await locator.scrollIntoViewIfNeeded();
    const box = await locator.boundingBox();
    if (!box) throw new Error('Target has no visible box');
    return box;
  }
  async focus(locator, scale) {
    const box = await this.box(locator);
    const fit = Math.max(1, Math.min(scale, this.viewport.width/(box.width+48), this.viewport.height/(box.height+48)));
    this.event({kind: 'camera', x: box.x + box.width / 2, y: box.y + box.height / 2, scale: fit, bounds: box});
  }
  async click(locator) {
    const box = await this.box(locator);
    const x = box.x + box.width / 2, y = box.y + box.height / 2;
    this.event({kind: 'click', x, y, width: box.width, height: box.height});
    await this.page.mouse.move(x, y, {steps: 12});
    await wait(160);
    await locator.click();
  }
  async save(path) {await writeFile(path, JSON.stringify({viewport: this.viewport, scenes: this.scenes, interrupted: this.active ? {...this.active, duration:this.time()-this.active.start} : null}, null, 2));}
}
