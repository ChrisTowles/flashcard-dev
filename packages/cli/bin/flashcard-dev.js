#!/usr/bin/env node
'use strict'

const path = require('path')
const resolveFrom = require('resolve-from')

let modulePath = '../dist/cli'
try {
  // use local cli if exists
  modulePath = path.join(path.dirname(resolveFrom(process.cwd(), '@flashcard-dev/cli')), 'cli.js')
}
catch {}

require(modulePath)
