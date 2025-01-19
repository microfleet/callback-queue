import assert from 'node:assert/strict'
import { spy as createSpy, SinonSpy } from 'sinon'
import * as callbackQueue from '../src/callback-queue.js'

describe('callback queue suite', () => {
  describe('add', () => {
    it('Throws when passed incorrect key', () => {
      function fn() {
        // @ts-expect-error invalid type - for testing
        callbackQueue.add(false)
      }

      assert.throws(fn, /key must be a truthy string/)
    })

    it('Throws when not passed a callback', () => {
      function fn() {
        // @ts-expect-error invalid type - for testing
        callbackQueue.add('test')
      }

      assert.throws(fn, /callback must be a function/)
    })

    it('Able to queue callbacks', () => {
      const key = 'test-queue-1'
      for (let i = 0; i < 100; i++) {
        const result = callbackQueue.add(key, () => { /* test */ })
        if (i === 0) {
          assert(typeof result === 'function')
        } else {
          assert.equal(result, false)
        }
      }
    })

    it('Calls each queued callback once', done => {
      const key = 'test-queue-2'
      const spiesContainer: SinonSpy[] = []
      let callback: callbackQueue.Thunk

      for (let i = 0; i < 100; i++) {
        const spy = createSpy()
        const result = callbackQueue.add(key, spy)
        if (i === 0) {
          assert(typeof result === 'function')
          callback = result
        } else {
          assert.equal(result, false)
        }
        spiesContainer.push(spy)
      }

      // @ts-expect-error stupid error - its always assigned
      callback(null, 'OK')

      // callback are queued, so we need to skip a few ticks
      setImmediate(() => {
        spiesContainer.forEach(spyFn => {
          assert(spyFn.calledOnceWithExactly(null, 'OK'))
        })
        done()
      })
    })
  })

  describe('remove', () => {
    it('Throws when no error is passed', () => {
      callbackQueue.add('test-queue-3', () => {/* test */})

      function fn() {
        // @ts-expect-error testing
        callbackQueue.remove('test-queue-3')
      }

      assert.throws(fn, /you must pass an instance of Error object when canceling requests/)
    })

    it('Returns false on empty callback bucket', () => {
      const result = callbackQueue.remove('test-queue-4', new Error('oh noes'))
      assert.equal(result, false)
    })

    it('Calls each callback in a bucket with an error', done => {
      const key = 'test-queue-5'
      const spiesContainer: SinonSpy[] = []

      for (let i = 0; i < 100; i++) {
        const spy = createSpy()
        const result = callbackQueue.add(key, spy)
        if (i === 0) {
          assert(typeof result === 'function')
        } else {
          assert.equal(result, false)
        }
        spiesContainer.push(spy)
      }

      const err = new Error('I remove you from the callback queue')
      callbackQueue.remove('test-queue-5', err)

      // callback are queued, so we need to skip a few ticks
      setImmediate(() => {
        spiesContainer.forEach(spyFn => {
          assert(spyFn.calledOnceWithExactly(err))
        })
        done()
      })
    })
  })
})
