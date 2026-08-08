# CSV import coverage audit — `voyageMapping.ts`

Audit of `src/tools/voyageMapping.ts` for columns dropped or mis-routed on import.
**Status: resolved** — findings fixed in `fix/voyage-mapping-date-targets`.

## Sources of truth, in priority order

1. **`SPSS_Codebook_2024-12-17.pdf`** — describes the CSVs we actually import, and
   is the file `voyageMapping.ts` already cites in an `ignored` reason. Authoritative.
2. [`importcsv.py`](https://github.com/IQSS/voyages/blob/main/voyages/apps/voyage/management/commands/importcsv.py)
   — the legacy Django importer. Authoritative for *semantics* (which model field a
   variable belongs to), but its column names are the older per-component ones.
3. `voyage/models.py` — legacy field definitions and their codebook tags.

Where 1 and 2 disagree, the codebook wins: it is current, and the legacy importer
predates the renames.

## Method

Both sides parsed programmatically, not read by eye:

- 270 variables extracted from the codebook PDF (`pypdf`, sequential text).
- 227 column references extracted from `importcsv.py` by AST walk, collecting
  `<model>.<field> = row.<accessor>('<column>')`.
- Every `targetField` in `voyageMapping` resolved through the real schemas to a
  `backingField`, by walking the exported object.

Result before the fix: **60 codebook variables neither mapped nor declared
ignored.** After: **0.**

## Why these were invisible

`importer.ts` exports `debugCheckHeaders(mapping)`, which enumerates every header
the mapping consumes — exactly the tool for detecting an unrecognized column.
**It has no callers.** Nothing compares a CSV's header row against the mapping, so
an unmapped column is discarded with no error, no warning, no report entry. The
`kind: "ignored"` entries are documentation only: `reason` is never surfaced, and
`importer.ts:483` returns `[]`, the same outcome as not mentioning the column.

> **Open recommendation.** Wire `debugCheckHeaders` into the bulk-import *inspect*
> endpoint and report `csvHeaders − mappingHeaders` as warnings. That turns this
> whole bug class from invisible into a one-line diagnostic, and would have
> surfaced everything below without an audit.

## Fixed — mis-routed columns

`targetField` is a lookup key, not a label: `importer.ts:196` resolves it with
`properties.find(p => p.label === fieldLabel)`, and that property's `backingField`
is the column written. So a wrong string silently re-routes data.

| column | wrote before | writes now |
|---|---|---|
| `voyage` | `imp_length_leaving_africa_to_disembark` | `length_middle_passage_days` |
| `datedepam` | `vessel_left_port_sparsedate_id` | `departure_last_place_of_landing_sparsedate_id` |
| `dateleftafr` | `date_departed_africa_sparsedate_id` | `vessel_left_port_sparsedate_id` |

Codebook evidence:

- `VOYAGE` — "Length of voyage from last port of embarkation to first port of
  disembarkation in days (formerly, length of Middle Passage in days)". It had been
  pointed at the *imputed* `VOY2IMP` field, so the two columns fought over one
  field (last write wins) and the raw value was never stored.
- `DATEDEPAM` — "Date ship left on return voyage".
- `DATELEFTAFR` — "Date that vessel left last slaving port". Historically the last
  slaving port was always in Africa, hence the old name; the newer phrasing
  generalises to databases where captives embarked elsewhere. This column feeds
  `dlslatrc`, a primary input to the impute script's `yearaf` and `voy2imp`.

All three date fixes together give the eight `Date10` composites a 1:1 mapping onto
eight distinct sparse-date properties.

## Fixed — silently dropped columns

All had target properties already present in `entities.ts`.

| area | columns | note |
|---|---|---|
| Crew | `crew4`, `crew5`, `crew`, `saild1`–`saild5`, `ndesert` | only `crew1/2/3` + `crewdied` were bound, so every crew-mortality-by-stage figure was discarded |
| Ship | `yrcons`, `yrreg`, `tonmod` | |
| Itinerary | `npafttra`, `npprior` | |
| Owners | `ownerf`–`ownerp` | codebook defines 16; only `a`–`e` were bound |
| Sources | `sourcen`–`sourcer` | codebook defines 18; only `a`–`m` were bound |

Owners and sources were added as further `bindings` entries, so they flow through
the existing `EnslaverInRelation` / `Voyage Source Connection` relations rather
than as flat columns.

## Now declared `ignored`, with reasons

- **Region columns** (`embreg`, `embreg2`, `regem3`, `regarr2`, `retrnreg`,
  `retrnreg1`, `deptregimp`, `deptregimp1`, joining those already listed) — regions
  are inferred from the place code (`code − code % 100`).
- **Per-component date columns** (`datedepa/b`, `d1slatra/b`, `dlslatra/b`,
  `datarr32/33/36/37/39/40/43/44`, `ddepam`, `ddepamb`, joining the year components
  already listed) — superseded by the `Date10` composites.
- **`evgreen`** — 1999 CD-ROM provenance flag, no entity field.
- **`voyageid2`** — see below.

## Remaining gaps — need a decision

### `voyageid2` — a real modelling gap

Not droppable. Django still models these pairs:

```python
class LinkedVoyages(models.Model):
    first  = FK('Voyage', related_name="outgoing_to_other_voyages")
    second = FK('Voyage', related_name="incoming_from_other_voyages")
    mode   = IntegerField()   # 0 UNSPECIFIED, 1 INTRA_AMERICAN_LINK_MODE
```

and `importcsv.py` builds them from a **delimited list** —
`re.split(',|;|/', rh.get('voyageid2'))` — with
`mode = INTRA_AMERICAN_LINK_MODE if intra_american else UNSPECIFIED`. Mapping it
needs a `LinkedVoyages` schema in `entities.ts`; marked `ignored` until then so the
omission is at least recorded.

### `npafttra` — verify against a real CSV

The codebook gives `Format: F3`, but Location codes are 5-digit. Both the Django
model (`port_of_call_before_atl_crossing = FK(Place)`) and the legacy importer
(`row.get_by_value(Place, 'npafttra')`) treat it as a place code, so it is mapped
as a `Location` lookup on `Code`.

Failure mode if the codebook format is right and the values are 3-digit: the lookup
misses, `importer.ts:331` pushes a visible `mkLookupError`, and the FK is set null
(it was null before). Visible and non-corrupting, but worth confirming.

## Not gaps

- `arrport3`, `arrport4`, `comments` — absent from the 2024-12-17 codebook. Legacy
  only; correctly omitted. (`comments` also has no property on `VoyageSchema`.)
- `captaind`+ — the codebook defines captains `a`–`c` only; current mapping correct.
- `date_departed_africa_sparsedate_id` — has no CSV source, and by the reasoning
  above is arguably a vestige of the `DATELEFTAFR` rename now that
  `vessel_left_port` carries that meaning. Flagged, not touched.
- `infant2` — mapped here, and **kept**, though the codebook does not document
  `INFANT2`. This is a codebook omission, not a missing column: the Django field is
  labelled *"Number of infants (INFANT2) died on Middle Passage"*, the legacy
  importer reads `row.cint('infant2')`, and the codebook documents the other eight
  categories of that row (`MEN2`, `WOMEN2`, `BOY2`, `GIRL2`, `ADULT2`, `CHILD2`,
  `MALE2`, `FEMALE2`). Reported upstream. (`imputed.py` never reads `infant2`, so
  the impute port is unaffected either way.)

  **Method note.** Absence from the codebook is evidence about the *documentation*,
  not about the data. It is strong evidence for what a variable is called and what
  it means, and weak evidence that a column does not exist — particularly against a
  Django field that names the variable outright. Where the two disagree, prefer the
  inert-but-present binding: an absent header returns `[]` early and costs nothing,
  whereas a missing binding discards data silently.

## Confidence in the extraction

The codebook is a PDF, so the variable inventory is only as good as the text
extraction. Two checks bound the error:

- **Every mapped header exists in the codebook** except `infant2` above — so the
  mapping contains no fictional columns.
- **No codebook variable is unaccounted for.** An exhaustive sweep of all-caps
  tokens adjacent to a `Format:` anchor (273 anchors) returns only `flag` and
  `yyyy`, both prose fragments.

One extraction trap is worth recording: variable names are not rendered uniformly.
`FATE2` and `FATE3` appear closed up, but **`FATE 4` carries a space**, so a strict
`FATE4` pattern silently attributes its definition to `FATE` — a real, mapped
variable — rather than reporting a miss. `FATE 4` ("Outcome of voyage for owner",
`F2`) is a legitimate codebook variable and is correctly mapped. Any future rerun
of this audit must use a space-tolerant pattern.

## Reproducing

Scripts live in the session scratchpad, not checked in: the codebook extractor, the
`importcsv.py` AST extractor, and the `voyageMapping` walker. Worth checking in as a
CI guard — the walker already validates that every `targetField` resolves, which is
a useful invariant on its own.
