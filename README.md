# Callback queue

Node.js callback queue. Can be used with browserify as well.

Idea is to queue callbacks, when same function wants to be called at the same time
by different callers.

One example would be conserving resources spent on outgoing http requests.

`npm install callback-queue -S`

## Example usage

1. `callbackQueue.add(String, Function)`: queues callbacks based on key attribute
2. `callbackQueue.remove(String, Error)`: calls queued callbacks with Error argument

```js
var callbackQueue = require('callback-queue');
var request = require('request');

function performOutgoingRequest(url, next) {
    var callback = callbackQueue.add(url, next);
    if (!callback) {
        return;
    }

    request(url, callback);
}

for (var i = 0; i < 100; i++) {

    // request itself will be performed just once
    performOutgoingRequest('https://google.com', function niceCallback(err, resp, body) {
        // will be called 100 times
    });

}

for (var x = 0; x < 100; x++) {

    // request itself will be performed just once
    performOutgoingRequest('https://google.com', function niceCallback(err, resp, body) {
        // will be called 100 times with Error object
    });

}

callbackQueue.remove('https://google.com', new Error('cancel it!'));

```