import test from 'node:test'
import assert from 'node:assert/strict'
import { parsePaths } from './paths.js'

test('parses POSIX paths and file URLs', () => {
  assert.deepEqual(
    parsePaths('/Users/jinghuan/Downloads/a.html\nfile:///Users/jinghuan/code/me-wiki\n'),
    ['/Users/jinghuan/Downloads/a.html', '/Users/jinghuan/code/me-wiki'],
  )
})

test('ignores ordinary clipboard text', () => {
  assert.deepEqual(parsePaths('hello\njust some notes'), [])
})

test('deduplicates and unwraps quotes', () => {
  assert.deepEqual(
    parsePaths('"/tmp/foo"\n/tmp/foo\n\'/tmp/bar\''),
    ['/tmp/foo', '/tmp/bar'],
  )
})

test('rejects mixed clipboard text that only mentions a path', () => {
  assert.deepEqual(
    parsePaths('see /tmp/foo later\n/Users/jinghuan/Downloads/a.html'),
    [],
  )
})
