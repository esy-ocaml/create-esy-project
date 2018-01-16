/**
 * @flow
 */

import chalk from 'chalk';
import child_process from 'child_process';
import copy from 'recursive-copy';
import * as fs from 'fs-extra';
import * as path from 'path';
import inquirer from 'inquirer';
import through from 'through2';
import {CommanderStatic} from 'commander';
import {basename} from 'path';

type ProcessFn = (
  proc: child_process$ChildProcess,
  update: (chunk: string) => void,
  reject: (err: mixed) => void,
  done: () => void,
) => void;

export async function getProjectOptions(
  root: string,
  program: CommanderStatic.Command,
): Promise<{[name: string]: string}> {
  const appName = basename(root);

  const author = {
    name: await getGitConfigInfo('user.name'),
    email: await getGitConfigInfo('user.email'),
  };

  const questions = [
    {
      name: 'name',
      message: 'Package name',
      default: appName,
    },
    {
      name: 'description',
      message: 'Project description',
      default: program.description,
    },
    {
      name: 'version',
      message: 'Version',
      default: '0.1.0',
    },
    {
      name: 'license',
      message: 'License',
      default: program.license,
    },
    {
      name: 'author',
      message: 'Author',
      default: stringifyPerson(author),
    },
    {
      name: 'ocaml',
      message: 'Ocaml version',
      default: program.ocamlVersion,
    },
  ];

  if (program.yes) {
    return Object.assign(
      {},
      ...questions.map(q => {
        return {[q.name]: q.default};
      }),
    );
  }

  return new Promise((resolve, reject) => {
    inquirer
      .prompt(questions)
      .then(answers => {
        resolve(answers);
      })
      .catch(error => {
        reject(error);
      });
  });
}

export async function copyStubs(
  src: string,
  dest: string,
  placeholders: {[name: string]: string},
) {
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

  return copy(src, dest, copyOptions).catch(error => {
    throw error;
  });
}

async function getGitConfigInfo(credential: string): Promise<string> {
  try {
    // try to get author default based on git config
    return await spawn('git', ['config', credential]);
  } catch (e) {
    return '';
  }
}

function stringifyPerson(person: mixed): any {
  if (!person || typeof person !== 'object') {
    return person;
  }

  const parts = [];
  if (person.name) {
    parts.push(person.name);
  }

  const email = person.email || person.mail;
  if (typeof email === 'string') {
    parts.push(`<${email}>`);
  }

  const url = person.url || person.web;
  if (typeof url === 'string') {
    parts.push(`(${url})`);
  }

  return parts.join(' ');
}

export function spawn(
  program: string,
  args: Array<string>,
  opts?: child_process$spawnOpts & {process?: ProcessFn} = {},
  onData?: (chunk: Buffer | string) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = child_process.spawn(program, args, opts);

    let processingDone = false;
    let processClosed = false;
    let err = null;

    let stdout = '';

    proc.on('error', err => {
      if (err.code === 'ENOENT') {
        reject(new Error(`Couldn't find the binary ${program}`));
      } else {
        reject(err);
      }
    });

    function updateStdout(chunk: string) {
      stdout += chunk;
      if (onData) {
        onData(chunk);
      }
    }

    function finish() {
      if (err) {
        reject(err);
      } else {
        resolve(stdout.trim());
      }
    }

    if (typeof opts.process === 'function') {
      opts.process(proc, updateStdout, reject, function() {
        if (processClosed) {
          finish();
        } else {
          processingDone = true;
        }
      });
    } else {
      if (proc.stderr) {
        proc.stderr.on('data', updateStdout);
      }

      if (proc.stdout) {
        proc.stdout.on('data', updateStdout);
      }

      processingDone = true;
    }

    proc.on('close', (code: number) => {
      if (code >= 1) {
        stdout = stdout.trim();
        // TODO make this output nicer
        err = new Error(
          [
            'Command failed.',
            `Exit code: ${code}`,
            `Command: ${program}`,
            `Arguments: ${args.join(' ')}`,
            `Directory: ${opts.cwd || process.cwd()}`,
            `Output:\n${stdout}`,
          ].join('\n'),
        );
        // $FlowFixMe: ...
        err.EXIT_CODE = code;
        // $FlowFixMe: ...
        err.stdout = stdout;
      }

      if (processingDone || err) {
        finish();
      } else {
        processClosed = true;
      }
    });
  });
}
