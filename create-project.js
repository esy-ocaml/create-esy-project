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
import * as fs from 'fs-extra';
import * as path from 'path';
import {getProjectOptions, copyStubs} from './util';

let projectName;

const packageJson = require('./package.json');
const program = new commander.Command(packageJson.name);

program
  .version(packageJson.version)
  .usage(`[options] ${chalk.green('<project-name>')}`)
  .arguments('<project-name>')
  .action(name => {
    projectName = name;
  });

program
  .option('-y, --yes', 'disable interactivity and use defaults')
  .option('--description <description>', 'Project description', 'OCaml workflow with Esy')
  .option('--license <license>', 'License', 'MIT')
  .option('--ocaml-version <version>', 'OCaml version', '~4.6.000');

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
} else {
  createProject(projectName, program).catch(error => {
    console.error(error);
    process.exit(1);
  });
}

async function createProject(name, program) {
  const root = path.resolve(name);
  const appName = path.basename(root);

  fs.ensureDirSync(name);

  console.log();
  console.log(`Creating a new esy project in ${chalk.green(root)}.`);
  console.log();

  const opts = await getProjectOptions(root, program);

  const packageJson = {
    name: opts.name,
    version: opts.version,
    description: opts.description,
    author: opts.author,
    license: opts.license,
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
      ocaml: opts.ocaml,
    },
    devDependencies: {
      '@opam/merlin': '^3.0.5',
      ocaml: opts.ocaml,
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

  await copyStubs(stubs, root, placeholders);

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
