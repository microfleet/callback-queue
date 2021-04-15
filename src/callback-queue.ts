import _debug = require('debug')
import assert = require('assert')

const debug = _debug('callback-queue')

/**
 * Callback queue
 */
const callbackQueue = new Map<string, Set<Thunk>>()

// cache reference
const nextTick = (typeof setImmediate === 'function' && setImmediate) || process.nextTick
export type Thunk<T extends any[] = any[], R = any> = (...args: T) => R

/**
 * Iterates over callbacks and calls them with passed args
 * @param bucket
 * @param args
 */
function iterateOverCallbacks<T extends Thunk<U, R>, U extends any[] = any[], R = any>(bucket: Set<T>, args: U) {
  // set iterator
  for (const thunk of bucket) {
    nextTick(thunk, ...args)
  }
}

/**
 * Adds callback into queue based on `key` argument
 * If this is the first callback in the queue, wrapped callback will
 * be returned, which should be called when any function that you want to perform
 * will complete. If there are already callbacks in the queue, returns Boolean false,
 * which indicates that you must not call the function, as it was already called and is
 * currently in progress
 *
 * @param {String}   key      - unique key, based on which requests are bucketed
 * @param {Function} callback - callback that should be added into requests queue
 */
export function add<T extends any[] = any[], R = any, X extends Thunk<T, R> = Thunk<T, R>>(key: string, callback: X): Thunk | false {
  assert.strictEqual(typeof key, 'string', 'key must be a truthy string')
  assert.ok(key, 'key must be a truthy string')
  assert.strictEqual(typeof callback, 'function', 'callback must be a function')

  const bucket = callbackQueue.get(key)
  if (bucket) {
    bucket.add(callback)
    return false
  }

  // push new set into queue
  callbackQueue.set(key, new Set([callback]))

  /**
   * Returns forwarder function that needs to be invoked
   * when data has been processed
   */
  return function forwarder(...args: T): null | void {
    // its essential that we do not use any reference, because of GC
    // when object reaches certain number of nullified values - its recreated using compactObject
    // function. Therefore we need to grab a reference when callback needs to be invoked and not at
    // other time
    const callbacks = callbackQueue.get(key)
    if (!callbacks) {
      debug('Callbacks couldn\'t be invoked')
      return null
    }

    debug('calling callback for key %s', key)
    callbackQueue.delete(key)
    return iterateOverCallbacks(callbacks, args)
  }
}

/**
 * Call this if you are absolutely sure you need to abort the request
 * Every callback in the queue will be called with a passed error object.
 * Make sure that previously returned callback is not called at a later time,
 * because if you create a bucket after removing it and then previously returned
 * callback is executed, it will introduces bugs into your code
 *
 * @param  {String} key
 * @param  {Error}  error
 */
export function remove(key: string, error: Error): void | false {
  const bucket = callbackQueue.get(key)
  if (!bucket) {
    return false
  }

  assert.ok(error instanceof Error, 'you must pass an instance of Error object when canceling requests')
  callbackQueue.delete(key)
  return iterateOverCallbacks(bucket, [error])
}
