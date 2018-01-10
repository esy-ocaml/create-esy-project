#!/usr/bin/env node
// @noflow

/**
 * Copyright (c) 2018, Esy contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

var path = require('path');

const root = path.dirname(__dirname);

const node_modules = path.join(root, 'node_modules');

require('babel-register')();

require('./create-project.js');
