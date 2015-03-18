'use strict';

var omit = require('lodash.omit');
var once = require('lodash.once');

/**
 * Callback queue
 * @type {Object}
 */
var callbackQueue = {};

/**
 * Keeps track of nullified properties for GC
 * @type {Number}
 */
var nulls = 0;

// cache reference
var nextTick = typeof setImmediate === 'function' && setImmediate || process.nextTick;
var isArray = Array.isArray;

// null threshold
var nullThreshold = process && process.env && process.env.NULL_THRESHOLD || 100;

/**
 * Performs cleanup on queue object
 * @param  {String} key
 */
function cleanup(key) {
    callbackQueue[key] = null;
    if (++nulls > nullThreshold) {
        callbackQueue = omit(callbackQueue, function removeNulls(datum) {
            return !!datum;
        });
    }
}

/**
 * Iterates over callbacks and calls them with passed args
 * @param {Array} bucket
 * @param {Array} args
 */
function iterateOverCallbacks(bucket, args) {
    bucket.forEach(function iterator(callback) {
        nextTick(function queuedCallback() {
            callback.apply(null, args);
        });
    });
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
exports.add = function (key, callback) {

    if (typeof key !== 'string' || !key) {
        throw new Error('key must be a truthy string');
    }

    if (typeof callback !== 'function') {
        throw new Error('callback must be a function');
    }

    var bucket = callbackQueue[key];
    if (isArray(bucket)) {
        bucket.push(callback);
        return false;
    }

    callbackQueue[key] = [callback];

    /**
     * This is wrapped in once so that we might escape all sorts of shit-like code
     * where people forget to remove certain even listeners and callback can be called
     * twice, but for another request. If you are certain that your code lacks these
     * stupid mistakes - you are more than welcome to fork and remove this restriction
     */
    return once(function queuedCallback() {
        bucket = callbackQueue[key];
        if (!isArray(bucket)) {
            return;
        }

        var len = arguments.length;
        var args = new Array(len);
        for (var i = 0; i < len; i++) {
            args[i] = arguments[i];
        }

        iterateOverCallbacks(bucket, args);
        cleanup(key);
    });

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
exports.remove = function (key, error) {

    var bucket = callbackQueue[key];

    // possibly it was already called -> return false
    if (!isArray(bucket)) {
        return false;
    }

    if (error instanceof Error !== true) {
        throw new Error('you must pass an instance of Error object when canceling requests');
    }

    iterateOverCallbacks(bucket, [error]);
    cleanup(key);
};
