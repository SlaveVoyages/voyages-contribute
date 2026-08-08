# Impute transpiler

Turns the imputed-variable calculation of `vendor/imputed.py` into TypeScript at
`src/impute/generated/impute.ts`.

Nothing here is bundled or type-checked by the build: `tsconfig.json` includes
only `src`, and the three Vite bundles are entry-point driven.

## Why a transpiler rather than a translation

The source is a straight-line cascade of 1,167 unguarded assignments over 186
variables, transliterated from SPSS. `slaximp` alone is assigned **312 times**;
`xmimpflag` 154. There is no `elif` and no early exit, so the last matching
condition wins and **statement order is the semantics**. Restructuring any of it
into something idiomatic silently changes results wherever two conditions
overlap, and no reviewer can hold 312 conditional overwrites in their head.

A mechanical transform has a property a translation cannot: it is total over its
input by construction. `transpile.py` walks the AST with one named emitter per
node type and *aborts* on anything unrecognised, so there is no silent
mistranslation — only success or a hard failure naming the line. Nineteen node
types cover the whole function.

Everything derivable is derived, so it cannot drift from the source: the input
surface, the 61 slave-number variables, the three read without a default, and
the tail's recode groups.

## Regenerating

```
python scripts/impute-transpiler/transpile.py
```

Never edit the generated file. Every statement carries a `py:NNN` comment giving
its line in `vendor/imputed.py`, so the two read side by side.

`vendor/imputed.py` is a byte-exact copy of upstream, pinned in `PINNED_SHA`
(currently `f3ce14df`, which has been `HEAD` for that file since 2021-12-31).
The generated header records both the commit and the file's sha256.

## Validating after a change

Run this whenever `vendor/imputed.py` is re-pinned or the emitter changes. It is
deliberately not part of `npm test`: it needs Python and takes minutes.

```
S=/tmp                       # any scratch directory

# 1. Real voyages, both datasets
python scripts/impute-transpiler/build_corpus.py \
    scripts/impute-transpiler/corpus/tastdb-exp-2019.zip $S/c_tast.json
python scripts/impute-transpiler/build_corpus.py \
    scripts/impute-transpiler/corpus/I-Am1.0.zip $S/c_iam.json --iam

# 2. Adversarial rows, for branches real data does not reach
python scripts/impute-transpiler/fuzz_corpus.py $S/c_fuzz.json --rows=20000

# 3. For each corpus: original, port, diff
python scripts/impute-transpiler/differential.py $S/c_tast.json $S/e_tast.json
npx vite-node scripts/impute-transpiler/run_ts.ts -- $S/c_tast.json $S/a_tast.json
python scripts/impute-transpiler/diff.py $S/e_tast.json $S/a_tast.json $S/c_tast.json
```

`differential.py` imports the vendored module against a minimal Django stub: the
calculation only reads `.value` off a model instance and only calls
`Model.objects.get(value=...)` when mapping results back to fields.

The third argument to `diff.py` adds a comparison against the values published in
the dataset. Treat that as a **statistic, not a gate** — an editor may have
overridden any published value, and where the port and the original agree it says
nothing about the port.

**The gate is Python ≡ TypeScript.** It must be exact, with the one documented
deviation below.

## Corpora

`corpus/` holds the published exports the port was validated against, zipped
(26.7 MB → 3.9 MB) since they are immutable. `SHA256SUMS` records the checksum of
the CSV inside each archive. `build_corpus.py` reads the archives directly.

Real data is not sufficient on its own: voyages cluster on a few paths, so rare
branches stay unexercised however many rows there are. `fuzz_corpus.py` targets
what the calculation branches on — missing values, zeros, ties between compared
counts, era and code boundaries — and is deterministic from its seed.

## The one deviation: SPSS missing-value semantics

Comparisons are emitted as `eq`/`ne`, where any comparison involving a missing
value is false. Everything else is a faithful rewrite.

SPSS relies on this and so needs no null guards. `imputed.py` emulates it by
prefixing a truthiness test — `if regem1 and regem1 == regem2:` — but only at
some sites. Where the prefix is missing, Python's own semantics take over:

- `None == None` is True, so a missing operand reaches the arithmetic.
  `imputed.py:498` raises `TypeError` on **5.8% of Intra-American voyages**.
- `None != 2` is True, so `imputed.py:486` fires where the original would not,
  overwriting a known port with the `60999` "unspecified" sentinel.

Emitting SPSS semantics fixes the class rather than patching sites. Static
detection of the affected sites was tried and abandoned: a naive scan reported
~300 candidates, of which all but one were false positives, and separating them
needed nullability dataflow through assignments. Wrongly "guarding" a site that
was never broken changes results just as silently as the bug.

The defect dates to the original conversion in 2016, not the 2021 Python 3 work.
Python 2 and 3 agree on `==`/`!=`; they differ on *ordering*, which is what the
`safe_ge`/`safe_lt` helpers already emulate. Equality was never wrapped.

## Results as of the pinned revision

| corpus | rows | values compared | Python ≡ TypeScript |
|---|---|---|---|
| `tastdb-exp-2019` | 36,108 | 6,029,702 | identical |
| `I-Am1.0` (`--iam`) | 11,521 | 1,258,020 | identical but `mjbyptimp` |
| fuzz, trans-Atlantic profile | 20,000 | 3,339,833 | 189 rows differ |
| fuzz, Intra-American profile | 20,000 | 2,319,304 | 560 rows differ |

Every difference is the deviation above, and nothing else. Demonstrated by
flipping the emitter to Python equality and re-running: all 749 fuzz divergences
collapse to **zero across 5,659,137 values**.

The trans-Atlantic corpus is the one the SPSS script was written for, so an exact
match there is the fidelity result. Intra-American data postdates the script and
its `is_iam` routine has no SPSS counterpart — yet on the 10,576 rows where the
semantics change `mjbyptimp`, **all 10,576 move from disagreeing with the
published dataset to matching it exactly**. Two independent corpora, one
conclusion.

Two trans-Atlantic rows fail on both sides with equivalent errors — voyage 24230
(day 99) and 42873 (month 13) — which is corrupt data in the published export,
rejected identically by both implementations.
