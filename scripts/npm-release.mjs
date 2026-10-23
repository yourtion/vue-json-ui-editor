import { spawnSync } from 'node:child_process';
import { appendFileSync, mkdirSync, readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// npm drops SemVer build metadata; reject tags that cannot round-trip.
const number = '(?:0|[1-9][0-9]*)';
const identifier = `(?:${number}|[0-9]*[A-Za-z-][0-9A-Za-z-]*)`;
const versionPattern = new RegExp(
  `^${number}\\.${number}\\.${number}(?:-${identifier}(?:\\.${identifier})*)?$`,
);

export function releaseInfo(tag, manifest) {
  const version = tag?.startsWith('v') ? tag.slice(1) : '';
  if (!versionPattern.test(version) || manifest.version !== version) {
    throw new Error(
      `Tag ${tag} must be v<SemVer> and match package.json version`,
    );
  }
  if (
    manifest.private ||
    typeof manifest.name !== 'string' ||
    !/^(?:@[a-z0-9._-]+\/)?[a-z0-9][a-z0-9._-]*$/.test(manifest.name)
  ) {
    throw new Error('Expected a named, public npm package');
  }
  return {
    tag,
    name: manifest.name,
    version,
    prerelease: version.includes('-'),
    distTag: version.includes('-') ? 'next' : 'latest',
  };
}

export function validatePack(pack, manifest) {
  if (
    pack.name !== manifest.name ||
    pack.version !== manifest.version ||
    !pack.filename?.endsWith('.tgz') ||
    basename(pack.filename) !== pack.filename
  ) {
    throw new Error('Packed name/version/filename does not match the release');
  }
  const files = new Set(pack.files.map((file) => file.path));
  const targets = [];
  function collect(value) {
    if (typeof value === 'string') targets.push(value);
    else if (value && typeof value === 'object') {
      for (const nested of Object.values(value)) collect(nested);
    }
  }
  collect(manifest.main);
  collect(manifest.types);
  collect(manifest.bin);
  collect(manifest.exports);
  for (const target of ['package.json', ...targets]) {
    const path = target.replace(/^\.\//, '');
    if (path.includes('*')) {
      throw new Error(
        `Add package-specific validation for wildcard export ${target}`,
      );
    }
    if (!files.has(path))
      throw new Error(`Tarball is missing entry point ${target}`);
  }
}

function execute(command, args) {
  return spawnSync(command, args, {
    encoding: 'utf8',
    env: { ...process.env, NPM_CONFIG_REGISTRY: 'https://registry.npmjs.org/' },
  });
}

function output(result) {
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || 'Release command failed');
  }
  return result.stdout;
}

export function isPublished(info, run = execute) {
  const result = run('npm', [
    'view',
    `${info.name}@${info.version}`,
    'version',
    '--json',
  ]);
  if (result.error) throw result.error;
  let data;
  try {
    data = JSON.parse(result.stdout);
  } catch {
    throw new Error(result.stderr || 'Invalid npm registry response');
  }
  // Only a structured npm E404 means absent. Auth/network errors must propagate.
  if (result.status !== 0 && data?.error?.code === 'E404') return false;
  output(result);
  if (data !== info.version) throw new Error('Unexpected npm registry version');
  return true;
}

export function publish(info, tarball, run = execute) {
  if (isPublished(info, run)) {
    console.log(`${info.name}@${info.version} already published; skipping npm`);
    return;
  }
  console.log(
    output(
      run('npm', [
        'publish',
        tarball,
        '--access',
        'public',
        '--tag',
        info.distTag,
        '--ignore-scripts',
      ]),
    ),
  );
}

export function completeRelease(info, repository, run = execute) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository ?? '')) {
    throw new Error('GITHUB_REPOSITORY must be owner/repo');
  }
  const tags = output(
    run('gh', [
      'api',
      '--paginate',
      `repos/${repository}/releases`,
      '--jq',
      '.[].tag_name',
    ]),
  ).split('\n');
  const args = tags.includes(info.tag)
    ? [
        'release',
        'edit',
        info.tag,
        '--draft=false',
        `--prerelease=${info.prerelease}`,
      ]
    : [
        'release',
        'create',
        info.tag,
        '--verify-tag',
        '--title',
        info.tag,
        '--generate-notes',
      ];
  if (!tags.includes(info.tag) && info.prerelease) args.push('--prerelease');
  console.log(output(run('gh', args)));
}

function main() {
  const [command, tag, destination] = process.argv.slice(2);
  const manifest = JSON.parse(readFileSync('package.json', 'utf8'));
  const info = releaseInfo(tag, manifest);
  if (command === 'check') console.log(JSON.stringify(info));
  else if (command === 'pack') {
    if (!destination) throw new Error('pack requires a destination directory');
    mkdirSync(destination, { recursive: true });
    const [pack] = JSON.parse(
      output(
        execute('npm', [
          'pack',
          '--json',
          '--ignore-scripts',
          '--pack-destination',
          destination,
        ]),
      ),
    );
    validatePack(pack, manifest);
    const tarball = resolve(destination, pack.filename);
    console.log(tarball);
    if (process.env.GITHUB_OUTPUT) {
      appendFileSync(process.env.GITHUB_OUTPUT, `tarball=${tarball}\n`);
    }
  } else if (command === 'publish') {
    if (!destination?.endsWith('.tgz'))
      throw new Error('publish requires a validated tarball');
    publish(info, destination);
  } else if (command === 'release') {
    completeRelease(info, process.env.GITHUB_REPOSITORY);
  } else
    throw new Error(
      'Usage: npm-release.mjs check|pack|publish|release v<version> [path]',
    );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
