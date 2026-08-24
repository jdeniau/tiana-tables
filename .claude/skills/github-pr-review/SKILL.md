---
name: github-pr-review
description: >
  Use when reviewing a GitHub pull request or posting a code review on any
  repository — the review contract (only what must change, severity circles
  🔴/🟠/🟢, the `Cloclo 🤖` signature, empty global body), the
  verify-before-asserting discipline, posting one single review through the
  GitHub reviews API, the shell traps that silently corrupt a review body,
  delegating a review to a subagent, and the cross-repo review sweep. Load it
  before writing a single line of review, and whenever the user says "review
  this PR", "review this branch", "code review", "post a review", "fais un tour
  sur #1234", mentions a review sweep, the severity emoji, or asks whether a PR
  is RAS.
---

# Reviewing a pull request

How review comments are to be written and posted on GitHub: what to look for,
how deep to dig, how to word a finding, how to publish it, and how the
cross-repo sweep works.

This encodes a **negotiated user policy**, not facts about a codebase. Almost
none of it can be re-derived by grepping — treat it as verbatim rather than as
suggestions to reinterpret. It applies to **every repository** reviewed, not
just the one this skill happens to live in.

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

## 0. The three values to confirm before the first post

Everything else in this skill is generic. These are not:

| Value           | Default                        | Why it matters                                             |
| --------------- | ------------------------------ | ---------------------------------------------------------- |
| Signature       | `Cloclo 🤖`                    | marks a comment as machine-written (see §2)                |
| Posting account | whoever `gh auth status` shows | used to detect "my own past reviews" and to rank the sweep |
| Sweep scope     | asked for at sweep time        | the org and the list of repositories to scan (§8)          |

Confirm the account with `gh auth status` before scanning or posting. If `gh`
is not authenticated, nothing can be read or published: say so plainly instead
of quietly producing an empty result.

## 1. The review contract

Deliver a review as **advice posted on GitHub through the reviews API**, not
merely as a summary in the chat. **One single review per PR.**

**Comment only on what must be CHANGED or FIXED.** Do not enumerate what is
already good, do not list the checks performed, do not congratulate the PR.
That belongs to the chat summary written for the user, never to the published
review. Go straight to what needs correcting.

Format:

- **Short, precise inline comments** anchored on the exact lines where the
  change applies. Include a `suggestion` block when the fix is a clean
  one-liner — a reviewer can then apply it in one click.
- At most **one** extra global comment, and only when it carries something the
  inline comments structurally cannot.

**The global body rule** (the one that drifts the most, so it is spelled out):

- **When there ARE inline findings → the global body MUST be empty (`""`).**
  No recap. A global body that validates the PR, paraphrases what the code does
  well, or lists resolved points adds nothing on the PR itself — only the
  inline comments carry value there. Keep the positives, the "here is what I
  verified" and the "this is now fixed" for the chat summary. This holds for
  re-reviews too: if a previously flagged point is now fixed, either say
  nothing (the resolved inline thread speaks for itself) or reply tersely in
  that thread — never a global "your point X is fixed and the rest is fine".
- **When there is NOTHING to change** → the whole review is one single global
  one-liner, signed, with no inline comment at all:

  ```
  Cloclo 🤖 : La PR semble correspondre à la description.
  ```

  Nothing else. The signature is required even in this "nothing to change" case
  — see §10 for why an unsigned review is worse than useless.

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
A global comment, when used, is signed too (e.g. a `## Review (Cloclo 🤖)`
heading).

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

Before concluding, cover:

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

Post everything as **one single review**:
`POST repos/{owner}/{repo}/pulls/{n}/reviews` with `event: COMMENT` and a
`comments` array. Build the JSON in the scratchpad and post it with
`gh api --input file.json`.

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
**last** in the sweep order, but they get a normally posted review. GitHub
allows `event: COMMENT` reviews on your own account's PRs; only APPROVE and
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

## 8. Cross-repo review sweep

For a "review every PR waiting on me" sweep, ask for the org and the repo list
once, then keep it for the session.

**Eligibility filter:** open · not draft · `updatedAt` within the scan window ·
no existing signed review. The default window is ~21 days; a frequent recurring
run only needs ~24 h. An existing bot review is detected by the signature
string appearing in any review body, issue comment or inline comment of the PR.

**The scan.** Iterate the repo list with the REST endpoint —
`gh api "repos/<org>/<repo>/pulls?state=open&per_page=100" --paginate` — rather
than a GraphQL-backed `gh pr list`: REST bills against a separate rate limit
and survives GraphQL exhaustion. Keep `draft == false` and
`updated_at >= now - window`. Put `</dev/null` on every `gh` call (§6).

**The verdict.** For each candidate compute `last` = the **max committer date**
of its commits (`pulls/{n}/commits`), and `mine` = the most recent of my
reviews + inline comments whose body matches the signature. Then:

| Condition       | Verdict          |
| --------------- | ---------------- |
| `mine` is empty | **NEEDS_REVIEW** |
| `last > mine`   | **RE-REVIEW**    |
| otherwise       | skip             |

Act on **NEEDS_REVIEW** first, then **RE-REVIEW**, then the posting account's
own PRs (last, never skipped, posted normally).

**Identity — the human and the bot share one account.** A PR authored by the
account that posts the reviews is **not** "the bot's own PR": review it and
post on it like any other developer's. Withholding a posted review because it
is "the same identity / I'd be talking to myself" is faulty reasoning. Bot
detection keeps working on those PRs precisely because the human's own comments
do not carry the signature.

**A signed review you do not recognize from the current session is NOT evidence
of a rogue or duplicated job.** The same account can be driven interactively
between runs, producing reviews absent from this session's history. Treat an
unrecognized in-account signed review as normal; raise a duplication concern
only with real evidence (two identical back-to-back ticks, or the user says so).

**RE-REVIEW is driven by committer date → expect benign churn.** Because `last`
is the latest committer date, a **rebase or a merge of the main branch** (fresh
committer dates, identical authored content) re-flags a PR with nothing new to
review. Before re-reviewing, diff the head against your last reviewed SHA:
`gh api repos/{o}/{r}/compare/<reviewed>...<head>` — `ahead/behind 1/1` with a
replayed commit is a rebase; `behind: 0` with only the main branch's commits is
a benign merge. Do not redo a deep review, and do not post "rebase, nothing to
report" notes on benign churn — check and move on.

## 9. Delegating a review to a subagent

A subagent knows only what its prompt tells it — it does not see this skill or
the user's conventions. When delegating a review the subagent will **post**,
copy the whole posting contract into **every** prompt: the severity circle
mapping (🔴/🟠/🟢), the inline `Cloclo 🤖 :` prefix, the global-body rule, the
prose language, and the one-shot reviews API call. An omission in the prompt
becomes an omission in the published review, which is expensive to repair after
the fact — a dropped severity mapping has already produced a review with no
severities at all.

**Cheap models are unreliable on the "already reviewed" exclusion.** They list
open / non-draft / recent PRs reliably, but not the exclusion step. Let a cheap
agent gather the candidate list, then run the signature check **yourself**
(`gh api .../reviews`, `.../issues/{n}/comments`, `.../pulls/{n}/comments`,
grepped case-insensitively). A wrong exclusion means either skipping PRs that
need a review, or double-reviewing one.

## 10. Running the sweep on a loop

A recurring sweep is a scheduled tick that scans the repos, classifies each open
PR (NEEDS_REVIEW / RE-REVIEW / skip), answers questions addressed to the bot,
and posts a review on every actionable PR per §1–§9. If nothing is actionable,
it reports per repo and waits.

- **Stagger the schedule.** Use offset minutes (`7,27,47 * * * *`), never `:00`
  or `:30`, so a fleet of jobs does not hit the API in lockstep.
- **Run each tick in one foreground call**, sequentially, with a generous
  timeout — a backgrounded tick that outlives its turn will interleave with the
  next one.
- **Guard against overlap.** Two ticks running at once share scratchpad files
  and produce inflated counters. The deduplicated verdict set stays correct
  (duplicate lines only repeat known verdicts, they never invent a PR), so the
  _result_ is never wrong — the collision is noise. If counters look inflated,
  kill the orphan by **explicit PID**; never `pkill -f <script>`, which also
  kills the Bash tool's own shell.
- **An empty-bodied review is invisible to the detection.** Only bodies
  containing the signature register, so an unsigned or empty review never counts
  and its PR re-flags on every single tick, forever. Sign every review,
  including the "nothing to change" one-liner.
- **Session-scoped schedulers die with the session.** If the loop is driven by
  an in-session scheduler, recreate it after a restart; if it must survive
  reboots, drive it from the OS scheduler with a lock file to prevent overlap.

## Maintenance

This skill encodes **a negotiated user policy** — how they want reviews done —
not facts about a codebase, so most of it cannot be re-verified by reading code.
The parts that go stale:

- The sweep scope (§8) drifts as repositories are added and archived —
  reconcile it with the real org before relying on it.
- The severity circles, the signature and the global-body rule are hard user
  preferences, confirmed repeatedly. Do not soften them without a new
  instruction.
- The shell traps (§6) are specific to the shell your Bash tool runs; re-check
  them when the environment changes.
