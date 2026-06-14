# One-paragraph vs Ponytail Skill — 2026-06-14

Is ponytail's 95-line SKILL.md really just one good sentence in disguise?

Tested by replacing the skill with a generic ~60-token paragraph (no
task-specific hints, no library name-drops, no benchmark references) and
running the same 5 tasks across Haiku 4.5, Sonnet 4.6, and Opus 4.8 with
prompt caching enabled on every skill arm.

## TL;DR

| model | one-paragraph LOC | ponytail LOC | ratio | verdict |
|---|---:|---:|---:|---|
| **Opus 4.8** | 39 | 38 | **1.03×** | ✅ parity |
| **Haiku 4.5** | 78 | 39 | 2.00× | ❌ skill needed |
| **Sonnet 4.6** | 99 | 42 | 2.36× | ❌ skill needed |

**The cliff is between frontier and sub-frontier — not a smooth gradient.**
On Opus the paragraph and the skill produce byte-similar output. On
Haiku and Sonnet the skill cuts code roughly in half. The 95 lines
aren't filler; they're rule redundancy that catches what sub-frontier
models ignore when stated once.

Cost still favors the paragraph (−41% across all 3 models), and that
claim is structural, not behavior-tuned.

## The one-paragraph prompt

```
Build only what is literally asked, the smallest code that runs. Use
what already exists — stdlib, native platform features, installed
dependencies — before writing new code or extracting abstractions. One
fenced code block. No prose, no usage example, no docstring.
```

~60 tokens. Captures ponytail's load-bearing rules:

- *"Build only what is asked"* → YAGNI
- *"smallest code that runs"* → "shortest working diff wins"
- *"stdlib, native platform features, installed dependencies"* → the
  ladder (rungs 2/3/4 of ponytail's 6-rung pre-code checklist)
- *"before writing new code or extracting abstractions"* → "no
  unrequested abstractions"
- *output discipline* → "code first, no essays"

What it deliberately does NOT contain: any reference to FastAPI, React,
debounce, slowapi, HTML, `__main__`, or any of the 5 benchmark tasks.
See `benchmarks/arms/oneline.js`.

## Method

Identical to the existing benchmark, with two changes:

1. A fourth arm (`oneline`) added to `promptfooconfig.yaml`.
2. Prompt caching enabled on every skill arm (system content wrapped in
   `cache_control: { type: "ephemeral" }`). Without caching the cost
   gap is even larger; with caching it reflects production reality
   inside Claude Code, Codex, OpenCode, etc.

n=1 per cell, default temperature, single-shot completions.

## Per-task LOC (per model)

| task | Haiku 1L | Haiku Pony | Sonnet 1L | Sonnet Pony | Opus 1L | Opus Pony |
|---|---:|---:|---:|---:|---:|---:|
| email | 5 | 3 | 4 | 10 | 3 | 4 |
| debounce | 13 | 11 | **28** | 7 | 5 | 5 |
| csv-sum | 7 | 3 | 7 | 3 | 3 | 4 |
| countdown | **27** | 12 | **37** | 10 | 13 | 10 |
| rate-limit | **26** | 10 | **23** | 12 | 15 | 15 |
| **sum** | **78** | **39** | **99** | **42** | **39** | **38** |

The pattern is consistent: where the paragraph fails, it fails the same
way an ungated model does — extracting a generic helper function
(debounce on Sonnet), building a full app instead of a component
(countdown on Sonnet/Haiku), or hand-rolling middleware instead of
using a library decorator (rate-limit on Sonnet/Haiku). Ponytail's 95
lines name-check each of these patterns multiple times in different
framings; the paragraph names them once.

On Opus, even one mention of each rule sticks.

## Per-arm totals (all 3 models, 15 cells each)

| arm | median LOC | sum LOC | total cost |
|---|---:|---:|---:|
| baseline (no skill) | 76 | 1,765 | $0.344 |
| caveman | 16 | 305 | $0.112 |
| **one-paragraph** | 13 | 216 | **$0.039** |
| **ponytail** | **10** | **119** | $0.067 |

Cost win for the paragraph (−41%) is purely structural: the system
prompt is ~60 tokens vs ~1,400, and even with caching that's a 23×
input-token gap that compounds across calls.

## What it means

Three claims the data actually supports:

1. **The substantive content of the skill is one paragraph.** Strip out
   the rules into 60 tokens, run on Opus, and the output is
   indistinguishable. The 95 lines aren't carrying novel rules.
2. **The skill's value is rule redundancy, not novel content.** Ponytail
   wins on Sonnet and Haiku by saying the same constraint 3 different
   ways across 95 lines. That redundancy is what catches a model that
   ignores rule #1's first phrasing.
3. **The skill's worth scales with the inverse of model capability — but
   discontinuously.** The cliff is between Opus and everyone else, not
   a smooth gradient. Opus gets it in 60 tokens. Haiku and Sonnet need
   the full 1,400. The skill is "production-tier insurance."

## The iteration that didn't generalize

Before the held-out test above, an earlier iteration tuned the
paragraph against the same 5-task benchmark over four passes, fixing
each LOC failure with a targeted rule:

| iteration | sum LOC (3 models) | added rule |
|---|---:|---|
| v1 | 324 | "shortest working solution, stdlib first" |
| v2 | 430 | "exactly one fenced block, no second block" |
| v3 | 166 | "no unrequested features (buttons, inputs, controls...)" |
| v4 | 183 | "no helpers, no wrappers" — backfired (models avoided slowapi) |
| v5 | 153 | "use library directly (e.g. `@limiter.limit`)" |
| **v6 (held-out)** | **216** | none of the above; benchmark-agnostic gist only |

v5 produced a tantalizing result: −47% cost, −82% tokens, sum LOC
within 28% of ponytail. But the rules tell on themselves —
`@limiter.limit("10/minute")` is the exact answer to the rate-limit
task, and `"no HTML scaffolding"` was patched in after seeing Haiku
wrap the debounce task in `<!DOCTYPE html>`. Classic train-on-test.

The held-out test (v6 generic) is what that v5 number actually
predicts about untuned tasks. On Opus the prediction holds. On Sonnet
and Haiku, the gap re-opens to ~2× — which is what overfitting always
looks like once you remove the test-set hints.

## Reproduce

```bash
git clone https://github.com/cy6erninja/ponytail.git
cd ponytail && git checkout oneliner
cp .env.example .env   # add ANTHROPIC_API_KEY
cd benchmarks
npx promptfoo@latest eval -c promptfooconfig.yaml
npx promptfoo@latest view
```

Current `arms/oneline.js` is v6 (generic, held-out). Earlier overfit
versions are documented in this file and recoverable from git history.
