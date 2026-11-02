'use strict';
/* Run: node demo/model.test.cjs. Tests domain invariants, not UI snapshots. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'model.js'), 'utf8'), sandbox);
const M = sandbox.window.MuseModel;
const plain = value => JSON.parse(JSON.stringify(value));
let passed = 0;
function test(name, run) { run(); passed += 1; console.log('✓ ' + name); }
const capture = overrides => Object.assign({
  id: 'session-1', templateId: 'cafe-natural', contextId: 'cafe', lookId: 'natural',
  mode: 'inFrame', outcome: 'keep', capturedAt: '2026-10-15T04:00:00.000Z', photoRef: 'assets/cafe.webp'
}, overrides);
const memoryStorage = () => {
  const items = new Map();
  return { getItem: key => items.has(key) ? items.get(key) : null, setItem: (key, value) => items.set(key, value), items };
};

test('all 5 contexts × 3 looks × 2 modes produce complete, matching plans', () => {
  assert.equal(M.TEMPLATES.length, 12);
  const ids = new Set(M.TEMPLATES.map(item => item.id));
  assert.equal(ids.size, 12);
  for (const context of M.CONTEXTS) for (const look of M.LOOKS) for (const mode of M.MODES) {
    const plan = M.getPlan(context.id, look.id, mode.id);
    assert.equal(plan.contextId, context.id);
    assert.equal(plan.sceneId, context.sceneId);
    assert.equal(plan.lookId, look.id);
    assert.equal(plan.mode, mode.id);
    assert.ok(plan.phone.height && plan.phone.distance && plan.phone.orientation);
    assert.deepEqual(plain(plan.actions.map(action => action.stage)), ['enterFrame', 'composition', 'pose', 'expression']);
    for (const action of plan.actions) assert.ok(action.inFrame && action.shooting && typeof action.spatial === 'boolean');
    assert.ok(plan.avoid.length >= 2);
  }
  assert.equal(M.getPlan('missing', 'natural', 'inFrame'), null);
  assert.equal(M.getPlan('cafe', 'missing', 'inFrame'), null);
  assert.equal(M.getPlan('cafe', 'natural', 'missing'), null);
});

test('profile purposes share a template but carry distinct expression instructions', () => {
  const dating = M.getPlan('dating', 'natural', 'inFrame');
  const work = M.getPlan('professional', 'natural', 'inFrame');
  assert.equal(dating.templateId, work.templateId);
  assert.notEqual(dating.id, work.id);
  assert.notEqual(dating.actions[3].inFrame, work.actions[3].inFrame);
  dating.phone.height = 'mutated';
  assert.equal(M.getPlan('dating', 'natural', 'inFrame').phone.height, 'Eye level');
});

test('Free access covers only weekly Natural; explicit chosen subscription prices are used', () => {
  for (const id of ['cafe', 'outfit', 'travel']) assert.equal(M.freeAccess(id, 'natural'), true);
  for (const id of ['dating', 'professional']) assert.equal(M.freeAccess(id, 'natural'), false);
  assert.equal(M.freeAccess('cafe', 'editorial'), false);
  assert.equal(M.freeAccess('cafe', 'candid'), false);
  assert.equal(M.CONFIG.subscription.monthly, 6.99);
  assert.equal(M.CONFIG.subscription.annual, 29.99);
  assert.equal(M.CONFIG.subscription.trialDays, 7);
});

test('Keep is immutable and idempotent; Favorite upgrades total weight to 3 exactly once', () => {
  const original = M.createData();
  let saved = M.commitSession(original, capture());
  assert.equal(original.sessions.length, 0);
  assert.deepEqual(plain(original.styleWeights), {});
  assert.equal(saved.sessions.length, 1);
  assert.equal(saved.styleWeights['cafe-natural'], 1);
  saved = M.commitSession(saved, capture());
  assert.equal(saved.styleWeights['cafe-natural'], 1);
  saved = M.commitSession(saved, capture({ outcome: 'favorite' }));
  assert.equal(saved.sessions.length, 1);
  assert.equal(saved.styleWeights['cafe-natural'], 3);
  assert.equal(saved.sessions[0].favorite, true);
  const repeat = M.commitSession(saved, capture({ outcome: 'favorite' }));
  assert.equal(repeat.styleWeights['cafe-natural'], 3);
  assert.equal(repeat.recentUses.length, 1);
  assert.equal(M.commitSession(repeat, capture()).sessions[0].outcome, 'favorite');
});

test('Favorite directly contributes 3; Retake and Discard never add sessions or weights', () => {
  const empty = M.createData();
  for (const outcome of ['retake', 'discard', 'Retake', 'Discard']) {
    const result = M.commitSession(empty, capture({ outcome }));
    assert.equal(result.sessions.length, 0);
    assert.deepEqual(plain(result.styleWeights), {});
    assert.equal(result.recentUses.length, 0);
  }
  const favorite = M.commitSession(empty, capture({ outcome: 'favorite' }));
  assert.equal(favorite.styleWeights['cafe-natural'], 3);
});

test('a session id cannot migrate between templates or purposes', () => {
  const saved = M.commitSession(M.createData(), capture());
  const replay = M.commitSession(saved, capture({ templateId: 'outfit-natural', contextId: 'outfit', outcome: 'favorite' }));
  assert.equal(replay.sessions[0].contextId, 'cafe');
  assert.equal(replay.styleWeights['cafe-natural'], 1);
  assert.equal(replay.styleWeights['outfit-natural'], undefined);
});

test('Reset style retains history and fatigue without replaying past contributions', () => {
  const saved = M.commitSession(M.createData(), capture({ outcome: 'favorite' }));
  const reset = M.resetStyle(saved);
  assert.equal(saved.styleWeights['cafe-natural'], 3);
  assert.deepEqual(plain(reset.styleWeights), {});
  assert.equal(reset.sessions.length, 1);
  assert.equal(reset.recentUses.length, 1);
  const repeated = M.commitSession(reset, capture({ outcome: 'favorite' }));
  assert.deepEqual(plain(repeated.styleWeights), {});
  const fresh = M.commitSession(repeated, capture({ id: 'session-2', outcome: 'keep' }));
  assert.equal(fresh.styleWeights['cafe-natural'], 1);
});

test('Reset style replay safety survives serialization and a subsequent load', () => {
  const storage = memoryStorage();
  const state = M.resetStyle(M.commitSession(M.createData(), capture()));
  assert.equal(M.save(state, storage).ok, true);
  const loaded = M.load(storage);
  assert.equal(loaded.ok, true);
  const repeated = M.commitSession(loaded.data, capture());
  assert.deepEqual(plain(repeated.styleWeights), {});
  const upgraded = M.commitSession(repeated, capture({ outcome: 'favorite' }));
  assert.equal(upgraded.styleWeights['cafe-natural'], 2);
});

test('Delete local data retains subscription/preferences and resets data and permission hints', () => {
  const state = M.commitSession(M.createData(), capture());
  state.subscription = { active: true, plan: 'annual' };
  state.preferences = { appearance: 'dark', voice: true, outline: true };
  state.permissions = { camera: 'granted', save: 'denied', thumbnails: 'granted' };
  state.lastSelection = { contextId: 'travel', lookId: 'natural', mode: 'shooting' };
  const deleted = M.deleteLocalData(state);
  assert.equal(deleted.sessions.length, 0);
  assert.equal(deleted.recentUses.length, 0);
  assert.deepEqual(plain(deleted.styleWeights), {});
  assert.deepEqual(plain(deleted.subscription), { active: true, plan: 'annual' });
  assert.equal(deleted.preferences.appearance, 'dark');
  assert.equal(deleted.preferences.voice, true);
  assert.deepEqual(plain(deleted.permissions), { camera: 'unknown', save: 'unknown', thumbnails: 'unknown' });
  assert.equal(deleted.lastSelection.contextId, 'cafe');
  assert.equal(state.sessions.length, 1);
});

test('missing, corrupted, unsupported and forbidden storage all return usable states', () => {
  const storage = memoryStorage();
  assert.equal(M.load(storage).ok, true);
  for (const raw of ['{invalid', '{"version":999}', 'null']) {
    storage.setItem(M.CONFIG.storageKey, raw);
    const loaded = M.load(storage);
    assert.equal(loaded.ok, false);
    assert.equal(loaded.code, 'corrupt');
    assert.equal(loaded.data.sessions.length, 0);
  }
  const blocked = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } };
  assert.equal(M.load(blocked).code, 'unavailable');
  assert.equal(M.save(M.createData(), blocked).code, 'unavailable');
  const quota = { setItem: () => { const e = new Error('full'); e.name = 'QuotaExceededError'; throw e; } };
  assert.equal(M.save(M.createData(), quota).code, 'quota');
});

test('storage whitelists metadata and never persists image bytes or private image URLs', () => {
  for (const unsafe of ['data:image/png;base64,PRIVATE', 'blob:https://app.test/private', 'https://private.test/me.jpg', 'C:\\Users\\me\\photo.jpg', 'assets/../private.jpg']) {
    const state = M.commitSession(M.createData(), capture({ photoRef: unsafe, photoData: 'PRIVATE', face: 'PRIVATE' }));
    state.cameraFrame = 'PRIVATE';
    state.sessions[0].keypoints = 'PRIVATE';
    const storage = memoryStorage();
    const result = M.save(state, storage);
    assert.equal(result.ok, true);
    const serialized = storage.getItem(M.CONFIG.storageKey);
    assert.ok(!serialized.includes('PRIVATE'));
    assert.equal(result.data.sessions[0].photoRef, null);
  }
  for (const safe of ['assets/cafe.webp', './assets/profile.jpg', 'demo/assets/pose.svg', 'live-session']) assert.equal(M.isSafePhotoRef(safe), true);
});

test('sort is stable and respects prior use, fatigue, then style within matching groups', () => {
  const candidates = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  const state = M.createData();
  state.styleWeights = { a: 100, b: 3, c: 1 };
  state.recentUses = [{ templateId: 'a', usedAt: '2026-10-15T04:00:00.000Z' }];
  assert.deepEqual(plain(M.sortTemplates(candidates, state, Date.parse('2026-10-15T05:00:00Z')).map(item => item.id)), ['b', 'c', 'a']);
  assert.deepEqual(plain(candidates.map(item => item.id)), ['a', 'b', 'c']);
  assert.equal(M.selectTemplate('cafe', 'natural', state).id, 'cafe-natural');
});

console.log('\n' + passed + ' model checks passed.');
