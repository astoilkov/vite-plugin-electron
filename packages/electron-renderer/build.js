const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const os = require('os');
const { init, parse } = require('es-module-lexer');

// When I try to build CommonJs using tsc, but `import.meat.url` doesn't get build correctly.
// src/use-node.js.ts:13:29 - error TS1343: The 'import.meta' meta-property is only allowed when the '--module' option is 'es2020', 'es2022', 'esnext', 'system', 'node16', or 'nodenext'.

const isdev = process.argv.slice(2).includes('--watch');
const TAG = '[build]';
const es_dir = path.join(__dirname, 'es');

; (async () => {
  if (isdev) {
    dev();
  } else {
    const result = await build();
    if (result.every(e => !e)) {
      patchImportExtension(es_dir);
      writePackageJson(es_dir);
      console.log(TAG, 'build success');
    }
  }
})();

function dev() {
  const cp1 = run('dev:es');
  const cp2 = run('dev:cjs');
  error(cp1);
  error(cp2);
  stdout(cp1);
  stdout(cp2);

  cp1.stdout.on('data', chunk => {
    // 10:09:29 AM - Found 0 errors. Watching for file changes.
    if (chunk.toString().includes('Found 0 errors. Watching for file changes')) {
      setTimeout(() => {
        patchImportExtension(es_dir).then(() => console.log(TAG, 'patched `.js` extension'));
        writePackageJson(es_dir);
        console.log(TAG, 'writed es package.json');
      }, 99);
    }
  });
}

/**
 * @type {() => Promise<(number | null)[]>}
 */
function build() {
  return new Promise(resolve => {
    const cp1 = run('build:es');
    const cp2 = run('build:cjs');
    error(cp1);
    error(cp2);
    stdout(cp1);
    stdout(cp2);

    const status = [-1, -1];
    function done() {
      if (status.every(e => e !== -1)) {
        resolve(status);
      }
    }
    cp1.on('exit', code => {
      status[0] = code;
      done();
    });
    cp2.on('exit', code => {
      status[1] = code;
      done();
    });
  });
}

function run(args = []) {
  const npm = os.platform() === 'win32' ? 'npm.cmd' : 'npm';
  return cp.spawn(npm, ['run'].concat(args));
}

/**
 * @type {(cp: import('child_process').ChildProcess) => void}
 */
function error(cp) {
  cp.on('error', error => {
    console.log(TAG, 'build error');
    console.log(error);
    process.exit(1);
  });
}

/**
 * @type {(cp: import('child_process').ChildProcess) => void}
 */
function stdout(cp) {
  cp.stdout.pipe(process.stdout);
}

// https://github.com/microsoft/TypeScript/issues/40878
async function patchImportExtension(dir) {
  const filename = path.join(dir, 'index.js');
  if (!fs.existsSync(filename)) return;
  let code = fs.readFileSync(filename, 'utf8');

  await init;
  const [imports] = parse(code);
  if (!imports.length) return;

  for (const { s, e } of [...imports].reverse()) {
    const importee = code.slice(s, e) + '.js';
    if (fs.existsSync(path.join(filename, '..', importee))) {
      code = code.slice(0, s) + importee + code.slice(e);
    }
  }

  fs.writeFileSync(filename, code);
}

function writePackageJson(dir) {
  const pkg = {
    main: 'index.js',
    type: 'module',
  };
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify(pkg, null, 2));
}
