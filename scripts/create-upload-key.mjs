// Creates the Google Play UPLOAD key for NEON ESCAPE, once, and points the
// release build at it. Run it yourself: `npm run android:upload-key`.
//
// - Asks for a password (typed twice, never shown or printed).
// - Creates an RSA 4096 keystore OUTSIDE the repository (default
//   ~/keys/neon-escape-upload.jks, alias "upload", valid ~27 years).
// - Writes android/keystore.properties (git-ignored) so `npm run android:bundle`
//   signs with it.
// - Never overwrites an existing keystore or keystore.properties.
//
// Options: --keystore <path>  --properties <path>  (defaults above)
// Non-interactive use (CI): set NEON_UPLOAD_PASSWORD instead of typing it.
// The password is handed to keytool through an environment variable, so it
// never appears on a command line or in the process list.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { homedir, platform } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const keystore = resolve(arg('--keystore') ?? join(homedir(), 'keys', 'neon-escape-upload.jks'));
const properties = resolve(arg('--properties') ?? join(root, 'android', 'keystore.properties'));

function fail(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

if (keystore.startsWith(root)) fail(`Keep the keystore outside the project folder (got ${keystore}).`);
if (existsSync(keystore)) fail(`A keystore already exists at ${keystore}. Nothing was changed (it is never overwritten).`);
if (existsSync(properties)) fail(`${properties} already exists. Nothing was changed (it is never overwritten).`);

function findKeytool() {
  const exe = platform() === 'win32' ? 'keytool.exe' : 'keytool';
  const homes = [
    process.env.JAVA_HOME,
    { win32: 'C:\\Program Files\\Android\\Android Studio\\jbr', darwin: '/Applications/Android Studio.app/Contents/jbr/Contents/Home' }[platform()],
    '/opt/android-studio/jbr',
  ].filter(Boolean);
  for (const home of homes) {
    const path = join(home, 'bin', exe);
    if (existsSync(path)) return path;
  }
  return null;
}
const keytool = findKeytool();
if (!keytool) fail('keytool not found. Install Android Studio (it includes a JDK) or set JAVA_HOME.');

/** Reads one line from the terminal without echoing it. */
function askHidden(prompt) {
  return new Promise((resolvePromise, reject) => {
    const stdin = process.stdin;
    if (!stdin.isTTY) return reject(new Error('No interactive terminal: run it in a terminal, or set NEON_UPLOAD_PASSWORD.'));
    process.stdout.write(prompt);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    let value = '';
    const onData = (chunk) => {
      for (const ch of chunk) {
        if (ch === '\r' || ch === '\n') {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.off('data', onData);
          process.stdout.write('\n');
          return resolvePromise(value);
        }
        if (ch === '\u0003') {
          stdin.setRawMode(false);
          process.stdout.write('\n');
          process.exit(130);
        }
        if (ch === '\u007f' || ch === '\b') value = value.slice(0, -1);
        else value += ch;
      }
    };
    stdin.on('data', onData);
  });
}

let password = process.env.NEON_UPLOAD_PASSWORD;
if (!password) {
  console.log('Creating the NEON ESCAPE upload key.');
  console.log(`Keystore: ${keystore}`);
  console.log('Choose a strong password (12+ characters). Store it in your password manager: it cannot be recovered.\n');
  try {
    password = await askHidden('Password: ');
    if ((await askHidden('Repeat password: ')) !== password) fail('The passwords do not match. Nothing was created.');
  } catch (error) {
    fail(error.message);
  }
}
if (password.length < 12) fail('Use at least 12 characters. Nothing was created.');
if (/[\r\n]/.test(password)) fail('The password cannot contain line breaks. Nothing was created.');

mkdirSync(dirname(keystore), { recursive: true });
const result = spawnSync(
  keytool,
  [
    '-genkeypair', '-keystore', keystore, '-storetype', 'PKCS12', '-alias', 'upload',
    '-keyalg', 'RSA', '-keysize', '4096', '-validity', '10000',
    '-dname', 'CN=Mr. White Games, O=Mr. White Games, C=RO',
    // PKCS12 uses one password for the store and the key.
    '-storepass:env', 'NEON_UPLOAD_KEY_SECRET', '-keypass:env', 'NEON_UPLOAD_KEY_SECRET',
  ],
  { stdio: ['ignore', 'ignore', 'pipe'], encoding: 'utf8', env: { ...process.env, NEON_UPLOAD_KEY_SECRET: password } },
);
if (result.status !== 0 || !existsSync(keystore)) fail(`keytool failed:\n${result.stderr ?? ''}`);

// Java properties files treat backslashes as escapes: store the path with forward slashes.
const escape = (value) => value.replace(/\\/g, '\\\\').replace(/^(\s)/, '\\$1');
writeFileSync(
  properties,
  [
    '# NEON ESCAPE upload key (Google Play App Signing). NEVER commit or share this file.',
    '# Created by scripts/create-upload-key.mjs. Back up the keystore AND this password.',
    `storeFile=${keystore.replace(/\\/g, '/')}`,
    `storePassword=${escape(password)}`,
    'keyAlias=upload',
    `keyPassword=${escape(password)}`,
    '',
  ].join('\n'),
  { mode: 0o600 },
);

console.log(`\n✔ Upload key created: ${keystore}`);
console.log(`✔ Release signing configured: ${properties} (git-ignored)`);
console.log('\nNext:');
console.log('  1. Back up the .jks file and the password in two safe places (see GOOGLE_PLAY_RELEASE.md).');
console.log('  2. Run: npm run android:bundle   (it should report SIGNED)\n');
