---
name: interactive-review
description: >
  Use when the user wants to walk through changes with you before they are committed or merged — the interactive review: every change shown once, in the order a human understands it rather than the alphabetical one, approved step by step, mechanical changes in bulk. Unstaged changes are staged hunk by hunk as they are approved (a `git add -p` in reading order); the files of a pull request are marked as viewed on GitHub; a change approved one way is not asked again the other. Triggers on "/interactive-review", "review interactive", "git add -p", "on relit la PR", "fais-moi relire", "mark as viewed", "review my changes with me", or a PR number to go through together.
---

# Interactive review

The user reviews; you guide. Every change is shown once, in an order that makes it understood, and nothing is approved on their behalf — except a change they already approved, which is never asked twice.

The mechanics are in `review.mjs`, next to this file (Node, no dependency): run it from the repository, `node .claude/skills/interactive-review/review.mjs <command>`.

| Command                 | Does                                                                                             |
| ----------------------- | ------------------------------------------------------------------------------------------------ |
| `hunks [path…]`         | the unstaged hunks, numbered per file, as JSON (an untracked file is one hunk)                   |
| `stage <path:1,3>…`     | stages exactly these hunks; a bare `path` stages the whole file (an addition, a deletion, bytes) |
| `pr [number]`           | the files of the pull request left to review (never the `VIEWED` ones), as JSON                  |
| `diff <number> <path>`  | the diff of one of them still to read                                                            |
| `view <number> <path>…` | marks them as viewed on GitHub                                                                   |

**Memory.** `stage` and `view` record every approved change as the blob a file went from and the blob it went to, in `interactive-review.json` of the git directory (never committed, shared by worktrees). `pr` reads it: a file whose base-to-head change is covered by a chain of approved changes is `approved: true`; one approved in part has a `reviewFrom`, and `diff` then shows only what came after. That is how a change staged here and pushed later is not asked again on GitHub, and how a `DISMISSED` file (changed since it was viewed) only shows its new part.

## 1. Which case

- **Unstaged changes** (`git status`): case 1, the `git add -p`. Changes the user staged before are theirs: say so, do not review them.
- **Otherwise, the pull request** of the branch (`pr` with no number) or the one the user names: case 2.
- **Both**: case 1 first. Once the user commits and pushes, case 2 picks up what was staged here as already approved.

Never commit nor push: staging is the whole of case 1.

## 2. Settle what was approved already

In case 2, the files with `approved: true` are marked as viewed straight away (`view`), without being shown: name them in one line. They are the same diff the user approved while staging.

## 3. Plan the reading

Read every diff first (`hunks`, or `diff` per file), then present the plan — numbered steps, the files or hunks of each, one line on why it comes there — before showing any change.

**The order is the one in which each change makes sense of the next**: what the rest depends on comes first.

1. the contract — types, enums, schemas, a channel, a public signature;
2. the implementation behind it;
3. the wiring — registration, main process, IPC, a route, a context;
4. what uses it — the interface, the callers;
5. the tests, next to what they cover (or right after it) rather than in a heap at the end;
6. fixtures, stories, then docs and rules.

When the repository's `CLAUDE.md` or `AGENTS.md` states a review order, it wins. Alphabetical order is never an argument.

**Mechanical changes go in bulk**: a rename, a parameter added or removed at every call site, imports moved, formatting, a generated file. One step can hold them across many files, shown as what changed and where, with one representative hunk.

**A file mixing mechanical and meaningful changes is split**: case 1 splits it by hunk, the meaningful hunks in their own step; in case 2, where only a whole file can be viewed, the meaningful hunks are shown in full and the mechanical ones named, and the file is viewed once all of it is approved. A hunk that itself mixes both is shown in full.

## 4. Walk the steps

For each step:

- Say in one or two sentences what it does and why it comes now, then show the meaningful hunks **as they are**, in a `diff` block: never a paraphrase in place of a change. Past about 150 lines, split the step.
- **The diff goes in your own message, before the question**: the user does not see a tool's output, so a diff read with `git diff` or `review.mjs diff` is shown to you alone.
- Ask with `AskUserQuestion`: **Valider** (approve), **Passer** (leave it for now); the free-text answer is how the user discusses or asks a question. Answer, show more context when asked, and ask again.
- **A gap you found and would fix gets its own option**, "Corriger <the gap> et valider", beside "Valider" as it is: approving the step must never read as approving the fix, nor the other way round.
- **A fix is offered for staging only once the repository's whole checks pass** (its lint and type check, not the one test it touches): a test runner that does not type-check passes a test that does not compile.
- On approval: `stage` its hunks (case 1), or `view` its files (case 2) — a file split across steps is viewed at the last of them.
- A skipped change stays unstaged or unviewed. If the user asks for a fix, it is a change of its own: make it only when asked, and it goes through the review like any other.

Hunk numbers shift once a hunk of the same file is staged: run `hunks` again before staging the next step's hunks of that file.

## 5. Wrap up

Say what was approved, and list what was skipped, each with the reason the user gave. Offer nothing else: posting review comments is the `github-pr-review` skill's, when the user asks for it.

Talk in the user's language; code and diffs stay as they are.
