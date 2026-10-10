const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../extension/content.js'), 'utf8');

function setup({ reducedMotion = false } = {}) {
  class Element {
    constructor(tag = 'div') {
      this.tag = tag;
      this.style = {};
      this.listeners = {};
      this.children = [];
      this.classes = new Set();
      this.classList = { contains: name => this.classes.has(name) };
      this.playbackRate = 1;
      this.paused = true;
    }
    animate(frames, options) {
      const animation = { frames, options, cancelled: false, cancel() { this.cancelled = true; } };
      (this.animations ??= []).push(animation);
      return animation;
    }
    play() {
      if (this.playError) return Promise.reject(this.playError);
      this.paused = false; this.emit('play'); return Promise.resolve();
    }
    pause() { this.paused = true; this.emit('pause'); }
    get textContent() { return this.children.length ? this.children.map(child => child.textContent).join('') : (this.text || ''); }
    set textContent(value) { this.text = value; this.children = []; }
    get parentElement() { return this.parent; }
    matches() { return ['input', 'textarea', 'select'].includes(this.tag) || this.role === 'textbox' || this.role === 'combobox'; }
    addEventListener(type, callback) { (this.listeners[type] ??= []).push(callback); }
    emit(type) { for (const fn of this.listeners[type] ?? []) fn(); }
    setAttribute(key, value) { this[key] = value; }
    appendChild(child) { child.remove(); this.children.push(child); child.parent = this; }
    remove() { if (this.parent) this.parent.children = this.parent.children.filter(c => c !== this); }
  }
  let media = new Element('video');
  const player = new Element();
  player.querySelector = () => media;
  const body = new Element('body');
  const document = new Element();
  Object.assign(document, { body, documentElement: body, getElementById: () => player, createElement: tag => new Element(tag) });
  const window = new Element();
  window.matchMedia = () => ({ matches: reducedMotion });
  let observer;
  let timerId = 0;
  const timers = new Map();
  vm.runInNewContext(source, {
    Element, document, window,
    MutationObserver: class { constructor(fn) { observer = fn; } observe() {} },
    setTimeout(fn, delay) { const id = ++timerId; timers.set(id, { fn, delay }); return id; },
    clearTimeout(id) { timers.delete(id); }
  });
  function flush() {
    for (let pass = 0; pass < 20; pass++) {
      const pending = [...timers].filter(([, timer]) => timer.delay === 0);
      if (!pending.length) return;
      for (const [id, timer] of pending) { timers.delete(id); timer.fn(); }
    }
    throw new Error('Refresh did not settle');
  }
  return {
    Element, player, document, body, flush,
    get media() { return media; },
    replaceVideo() { media = new Element('video'); observer([{ type: 'childList', target: player }]); flush(); },
    removeVideo() { media = null; },
    setAd(active) {
      if (active) player.classes.add('ad-showing'); else player.classes.delete('ad-showing');
      observer([{ type: 'attributes', target: player }]); flush();
    },
    press(code, extras = {}, target = body) {
      const event = {
        code, composedPath: () => [target, body, document, window],
        preventDefault() { this.prevented = true; },
        stopImmediatePropagation() { this.stopped = true; }, ...extras
      };
      for (const fn of window.listeners.keydown) fn(event);
      flush();
      return event;
    }
  };
}

test('all four speed keys set exact rates and preserve paused state', () => {
  const app = setup();
  for (const [code, rate] of [['Backquote', 0.2], ['BracketLeft', 0.4], ['BracketRight', 0.5], ['Backslash', 0.6]]) {
    const event = app.press(code);
    assert.equal(app.media.playbackRate, rate);
    assert.equal(app.media.paused, true);
    assert.equal(event.prevented, true);
    assert.equal(event.stopped, true);
    assert.match(app.body.children.at(-1).textContent, new RegExp(String(rate)));
  }
});

test('typing, composition, modifiers, repeats and unrelated keys do not change speed', () => {
  const app = setup();
  for (const tag of ['input', 'textarea', 'select']) app.press('BracketLeft', {}, new app.Element(tag));
  const editable = new app.Element(); editable.isContentEditable = true;
  app.press('BracketLeft', {}, editable);
  const textbox = new app.Element(); textbox.role = 'textbox';
  app.press('BracketLeft', {}, textbox);
  for (const flag of ['ctrlKey', 'metaKey', 'altKey', 'shiftKey', 'isComposing', 'repeat']) {
    app.press('BracketLeft', { [flag]: true });
  }
  assert.equal(app.press('KeyA').prevented, undefined);
  assert.equal(app.media.playbackRate, 1);
});

test('restores selection after rate changes and replacement video nodes', () => {
  const app = setup();
  app.press('Backslash');
  app.media.playbackRate = 1;
  app.media.emit('ratechange'); app.flush();
  assert.equal(app.media.playbackRate, 0.6);
  app.replaceVideo();
  assert.equal(app.media.playbackRate, 0.6);
  app.media.playbackRate = 1;
  app.media.emit('loadedmetadata'); app.flush();
  assert.equal(app.media.playbackRate, 0.6);
});

test('ad playback is not forced to the selected rate; content resumes at it', () => {
  const app = setup();
  app.setAd(true);
  app.press('BracketRight');
  assert.equal(app.media.playbackRate, 1);
  assert.match(app.body.children.at(-1).textContent, /after ad/);
  app.setAd(false);
  assert.equal(app.media.playbackRate, 0.5);
});

test('backquote selects 0.2x without restoring normal speed', () => {
  const app = setup();
  app.press('BracketLeft');
  assert.equal(app.press('Backquote').prevented, true);
  assert.equal(app.media.playbackRate, 0.2);
});

test('toast is attached inside fullscreen; pages without a video keep normal keys', () => {
  const app = setup();
  app.document.fullscreenElement = app.player;
  app.press('BracketRight');
  assert.match(app.player.children.at(-1).textContent, /0.5/);
  app.removeVideo();
  assert.equal(app.press('BracketLeft').prevented, undefined);
});


test('persistent snail panel confirms loading and its buttons select speeds', () => {
  const app = setup();
  const panel = app.body.children.find(child => child.id === 'snail-spoke-controller');
  assert.ok(panel);
  assert.match(panel.children[0].textContent, /🐌 1× · ready/);
  assert.equal(panel.children[1].children.length, 5);
  for (const [index, speed] of [0.2, 0.4, 0.5, 0.6].entries()) {
    panel.children[1].children[index].emit('click');
    app.flush();
    assert.equal(app.media.playbackRate, speed);
    assert.equal(panel.children[2].textContent, `Clicked → ${speed}×`);
  }
});

test('unmapped keys and missing videos show diagnostic feedback', () => {
  const app = setup();
  const panel = app.body.children.find(child => child.id === 'snail-spoke-controller');
  app.press('KeyA');
  assert.equal(panel.children[2].textContent, 'Key received: KeyA');
  app.removeVideo();
  app.press('BracketLeft');
  assert.match(panel.children[0].textContent, /no video found/);
  assert.match(app.body.children.at(-1).textContent, /Trigger received/);
});


test('start/pause button and K preserve speed and follow external playback changes', async () => {
  const app = setup();
  const panel = app.body.children.find(child => child.id === 'snail-spoke-controller');
  const button = panel.children[1].children[4];
  app.press('BracketRight');
  assert.equal(button.textContent, '▶');
  button.emit('click');
  await new Promise(resolve => setImmediate(resolve)); app.flush();
  assert.equal(app.media.paused, false);
  assert.equal(button.textContent, '⏸');
  assert.equal(app.media.playbackRate, 0.5);
  app.press('KeyK', { repeat: true });
  assert.equal(app.media.paused, false);
  const event = app.press('KeyK');
  assert.equal(event.stopped, true);
  assert.equal(app.media.paused, true);
  assert.equal(button.textContent, '▶');
  app.press('KeyK', {}, new app.Element('input'));
  assert.equal(app.media.paused, true);
  await app.media.play(); app.flush();
  assert.equal(button.textContent, '⏸');
  app.media.pause(); app.flush();
  assert.equal(button.textContent, '▶');
});

test('failed play reports an error and leaves the button ready to retry', async () => {
  const app = setup();
  app.media.playError = new Error('Blocked');
  app.press('KeyK');
  await new Promise(resolve => setImmediate(resolve)); app.flush();
  const panel = app.body.children.find(child => child.id === 'snail-spoke-controller');
  assert.equal(panel.children[1].children[4].textContent, '▶');
  assert.match(app.body.children.at(-1).textContent, /Could not start/);
});


test('snail animation runs for clicks and Spoke keys and restarts on each trigger', () => {
  const app = setup();
  const panel = app.body.children.find(child => child.id === 'snail-spoke-controller');
  const snail = panel.children[0].children[0];
  panel.children[1].children[0].emit('click');
  assert.equal(snail.animations.length, 1);
  assert.equal(snail.animations[0].options.iterations, 1);
  app.press('BracketLeft');
  assert.equal(snail.animations.length, 2);
  assert.equal(snail.animations[0].cancelled, true);
  app.press('KeyK');
  assert.equal(snail.animations.length, 3);
});

test('reduced motion uses opacity feedback without movement', () => {
  const app = setup({ reducedMotion: true });
  app.press('BracketRight');
  const panel = app.body.children.find(child => child.id === 'snail-spoke-controller');
  const animation = panel.children[0].children[0].animations[0];
  assert.equal(animation.options.iterations, 1);
  assert.ok(animation.frames.every(frame => 'opacity' in frame && !('transform' in frame)));
});


test('snail collapses and reopens controls while preserving keyboard operation and speed', () => {
  const app = setup();
  const panel = app.body.children.find(child => child.id === 'snail-spoke-controller');
  const snail = panel.children[0].children[0];
  snail.emit('click');
  assert.equal(panel.style.width, '48px');
  assert.equal(panel.style.height, '48px');
  assert.equal(panel.children[1].style.display, 'none');
  assert.equal(panel.children[2].style.display, 'none');
  assert.equal(snail['aria-expanded'], 'false');
  app.press('Backquote');
  assert.equal(app.media.playbackRate, 0.2);
  assert.equal(panel.style.width, '48px');
  app.replaceVideo();
  assert.equal(app.media.playbackRate, 0.2);
  assert.equal(panel.style.width, '48px');
  snail.emit('click');
  assert.equal(panel.style.width, '260px');
  assert.equal(panel.style.height, '108px');
  assert.equal(panel.children[1].style.display, 'grid');
  assert.equal(panel.children[2].style.display, 'block');
  assert.equal(snail['aria-expanded'], 'true');
  assert.match(panel.children[0].textContent, /0.2×/);
});
