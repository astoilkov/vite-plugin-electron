const cp = require('child_process');
const os = require('os');

const isdev = process.argv.slice(2).includes('--watch');
const TAG = '[build]';

; (async () => {
  if (isdev) {
    dev();
  } else {
    const result = await build();
    if (result.every(e => !e)) {
      console.log(TAG, 'build success');
    }
  }
})();

function dev() {
  stdout(error(run('dev:es')));
  stdout(error(run('dev:cjs')));
}

/**
 * @type {() => Promise<(number | null)[]>}
 */
function build() {
  return new Promise(resolve => {
    const status = [-1, -1];
    function done() {
      if (status.every(e => e !== -1)) {
        resolve(status);
      }
    }
    stdout(error(run('build:es'))).on('exit', code => {
      status[0] = code;
      done();
    });
    stdout(error(run('build:cjs'))).on('exit', code => {
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
 * @type {(cp: import('child_process').ChildProcess) => typeof cp}
 */
function error(cp) {
  cp.on('error', error => {
    console.log(TAG, 'build error');
    console.log(error);
    process.exit(1);
  });
  return cp;
}

/**
 * @type {(cp: import('child_process').ChildProcess) => typeof cp}
 */
function stdout(cp) {
  cp.stdout.pipe(process.stdout);
  return cp;
}
