---
name: github-pr-review
description: >
  Use when reviewing a GitHub pull request or posting a code review on any
  repository — the review contract (only what must change, severity circles
  🔴/🟠/🟢, the `Cloclo 🤖` signature, and when the global body stays empty),
  the verify-before-asserting discipline, posting one single review through the
  GitHub reviews API, the shell traps that silently corrupt a review body, and
  the cross-repo review sweep. Load it before writing a single line of review,
  and whenever the user says "review this PR", "review this branch", "code
  review", "post a review", "fais un tour sur #1234", mentions a review sweep,
  the severity emoji, or asks whether a PR is RAS.
---

# Reviewing a pull request

How review comments are to be written and posted on GitHub: what to look for,
how deep to dig, how to word a finding, and how to publish it.

This encodes a **negotiated user policy**, not facts about a codebase. Almost
none of it can be re-derived by grepping — treat it as verbatim rather than as
suggestions to reinterpret. It applies to **every repository** reviewed, not
just the one this skill happens to live in.

Reviewing a batch of PRs across repositories — the eligibility filter, the
already-reviewed detection, delegation and the recurring loop — lives in
[references/sweep.md](references/sweep.md). Read it when the task is a sweep
rather than a single PR.

## When to use it — and when not to

Use it when the user asks for a review of a branch or a PR, when a review is
about to be posted on GitHub in their name, or when running the cross-repo
sweep. Do **not** use it for:

| Task                                                    | Use instead                           |
| ------------------------------------------------------- | ------------------------------------- |
| Writing the PR **description** (not its review)         | the project's own writing conventions |
| Reviewing your own uncommitted working diff             | the `/code-review` command            |
| A security-focused pass on pending changes              | the `/security-review` command        |
| Proving a perf or correctness claim before asserting it | run it for real — see §4              |

## 0. Before the first post

Comments are signed **`Cloclo 🤖`** (see §2), and they are published by
whichever GitHub account `gh` is authenticated as. Confirm it with
`gh auth status` before reading or posting: if `gh` is not authenticated,
nothing can be scanned or published, and saying so plainly beats quietly
producing an empty result.

## 1. The review contract

Deliver a review as **advice posted on GitHub through the reviews API**, not
merely as a summary in the chat. **One single review per PR.**

**Comment only on what must be CHANGED or FIXED.** Do not enumerate what is
already good, do not list the checks performed, do not congratulate the PR.
That belongs to the chat summary written for the user, never to the published
review. Go straight to what needs correcting.

Findings are **short, precise inline comments** anchored on the exact lines
where the change applies, opened by a severity circle and the signature, with
a `suggestion` block whenever the fix is a clean one-liner — a reviewer can
then apply it in one click:

````markdown
🟠 Cloclo 🤖 : `getUserById` peut répondre `undefined` — le `?` de sa signature
le dit — donc `user.email` jette dès qu'un id périmé sort du cache.

```suggestion
const email = user?.email ?? FALLBACK_EMAIL;
```
````

### The global body

**With inline findings, the global body stays empty (`""`)** — unless it
carries something no line can hold. That exception is real, and it is narrow:

| Belongs in the global body                                                                                                     | Does not                                             |
| ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------- |
| A remark that spans several files and cannot be anchored anywhere in particular                                                | A recap of the inline comments                       |
| A question or a doubt about the PR's overall approach, scope or sequencing                                                     | A verdict on the PR ("looks good", "well done")      |
| Context the reviewer needs for the inline comments to make sense                                                               | A paraphrase of what the code does well              |
| A risk that only exists at the scale of the whole change (migration order, deploy sequencing, a breaking change for consumers) | A list of what was verified, or of what is now fixed |

The test to apply: **could this be said on a line?** If yes, say it there. If
it only repeats what the lines already say, it is a recap — drop it. The
positives, the "here is what I checked" and the "this is now resolved" go to
the chat summary for the user, which is where they are useful.

This holds for re-reviews too: when a previously flagged point is fixed, either
say nothing (the resolved inline thread speaks for itself) or reply tersely in
that thread — never a global "your point X is fixed and the rest is fine".

**With nothing to change**, the whole review is one global one-liner, signed,
with no inline comment at all:

```
Cloclo 🤖 : La PR semble correspondre à la description.
```

Nothing else. The signature is required even in this case — an unsigned review
is invisible to the sweep's own detection, and its PR then re-flags forever.

**Angles that matter:** bugs introduced by the way the code is written ·
improvements to the feature actually being implemented · adherence to the
project's own conventions · performance · security.

**Read the TARGET repository's conventions first.** Every repo carries its own
`AGENTS.md` / `CLAUDE.md` (and sometimes its own skills) with specific rules.
The "conventions" angle means the rules of the repo **being reviewed** — not
the ones of the repo you happen to be sitting in. Before reviewing a PR in an
unfamiliar repo, read its instructions read-only and judge the diff against
them:

```bash
gh api repos/<owner>/<repo>/contents/AGENTS.md --jq .content | base64 -d
```

Do not apply the idioms of one stack to a PR written in another, and do not
flag as a convention breach something the target repo does not mandate (or
actively does differently). With no `AGENTS.md`, fall back to its README and to
the dominant style of the surrounding code.

## 2. Severity circles + signature (required on every inline comment)

Start every inline comment with one of these **exact colored circles**, then the
signature — e.g. `🟠 Cloclo 🤖 : ...`.

| Circle | Meaning                                                                                                             |
| ------ | ------------------------------------------------------------------------------------------------------------------- |
| 🔴     | blocking / serious — bug, security hole, data loss, breaking change. Must be fixed.                                 |
| 🟠     | important — correctness risk, maintainability, perf concern, or a question that may be hiding a bug. Fix or answer. |
| 🟢     | minor — nit, style, optional suggestion, nice-to-have.                                                              |

Do **not** substitute other emoji (⚠️ 💡 ❓ ✅). Models drift toward those
across sessions; the three circles are what the user reads at a glance to sort
a review, and a review whose severities are unreadable has to be read twice.
A global body, when it earns its place, is signed too.

**Why a signature at all:** the GitHub token authenticates the user's own
account, so there is no separate "Claude" identity on GitHub. The `Cloclo 🤖`
prefix is the only thing that marks a review as machine-written — for the
humans reading the PR, and for the sweep's own detection (§8).

## 3. Depth — do not rush to "nothing to report"

The terse format above governs how findings are **presented**; it is not a
licence to **under-find**. Recurring review loops drift toward one-line
"nothing to report" verdicts, or a lone 🟢, on PRs where thinking longer
surfaces real bugs. "Nothing to report" is only credible **after** a real
sweep.

The list below is what that sweep looks like on a React/TypeScript codebase,
where most of these reviews happen. The categories transpose; the examples do
not — on a PR in another stack, ask what plays the same role there rather than
hunting for a `useMemo` that does not exist.

- **Data flow through ALL sinks**, not one suspicious spot — e.g. a callback
  wired without discriminating on the event it receives, or a shared storage
  key renamed with no migration for the values already written under the old
  one.
- **Render cost / memoization**: catalogs rebuilt on every render and consumed
  by components that need a single field; a context whose value object is
  recreated each time and re-renders the whole tree.
- **Accessibility**: interactive controls nested inside a `<label htmlFor>`
  (invalid HTML), missing labels, keyboard traps.
- **i18n hygiene**: deleting a component leaves **orphan translation keys**
  whose only consumers were the deleted files → list them for removal. A new
  key added to the reference locale and not mirrored in the others.
- **Conventions**: type-only imports; mixed scopes (an unrelated chore file
  inside a feature PR); default-value or UX changes that deserve to be called
  out.
- **Dead or contradictory state**: an optional-chaining `?.` on a value the
  code just constructed, a guard that can never be false, a piece of state that
  duplicates a prop.
- **Cross-file / cross-PR**: the same bug usually lives in a sibling file, and
  often in a sibling repo.

The lever, in the user's own words: **"think longer"**.

## 4. Verify before asserting (every claim, every time)

Before asserting **anything** in a review — how a framework or library method
behaves, how data flows, whether a validation already exists, what a config
wires up, CI status, or whether a previously flagged point was really fixed —
**check it against the actual source**. Do not reason from assumed conventions.
A confident but wrong claim wastes an experienced colleague's time and costs
trust; this is a standing habit, not a per-library exception.

- For any finding — "X overwrites Y", "this library does Z", "there is no
  validation for W", "this route will 400", "this is dead code", "the fix is
  not applied" — open the real code first. Check copy-vs-in-place (does the
  sort mutate the output list or a copy?), output-vs-lookup (does the result
  drive iteration order, or just a map?), the method's real return/mutation
  semantics, the existing constraints, the config wiring, the current state of
  the file.
- If you cannot verify it, phrase it as an **explicit question**, not as an
  assertion.
- When in doubt on an error / perf / security finding, **prove it for real**
  rather than imagining it: set up a worktree, run the type checker, the linter
  or the relevant test, reproduce the breaking path, measure the perf claim.
  Reading confirms _what the code does_; running confirms _that it actually
  breaks_. See §7 for the worktree rule.
- When a colleague corrects you and they are right, acknowledge it briefly in
  the thread, signed.

**Omit facts CI already provides.** Never restate in a posted review what the
checks already display — "lint is green", "no dead exports", "types OK", "CI
passes", "tests pass". The reviewer can see the checks; less is more. Verify
them silently for your own confidence (keep that in the chat summary) and
report only what CI cannot tell them: a real bug, a convention breach, a logic
or design concern, an answer to a question.

## 5. Posting mechanics (GitHub reviews API)

Post everything as **one single review** on
`repos/{owner}/{repo}/pulls/{n}/reviews`, with `event: COMMENT` and a
`comments` array. Build the JSON in the scratchpad and post it in one call:

```json
{
  "event": "COMMENT",
  "body": "",
  "comments": [
    {
      "path": "src/user/mailer.ts",
      "line": 42,
      "side": "RIGHT",
      "body": "🟠 Cloclo 🤖 : `getUserById` peut répondre `undefined` …"
    }
  ]
}
```

```bash
gh api -X POST repos/<owner>/<repo>/pulls/<n>/reviews --input review.json
```

- Anchor inline comments on lines that appear in the diff (added / removed /
  context inside a hunk), `side: RIGHT`.
- Write the prose in the user's language (**French**), but keep code and
  identifiers **verbatim**: never translate a class, entity, property or method
  name. A domain term in French belongs to the prose only; it is never a rename
  of the symbol.
- To repair the body of an already posted review:
  `gh api -X PUT repos/{o}/{r}/pulls/{n}/reviews/{id} -F body=@cleanfile`.

**`gh pr diff` can be stale.** It may lag behind the PR's real head commit, so
a finding derived from it can be wrong and inline comments anchored on outdated
lines will 422. Before asserting a diff-derived claim or posting inline
comments, get the real head (`gh pr view <n> --json headRefOid`), read the real
file at that SHA
(`gh api repos/<o>/<r>/contents/<path>?ref=<sha> --jq .content | base64 -d`),
and trust that. If the diff looks stale, post the review **in the body** with
`file:line` references instead of inline `comments[]`.

**Replying to another reviewer's comment.** When you have a genuine,
substantial opinion on a comment someone else already left, reply **inside that
comment's thread** (not a new top-level comment), always prefixed with the
signature: `POST .../pulls/{n}/comments` with `in_reply_to: <comment_id>`.
Agreeing → a short confirmation. Disagreeing → a short answer explaining
**why**, with a concrete reason. Only for something that matters; not to add
noise.

**Answering questions addressed to the bot.** When a PR comment asks you a
question directly (by name, "@Cloclo ...", "et toi t'en penses quoi ?"), reply
in that thread, signed, with a substantive answer verified before it is
asserted — including honest technical nuance, not just polite agreement. This
keeps the thread actionable even during a sweep where the PR has no new commit.

**The user's own PRs.** Review them and post on them **exactly like anyone
else's** — including PRs opened from the same GitHub account that posts the
reviews. Do not skip them, do not preface with "(reviewing my own PR)". They go
last in the sweep order, but they get a normally posted review. GitHub allows
`event: COMMENT` reviews on your own account's PRs; only APPROVE and
REQUEST_CHANGES are blocked.

## 6. Shell traps when posting

Review bodies are Markdown prose full of backticks and apostrophes — exactly
what these traps bite. Know which shell your Bash tool actually runs (`bash`,
`zsh`, or Git Bash on Windows) before quoting anything.

- **An unquoted heredoc executes backticks.** `cat > f <<JSON` performs command
  substitution: every `` `code` `` in the body is run as a command, fails, and
  is silently stripped from the posted review. Default to a **quoted**
  delimiter — `cat > f <<'JSON'` — or write the file with the **Write** tool
  (zero shell interpretation). Never fall back to an unquoted heredoc just to
  interpolate a variable. Long bodies are safer written with **Write** outright:
  a heredoc is one stray quote away from a parse error that loses the whole
  message.
- **Apostrophes break single-quoted `-f body='…'`.** French bodies (`l'appui`,
  `qu'elle`) close the quote and expose backticks and `>` to the shell, causing
  parse errors. Do not fight it with per-apostrophe escaping — write a
  `{"body":"…","in_reply_to":<id>}` JSON file and post with
  `gh api … --input file.json`.
- **`gh api --jq` does not accept `--arg`** (it fails with
  `accepts 1 arg(s), received 4`). Interpolate the value into the filter string
  shell-side, escaping the inner quotes:
  `--jq ".[] | select(.commit.committer.date > \"$since\") | ..."`.
- **`gh` inside a `while read … done < file` loop can deadlock** (zero
  progress, then a timeout) while the same call in isolation answers in under a
  second: `gh` consumes the loop's stdin. Redirect each call's stdin
  (`gh … </dev/null`), or use a plain `for x in a b c; do gh …; done`. For any
  batch of `gh` calls, write a `.sh` file and run it with `bash script.sh`,
  prefer `?per_page=100` over `--paginate`, and write results incrementally so
  a partial output survives a timeout.
- **On Windows, do not compose review bodies in PowerShell.** Its escape
  character is a backtick — the very character Markdown code spans are made of.
  Use the Bash tool with a quoted heredoc, or the Write tool.

## 7. Local analysis → always in a worktree

When a review needs local analysis — checking out the PR branch, running
tooling, browsing the repo at a precise ref — do it in a dedicated **git
worktree**, never with `git checkout` / a branch switch in the user's main
working copy. Their checkouts are live and shared; switching branches under
them disrupts work in progress and can silently invalidate a running dev server
or test watcher.

- Read-only inspection at a ref → cheapest is
  `gh api repos/{o}/{r}/contents/{path}?ref=<sha>` (no checkout at all).
- Local tooling / running code at a branch's state →
  `git worktree add <path> <branch-or-sha>` (clean up with
  `git worktree remove <path>`), or the `EnterWorktree` / `ExitWorktree` tools,
  or `isolation: "worktree"` when delegating.
- Never leave the user's main working directory on a branch other than the one
  it started on.

## 8. Reviewing many PRs at once

A sweep across repositories — which PRs are eligible, how an existing signed
review is detected, why a rebase re-flags a PR that has nothing new, what to
copy into a subagent's prompt, and how to run the whole thing on a schedule —
is its own procedure: read [references/sweep.md](references/sweep.md) when that
is the task. Everything above still governs each individual review it posts.

## Maintenance

This skill encodes **a negotiated user policy** — how they want reviews done —
not facts about a codebase, so most of it cannot be re-verified by reading code.
The parts that go stale:

- The severity circles, the signature and the global-body rule are hard user
  preferences, confirmed repeatedly. Do not soften them without a new
  instruction.
- The shell traps (§6) are specific to the shell your Bash tool runs. The
  absence of `--arg` on `gh api` was last confirmed on gh 2.89.
- The **write** side of the API — `in_reply_to`, `PUT …/reviews/{id}`,
  `event: COMMENT` on your own account's PRs — comes from practice elsewhere
  and has not been exercised from this machine. The read endpoints it builds on
  have. If one of them answers with an error rather than the documented
  behaviour, fix it here rather than working around it in the moment.
