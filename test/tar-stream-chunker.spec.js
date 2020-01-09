'use strict';

const t = require('./scaffold/t');
const { tap } = require('rxjs/operators');

const cmd = `node ${__dirname}/../src/tar-stream-chunker`;

test('should pass print usage help if no params provided', t.pipe(
  t.run .exec(cmd),
  tap(({ stderr }) => expect(stderr).toContain('Usage:')),
));

test('should error if file name is not provided', t.pipe(
  t.run .exec(`${cmd} --abc`),
  tap(({ stderr }) => expect(stderr).toContain('file name is not provided.')),
));

test('should error if chunk size is not provided', t.pipe(
  t.run .exec(`${cmd} --file-name file`),
  tap(({ stderr }) => expect(stderr).toContain('chunk size is not provided.')),
));

test.each([ '_', 'a', 'Z', '!', '~', ' ', '', '3.14', '-1', '-999999' ])
('should error if chunk size is not an integer "%s"', t.each('size').pipe(
  t.run .exec(_ => `${cmd} --file-name file --chunk-size ${t.size}`),
  tap(({ stderr }) => expect(stderr).toContain('chunk size is not provided.')),
));

test('should error if provided chunk size is zero', t.pipe(
  t.run .exec(`${cmd} --file-name file --chunk-size 0`),
  tap(({ stderr }) => expect(stderr).toContain('Given chunk size is meaningless: 0.')),
));

test('should create TAR with no chunks if stdin is empty', t.pipe(
  t.run .mktemp('tar'),
  t.run .exec(_ => `printf '' | ${cmd} --file-name file --chunk-size 1 > ${t.tmp.tar}`),

  t.run .exec(_ => `tar -tf ${t.tmp.tar} | grep file`),
  tap(({ stdout }) => expect(stdout.trim().split('\n').filter(i=>i)).toHaveLength(0)),
));

test('should create TAR with a single chunk of 1 byte size if stdin has 1 byte length', t.pipe(
  t.run .mktemp('tar'),
  t.run .exec(_ => `printf 'A' | ${cmd} --file-name file --chunk-size 1 > ${t.tmp.tar}`),

  t.run .exec(_ => `tar -tf ${t.tmp.tar} | grep file`),
  tap(({ stdout }) => expect(stdout.trim().split('\n')).toHaveLength(1)),

  t.run .exec(_ => `tar -xf ${t.tmp.tar} -O file.chunk00001`),
  tap(({ stdout }) => expect(stdout).toHaveLength(1)),
));

test('should create TAR with a single chunk if stdin has 2 bytes length and user asked for chunk size in 1 byte', t.pipe(
  t.run .mktemp('tar'),
  t.run .exec(_ => `printf 'AB' | ${cmd} --file-name file --chunk-size 1 > ${t.tmp.tar}`),

  t.run .exec(_ => `tar -tf ${t.tmp.tar} | grep file`),
  tap(({ stdout }) => expect(stdout.trim().split('\n')).toHaveLength(1)),

  t.run .exec(_ => `tar -xf ${t.tmp.tar} -O file.chunk00001`),
  tap(({ stdout }) => expect(stdout).toEqual('AB')),
));

test('should create TAR with more than 1 chunk if stdin has 10*1024*1024 bytes length and user asked for chunk size in 1024 bytes', t.pipe(
  t.run .mktemp('orig'),
  t.run .exec(_ => `printf '%.1s' {1..10485760} > ${t.tmp.orig}`),

  t.run .mktemp('tar'),
  t.run .exec(_ => `cat ${t.tmp.orig} | ${cmd} --file-name file --chunk-size 1024 > ${t.tmp.tar}`),

  t.run .exec(_ => `tar -tf ${t.tmp.tar} | grep file`),
  tap(({ stdout }) => expect(stdout.trim().split('\n').length).toBeGreaterThan(1)),

  t.run .mktemp('result'),
  t.run .exec(_ => `tar -xf ${t.tmp.tar} -O file.chunk* > ${t.tmp.result}`),
  t.run .exec(_ => `diff -u ${t.tmp.orig} ${t.tmp.result}`),
  tap(({ stdout }) => expect(stdout.trim()).toHaveLength(0)),
));

test('should create TAR with a single chunk if stdin has 1024*1024 bytes length and user asked for chunk size in 1024*1024 bytes', t.pipe(
  t.run .mktemp('orig'),
  t.run .exec(_ => `printf '%.1s' {1..1048576} > ${t.tmp.orig}`),

  t.run .mktemp('tar'),
  t.run .exec(_ => `printf '%.1s' {1..1048576} | ${cmd} --file-name file --chunk-size 1048576 > ${t.tmp.tar}`),

  t.run .exec(_ => `tar -tf ${t.tmp.tar} | grep file`),
  tap(({ stdout }) => expect(stdout.trim().split('\n')).toHaveLength(1)),

  t.run .mktemp('result'),
  t.run .exec(_ => `tar -xf ${t.tmp.tar} -O file.chunk* > ${t.tmp.result}`),
  t.run .exec(_ => `diff -u ${t.tmp.orig} ${t.tmp.result}`),
  tap(({ stdout }) => expect(stdout.trim()).toHaveLength(0)),
));

test('should add README file into TAR archive', t.pipe(
  t.run .mktemp('tar'),
  t.run .exec(_ => `printf hello | ${cmd} --file-name file --chunk-size 2 > ${t.tmp.tar}`),

  t.run .exec(_ => `tar -xf ${t.tmp.tar} -O README`),
  tap(({ stdout }) => expect(stdout).toEqual(`In order to assemble the original file:\n$ cat file.chunk* > file\n`)),
));

