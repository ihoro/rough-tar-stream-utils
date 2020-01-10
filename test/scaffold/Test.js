'use strict';

const uuid = require('uuid/v4');
const fs = require('fs');
const child_process = require('child_process');
const { from, of, Observable, bindCallback } = require('rxjs');
const { mergeMap, tap, finalize, count } = require('rxjs/operators');

module.exports = class {
  constructor() {
    this.execOptions = {
      timeout: 1 * 60 * 1000 /* 1 min */,
      maxBuffer: 200 * 1024 /* 200 KiB of stdout/stderr */
    };
  }

  setUp() {
    return of(this).pipe(
      tap(_ => this.tmp = {}),
      finalize(_ => this.doTearDown()),
    );
  }

  tearDown(testFrameworkCallback) {
    return {
      next: _ => {},
      error: err => testFrameworkCallback(err),
      complete: _ => testFrameworkCallback(),
    };
  }

  doTearDown() {
    for (let key in this.tmp)
      fs.unlink(this.tmp[key], () => {});
  }

  mktemp(refName) {
    return of(this).pipe(
      tap(_ => this.tmp[refName] = `${__dirname}/${uuid()}`),
    );
  }

  exec(cmd) {
    return Observable.create(observer => {
      child_process.exec(cmd, this.execOptions, (error, stdout, stderr) => {
        observer.next({ error, stdout, stderr });
        observer.complete();
      });
    });
  }
};
