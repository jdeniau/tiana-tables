# The cross-repo review sweep

Reviewing every PR that is waiting on you, across several repositories, and
keeping that going on a schedule. Each individual review it produces follows
the contract in [SKILL.md](../SKILL.md) — this file only covers what changes
when there are many PRs instead of one.

Ask for the org and the repo list once, then keep them for the session.

## Eligibility

Open · not draft · `updatedAt` within the scan window · no existing signed
review. The default window is ~21 days; a frequent recurring run only needs
~24 h. An existing bot review is detected by the signature string appearing in
any review body, issue comment or inline comment of the PR.

## The scan

Iterate the repo list with the REST endpoint —
`gh api "repos/<org>/<repo>/pulls?state=open&per_page=100" --paginate` — rather
than a GraphQL-backed `gh pr list`: REST bills against a separate rate limit
and survives GraphQL exhaustion. Keep `draft == false` and
`updated_at >= now - window`. Put `</dev/null` on every `gh` call — see the
shell traps in SKILL.md §6.

## The verdict

For each candidate compute `last` = the **max committer date** of its commits
(`pulls/{n}/commits`), and `mine` = the most recent of my reviews + inline
comments whose body matches the signature. Then:

| Condition       | Verdict          |
| --------------- | ---------------- |
| `mine` is empty | **NEEDS_REVIEW** |
| `last > mine`   | **RE-REVIEW**    |
| otherwise       | skip             |

Act on **NEEDS_REVIEW** first, then **RE-REVIEW**, then the posting account's
own PRs (last, never skipped, posted normally).

## Identity — the human and the bot share one account

A PR authored by the account that posts the reviews is **not** "the bot's own
PR": review it and post on it like any other developer's. Withholding a posted
review because it is "the same identity / I'd be talking to myself" is faulty
reasoning. Bot detection keeps working on those PRs precisely because the
human's own comments do not carry the signature.

**A signed review you do not recognize from the current session is NOT evidence
of a rogue or duplicated job.** The same account can be driven interactively
between runs, producing reviews absent from this session's history. Treat an
unrecognized in-account signed review as normal; raise a duplication concern
only with real evidence (two identical back-to-back ticks, or the user says so).

## RE-REVIEW is driven by committer date → expect benign churn

Because `last` is the latest committer date, a **rebase or a merge of the main
branch** (fresh committer dates, identical authored content) re-flags a PR with
nothing new to review. Before re-reviewing, diff the head against your last
reviewed SHA: `gh api repos/{o}/{r}/compare/<reviewed>...<head>` —
`ahead/behind 1/1` with a replayed commit is a rebase; `behind: 0` with only
the main branch's commits is a benign merge. Do not redo a deep review, and do
not post "rebase, nothing to report" notes on benign churn — check and move on.

## Delegating a review to a subagent

A subagent knows only what its prompt tells it — it does not see the skill or
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

## Running it on a loop

A recurring sweep is a scheduled tick that scans the repos, classifies each open
PR, answers questions addressed to the bot, and posts a review on every
actionable PR. If nothing is actionable, it reports per repo and waits.

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

The repo list drifts as repositories are added and archived — reconcile it with
the real org before relying on it.
