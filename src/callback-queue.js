const debug = require('debug')('callback-queue');
const assert = require('assert');

/**
 * Callback queue
 * @type {Map}
 */
const callbackQueue = new Map();
// cache reference
const nextTick = typeof setImmediate === 'function' && setImmediate || process.nextTick;

/**
 * Iterates over callbacks and calls them with passed args
 * @param {Array} bucket
 * @param {Array} args
 */
function iterateOverCallbacks(bucket, args) {
  // set iterator
  for (const thunk of bucket) {
    nextTick(thunk, ...args);
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
exports.add = function add(key, callback) {
  assert.equal(typeof key, 'string', 'key must be a truthy string');
  assert.ok(key, 'key must be a truthy string');
  assert.equal(typeof callback, 'function', 'callback must be a function');

  const bucket = callbackQueue.get(key);
  if (bucket) {
    bucket.add(callback);
    return false;
  }

  // push new set into queue
  callbackQueue.set(key, new Set([callback]));

  return function queuedCallback(...args) {
    // its essential that we do not use any reference, because of GC
    // when object reaches certain number of nullified values - its recreated using compactObject
    // function. Therefore we need to grab a reference when callback needs to be invoked and not at
    // other time
    const callbacks = callbackQueue.get(key);
    if (!callbacks) {
      debug('Callbacks couldn\'t be invoked');
      return null;
    }

    debug('calling callback for key %s', key);
    callbackQueue.delete(key);
    return iterateOverCallbacks(callbacks, args);
  };
};

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
exports.remove = function remove(key, error) {
  const bucket = callbackQueue.get(key);
  if (!bucket) {
    return false;
  }

  assert.ok(error instanceof Error, 'you must pass an instance of Error object when canceling requests');
  callbackQueue.delete(key);
  return iterateOverCallbacks(bucket, [error]);
};
