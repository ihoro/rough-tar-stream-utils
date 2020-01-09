# TAR streaming utils

[![tar-stream-chunker](https://github.com/ihoro/rough-tar-stream-utils/workflows/tar-stream-chunker/badge.svg)](link=https://github.com/ihoro/rough-tar-stream-utils/actions?query=workflow%3Atar-stream-chunker)
[![npm version](https://badge.fury.io/js/%40rough%2Ftar-stream-utils.svg)](https://badge.fury.io/js/%40rough%2Ftar-stream-utils)

A set of utils around TAR streaming and processing, there is only
tar-stream-chunker tool for now.

## tar-stream-chunker

tar-stream-chunker can help to handle data stream of unknown size in order to
build TAR archive buffering data in memory without hitting disk, i.e. you do
not need to store data on disk first and create TAR archive of it later.
As long as creating TAR archive as a stream needs to now file size ahead, that
is why the ider of the chunker is to split input stream onto chunks with known
size.

Initially this tool was created to use for data backup using tarsnap.com
service.

### Usage example

- `$ npm install -g tar-stream-utils`
- `$ pg_dump <options> | tar-stream-chunker --file-name db-dump.sql --chunk-size 100000000 | tarsnap -cvf db-dump.sql.$(date +daily.%Y%m%d.%H%M%S) @-`

### TODO

- add test coverage
