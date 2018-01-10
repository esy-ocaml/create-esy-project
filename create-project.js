/**
 * @flow
 */

/**
 * Copyright (c) 2018, Esy contributors
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import chalk from 'chalk';
import commander from 'commander';
import copy from 'recursive-copy';
import * as fs from 'fs-extra';
import * as path from 'path';
import through from 'through2';

const packageJson = require('./package.json');

let projectName;

const program = new commander.Command(packageJson.name).version(packageJson.version);

program.arguments('<project-name>');
program.usage(`${chalk.green('<project-name>')} [options]`);
program.action(name => {
  projectName = name;
});

program.option('--license <license>', 'License', 'MIT');
program.option(
  '--description <description>',
  'Project description',
  'OCaml workflow with Esy',
);
program.option('--ocaml-version <version>', 'OCaml version', '~4.6.000');

program.option('--verbose', 'print additional logs');

program.on('--help', () => {
  console.log(`    Only ${chalk.green('<project-name>')} is required.`);
  console.log();
  console.log(`    If you have any problems, do not hesitate to file an issue:`);
  console.log(
    `      ${chalk.cyan('https://github.com/esy-ocaml/create-esy-project/issues/new')}`,
  );
  console.log();
});

program.parse(process.argv);

if (typeof projectName === 'undefined') {
  console.error('Please specify the project directory:');
  console.log(`  ${chalk.cyan(program.name())} ${chalk.green('<project-directory>')}`);
  console.log();
  console.log('For example:');
  console.log(`  ${chalk.cyan(program.name())} ${chalk.green('my-esy-project')}`);
  console.log();
  console.log(`Run ${chalk.cyan(`${program.name()} --help`)} to see all options.`);
  process.exit(1);
}

createProject(projectName, program);

async function createProject(name, program) {
  const root = path.resolve(name);
  const appName = path.basename(root);

  const verbose = program.verbose;

  fs.ensureDirSync(name);

  console.log(`Creating a new esy project in ${chalk.green(root)}.`);
  console.log();

  const packageJson = {
    name: appName,
    version: '0.1.0',
    description: 'OCaml workflow with Esy',
    license: program.license,
    esy: {
      build: ['jbuilder build'],
      install: ['esy-installer'],
      buildsInSource: '_build',
    },
    dependencies: {
      '@esy-ocaml/esy-installer': '^0.0.0',
      '@opam/jbuilder': '^1.0.0-beta16',
      '@opam/lambda-term': '^1.11.0',
      '@opam/lwt': '^3.1.0',
    },
    peerDependencies: {
      ocaml: program.ocamlVersion,
    },
    devDependencies: {
      '@opam/merlin': '^3.0.5',
      ocaml: program.ocamlVersion,
    },
    private: true,
  };

  await fs.writeFile(
    path.join(root, 'package.json'),
    JSON.stringify(packageJson, null, 2),
  );

  const stubs = path.join(__dirname, 'stubs', 'jbuilder');

  const placeholders = {
    '%project_name%': appName,
  };

  const replacePlacholder = ph => {
    return placeholders[ph] || ph;
  };

  const copyOptions = {
    overwrite: true,
    dot: true,
    rename: function(filepath) {
      return filepath.replace(/%\w+%/g, replacePlacholder);
    },
    transform: function(src, dest, stats) {
      return through(function(chunk, enc, done) {
        var output = chunk.toString().replace(/%\w+%/g, replacePlacholder);
        done(null, output);
      });
    },
  };

  const files = await copyStubs(stubs, root, copyOptions);

  console.log();
  console.log(`Success! Created ${appName} at ${root}`);
  console.log('Inside your project directory, you can run several commands:');
  console.log();
  console.log(chalk.cyan(`  esy install`));
  console.log('    Installs all the dependencies.');
  console.log();
  console.log(chalk.cyan(`  esy build`));
  console.log('    Builds the project and its dependencies.');
  console.log();
  console.log(chalk.cyan(`  esy x hello`));
  console.log('    Runs the example executable.');
  console.log();
  console.log('We suggest that you begin by typing:');
  console.log();
  console.log(`  ${chalk.cyan(`esy install`)}`);
  console.log(`  ${chalk.cyan(`esy build`)}`);
  console.log();
  console.log('Happy hacking!');
}

function copyStubs(src, dest, options) {
  return copy(src, dest, options).catch(error => {
    throw error;
  });
}
