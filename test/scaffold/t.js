'use strict';

const { zip, of, concat } = require('rxjs');
const { map, flatMap } = require('rxjs/operators');
const Test = require('./Test');

function chainBuilder(observableFactory) {
  let chain = [];

  const makeProxy = () => {
    return new Proxy(function(){}, {
      get: (_, property) => {
        chain.push(property)
        return makeProxy();
      },
      apply: (_, thisArg, args) => observableFactory(chain, args)
    });
  };

  return makeProxy();
}

const ObservableFactory = {};

ObservableFactory.run = function(chain, args) {
  return (sourceObservable) => sourceObservable.pipe(
    flatMap(_ => {
      const ch = [ ...chain ];
      const fn = ch.pop();
      const obj = ch.reduce( (r, property) => r[property], t );
      const argumentList = args.map(a => (typeof a === 'function') ? a() : a);
      if (typeof obj[fn] !== 'function')
        throw new Error(`t.run.${chain.join('.')} is not a function.`);
      return obj[fn](...argumentList);
    }),
  );
};

ObservableFactory.def = function(chain, args) {
  return (sourceObservable) => sourceObservable.pipe(
    flatMap(_ => {
      const ch = [ ...chain ];
      const fn = ch.pop();
      const propertyName = ch.shift();
      const obj = ch.reduce( (r, property) => r[property], t );
      const argumentList = args.map(a => (typeof a === 'function') ? a() : a);
      if (typeof obj[fn] !== 'function')
        throw new Error(`t.def.${chain.join('.')} is not a function.`);
      return zip( of(propertyName), obj[fn](...argumentList) );
    }),
    map(([propertyName, result]) => {
      t[propertyName] = result;
      return result;
    }),
  );
};

let t = {

  get pipe() {
    return (...operators) =>
      (testFrameworkCallback) => {
        const test = new Test();
        Object.assign(t, test);
        Object.setPrototypeOf(t, Test.prototype);

        return concat(
          t.setUp(),
          of(t).pipe(...operators), // TODO: check if result is Observable and notify developer?
          //test.tearDown(testFrameworkCallback),
        )
        .subscribe({
          next: _ => {
            // emptiness
          },
          error: err => {
            t.doTearDown();
            testFrameworkCallback(err);
          },
          complete: _ => {
            t.doTearDown();
            testFrameworkCallback();
          }
        });
      }
  },

  each: (...eachParams) => ({
    pipe: (...operators) =>
      (...testArgs) => new Promise((resolve, reject) => {
        testArgs.forEach((v, i) => t[eachParams[i]] = v);
        t.pipe(...operators)(err => err ? reject(err) : resolve());
      })
  }),

  get run() {
    return chainBuilder(ObservableFactory.run);
  },

  get def() {
    return chainBuilder(ObservableFactory.def);
  },

};

module.exports = t;
