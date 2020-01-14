# TAR streaming utils

[![tar-stream-chunker](https://github.com/ihoro/rough-tar-stream-utils/workflows/tar-stream-chunker/badge.svg)](link=https://github.com/ihoro/rough-tar-stream-utils/actions?query=workflow%3Atar-stream-chunker)
[![npm version](https://badge.fury.io/js/%40rough%2Ftar-stream-utils.svg)](https://badge.fury.io/js/%40rough%2Ftar-stream-utils)

A set of utils for TAR streaming and processing, there is only
tar-stream-chunker tool for now.

## tar-stream-chunker

tar-stream-chunker can help to handle data stream of unknown size without
hitting a disk. As long as creating TAR archive as a stream needs to know
file size in advance, that is why the idea of the chunker is to split input
stream onto chunks with known size.

Initially this tool was created to use for data backup using [tarsnap.com](https://tarsnap.com)
service. But I ended up with [tar-stream-chunker.c](https://github.com/ihoro/tar-stream-chunker.c)
for better performance and optimal memory usage.

### Usage example

- `$ npm install -g @rough/tar-stream-utils`
- `$ pg_dump <options> | tar-stream-chunker --file-name db-dump.sql --chunk-size 100000000 | tarsnap -cvf db-dump.sql.$(date +daily.%Y%m%d.%H%M%S) @-`

And resulting TAR archive could look like this:
```
$ cat file | tar-stream-chunker --file-name file --chunk-size 1000000 > archive.tar
Chunks:      1, size:          1048576 B =        1 MiB.
Chunks:      2, size:          2064384 B =        2 MiB.
Chunks:      3, size:          3096576 B =        3 MiB.
Chunks:      4, size:          4112384 B =        4 MiB.
Chunks:      5, size:          5144576 B =        5 MiB.
Chunks:      6, size:          5398528 B =        5 MiB.

$ tar -tf archive.tar
file.chunk00001
file.chunk00002
file.chunk00003
file.chunk00004
file.chunk00005
file.chunk00006
README

$ tar -xf archive.tar -O README
In order to assemble the original file:
$ cat file.chunk* > file
```

