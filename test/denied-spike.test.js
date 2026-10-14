import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DeniedSpike } from '../src/denied-spike.js';
import { buildApp } from './helpers.js';

test('DeniedSpike: reports once per window per source, forgets old denials, off at threshold 0', () => {
  const s = new DeniedSpike({ threshold: 3, windowMs: 60_000 });
  assert.equal(s.observe('atc-auth', 2, 1_000), null);
  assert.equal(s.observe('atc-media', 2, 2_000), null, 'another source has its own count');
  assert.deepEqual(s.observe('atc-auth', 1, 30_000), { source: 'atc-auth', count: 3, windowSec: 60 });
  assert.equal(s.observe('atc-auth', 1, 31_000), null, 'the counter restarted after the report');
  assert.equal(s.observe('atc-media', 1, 70_000), null, 'two of the three fell out of the window');
  assert.equal(s.observe('atc-auth', 0, 70_000), null);
  assert.equal(new DeniedSpike({ threshold: 0, windowMs: 1000 }).observe('x', 99, 0), null);
});

test('ingest: a burst of denied events publishes ops.audit.denied_spike, duplicates and successes do not count', async () => {
  /** @type {[string, any][]} */ const out = [];
  const publisher = { publish: (/** @type {string} */ t, /** @type {any} */ d) => { out.push([t, d]); return true; } };
  const { service } = await buildApp({}, null, { spike: new DeniedSpike({ threshold: 3, windowMs: 60_000 }), publisher });
  const denied = (/** @type {string} */ id) => ({ id, action: 'atc-auth.x', outcome: /** @type {const} */ ('denied') });
  service.ingest('atc-auth', [denied('a'), denied('b')], 1_000);
  service.ingest('atc-auth', [denied('a'), { action: 'atc-auth.y' }], 2_000); // a is a duplicate
  assert.deepEqual(out, []);
  service.ingest('atc-auth', [denied('c')], 3_000);
  assert.deepEqual(out, [['ops.audit.denied_spike', { source: 'atc-auth', count: 3, windowSec: 60 }]]);
});
