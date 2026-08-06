# Porting `imputed.py` — plan

Port of `voyages/apps/contribute/imputed.py` (IQSS/voyages, 1712 lines, itself a
transliteration of an SPSS script) into this repo, adapted to the delta-based
contribution model.

## 1. What changes conceptually

| | Legacy | Here |
|---|---|---|
| Input | `InterimVoyage` row + `InterimSlaveNumber` rows keyed by SPSS var name | `MaterializedEntity` of `Voyage`, i.e. the snapshot of the current review stack |
| Output | `setattr` on the interim voyage; delete+reinsert imputed `InterimSlaveNumber` rows | an `EntityChange[]` authored by **Impute bot**, pushed as the next `Review` on the stack |
| Re-run | overwrites in place, previous values unrecoverable | new review stacked on top; every run is diffable and revertable |
| Override | editor edits the interim, indistinguishable from the imputed value | editor stacks a review *above* the bot's; the override is explicit |

Equivalence requirement: materializing `original ⊕ contribution ⊕ reviews… ⊕ imputeReview`
must equal what the legacy script would have written for the same inputs.

## 2. Module layout

The numeric core must be pure and I/O-free so it can be golden-tested against the
Python original and run either on the server or in the editor UI.

```
src/impute/
  spssRuntime.ts       # safeGe/safeLe/safeLt/safeGt, pyTruthy, pyRound, floorDiv,
                       # clearMod, regionValue, broadValue, threshold, recodeVar,
                       # firstValid, yearMod, allOrNothing
  types.ts             # ImputeInput (flat, SPSS-named) / ImputeOutput
  readVoyage.ts        # MaterializedEntity(Voyage) -> ImputeInput      [read-side mapping]
  compute.ts           # ImputeInput -> ImputeOutput                    [pure port]
  mortalityTable.ts    # GENERATED — 151 xmimpflag entries
  writeVoyage.ts       # ImputeOutput + snapshot -> EntityChange[]      [write-side mapping]
  registry.ts          # schema name -> EditorialComputation
  index.ts
src/backend/
  imputeRoutes.ts      # POST /contributions/:id/impute  (requireEditor)
scripts/
  extractMortalityTable.py   # one-shot generator, checked in
  generateGoldenVectors.py   # runs the real imputed.py against stubbed Django models
tests/
  imputeGoldenTests.ts
  imputeReviewTests.ts
```

`src/impute` is exported from the package (`src/models/index.ts` sibling) so the
editor UI can preview an impute run before committing it.

## 3. Generalization (the "only voyages" problem)

The contribute code is entity-agnostic; impute is not. Introduce a narrow
registry rather than special-casing `Voyage`:

```ts
export interface EditorialComputation {
  /** Stable id, also used as the bot author name suffix. */
  id: string
  schema: string
  /** Human label shown in the editor UI. */
  label: string
  /** Pure: snapshot in, proposed property changes out. */
  compute: (snapshot: MaterializedEntity, ctx: ComputationContext) => Promise<EntityChange[]>
}
```

`ComputationContext` carries the `EntityLookUp` (code → `EntityRef`) and nothing
else. `registry.ts` holds `Record<string, EditorialComputation[]>` keyed by schema
name; the endpoint looks up by `contribution.root.schema` and 404s if absent. A
future "impute enslavers" or "normalize sources" bot registers the same way.

## 4. Read side — the impedance mismatch

Legacy reads scalars off `InterimVoyage`, FK codes via `obj.value`, and slave
numbers out of a `{var_name: number}` bag. Here everything is nested
`MaterializedEntity` keyed by property **label**, except table cells which are
keyed by **backing field**.

Two accessor hazards to centralize:

- Code labels are inconsistent across schemas: `Location`, `Nationality`,
  `RigOfVessel`, `TonType`, `VoyageGrouping` expose `"Code"`; `ParticularOutcome`,
  `SlavesOutcome`, `VesselOutcomeSchema`, `OwnerOutcome` expose `"Value"`. Use an
  explicit per-schema table, not `data.Code ?? data.Value` — a silent `undefined`
  here corrupts every downstream branch.
- Linked entities reached through a change set can be `state: "lazy"` with
  `data: {}`. Reading `.Code` off those yields `undefined`. Needs a
  `hydrateMaterialized(entity, resolver)` pass before `readVoyage` (also useful
  outside impute).

### 4.1 Scalar inputs

| SPSS | Legacy `InterimVoyage` field | Snapshot path |
|---|---|---|
| `datedepc` | `date_departure` | `Dates` → `Date of vessel's departure` (SparseDate) |
| `d1slatrc` | `date_slave_purchase_began` | `Dates` → `Date that embarkation began` |
| `dlslatrc` | `date_vessel_left_last_slaving_port` | `Dates` → `Date that vessel left last slaving port` |
| `datarr34` | `date_first_slave_disembarkation` | `Dates` → `Date of first disembarkation` |
| `ddepamc` | `date_return_departure` | `Dates` → `Date that ship left on return voyage` |
| `datarr45` | `date_voyage_completed` | `Dates` → `Date when voyage completed` |
| (voy2imp fallback) | `length_of_middle_passage` | `Dates` → `Length of transoceanic voyage in days` |
| `natinimp` src | `national_carrier` | `Ship` → `National carrier` → `Code` |
| `tonnage` | `tonnage_of_vessel` | `Ship` → `Tonnage of vessel` |
| `tontype` | `ton_type` | `Ship` → `Definition of ton` → `Code` |
| `rig` | `rig_of_vessel` | `Ship` → `Rig of vessel` → `Code` |
| `_outcome_value` | `voyage_outcome` | `Outcome` → `Outcome of voyage` → `Value` |
| `embport` / `embport2` | `first/second_port_intended_embarkation` | `Itinerary` → `First/Second port of intended embarkation` → `Code` |
| `arrport` / `arrport2` | `first/second_port_intended_disembarkation` | `Itinerary` → `First/Second port of intended disembarkation` → `Code` |
| `plac1tra`/`plac2tra`/`plac3tra` | `first/second/third_place_of_slave_purchase` | `Itinerary` → `First/Second/Third port of embarkation` → `Code` |
| `sla1port`/`adpsale1`/`adpsale2` | `first/second/third_place_of_landing` | `Itinerary` → `First/Second/Third port of disembarkation` → `Code` |
| `majbuypt` | `principal_place_of_slave_purchase` | `Itinerary` → `Principal port of embarkation` → `Code` |
| `majselpt` | `principal_place_of_slave_disembarkation` | `Itinerary` → `Principal port of disembarkation` → `Code` |
| `portdep` | `port_of_departure` | `Itinerary` → `Port of vessel's departure` → `Code` |
| `portret` | `port_voyage_ended` | `Itinerary` → `Port at which voyage ended` → `Code` |
| — (line 486) | `imputed_outcome_of_voyage_for_slaves` | `Outcome` → `Enslaved outcome` → `Value` |

Dates: legacy stores `"MM,DD,YYYY"` strings and `extract_year` / `extract_datetime`
parse them, rejecting the string if any component is empty. Here the equivalent is
a `VoyageSparseDate` with nullable `Year`/`Month`/`Day`. Port the *semantics*:
`extractYear` = `Year ?? null`; `extractDatetime` = `null` unless all three are
present. `date_diff` becomes an exact day difference on a UTC date built from the
three components (no timezone, no DST).

### 4.2 Slave numbers

`InterimSlaveNumber.var_name` (e.g. `MEN1`, `NCAR13`) decomposes as
`<category><positionDigit>`:

| digit | table row / field |
|---|---|
| 1 | `..._embark_first_port_purchase` |
| 2 | `..._died_middle_passage` |
| 3 | `..._disembark_first_landing` |
| 4 | `..._embark_second_port_purchase` |
| 5 | `..._embark_third_port_purchase` |
| 6 | `..._disembark_second_landing` |

Categories map to the `slaveNumberPrefixes` array: `MEN→num_men`, `WOMEN→num_women`,
`BOY→num_boy`, `GIRL→num_girl`, **`MALE→num_males`**, **`FEMALE→num_females`**,
`ADULT→num_adult`, `CHILD→num_child`, `INFANT→num_infant` (note the two plurals).

Non-table numbers:

| SPSS | `VoyageSlaveNumbers` property |
|---|---|
| `NCAR13/15/17` | `Captives carried from first/second/third port of embarkation` |
| `TSLAVESP` | `Total captives embarked` |
| `TSLAVESD` | `Total captives on board at departure from last slaving port` |
| `SLAARRIV` | `Total captives arrived at first port of disembarkation` |
| `SLAS32/36/39` | `Captives landed at first/second/third port of disembarkation` |
| `SLADVOY` | `Deaths in the transoceanic voyage` |

`ncartot` and `slastot` are derived, not stored (consistent with the `ignored`
block in `voyageMapping.ts`).

**Default asymmetry, load-bearing:** legacy uses `_numbers.get('MEN1', 0)` (missing
⇒ 0) but `_numbers.get('TSLAVESD')` (missing ⇒ `None`). The two behave differently
in every `not x` test downstream. `readVoyage` must reproduce the per-variable
default exactly; a single "null means 0" shortcut silently changes results.

`INFANT5` / `INFANT6` exist as table cells but are never read by the script
(`chil1imp` omits `infant5`, `chil3imp` omits `infant6`). Reproduce verbatim.

## 5. Write side — where the imputed variables land

### 5.1 Mapped (impute bot writes these)

| SPSS | Owner | Property |
|---|---|---|
| `xmimpflag` | Voyage | `Voyage grouping` → `VoyageGrouping` by `Code` |
| `natinimp` | Ship | `Nationality` → `Nationality` by `Code` |
| `tonmod` | Ship | `Tonnage standardized on British measured tons, 1773-1870` |
| `fate2` | Outcome | `Enslaved outcome` → `SlavesOutcome` by `Value` |
| `fate3` | Outcome | `Vessel outcome` → `VesselOutcomeSchema` by `Value` |
| `fate4` | Outcome | `Owner outcome` → `OwnerOutcome` by `Value` |
| `ptdepimp` | Itinerary | `Imputed port where voyage began` → `Location` by `Code` |
| `mjbyptimp` | Itinerary | `Imputed principal place of slave purchase` → `Location` by `Code` |
| `mjslptimp` | Itinerary | `Imputed principal port of slave disembarkation` → `Location` by `Code` |
| `yeardep` | Dates | `Year voyage began` (SparseDate, `Year` only) |
| `yearaf` | Dates | `Year departed Africa` (SparseDate, `Year` only) |
| `yearam` | Dates | `Year of arrival at port of disembarkation` (SparseDate, `Year` only) |
| `voy1imp` | Dates | `Voyage length from home port to disembarkation (days)` |
| `voy2imp` | Dates | `Voyage length from last slave embarkation to first disembarkation (days)` |
| `slaximp` | Slave numbers | `Total captives embarked (imputed)` |
| `slamimp` | Slave numbers | `Total captives disembarked (imputed)` |
| `tslmtimp` | Slave numbers | `Imputed number of captives embarked for mortality calculation` |
| `vymrtimp` | Slave numbers | `Imputed number of captive deaths during Middle Passage` |
| `vymrtrat` | Slave numbers | `Imputed mortality ratio` |
| `slavema1`/`slavemx1`/`slavmax1` | Slave numbers | `Total captives embarked with age / gender / age and gender identified` |
| `slavema3`/`slavemx3`/`slavmax3` | Slave numbers | `Total captives landed with age / gender identified`, `…by age and gender among landed` |
| `slavema7`/`slavemx7`/`slavmax7` | Slave numbers | `Total captives identified by age / gender / age and gender at departure or arrival` |
| `menrat1`,`womrat1`,`boyrat1`,`girlrat1`,`chilrat1`,`malrat1` | Slave numbers | `Percentage of men/women/boys/girls among embarked captives`, `Child ratio…`, `Male ratio among embarked captives` |
| `menrat3`,`womrat3`,`boyrat3`,`girlrat3`,`chilrat3`,`malrat3` | Slave numbers | same family, `…landed captives` |
| `menrat7`,`womrat7`,`boyrat7`,`girlrat7`,`chilrat7`,`malrat7` | Slave numbers | `Percentage men/women/boy/girl on voyage`, `Percentage children on voyage`, `Percentage male on voyage` |
| `adlt1imp`,`chil1imp`,`male1imp`,`feml1imp` | Slave numbers table | `imp_num_adult_embarked`, `imp_num_children_embarked`, `imp_num_male_embarked`, `imp_num_female_embarked` |
| `adlt2imp`,`chil2imp`,`male2imp`,`feml2imp` | Slave numbers table | `imp_adult_death_middle_passage`, `imp_child_death_middle_passage`, `imp_male_death_middle_passage`, `imp_female_death_middle_passage` |
| `adlt3imp`,`chil3imp`,`male3imp`,`feml3imp` | Slave numbers table | `imp_num_adult_landed`, `imp_num_child_landed`, `imp_num_male_landed`, `imp_num_female_landed` |
| `men7`,`women7`,`boy7`,`girl7`,`adult7`,`child7`,`male7`,`female7` | Slave numbers table | `imp_num_men_total`, `imp_num_women_total`, `imp_num_boy_total`, `imp_num_girl_total`, `imp_num_adult_total`, `imp_num_child_total`, `imp_num_males_total`, `imp_num_females_total` |

All 51 `slave_number_var_names` and all mapped `imputed_vars_model_map` entries are
accounted for. The table-cell names above were verified against
`VoyageSlaveNumbersSchema.cellField` — including its three hard-coded exceptions
(`imp_num_children_embarked`, `imp_num_males_total`, `imp_num_females_total`).

### 5.2 Computed but with no home in `entities.ts`

- **Regions**: `deptregimp`, `regem1/2/3`, `regdis1/2/3`, plus intermediates
  `majbyimp`, `mjselimp`, `deptregimp1`, `majbyimp1`, `mjselimp1`, `retrnreg1`.
  Deliberate — regions are derived arithmetically from a `Location.Code`
  (`code - code % 100`) and `voyageMapping.ts` already lists them as `ignored`
  ("the region is inferred from the place").
- **Year buckets**: `year5`, `year10`, `year25`, `year100` — `ignored` as
  "trivially obtained from the year".

Keep them as `ImputeOutput` intermediates (they feed `xmimpflag`) and expose them
in the endpoint response as diagnostics, mirroring the legacy third return value
`local_vars`, which the legacy view returns to the client as `imputed_vars`.
Do not write them.

### 5.3 Schema fields the bot must *not* touch

- `Sterling cash price in Jamaica (imputed)` (`imp_jamaican_cash_price`) —
  commented out in `imputed_vars_model_map` as "manually imputed".
- `Percentage adult on voyage`, `Percentage female on voyage` — no `adultrat7` /
  `femalerat7` exists in the script.

### 5.4 Change-set construction

One `EntityUpdate` on the voyage ref, containing `OwnedEntityChange`s for `Ship`,
`Outcome`, `Itinerary`, `Dates`, `Slave numbers`, a `LinkedEntitySelectionChange`
for `Voyage grouping`, and two `TableChange`s for the slave-numbers tables.

Points needing care:

- The imputed sparse-date props are `linkedEntity` with `mode: Own`. The correct
  change is `kind: "linked"` with `changed` = the `VoyageSparseDate` entity and
  `linkedChanges: [Direct(Year)]` — reuse the existing ref if the voyage already
  has one, otherwise a fresh `type: "new"` ref. (Note: `materializationTests.ts`
  builds one of these as `kind: "owned"`; `applyUpdate` tolerates that but
  `combineChanges`/`validateAndGetProperty` would reject it. Use `"linked"`.)
- Owned entities may be absent on an existing voyage — `Outcome` is not
  `notNull`, so `entityOwnedFetch` yields `null`. The writer must materialize a
  new one and emit the change against it.
- **Zero ⇒ null.** Legacy's last step is
  `float(v) if v else None` over every imputed number, so a computed `0` is stored
  as NULL. Reproduce, or the imputed table fills with zeros the legacy never wrote.

## 6. Fidelity hazards in the port itself

1. **Python-2 comparison emulation.** `safe_ge(a,b)`: `None` sorts below
   everything; `safe_ge(None, None) === true`. All four helpers derive from it.
   Mechanical but pervasive — get it wrong once and hundreds of branches shift.
2. **Truthiness.** `if tonnage:` / `not slaarriv` are false for both `0` and
   `None`. A TS `!= null` check is not equivalent. One `pyTruthy` helper, used
   everywhere the Python used bare truthiness.
3. **`round()` is banker's rounding.** `round(0.5) === 0`, `round(2.5) === 2`.
   Applied to `slaximp`/`slamimp`. `Math.round` is wrong here.
4. **`//` is floor division**, not truncation — matters in `year_mod` for years
   before the 1500 epoch and in `year100`.
5. **Statement order is semantics.** The script is a straight-line cascade of
   unguarded `if` assignments; later lines overwrite earlier ones. Port
   statement-by-statement. Do not "simplify" into `else if` chains.
6. **`fate2` is read twice with different meanings.** Line 486 (`mjbyptimp`) reads
   the *persisted* `imputed_outcome_of_voyage_for_slaves` — i.e. the previous
   run's value from the snapshot — while line 579 (`mjslptimp`) uses the value
   computed in this run. Both readings must be preserved; they are not the same
   variable.
7. **`all_or_nothing`** runs against a snapshot of `locals()` *after* all
   computation, so it only affects the diagnostics dict — except `_no_zeros`
   (`pctdis`, `adlt2imp`, `chil2imp`, `male2imp`, `feml2imp`), which does reach the
   output. Do not apply the recodes to the written values.
8. **The 151-entry `xmimpflag` mortality table** (lines 779–1382): every flag has
   exactly 4 statements, but in **two orderings** that are *not* equivalent —
   137 flags do `slamimp = default; slaximp = default/(1-rate)`, 14 flags
   (104, 4, 5, 7, 27, 28, 52, 58, 68, 83, 88, 138, 142, 147) do
   `slaximp = default; slamimp = default - default*rate`. Two further anomalies:
   flag 68 hard-codes `84` in place of the default constant, flag 96 has
   `rate = 0`. **Generate this table mechanically** (`scripts/extractMortalityTable.py`)
   into `mortalityTable.ts` with an explicit `order` discriminator; do not
   hand-transcribe 600 lines.

## 7. Method and verification

Superseded. The port is a mechanical AST transform, not a hand
translation: see `scripts/impute-transpiler/README.md` for the method and
the reproduction procedure, and `IMPUTE_AUDIT_STORY.md` for how it was
validated. Sections 1-6 above still describe the variable mapping and the
contribution-model design, which are unchanged.

## 8. Sequencing

Steps 1-4 are done and shipped in PR #5. The remainder -- the adapter,
the change-set writer, snapshot materialisation, the registry and the
endpoint -- is tracked in issue #7.

## 9. Decisions needed before step 6

1. **Re-running impute over an editor override.** An editor stacks a review above
   the bot changing an imputed value; impute is re-run. Options: (a) bot re-asserts
   its value, silently reverting the override; (b) bot skips any property touched
   by a later human review; (c) bot emits those as conflicts for the editor to
   resolve. Recommend (b) with (c)'s reporting — never clobber a human, but say
   what was skipped.
2. **Delta vs absolute.** Recommend the bot's review contain only properties whose
   imputed value *differs* from the current snapshot, so a no-op re-run yields an
   empty change set (rejected with "nothing to impute") instead of a noise review.
3. **`is_iam` source.** Legacy takes it from a POST flag. Recommend deriving from
   `Voyage.Dataset === 1` (`VoyageDataset.IntraAmerican`), with an explicit
   request override retained for editors.
4. **Orphaned sparse dates.** When an imputed year goes from a value to `null`,
   the FK is cleared. Emit an `EntityDelete` for the now-unreferenced
   `VoyageSparseDate`, or leave the row? (`dropOrphans` only handles `new` refs.)
5. **Where impute executes.** Recommend: pure core shipped in the package so the
   UI can preview; the authoritative run is server-side behind `requireEditor`.
6. **Bot identity.** `ChangeSet.author` is a free string today, set from the JWT.
   Needs a reserved value (e.g. `"Impute bot"`) plus a `Review` marker so the UI
   can style it and rule 1 can identify bot reviews. Adding a nullable
   `kind`/`generatedBy` column to `ReviewEntity` is cleaner than sniffing the
   author string — confirm the migration is acceptable.

## 10. Adjacent findings (not in scope, flagging)

- `voyageMapping.ts` maps CSV `datedepam` → `"Date that vessel left last slaving
  port"`. Per the legacy model, `DDEPAM` is `departure_last_place_of_landing`
  ("Date that ship left on return voyage"), and `vessel_left_port` (`DLSLATR`) has
  no CSV binding at all. Two of the six date sources the impute script reads are
  therefore mis-fed on CSV-imported voyages.
- `voyageMapping.ts` maps both `voyage` and `voy2imp` to `"Voyage length from last
  slave embarkation to first disembarkation (days)"`. `voyage` is
  `length_middle_passage_days` → `"Length of transoceanic voyage in days"`. As
  written, the raw value overwrites (or is overwritten by) the imputed one, and
  `voy2imp`'s own fallback input is never populated.
