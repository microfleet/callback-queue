/* global describe, it */

'use strict';

var chai = require('chai');
var spies = require('chai-spies');
var expect = chai.expect;

chai.use(spies);

describe('callback queue suite', function suite() {

    var lib = require('../index.js');

    describe('add', function addSuite() {

        it('Throws when passed incorrect key', function () {
            var fn = function () {
                lib.add(false);
            };

            expect(fn).to.throw(Error, 'key must be a truthy string');
        });

        it('Throws when not passed a callback', function () {
            var fn = function () {
                lib.add('test');
            };

            expect(fn).to.throw(Error, 'callback must be a function');
        });

        it('Able to queue callbacks', function () {
            var key = 'test-queue-1';
            var result;
            for (var i = 0; i < 100; i++) {
                result = lib.add(key, function () {});
                if (i === 0) {
                    expect(result).to.be.instanceof(Function);
                } else {
                    expect(result).to.be.eq(false);
                }
            }
        });

        it('Calls each queued callback once', function (done) {
            var key = 'test-queue-2';
            var result, spy, callback;
            var spies = [];

            for (var i = 0; i < 100; i++) {
                spy = chai.spy();
                result = lib.add(key, spy);
                if (i === 0) {
                    callback = result;
                    expect(result).to.be.instanceof(Function);
                } else {
                    expect(result).to.be.eq(false);
                }
                spies.push(spy);
            }

            callback(null, 'OK');

            // callback are queued, so we need to skip a few ticks
            setImmediate(function () {
                spies.forEach(function (spyFn) {
                    expect(spyFn).to.be.called.exactly(1);
                    expect(spyFn).to.be.called.with(null, 'OK');
                });
                done();
            });
        });

    });

    describe('remove', function removeSuite() {

        it('Throws when no error is passed', function () {
            lib.add('test-queue-3', function () {});

            var fn = function () {
                lib.remove('test-queue-3');
            };

            expect(fn).to.throw(Error, 'you must pass an instance of Error object when canceling requests');
        });

        it('Returns false on empty callback bucket', function () {
            var result = lib.remove('test-queue-4', new Error('oh noes'));
            expect(result).to.eq(false);
        });

        it('Calls each callback in a bucket with an error', function (done) {
            var key = 'test-queue-5';
            var result, spy, callback;
            var spies = [];

            for (var i = 0; i < 100; i++) {
                spy = chai.spy();
                result = lib.add(key, spy);
                if (i === 0) {
                    callback = result;
                    expect(result).to.be.instanceof(Function);
                } else {
                    expect(result).to.be.eq(false);
                }
                spies.push(spy);
            }

            var err = new Error('I remove you from the callback queue');
            lib.remove('test-queue-5', err);

            // callback are queued, so we need to skip a few ticks
            setImmediate(function () {
                spies.forEach(function (spyFn) {
                    expect(spyFn).to.be.called.exactly(1);
                    expect(spyFn).to.be.called.with(err);
                });
                done();
            });
        });

    });

});
