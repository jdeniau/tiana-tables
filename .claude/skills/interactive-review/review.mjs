#!/usr/bin/env node
// The mechanics of the `interactive-review` skill: listing what is left to review, staging hunks,
// marking pull request files as viewed, and remembering every change approved either way.
//
//   review.mjs hunks [path…]         unstaged hunks, numbered, as JSON (untracked files whole)
//   review.mjs stage <path[:n,…]>…   stage these hunks (a bare path: the whole file), remember them
//   review.mjs pr [number]           the pull request's files left to review, as JSON
//   review.mjs diff <number> <path>  the diff of one of them still to review
//   review.mjs view <number> <path>… mark them as viewed on GitHub, remember them
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

function run(command, args, input) {
  return execFileSync(command, args, {
    encoding: 'utf8',
    input,
    maxBuffer: 256 * 1024 * 1024,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
}

const git = (...args) => run('git', args);

/** The blob a revision holds at a path, `null` where it holds none. */
function blobAt(revision, path) {
  try {
    return git(
      'rev-parse',
      '--verify',
      '--quiet',
      `${revision}:${path}`
    ).trim();
  } catch {
    return null;
  }
}

/** The blob the index holds at a path, `null` where it holds none. */
function indexBlob(path) {
  const line = git('ls-files', '--stage', '--', path).trim();

  return line === '' ? null : line.split(/\s+/)[1];
}

// ---- memory: every approved change, as the blob a file went from and the blob it went to

const MEMORY = join(
  git('rev-parse', '--path-format=absolute', '--git-common-dir').trim(),
  'interactive-review.json'
);

function readMemory() {
  return existsSync(MEMORY)
    ? JSON.parse(readFileSync(MEMORY, 'utf8'))
    : { version: 1, approved: [] };
}

function remember(entries) {
  const memory = readMemory();
  const at = new Date().toISOString();

  for (const { path, from, to } of entries) {
    if (from !== to) {
      memory.approved.push({ path, from, to, at });
    }
  }

  writeFileSync(MEMORY, `${JSON.stringify(memory, null, 2)}\n`);
}

/**
 * The blobs reachable from `start` through approved changes, each with the date it was reached:
 * a pull request of several commits is approved when a chain of them leads from its base to its head.
 */
function reachableFrom(start) {
  const { approved } = readMemory();
  const reached = new Map([[start, '']]);
  const queue = [start];

  while (queue.length > 0) {
    const blob = queue.shift();

    for (const { from, to, at } of approved) {
      if (from === blob && !reached.has(to)) {
        reached.set(to, at);
        queue.push(to);
      }
    }
  }

  return reached;
}

// ---- case 1: the working tree against the index, as `git add -p` sees it

/** A file's diff: its header lines, then its hunks, each starting at `@@`. */
function splitDiff(diff) {
  const files = [];

  for (const chunk of diff.split(/^(?=diff --git )/m).filter(Boolean)) {
    const [header, ...hunks] = chunk.split(/^(?=@@ )/m);
    const path =
      /^\+\+\+ b\/(.*)$/m.exec(header)?.[1] ??
      /^--- a\/(.*)$/m.exec(header)?.[1];

    files.push({ path, header, hunks });
  }

  return files;
}

function unstagedDiff(paths) {
  return git(
    'diff',
    '--no-color',
    '--no-ext-diff',
    '--no-renames',
    '-U3',
    '--',
    ...paths
  );
}

function hunks(paths) {
  const tracked = splitDiff(unstagedDiff(paths)).map(
    ({ path, header, hunks: parts }) => ({
      path,
      status: /^deleted file/m.test(header)
        ? 'deleted'
        : /^Binary files/m.test(header)
          ? 'binary'
          : 'modified',
      hunks: parts.map((patch, index) => ({ n: index + 1, patch })),
    })
  );
  const untracked = git(
    'ls-files',
    '--others',
    '--exclude-standard',
    '--',
    ...paths
  )
    .split('\n')
    .filter(Boolean)
    .map((path) => {
      const content = readFileSync(path, 'utf8');
      const binary = content.includes('\0');

      return {
        path,
        status: binary ? 'binary' : 'untracked',
        hunks: binary ? [] : [{ n: 1, patch: content }],
      };
    });

  return [...tracked, ...untracked];
}

/** `path` stages the whole file — an addition, a deletion or bytes included —, `path:1,3` those hunks. */
function stage(specs) {
  const approved = [];

  for (const spec of specs) {
    const match = /^(.*):(\d+(?:,\d+)*)$/.exec(spec);
    const path = match ? match[1] : spec;
    const from = indexBlob(path);

    if (match) {
      const wanted = new Set(match[2].split(',').map(Number));
      const [file] = splitDiff(unstagedDiff([path]));

      if (!file || [...wanted].some((n) => n < 1 || n > file.hunks.length)) {
        throw new Error(`${path} has no hunk ${match[2]}: run \`hunks\` again`);
      }

      const patch =
        file.header +
        file.hunks.filter((_, index) => wanted.has(index + 1)).join('');

      run('git', ['apply', '--cached', '--recount', '-'], patch);
    } else {
      git('add', '--all', '--', path);
    }

    approved.push({ path, from, to: indexBlob(path) });
  }

  remember(approved);

  return approved;
}

// ---- case 2: a pull request on GitHub

const gh = (...args) => run('gh', args);

function pullRequest(number) {
  const pr = JSON.parse(
    gh(
      'pr',
      'view',
      ...(number ? [number] : []),
      '--json',
      'number,id,url,baseRefName,headRefOid'
    )
  );
  const { owner, name } = JSON.parse(
    gh('repo', 'view', '--json', 'owner,name')
  );

  git(
    'fetch',
    '--quiet',
    'origin',
    pr.baseRefName,
    `refs/pull/${pr.number}/head`
  );

  // GitHub's "Files changed" is the three-dot diff: from where the head left the base
  const base = git(
    'merge-base',
    `origin/${pr.baseRefName}`,
    pr.headRefOid
  ).trim();

  return { ...pr, owner: owner.login, repo: name, base };
}

function viewedStates({ owner, repo, number }) {
  const states = new Map();
  let after = null;

  do {
    const { data } = JSON.parse(
      gh(
        'api',
        'graphql',
        '-F',
        `owner=${owner}`,
        '-F',
        `repo=${repo}`,
        '-F',
        `number=${number}`,
        ...(after ? ['-F', `after=${after}`] : []),
        '-f',
        'query=query($owner: String!, $repo: String!, $number: Int!, $after: String) { repository(owner: $owner, name: $repo) { pullRequest(number: $number) { files(first: 100, after: $after) { nodes { path viewerViewedState } pageInfo { hasNextPage endCursor } } } } }'
      )
    );
    const { nodes, pageInfo } = data.repository.pullRequest.files;

    for (const { path, viewerViewedState } of nodes) {
      states.set(path, viewerViewedState);
    }

    after = pageInfo.hasNextPage ? pageInfo.endCursor : null;
  } while (after);

  return states;
}

/** One file as the review sees it: the diff left to read starts at the last blob approved, or at the base. */
function describe(
  pr,
  { filename, previous_filename, status, additions, deletions }
) {
  const baseBlob = blobAt(pr.base, previous_filename ?? filename);
  const headBlob = blobAt(pr.headRefOid, filename);
  const reached = reachableFrom(baseBlob);
  const since = [...reached]
    .filter(([blob]) => blob !== baseBlob)
    .sort(([, left], [, right]) => right.localeCompare(left))[0]?.[0];

  return {
    path: filename,
    previousPath: previous_filename ?? null,
    status,
    additions,
    deletions,
    baseBlob,
    headBlob,
    // every change of the file was approved already, locally or on GitHub
    approved: reached.has(headBlob),
    // the part approved already: only what came after it is left to read
    reviewFrom: reached.has(headBlob) ? headBlob : (since ?? null),
  };
}

function prFiles(pr) {
  pr.files ??= JSON.parse(
    gh(
      'api',
      '--paginate',
      `repos/${pr.owner}/${pr.repo}/pulls/${pr.number}/files?per_page=100`
    )
  );

  return pr.files;
}

function listPr(number) {
  const pr = pullRequest(number);
  const states = viewedStates(pr);
  const files = prFiles(pr)
    .map((file) => ({
      ...describe(pr, file),
      viewedState: states.get(file.filename),
    }))
    .filter(({ viewedState }) => viewedState !== 'VIEWED');

  return {
    number: pr.number,
    url: pr.url,
    base: pr.base,
    head: pr.headRefOid,
    viewed: [...states.values()].filter((state) => state === 'VIEWED').length,
    files,
  };
}

function fileOf(pr, path) {
  const file = prFiles(pr).find(({ filename }) => filename === path);

  if (!file) {
    throw new Error(`${path} is not a file of #${pr.number}`);
  }

  return describe(pr, file);
}

function diff(number, path) {
  const pr = pullRequest(number);
  const file = fileOf(pr, path);

  if (file.reviewFrom && file.reviewFrom !== file.baseBlob && file.headBlob) {
    // only what came after the part approved already; a diff of two blobs names them by hash
    const since = git(
      'diff',
      '--no-color',
      file.reviewFrom,
      file.headBlob
    ).replace(/^(diff --git|---|\+\+\+) .*$/gm, (line) =>
      line.replace(/\b[0-9a-f]{40}\b/g, path)
    );

    return `# only the changes since ${file.reviewFrom}, the part approved before\n${since}`;
  }

  return git(
    'diff',
    '--no-color',
    '--find-renames',
    pr.base,
    pr.headRefOid,
    '--',
    ...(file.previousPath ? [file.previousPath] : []),
    path
  );
}

function view(number, paths) {
  const pr = pullRequest(number);
  const approved = [];

  for (const path of paths) {
    const file = fileOf(pr, path);

    gh(
      'api',
      'graphql',
      '-F',
      `id=${pr.id}`,
      '-F',
      `path=${path}`,
      '-f',
      'query=mutation($id: ID!, $path: String!) { markFileAsViewed(input: { pullRequestId: $id, path: $path }) { clientMutationId } }'
    );

    approved.push({
      path,
      from: file.reviewFrom ?? file.baseBlob,
      to: file.headBlob,
    });
  }

  remember(approved);

  return approved;
}

const [command, ...args] = process.argv.slice(2);
const commands = {
  hunks: () => hunks(args),
  stage: () => stage(args),
  pr: () => listPr(args[0]),
  diff: () => diff(args[0], args[1]),
  view: () => view(args[0], args.slice(1)),
};

if (!commands[command]) {
  console.error(`usage: review.mjs ${Object.keys(commands).join(' | ')} …`);
  process.exit(2);
}

try {
  const result = commands[command]();

  process.stdout.write(
    typeof result === 'string' ? result : `${JSON.stringify(result, null, 2)}\n`
  );
} catch (error) {
  console.error(error.stderr?.toString() || error.message);
  process.exit(1);
}
