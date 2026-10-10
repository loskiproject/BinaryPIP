import test from 'node:test'
import assert from 'node:assert/strict'

import { TIMEFRAME_TO_MS } from './chartTimeframes.js'

test('timeframe refresh rate follows each chart timeframe', () => {
  assert.equal(TIMEFRAME_TO_MS['1s'], 1000)
  assert.equal(TIMEFRAME_TO_MS['5s'], 5000)
  assert.equal(TIMEFRAME_TO_MS['1m'], 60000)
  assert.equal(TIMEFRAME_TO_MS['5m'], 300000)
  assert.equal(TIMEFRAME_TO_MS['15m'], 900000)
  assert.equal(TIMEFRAME_TO_MS['1h'], 3600000)
  assert.equal(TIMEFRAME_TO_MS['1d'], 86400000)
})
