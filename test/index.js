/* global describe, it */

const chai = require('chai');
const spies = require('chai-spies');
const expect = chai.expect;
const lib = require('..');
const noop = function noop() {};

chai.use(spies);

describe('callback queue suite', () => {
  describe('add', () => {
    it('Throws when passed incorrect key', () => {
      function fn() {
        lib.add(false);
      }

      expect(fn).to.throw(Error, 'key must be a truthy string');
    });

    it('Throws when not passed a callback', () => {
      function fn() {
        lib.add('test');
      }

      expect(fn).to.throw(Error, 'callback must be a function');
    });

    it('Able to queue callbacks', () => {
      const key = 'test-queue-1';
      for (let i = 0; i < 100; i++) {
        const result = lib.add(key, noop);
        if (i === 0) {
          expect(result).to.be.instanceof(Function);
        } else {
          expect(result).to.be.eq(false);
        }
      }
    });

    it('Calls each queued callback once', done => {
      const key = 'test-queue-2';
      const spiesContainer = [];
      let callback;

      for (let i = 0; i < 100; i++) {
        const spy = chai.spy();
        const result = lib.add(key, spy);
        if (i === 0) {
          callback = result;
          expect(result).to.be.instanceof(Function);
        } else {
          expect(result).to.be.eq(false);
        }
        spiesContainer.push(spy);
      }

      callback(null, 'OK');

      // callback are queued, so we need to skip a few ticks
      setImmediate(() => {
        spiesContainer.forEach(spyFn => {
          expect(spyFn).to.be.called.exactly(1);
          expect(spyFn).to.be.called.with(null, 'OK');
        });
        done();
      });
    });
  });

  describe('remove', () => {
    it('Throws when no error is passed', () => {
      lib.add('test-queue-3', noop);

      function fn() {
        lib.remove('test-queue-3');
      }

      expect(fn).to.throw(Error, 'you must pass an instance of Error object when canceling requests');
    });

    it('Returns false on empty callback bucket', () => {
      const result = lib.remove('test-queue-4', new Error('oh noes'));
      expect(result).to.eq(false);
    });

    it('Calls each callback in a bucket with an error', done => {
      const key = 'test-queue-5';
      const spiesContainer = [];

      for (let i = 0; i < 100; i++) {
        const spy = chai.spy();
        const result = lib.add(key, spy);
        if (i === 0) {
          expect(result).to.be.instanceof(Function);
        } else {
          expect(result).to.be.eq(false);
        }
        spiesContainer.push(spy);
      }

      const err = new Error('I remove you from the callback queue');
      lib.remove('test-queue-5', err);

      // callback are queued, so we need to skip a few ticks
      setImmediate(() => {
        spiesContainer.forEach(spyFn => {
          expect(spyFn).to.be.called.exactly(1);
          expect(spyFn).to.be.called.with(err);
        });
        done();
      });
    });
  });
});
