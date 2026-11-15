// Builds the Android app from the current web build:
//   (no flag)   debug APK            `npm run android:apk`
//   --bundle    release AAB (Play)    `npm run android:bundle`
//   --bundle --ad-mode=production     `npm run android:bundle:production-ads`
// The npm scripts build and sync the web app first. The release AAB is signed
// with the upload key when android/keystore.properties exists, otherwise it is
// unsigned (fine for checking the build, not for uploading). See GOOGLE_PLAY_RELEASE.md.
//
// It finds Java and the Android SDK the way Android Studio installs them, so
// no environment variables are needed on a typical machine:
//   Java:  JAVA_HOME, else the JDK bundled with Android Studio
//   SDK:   ANDROID_HOME / ANDROID_SDK_ROOT, else android/local.properties, else the default SDK folder
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { homedir, platform } from 'node:os';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const android = join(root, 'android');
const isWindows = platform() === 'win32';

function fail(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

function findJava() {
  if (process.env.JAVA_HOME && existsSync(process.env.JAVA_HOME)) return process.env.JAVA_HOME;
  const candidates = {
    win32: ['C:\\Program Files\\Android\\Android Studio\\jbr'],
    darwin: ['/Applications/Android Studio.app/Contents/jbr/Contents/Home'],
    linux: ['/opt/android-studio/jbr', join(homedir(), 'android-studio', 'jbr')],
  }[platform()] ?? [];
  return candidates.find((p) => existsSync(p)) ?? null;
}

function findSdk() {
  const fromEnv = process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT;
  if (fromEnv && existsSync(fromEnv)) return fromEnv;
  const props = join(android, 'local.properties');
  if (existsSync(props)) {
    const line = readFileSync(props, 'utf8').split(/\r?\n/).find((l) => l.startsWith('sdk.dir='));
    const dir = line?.slice('sdk.dir='.length).replace(/\\:/g, ':').replace(/\\\\/g, '\\');
    if (dir && existsSync(dir)) return dir;
  }
  const defaults = {
    win32: join(process.env.LOCALAPPDATA ?? '', 'Android', 'Sdk'),
    darwin: join(homedir(), 'Library', 'Android', 'sdk'),
    linux: join(homedir(), 'Android', 'Sdk'),
  };
  const dir = defaults[platform()];
  return dir && existsSync(dir) ? dir : null;
}

if (!existsSync(android)) fail('No android/ folder. Run `npx cap add android` first.');
const java = findJava();
if (!java) fail('No Java found. Install Android Studio (it includes a JDK) or set JAVA_HOME.');
const sdk = findSdk();
if (!sdk) fail('No Android SDK found. Open Android Studio once and let it install the SDK, or set ANDROID_HOME.');

// Gradle reads the SDK location from local.properties (machine-specific, not committed).
const props = join(android, 'local.properties');
if (!existsSync(props)) writeFileSync(props, `sdk.dir=${sdk.replace(/\\/g, '/').replace(/:/g, '\\:')}\n`);

const bundle = process.argv.includes('--bundle');
const adMode = process.argv.find((a) => a.startsWith('--ad-mode='))?.slice('--ad-mode='.length) ?? 'test';
if (!['test', 'production'].includes(adMode)) fail(`Unknown --ad-mode=${adMode} (test or production).`);
const signing = existsSync(join(android, 'keystore.properties'));
const what = bundle
  ? `Building the release AAB (ads: ${adMode}, ${signing ? 'signing with the upload key from android/keystore.properties' : 'UNSIGNED: no android/keystore.properties'})…`
  : 'Building the debug APK…';

console.log(`Java: ${java}\nSDK:  ${sdk}\n${what}\n`);
const gradlew = join(android, isWindows ? 'gradlew.bat' : 'gradlew');
const result = spawnSync(gradlew, bundle ? ['bundleRelease', `-PadMode=${adMode}`] : ['assembleDebug'], {
  cwd: android,
  stdio: 'inherit',
  shell: isWindows, // .bat files need a shell on Windows
  env: { ...process.env, JAVA_HOME: java, ANDROID_HOME: sdk },
});
if (result.status !== 0) fail('Gradle build failed (see the output above).');

if (bundle) {
  const aab = join(android, 'app', 'build', 'outputs', 'bundle', 'release', 'app-release.aab');
  if (!existsSync(aab)) fail(`Build finished but no AAB at ${aab}`);
  const mb = (statSync(aab).size / 1024 / 1024).toFixed(1);
  // jarsigner (in the JDK) tells whether the bundle really carries a signature.
  const jarsigner = join(java, 'bin', isWindows ? 'jarsigner.exe' : 'jarsigner');
  const verify = existsSync(jarsigner) ? spawnSync(jarsigner, ['-verify', aab], { encoding: 'utf8' }) : null;
  const signed = verify?.status === 0 && /jar verified/i.test(verify.stdout) && !/unsigned/i.test(verify.stdout);
  console.log(`\n✔ Release AAB ready (${mb} MB, ads: ${adMode}, ${signed ? 'SIGNED' : 'UNSIGNED: not uploadable'}):\n  ${aab}\n`);
  process.exit(0);
}

const apk = join(android, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
if (!existsSync(apk)) fail(`Build finished but no APK at ${apk}`);
const mb = (statSync(apk).size / 1024 / 1024).toFixed(1);
console.log(`\n✔ Debug APK ready (${mb} MB):\n  ${apk}\n`);
