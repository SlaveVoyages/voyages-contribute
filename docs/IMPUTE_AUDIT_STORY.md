# How a two-line label fix turned into a ten-year-old defect

A narrative record of the audit behind PR #5, written because the findings arrived
in a chain where each one only became visible after the previous was fixed. The
reference material is in `IMPORT_COVERAGE_AUDIT.md` and
`scripts/impute-transpiler/README.md`; this is the story of how we got there.

## The task

Port `imputed.py` — the editorial tool that computes imputed variables for a
voyage — from the legacy Django app into this codebase. It is 1,712 lines of
Python transliterated from an SPSS script, and it was to be adapted to the new
contribution model, where an editor's impute run becomes a stacked review by an
"Impute bot" rather than an in-place mutation.

Before writing any of it, we needed to know what the script reads and where those
values land here. That question is what started everything else.

## 1. Establishing ground truth surfaced two mis-routed columns

The impute calculation reads dates and lengths that arrive via CSV import, so we
traced them through `voyageMapping.ts`. Two were pointed at the wrong properties.

`targetField` in that file looks like a display label. It is not: `importer.ts`
resolves it by identity against the schema, and the matched property's
`backingField` is the database column written. A wrong string silently re-routes
data, and nothing type-checks it.

- `voyage` — the length of the Middle Passage — was writing to
  `imp_length_leaving_africa_to_disembark`, the *imputed* field that `voy2imp`
  already maps to. Two columns fought over one field, last write winning, and the
  raw `length_middle_passage_days` was never populated at all.
- `datedepam` — departure from the last place of landing, on the return voyage —
  was writing to `vessel_left_port_sparsedate_id`, which is departure from
  Africa. A different leg of the voyage entirely.

Both mattered directly: they are inputs the impute calculation reads.

## 2. The codebook contradicted the legacy importer

Fixing `datedepam` left `"Date that vessel left last slaving port"` with no
source, so we went looking for the column that should feed it. The legacy
importer reads `dlslatr`; the modern export has no such column.

The SPSS codebook settled it, and inverted the answer:

```
DATELEFTAFR   Date that vessel left last slaving port   Format: Date10
```

`dateleftafr` was already mapped — to `"Date vessel departed Africa"`. So the
column existed all along and was simply mis-targeted, which is why no new binding
was needed. The legacy importer maps that same column to `date_departed_africa`,
so **the codebook and the legacy importer disagree**, and the codebook is the one
describing the files we actually import.

The naming makes sense once explained: historically the last slaving port was
always in Africa, so the two names described one thing. The newer phrasing
generalises to databases where captives embarked elsewhere.

That was the third mis-routed column, and the one that actually feeds `dlslatrc`
— a primary input to `yearaf` and `voy2imp`.

## 3. Sixty variables were being dropped in silence

Three mistakes in one small area suggested the file had never been checked
systematically. So we checked it mechanically: every variable in
`SPSS_Codebook_2024-12-17` against every header `voyageMapping` consumes, with
both sides parsed rather than read.

**Sixty codebook variables were neither mapped nor declared ignored.**

The reason they were invisible is worth recording. `importer.ts` exports
`debugCheckHeaders(mapping)` — which enumerates every header the mapping consumes,
exactly the tool for spotting an unrecognised column — and **it has no callers**.
Nothing compares a CSV's header row against the mapping, so an unmapped column is
discarded with no error, no warning, and no entry in the import report.

Seventeen had properties already waiting in `entities.ts`:

- **Nine crew columns.** Only `crew1`, `crew2`, `crew3` and `crewdied` were bound,
  so every crew-mortality-by-stage figure — died before first trade, on the
  African coast, in the Middle Passage, in the Americas, on the return — was
  being thrown away on every import.
- Three ship, two itinerary.
- Owners `f` through `p`: the codebook defines sixteen, five were bound.
- Sources `n` through `r`: the codebook defines eighteen, thirteen were bound.

The asymmetry has a simple cause. `entities.ts` was modelled from the full Django
model; `voyageMapping.ts` was written by hand against a one-off CSV that
legitimately omitted columns unused in that dataset. The drift was one-sided, and
every gap had a home waiting for it.

## 4. A lesson about what "absent from the codebook" means

`infant2` was mapped here but absent from the codebook, so we dropped it. That was
wrong, and the correction is the most transferable thing in this document.

Absence from the codebook is evidence about the **documentation**, not the data.
It is strong evidence for what a variable is *called* and what it *means*, and
weak evidence that a column does not exist. Three signals said otherwise: the
Django field is labelled `"Number of infants (INFANT2) died on Middle Passage"`,
the legacy importer reads `row.cint('infant2')`, and the codebook documents the
other eight categories of that row.

The failure modes are asymmetric. An absent column makes a binding inert and costs
nothing; a missing binding discards data silently. When the two sources disagree,
keep the binding.

The same investigation turned up an extraction trap worth knowing: `FATE2` and
`FATE3` are written closed up, but **`FATE 4` carries a space**. A strict pattern
attributes its definition to `FATE` — a real, mapped variable — so it vanishes as
a silent mis-attribution rather than surfacing as a miss. Any rerun needs a
space-tolerant pattern.

Coverage went from sixty unaccounted variables to zero.

## 5. The port itself: transpile, do not translate

Only then did we start the port. The shape of the source decided the method.

The calculation is a straight-line cascade of 1,167 unguarded assignments over 186
variables. `slaximp` alone is assigned **312 times**. There is no `elif`, no early
exit: the last matching condition wins, so statement order *is* the semantics.
Nobody can hold that in their head, and any tidying-up silently changes results
wherever two conditions overlap.

So we wrote a transpiler instead — an AST walker with one named emitter per node
type that **aborts on anything it does not recognise**. That makes the transform
total over its input by construction: no silent mistranslation, only success or a
hard failure naming the line. Nineteen node types cover the whole function, and
every emitted statement carries a `py:NNN` comment pointing back at its source.

Regex was considered and rejected. The statement layer is easy — thirteen shapes —
but the file contains 2,366 `not`s and 958 `and`/`or`s, and wrapping their
operands correctly requires knowing where each operand begins and ends, which
means balanced-paren matching plus Python's precedence. With 3,300 operands,
"mostly right" is not a safety property.

## 6. The harness, and what it found

The published datasets were sitting in a sibling repo: 36,108 trans-Atlantic
voyages and 11,521 Intra-American, carrying both the raw inputs *and* the shipped
imputed outputs. Both implementations were run over identical inputs and diffed.

The first run was green on trans-Atlantic data — 6,029,702 values, zero
differences — and reported something odd on Intra-American: the original crashed
on 676 rows where the port did not.

`imputed.py:498`:

```python
if ncar13 == ncar15 and regem1 == regem2: mjbyptimp = regem1 + 99
```

When a voyage has no embarkation places, `regem1` and `regem2` are both `None`,
`None == None` is `True`, and it evaluates `None + 99`. **5.8% of Intra-American
voyages raise `TypeError`.** The port did not crash, which was worse: JavaScript
coerces `null + 99` to `99` and writes a nonsense place code.

Sixty lines earlier, the four analogous statements all read
`if regem1 and regem1 == regem2 ...`. The SPSS source explained why:

```spss
if (regem1 = regem2 & missing(regem3)) mjbyptimp=regem1+99.
```

**SPSS has no guard either** — it does not need one. Any comparison involving a
missing value is itself false, so the statement never runs. The `regem1 and`
prefix in the Python is an *emulation* of that, applied at some sites and not
others. Line 498 was not missing a feature; it was missing an emulation.

The same defect appears with the opposite sign at `imputed.py:486`, where
`None != 2` is `True` in Python but false in SPSS, so the statement fires where
the original would skip it — overwriting a known port with the `60999`
"unspecified" sentinel.

## 7. Fixing the class, not the sites

We tried static detection first. A naive scan found ~300 candidate sites; teaching
it about `safe_ge`/`safe_gt` and zero-default reads cut that to 25; inspecting
those, all but one were still false positives, each needing a different piece of
analysis — enclosing-scope tracking, another syntactic form of null test,
transitive non-nullness, and finally dataflow through assignments. Wrongly
"guarding" a site that was never broken changes results exactly as silently as the
bug does.

So the fix went in at the level the specification actually describes: comparisons
are emitted with SPSS missing-value semantics. One rule, no site list, no
dataflow.

The evidence that this is right, rather than merely different:

- **Trans-Atlantic data: unchanged.** 6,029,702 values, still identical. That is
  the corpus the SPSS script was written for, so an exact match there is the
  fidelity result.
- **Intra-American data: 10,576 rows change `mjbyptimp`, and all 10,576 move from
  disagreeing with the published dataset to matching it exactly.** Not one row
  supports the Python behaviour.
- **Every divergence is that deviation and nothing else.** Flipping the emitter
  back to Python equality collapses all 749 fuzz divergences to zero across
  5,659,137 values.

`imputed.py` has therefore been producing wrong `mjbyptimp` for ~92% of
Intra-American voyages, disagreeing with the dataset it was meant to produce.

## 8. Provenance

`git blame` puts line 498 in commit `f3ce14df` (2021-12-31), *"Restoring imputed
script from previous production version and applying minimal set of py3 related
changes"*, with the surrounding comment attributing the routine to Greg.

But the equality mismatch is older. Python 2 and 3 agree on `==` and `!=`; they
differ on **ordering**, which is precisely what the `safe_ge`/`safe_lt` helpers
exist to emulate — the file says so: `# Emulate the Python 2 behavior (anything
>= None)`. Ordering was wrapped; equality never was. The defect dates to the
original conversion in **May 2016**.

Ten years, invisible to review, because `regem1 != regem2` reads perfectly well
in Python. It took the SPSS source to know what it was supposed to mean and the
published dataset to prove which reading shipped.

## What generalises

- **A mechanical transform preserves defects; a translation hides them.** Any
  competent engineer rewriting line 498 by hand would have "tidied" it into the
  guarded form of its four neighbours and never known they had changed behaviour
  for 671 voyages.
- **Fidelity to the source is not the goal — fidelity to the specification is.**
  The Python is a lossy transliteration of SPSS. Reproducing its bugs bug-for-bug
  would have enshrined a translation artifact.
- **Two oracles beat one.** Python-vs-TypeScript proves the transform is faithful
  but is blind to adaptation errors, since both sides read the same input. The
  published dataset caught what the first oracle structurally could not.
- **Tools that check nothing are worse than absent ones.** `debugCheckHeaders`
  existed, did exactly the right thing, and had no callers.
- **A guard that cannot fail is not a guard.** The mapping test was
  fault-injected before being trusted.

## Open threads

- Confirm the `mjbyptimp` intent with Greg, who specified the I-Am routine.
- Report both defects upstream to IQSS, along with the `INFANT2` codebook omission
  and the `FATE 4` spacing inconsistency.
- `voyageid2` needs a `LinkedVoyages` schema before it can be imported (issue #6).
- Wiring the calculation to contributions as an Impute-bot review (issue #7).
