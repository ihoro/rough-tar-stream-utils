'use strict';

const anyBase = require('any-base');
const tar = require('tar-stream');
const argv = require('minimist')(process.argv.slice(2));


// Help

if (process.argv.length - 2 <= 0) {
  console.error('Usage:');
  console.error('  $ tar-stream-chunker --file-name <name> --chunk-size <bytes>');
  console.error();
  console.error('Disclaimer:');
  console.error('  - resulting chunk size is not exactly <bytes> you asked,\n    it is more like a threshold what triggers next chunk creation');
  console.error();
  console.error('Examples:');
  console.error('  $ pg_dump <options> | \\\n    tar-stream-chunker --file-name db-dump.sql --chunk-size 1048576 > archive.tar');
  console.error();
  console.error('  $ pg_dump <options> | \\\n    tar-stream-chunker --file-name db-dump.sql --chunk-size 100000000 | \\\n    tarsnap --dry-run --no-default-config --print-stats --humanize-numbers -c @-');
  console.error();
  console.error('  $ pg_dump <options> | \\\n    tar-stream-chunker --file-name db-dump.sql --chunk-size 100000000 | \\\n    tarsnap -cvf db-dump.sql.$(date +daily.%Y%m%d.%H%M%S) @-');
  process.exit(1);
}


// Prepare params

if (!argv['file-name'] || typeof argv['file-name'] !== 'string' || argv['file-name'].length < 1)
  return console.error('file name is not provided.');
const fileName = argv['file-name'];

if (! Number.isInteger(argv['chunk-size']))
  return console.error('chunk size is not provided.');
const chunkSize = argv['chunk-size'];
if (chunkSize < 1)
  return console.error('Given chunk size is meaningless: ' + chunkSize + '.');


// Process the stream

const dec_to_36base = anyBase(anyBase.DEC, '0123456789abcdefghijklmnopqrstuvwxyz');
const formChunkSuffix = chunkIndex => dec_to_36base(String(chunkIndex)).padStart(5, '0');

var pack = tar.pack();
pack.pipe(process.stdout);

let chunkIndex = 0;
let buffers = [];
let bufferedBytes = 0;
let totalBytes = 0;

const reportStatus = () => console.error(
  `Chunks: ${String(chunkIndex).padStart(6, ' ')}, ` +
  `size: ${String(totalBytes).padStart(16, ' ')} B = ${String(Math.round(totalBytes/1024/1024)).padStart(8, ' ')} MiB.`
);

process.stdin.on('data', buf => {
  buffers.push(buf);
  bufferedBytes += buf.length;
  
  if (bufferedBytes >= chunkSize) {
    process.stdin.pause();

    chunkIndex++;
    totalBytes += bufferedBytes;
    reportStatus();

    let entry = pack.entry({ name: fileName + '.chunk'+formChunkSuffix(chunkIndex), size: bufferedBytes }, err => {
      if (err)
        console.error('=== TAR ERR: ' + err);
      process.stdin.resume();
    });
    flushBuffers(buffers, entry, () => {
      buffers = [];
      bufferedBytes = 0;
      entry.end();
    });
  }
});

const flushBuffers = (buffers, writable, cb) => {
  if (!buffers || buffers.length < 1)
    return cb();
  flushBuffer(buffers[0], writable, () => { flushBuffers(buffers.slice(1), writable, cb); });
}

const flushBuffer = (buffer, writable, cb) => {
  const ok = writable.write(buffer);
  if (ok)
    return cb();
  writable.once('drain', () => cb());
};


// Finalise

process.stdin.on('end', () => {
  if (bufferedBytes <= 0)
    return addReadme();

  chunkIndex++;
  totalBytes += bufferedBytes;
  reportStatus();

  let entry = pack.entry({ name: fileName + '.chunk'+formChunkSuffix(chunkIndex), size: bufferedBytes }, err => {
    if (err)
      console.error('=== TAR ERR: ' + err);
    addReadme();
  });
  flushBuffers(buffers, entry, () => entry.end());
});


// README file

const addReadme = () => {
  let readmeBuf = Buffer.from(`In order to assemble the original file:\n$ cat ${fileName}.chunk* > ${fileName}\n`);
  let entry = pack.entry({ name: 'README', size: readmeBuf.length }, err => {
    if (err)
      console.error('=== TAR ERR: ' + err);
    pack.finalize();
  });
  flushBuffers([ readmeBuf ], entry, () => entry.end());
};

