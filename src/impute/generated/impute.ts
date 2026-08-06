/*
 * GENERATED FILE - DO NOT EDIT.
 *
 * Produced by scripts/impute-transpiler/transpile.py from the imputed-
 * variable calculation of IQSS/voyages voyages/apps/contribute/imputed.py.
 *
 *   source commit : f3ce14df5216835bf011cc066729c4bdf581f6bf
 *   source sha256 : cde55c7aba812f391bf02243e0ffe3534a7bdbc09f517435f862f95b13a2f9f9
 *
 * Every statement carries a `py:NNN` comment giving its line in that
 * source, so the two can be read side by side. Regenerate rather than
 * editing; behaviour is pinned by tests/imputeGoldenTests.ts.
 */
/* eslint-disable */
import {
  PyNum,
  CodedValue,
  CsvDate,
  pyTruthy,
  safeGe,
  safeLe,
  safeLt,
  safeGt,
  floorDiv,
  pyRound,
  pyInt,
  pyRange,
  clearMod,
  regionValue,
  broadValue,
  recodeVar,
  threshold,
  yearMod,
  firstValid,
  getObjValue,
  extractYear,
  dateDiff,
  dictGet,
  eq,
  ne,
  listRemove
} from "../spssRuntime"

/**
 * Every slave-number variable the calculation reads, by codebook name.
 * Naming them keeps the real input surface visible: a mistyped key would
 * otherwise read as absent and silently change the result.
 */
export type SlaveNumberVar =
  | "NCAR13"
  | "NCAR15"
  | "NCAR17"
  | "TSLAVESD"
  | "TSLAVESP"
  | "SLAS32"
  | "SLAS36"
  | "SLAS39"
  | "SLAARRIV"
  | "SLADVOY"
  | "MEN1"
  | "MEN4"
  | "MEN5"
  | "WOMEN1"
  | "WOMEN4"
  | "WOMEN5"
  | "ADULT1"
  | "ADULT4"
  | "ADULT5"
  | "GIRL1"
  | "GIRL4"
  | "GIRL5"
  | "BOY1"
  | "BOY4"
  | "BOY5"
  | "CHILD1"
  | "CHILD4"
  | "CHILD5"
  | "INFANT1"
  | "INFANT4"
  | "MALE1"
  | "MALE4"
  | "MALE5"
  | "FEMALE1"
  | "FEMALE4"
  | "FEMALE5"
  | "MEN3"
  | "MEN6"
  | "WOMEN3"
  | "WOMEN6"
  | "ADULT3"
  | "ADULT6"
  | "GIRL3"
  | "GIRL6"
  | "BOY3"
  | "BOY6"
  | "CHILD3"
  | "CHILD6"
  | "INFANT3"
  | "MALE3"
  | "MALE6"
  | "FEMALE3"
  | "FEMALE6"
  | "MEN2"
  | "WOMEN2"
  | "ADULT2"
  | "GIRL2"
  | "BOY2"
  | "CHILD2"
  | "MALE2"
  | "FEMALE2"

export const SLAVE_NUMBER_VARS: readonly SlaveNumberVar[] = [
  "NCAR13", "NCAR15", "NCAR17", "TSLAVESD", "TSLAVESP", "SLAS32",
  "SLAS36", "SLAS39", "SLAARRIV", "SLADVOY", "MEN1", "MEN4",
  "MEN5", "WOMEN1", "WOMEN4", "WOMEN5", "ADULT1", "ADULT4",
  "ADULT5", "GIRL1", "GIRL4", "GIRL5", "BOY1", "BOY4",
  "BOY5", "CHILD1", "CHILD4", "CHILD5", "INFANT1", "INFANT4",
  "MALE1", "MALE4", "MALE5", "FEMALE1", "FEMALE4", "FEMALE5",
  "MEN3", "MEN6", "WOMEN3", "WOMEN6", "ADULT3", "ADULT6",
  "GIRL3", "GIRL6", "BOY3", "BOY6", "CHILD3", "CHILD6",
  "INFANT3", "MALE3", "MALE6", "FEMALE3", "FEMALE6", "MEN2",
  "WOMEN2", "ADULT2", "GIRL2", "BOY2", "CHILD2", "MALE2",
  "FEMALE2",
]

/**
 * Read without a default, so an absent key yields null rather than 0. The
 * distinction is load-bearing: null and 0 are both falsy to `pyTruthy`, but
 * they order differently under the safeGe family.
 */
export const SLAVE_NUMBER_VARS_WITHOUT_DEFAULT: readonly SlaveNumberVar[] = [
  "TSLAVESD", "TSLAVESP", "SLADVOY",
]

/**
 * Groups recoded together once the calculation is done: if any member is
 * truthy the falsy ones become 0, otherwise all become null.
 */
export const ALL_OR_NOTHING_GROUPS: readonly (readonly string[])[] = [
  ["men1", "women1", "boy1", "girl1", "child1", "infant1", "adult1", "men4", "women4", "boy4", "girl4", "child4", "infant4", "adult4", "men5", "women5", "boy5", "girl5", "child5", "adult5"],
  ["male1", "female1", "male4", "female4", "male5", "female5"],
  ["men2", "women2", "boy2", "girl2", "child2", "adult2"],
  ["male2", "female2"],
  ["men3", "women3", "boy3", "girl3", "child3", "infant3", "adult3", "men6", "women6", "boy6", "girl6", "child6", "adult6"],
  ["male3", "female3", "male6", "female6"],
  ["ncar13", "ncar15", "ncar17", "ncartot"],
  ["slas32", "slas36", "slas39", "slastot"],
]

/** Cleared to null when falsy, after the group recodes. */
export const NO_ZERO_VARS: readonly string[] = [
  "pctdis", "adlt2imp", "chil2imp", "male2imp", "feml2imp"
]

/** The inputs, mirroring the legacy InterimVoyage. */
export interface ImputeInput {
  date_departure: CsvDate
  date_first_slave_disembarkation: CsvDate
  date_return_departure: CsvDate
  date_slave_purchase_began: CsvDate
  date_vessel_left_last_slaving_port: CsvDate
  date_voyage_completed: CsvDate
  first_place_of_landing: CodedValue | null
  first_place_of_slave_purchase: CodedValue | null
  first_port_intended_disembarkation: CodedValue | null
  first_port_intended_embarkation: CodedValue | null
  imputed_outcome_of_voyage_for_slaves: CodedValue | null
  length_of_middle_passage: PyNum
  national_carrier: CodedValue | null
  port_of_departure: CodedValue | null
  port_voyage_ended: CodedValue | null
  principal_place_of_slave_disembarkation: CodedValue | null
  principal_place_of_slave_purchase: CodedValue | null
  rig_of_vessel: CodedValue | null
  second_place_of_landing: CodedValue | null
  second_place_of_slave_purchase: CodedValue | null
  second_port_intended_disembarkation: CodedValue | null
  second_port_intended_embarkation: CodedValue | null
  slave_numbers: ReadonlyMap<SlaveNumberVar, number>
  third_place_of_landing: CodedValue | null
  third_place_of_slave_purchase: CodedValue | null
  ton_type: CodedValue | null
  tonnage_of_vessel: PyNum
  voyage_outcome: CodedValue | null
}

/** Every local of the source function, which its tail reflects over. */
export type ImputeEnv = Record<string, PyNum>

export const runImpute = (
  iv: ImputeInput,
  is_iam: boolean
): ImputeEnv => {
  let _named_sources: any
  let _yeardep_sources: any
  let yeardep: any
  let _yearaf_sources: any
  let yearaf: any
  let _yearam_sources: any
  let yearam: any
  let year5: any
  let year10: any
  let year25: any
  let year100: any
  let voy1imp: any
  let voy2imp: any
  let _interim_length: any
  let natinimp: any
  let tonnage: any
  let tonmod: any
  let tontype: any
  let fate2: any
  let fate3: any
  let fate4: any
  let _outcome_value: any
  let embport: any
  let embport2: any
  let _numbers: any
  let ncar13: any
  let ncar15: any
  let ncar17: any
  let ncartot: any
  let tslavesd: any
  let tslavesp: any
  let pctemb: any
  let _places: any
  let regem1: any
  let regem2: any
  let regem3: any
  let mjbyptimp: any
  let embreg: any
  let embreg2: any
  let _no_places: any
  let majbuypt: any
  let plac1tra: any
  let plac2tra: any
  let sla1port: any
  let adpsale1: any
  let adpsale2: any
  let arrport: any
  let arrport2: any
  let mjslptimp: any
  let regarr: any
  let regarr2: any
  let regdis1: any
  let regdis2: any
  let regdis3: any
  let slas32: any
  let slas36: any
  let slas39: any
  let slaarriv: any
  let slastot: any
  let pctdis: any
  let majselpt: any
  let portdep: any
  let ptdepimp: any
  let _region_mod: any
  let deptregimp: any
  let majbyimp: any
  let mjselimp: any
  let deptregimp1: any
  let majbyimp1: any
  let mjselimp1: any
  let portret: any
  let retrnreg1: any
  let xmimpflag: any
  let rig: any
  let slaximp: any
  let slamimp: any
  let captive_threshold: any
  let sladvoy: any
  let vymrtimp: any
  let tslmtimp: any
  let vymrtrat: any
  let men1: any
  let men4: any
  let men5: any
  let women1: any
  let women4: any
  let women5: any
  let adult1: any
  let adult4: any
  let adult5: any
  let girl1: any
  let girl4: any
  let girl5: any
  let boy1: any
  let boy4: any
  let boy5: any
  let child1: any
  let child4: any
  let child5: any
  let infant1: any
  let infant4: any
  let male1: any
  let male4: any
  let male5: any
  let female1: any
  let female4: any
  let female5: any
  let adlt1imp: any
  let chil1imp: any
  let male1imp: any
  let feml1imp: any
  let slavema1: any
  let slavemx1: any
  let slavmax1: any
  let chilrat1: any
  let malrat1: any
  let menrat1: any
  let womrat1: any
  let boyrat1: any
  let girlrat1: any
  let men3: any
  let men6: any
  let women3: any
  let women6: any
  let adult3: any
  let adult6: any
  let girl3: any
  let girl6: any
  let boy3: any
  let boy6: any
  let child3: any
  let child6: any
  let infant3: any
  let male3: any
  let male6: any
  let female3: any
  let female6: any
  let adlt3imp: any
  let chil3imp: any
  let male3imp: any
  let feml3imp: any
  let slavema3: any
  let slavemx3: any
  let slavmax3: any
  let chilrat3: any
  let malrat3: any
  let menrat3: any
  let womrat3: any
  let boyrat3: any
  let girlrat3: any
  let men7: any
  let women7: any
  let boy7: any
  let girl7: any
  let adult7: any
  let child7: any
  let male7: any
  let female7: any
  let slavema7: any
  let slavemx7: any
  let slavmax7: any
  let menrat7: any
  let womrat7: any
  let boyrat7: any
  let girlrat7: any
  let chilrat7: any
  let malrat7: any
  let men2: any
  let women2: any
  let adult2: any
  let girl2: any
  let boy2: any
  let child2: any
  let male2: any
  let female2: any
  let adlt2imp: any
  let chil2imp: any
  let male2imp: any
  let feml2imp: any

  _named_sources = { "d1slatrc": iv.date_slave_purchase_began, "datarr34": iv.date_first_slave_disembarkation, "datarr45": iv.date_voyage_completed, "datedepc": iv.date_departure, "dlslatrc": iv.date_vessel_left_last_slaving_port, "ddepamc": iv.date_return_departure }  // py:207
  const _extract_year_from_sources = (sources: any): any => {  // py:216
    return firstValid(sources.map((var_name: any) => dictGet(_named_sources, var_name, null)).map(extractYear))  // py:217
  }
  _yeardep_sources = ["datedepc", "d1slatrc", "dlslatrc", "datarr34", "ddepamc", "datarr45"]  // py:220
  yeardep = _extract_year_from_sources(_yeardep_sources)  // py:221
  _yearaf_sources = ["dlslatrc", "d1slatrc", "datedepc", "datarr34", "ddepamc", "datarr45"]  // py:224
  yearaf = _extract_year_from_sources(_yearaf_sources)  // py:225
  _yearam_sources = ["datarr34", "dlslatrc", "d1slatrc", "datedepc", "ddepamc", "datedepc", "datarr45"]  // py:228
  if (pyTruthy(is_iam)) {  // py:229
    listRemove(_yearam_sources, "ddepamc")  // py:230
    listRemove(_yearam_sources, "datarr45")  // py:231
    _yearam_sources.push("datarr38")  // py:232
  }
  yearam = _extract_year_from_sources(_yearam_sources)  // py:233
  year5 = yearMod(yearam, 5, 1500)  // py:235
  year10 = yearMod(yearam, 10, 1500)  // py:236
  year25 = yearMod(yearam, 25, 1500)  // py:237
  year100 = (pyTruthy(yearam) ? (floorDiv((yearam - 1), 100) * 100) : null)  // py:238
  voy1imp = dateDiff(iv.date_first_slave_disembarkation, iv.date_departure)  // py:240
  voy1imp = threshold(voy1imp, 39)  // py:244
  voy2imp = dateDiff(iv.date_first_slave_disembarkation, iv.date_vessel_left_last_slaving_port)  // py:246
  try {  // py:250
    _interim_length = pyInt(iv.length_of_middle_passage)  // py:251
  } catch {
    _interim_length = 0  // py:253
  }
  if (pyTruthy((pyTruthy((voy2imp === null)) || pyTruthy((pyTruthy((voy2imp < (pyTruthy(is_iam) ? 0 : 20))) && pyTruthy(_interim_length) && pyTruthy(((_interim_length - voy2imp) > (pyTruthy(is_iam) ? 0 : 10)))))))) {  // py:254
    voy2imp = _interim_length  // py:255
  }
  if (pyTruthy(!pyTruthy(is_iam))) {  // py:256
    voy2imp = threshold(voy2imp, 10)  // py:257
  } else {
    voy2imp = threshold(voy2imp, 1)  // py:259
  }
  natinimp = getObjValue(iv.national_carrier)  // py:261
  natinimp = recodeVar([[3, [1, 2]], [6, [4, 5]], [7, [7]], [8, [8]], [9, [9]], [10, [10]], [15, pyRange(11, 15)], [30, pyRange(16, 25)]], natinimp)  // py:262
  tonnage = iv.tonnage_of_vessel  // py:272
  tonmod = null  // py:273
  tontype = null  // py:274
  if (pyTruthy(tonnage)) {  // py:275
    tonnage = pyInt(tonnage)  // py:276
    tontype = getObjValue(iv.ton_type)  // py:277
    tonmod = tonnage  // py:278
    if (pyTruthy(eq(tontype, 13))) {  // py:279
      tonmod = tonnage  // py:280
    }
    if (pyTruthy((pyTruthy((pyTruthy((pyTruthy(tontype) && pyTruthy(safeLt(tontype, 3)))) || pyTruthy(eq(tontype, 4)) || pyTruthy(eq(tontype, 5)))) && pyTruthy(safeGt(yearam, 1773))))) {  // py:281
      tonmod = tonnage  // py:282
    }
    if (pyTruthy((pyTruthy((pyTruthy((pyTruthy(tontype) && pyTruthy(safeLt(tontype, 3)))) || pyTruthy(eq(tontype, 4)) || pyTruthy(eq(tontype, 5)))) && pyTruthy(yearam) && pyTruthy(safeLt(yearam, 1774)) && pyTruthy(safeGt(tonnage, 250))))) {  // py:283
      tonmod = (13.1 + (1.1 * tonnage))  // py:284
    }
    if (pyTruthy((pyTruthy((pyTruthy((pyTruthy(tontype) && pyTruthy(safeLt(tontype, 3)))) || pyTruthy(eq(tontype, 4)) || pyTruthy(eq(tontype, 5)))) && pyTruthy(yearam) && pyTruthy(safeLt(yearam, 1774)) && pyTruthy(safeGt(tonnage, 150)) && pyTruthy(safeLt(tonnage, 251))))) {  // py:285
      tonmod = (65.3 + (1.2 * tonnage))  // py:286
    }
    if (pyTruthy((pyTruthy((pyTruthy((pyTruthy(tontype) && pyTruthy(safeLt(tontype, 3)))) || pyTruthy(eq(tontype, 4)) || pyTruthy(eq(tontype, 5)))) && pyTruthy(yearam) && pyTruthy(safeLt(yearam, 1774)) && pyTruthy(safeLt(tonnage, 151))))) {  // py:287
      tonmod = (2.3 + (1.8 * tonnage))  // py:288
    }
    if (pyTruthy((pyTruthy(eq(tontype, 4)) && pyTruthy(safeGt(yearam, 1783)) && pyTruthy(yearam) && pyTruthy(safeLt(yearam, 1794))))) {  // py:289
      tonmod = null  // py:290
    }
    if (pyTruthy((pyTruthy(eq(tontype, 3)) || pyTruthy(eq(tontype, 6)) || pyTruthy(eq(tontype, 9)) || pyTruthy(eq(tontype, 16))))) {  // py:291
      tonmod = (71 + (0.86 * tonnage))  // py:292
    }
    if (pyTruthy((pyTruthy((pyTruthy(eq(tontype, 3)) || pyTruthy(eq(tontype, 6)) || pyTruthy(eq(tontype, 9)) || pyTruthy(eq(tontype, 16)))) && pyTruthy(yearam) && pyTruthy(safeLt(yearam, 1774)) && pyTruthy(safeGt(tonmod, 250))))) {  // py:293
      tonmod = (13.1 + (1.1 * tonnage))  // py:294
    }
    if (pyTruthy((pyTruthy((pyTruthy(eq(tontype, 3)) || pyTruthy(eq(tontype, 6)) || pyTruthy(eq(tontype, 9)) || pyTruthy(eq(tontype, 16)))) && pyTruthy(yearam) && pyTruthy(safeLt(yearam, 1774)) && pyTruthy(safeGt(tonmod, 150)) && pyTruthy(safeLt(tonmod, 251))))) {  // py:295
      tonmod = (65.3 + (1.2 * tonnage))  // py:296
    }
    if (pyTruthy((pyTruthy((pyTruthy(eq(tontype, 3)) || pyTruthy(eq(tontype, 6)) || pyTruthy(eq(tontype, 9)) || pyTruthy(eq(tontype, 16)))) && pyTruthy(yearam) && pyTruthy(safeLt(yearam, 1774)) && pyTruthy(safeLt(tonmod, 151))))) {  // py:297
      tonmod = (2.3 + (1.8 * tonnage))  // py:298
    }
    if (pyTruthy(eq(tontype, 7))) {  // py:299
      tonmod = (tonnage * 2)  // py:300
    }
    if (pyTruthy((pyTruthy(eq(tontype, 7)) && pyTruthy(safeGt(yearam, 1773)) && pyTruthy(safeGt(tonmod, 250))))) {  // py:301
      tonmod = (13.1 + (1.1 * tonmod))  // py:302
    }
    if (pyTruthy((pyTruthy(eq(tontype, 7)) && pyTruthy(safeGt(yearam, 1773)) && pyTruthy(safeGt(tonmod, 150)) && pyTruthy(safeLt(tonmod, 251))))) {  // py:303
      tonmod = (65.3 + (1.2 * tonmod))  // py:304
    }
    if (pyTruthy((pyTruthy(eq(tontype, 7)) && pyTruthy(safeGt(yearam, 1773)) && pyTruthy(safeLt(tonmod, 151))))) {  // py:305
      tonmod = (2.3 + (1.8 * tonmod))  // py:306
    }
    if (pyTruthy(eq(tontype, 21))) {  // py:307
      tonmod = (-6.093 + (0.76155 * tonnage))  // py:308
    }
    if (pyTruthy((pyTruthy(eq(tontype, 21)) && pyTruthy(safeGt(yearam, 1773)) && pyTruthy(safeGt(tonmod, 250))))) {  // py:309
      tonmod = (13.1 + (1.1 * tonmod))  // py:310
    }
    if (pyTruthy((pyTruthy(eq(tontype, 21)) && pyTruthy(safeGt(yearam, 1773)) && pyTruthy(safeGt(tonmod, 150)) && pyTruthy(safeLt(tonmod, 251))))) {  // py:311
      tonmod = (65.3 + (1.2 * tonmod))  // py:312
    }
    if (pyTruthy((pyTruthy(eq(tontype, 21)) && pyTruthy(safeGt(yearam, 1773)) && pyTruthy(safeLt(tonmod, 151))))) {  // py:313
      tonmod = (2.3 + (1.8 * tonmod))  // py:314
    }
    if (pyTruthy((pyTruthy((tontype === null)) && pyTruthy(safeGt(yearam, 1714)) && pyTruthy(yearam) && pyTruthy(safeLt(yearam, 1786)) && pyTruthy(safeGt(tonnage, 0)) && pyTruthy(eq(natinimp, 7))))) {  // py:315
      tontype = 22  // py:316
    }
    if (pyTruthy((pyTruthy(eq(tontype, 22)) && pyTruthy(safeGt(tonnage, 250))))) {  // py:317
      tonmod = (13.1 + (1.1 * tonnage))  // py:318
    }
    if (pyTruthy((pyTruthy(eq(tontype, 22)) && pyTruthy(safeGt(tonnage, 150)) && pyTruthy(safeLt(tonnage, 251))))) {  // py:319
      tonmod = (65.3 + (1.2 * tonnage))  // py:320
    }
    if (pyTruthy((pyTruthy(eq(tontype, 22)) && pyTruthy(safeLt(tonnage, 151))))) {  // py:321
      tonmod = (2.3 + (1.8 * tonnage))  // py:322
    }
    if (pyTruthy((pyTruthy(eq(tontype, 15)) || pyTruthy(eq(tontype, 14)) || pyTruthy(eq(tontype, 17))))) {  // py:323
      tonmod = (52.86 + (1.22 * tonnage))  // py:324
    }
  }
  fate2 = null  // py:326
  fate3 = null  // py:327
  fate4 = null  // py:328
  if (pyTruthy(iv.voyage_outcome)) {  // py:329
    _outcome_value = getObjValue(iv.voyage_outcome)  // py:330
    fate2 = recodeVar([[1, [1, 4, 5, 7, 8, 9, 11, 12, 15, 16, 17, 19, 20, 24, 26, 29, 30, 39, 40, 46, 47, 48, 49, 51, 52, 54, 58, 68, 70, 71, 72, 76, 78, 79, 80, 81, 82, 85, 88, 92, 95, 97, 104, 108, 109, 122, 123, 124, 125, 132, 134, 135, 142, 144, 148, 154, 157, 159, 161, 162, 163, 170, 171, 172, 173, 174, 176, 177, 178, 179, 180, 181, 182, 183, 184, 185, 187, 189, 201, 203, 205, 304, 305, 306, 307, 309, 311, 313]], [2, [2, 6, 10, 14, 18, 22, 25, 27, 31, 41, 45, 50, 57, 74, 90, 93, 94, 96, 102, 103, 106, 110, 111, 112, 118, 121, 126, 127, 128, 130, 138, 141, 153, 155, 156, 160, 192, 193, 198, 202]], [3, [42, 44, 69, 73, 114, 120, 206, 207, 310]], [4, [3, 66, 99]], [5, [13, 21, 23, 43, 53, 55, 56, 59, 67, 77, 86, 87, 113, 164, 165, 166, 188, 191, 194, 195, 196, 199]], [6, [208, 308]], [7, [28, 75, 89, 91, 98]]], _outcome_value)  // py:332
    fate3 = recodeVar([[1, [2, 3, 4, 5, 27, 28, 29, 30, 75, 85, 86, 91, 94, 95, 97]], [2, [6, 7, 8, 9, 31, 48, 96, 159, 192, 193, 306, 307]], [3, [10, 11, 12, 13, 54, 58, 102, 103, 104, 106, 108, 109, 110, 111, 112, 113, 114, 118, 120, 121, 122, 123, 124, 125, 126, 127, 128, 130, 132, 134, 135, 138, 141, 144, 148, 155, 156, 194, 196, 198, 202, 203, 205]], [4, [14, 15, 16, 17, 309]], [5, [18, 19, 20, 21, 187, 188, 189, 191, 195]], [6, [22, 23, 24, 25, 55]], [8, [43, 50, 51, 52, 53, 164, 165, 166, 170, 171, 172, 173, 174, 176, 177, 178, 179, 180, 181, 182, 183, 184]], [9, [160, 161, 162, 163, 185]], [10, [42, 56, 66, 69, 73, 76, 80, 81, 82, 87, 99, 310]], [11, [57, 74, 79, 89, 90, 98]], [12, [142, 199]], [13, [26, 39, 45, 46, 47, 67, 71, 72, 78, 153, 154, 157]], [14, [1, 40, 41, 44, 49, 59, 68, 70, 77, 88, 92, 93, 206, 207, 304, 305, 308, 311, 313]], [15, [208]], [16, [201]], [17, [211]], [18, [212]]], _outcome_value)  // py:352
    fate4 = recodeVar([[1, [1, 49, 68, 77, 79, 88, 92, 135, 203, 205, 206, 207, 208, 304, 308]], [2, [2, 3, 4, 5, 27, 28, 29, 30, 54, 58, 59, 85, 86, 91, 94, 95, 97, 311, 313]], [3, [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 31, 39, 41, 42, 43, 44, 45, 46, 47, 48, 50, 51, 52, 53, 55, 56, 57, 66, 67, 69, 71, 72, 73, 74, 75, 76, 78, 80, 81, 82, 87, 89, 90, 93, 98, 99, 102, 103, 104, 106, 108, 109, 110, 111, 112, 113, 114, 118, 120, 121, 122, 123, 124, 125, 126, 127, 128, 130, 132, 134, 138, 141, 142, 144, 148, 153, 154, 155, 156, 157, 159, 160, 161, 162, 163, 164, 165, 166, 170, 171, 172, 173, 174, 176, 177, 178, 179, 180, 181, 182, 183, 184, 185, 187, 188, 189, 191, 192, 193, 194, 195, 196, 198, 199, 201, 202, 305, 306, 307, 309, 310]], [4, [40, 70, 96, 208]]], _outcome_value)  // py:378
  }
  embport = getObjValue(iv.first_port_intended_embarkation)  // py:399
  embport2 = getObjValue(iv.second_port_intended_embarkation)  // py:400
  _numbers = iv.slave_numbers  // py:402
  ncar13 = dictGet(_numbers, "NCAR13", 0)  // py:406
  ncar15 = dictGet(_numbers, "NCAR15", 0)  // py:407
  ncar17 = dictGet(_numbers, "NCAR17", 0)  // py:408
  if (pyTruthy(is_iam)) {  // py:409
    ncar17 = 0  // py:409
  }
  ncartot = ((ncar13 + ncar15) + ncar17)  // py:410
  tslavesd = dictGet(_numbers, "TSLAVESD", null)  // py:411
  tslavesp = dictGet(_numbers, "TSLAVESP", null)  // py:412
  if (pyTruthy(is_iam)) {  // py:413
    tslavesp = null  // py:413
  }
  pctemb = (pyTruthy(tslavesd) ? (ncartot / tslavesd) : null)  // py:414
  if (pyTruthy((pyTruthy((pctemb === null)) && pyTruthy(tslavesp)))) {  // py:415
    pctemb = (ncartot / tslavesp)  // py:416
  }
  _places = [getObjValue(iv.first_place_of_slave_purchase), getObjValue(iv.second_place_of_slave_purchase), getObjValue(iv.third_place_of_slave_purchase)]  // py:418
  regem1 = regionValue(_places[0])  // py:423
  regem2 = regionValue(_places[1])  // py:424
  regem3 = regionValue(_places[2])  // py:425
  mjbyptimp = null  // py:426
  if (pyTruthy((pyTruthy(_places[0]) && pyTruthy(!pyTruthy(_places[1])) && pyTruthy(!pyTruthy(_places[2]))))) {  // py:427
    mjbyptimp = _places[0]  // py:427
  }
  if (pyTruthy((pyTruthy(_places[1]) && pyTruthy(!pyTruthy(_places[0])) && pyTruthy(!pyTruthy(_places[2]))))) {  // py:428
    mjbyptimp = _places[1]  // py:428
  }
  if (pyTruthy((pyTruthy(_places[2]) && pyTruthy(!pyTruthy(_places[0])) && pyTruthy(!pyTruthy(_places[1]))))) {  // py:429
    mjbyptimp = _places[2]  // py:429
  }
  embreg = regionValue(embport)  // py:431
  embreg2 = regionValue(embport2)  // py:432
  if (pyTruthy((pyTruthy(!pyTruthy(_places[0])) && pyTruthy(!pyTruthy(_places[1])) && pyTruthy(!pyTruthy(_places[2]))))) {  // py:433
    if (pyTruthy((pyTruthy(safeGe(embport, 1)) && pyTruthy(!pyTruthy(embport2))))) {  // py:434
      mjbyptimp = embport  // py:434
    }
    if (pyTruthy((pyTruthy(!pyTruthy(embport)) && pyTruthy(safeGe(embport2, 1))))) {  // py:435
      mjbyptimp = embport2  // py:435
    }
    if (pyTruthy((pyTruthy(safeGe(embport, 1)) && pyTruthy(safeGe(embport2, 1)) && pyTruthy(eq(embreg, embreg2))))) {  // py:436
      mjbyptimp = (embreg + 99)  // py:436
    }
    if (pyTruthy((pyTruthy(safeGe(embport, 1)) && pyTruthy(safeGe(embport2, 1)) && pyTruthy(ne(embreg, embreg2))))) {  // py:437
      mjbyptimp = 60999  // py:437
    }
  }
  if (pyTruthy((pyTruthy(regem1) && pyTruthy(eq(regem1, regem2)) && pyTruthy(!pyTruthy(regem3))))) {  // py:439
    mjbyptimp = (regem1 + 99)  // py:439
  }
  if (pyTruthy((pyTruthy(regem1) && pyTruthy(eq(regem1, regem3)) && pyTruthy(!pyTruthy(regem2))))) {  // py:440
    mjbyptimp = (regem1 + 99)  // py:440
  }
  if (pyTruthy((pyTruthy(regem2) && pyTruthy(eq(regem2, regem3)) && pyTruthy(!pyTruthy(regem1))))) {  // py:441
    mjbyptimp = (regem2 + 99)  // py:441
  }
  if (pyTruthy((pyTruthy(regem1) && pyTruthy(eq(regem1, regem2)) && pyTruthy(eq(regem1, regem3))))) {  // py:442
    mjbyptimp = (regem1 + 99)  // py:442
  }
  if (pyTruthy((pyTruthy(ne(regem1, regem2)) && pyTruthy(ne(regem1, regem3)) && pyTruthy(ne(regem2, regem3))))) {  // py:443
    mjbyptimp = 60999  // py:443
  }
  if (pyTruthy((pyTruthy(safeGt(ncar13, ncar15)) && pyTruthy(safeGt(ncar13, ncar17))))) {  // py:445
    mjbyptimp = _places[0]  // py:445
  }
  if (pyTruthy((pyTruthy(safeGt(ncar15, ncar13)) && pyTruthy(safeGt(ncar15, ncar17))))) {  // py:446
    mjbyptimp = _places[1]  // py:446
  }
  if (pyTruthy((pyTruthy(safeGt(ncar17, ncar13)) && pyTruthy(safeGt(ncar17, ncar15))))) {  // py:447
    mjbyptimp = _places[2]  // py:447
  }
  if (pyTruthy((pyTruthy(eq(ncar13, ncar15)) && pyTruthy(safeGt(ncar13, ncar17)) && pyTruthy(regem1) && pyTruthy(eq(regem1, regem2))))) {  // py:449
    mjbyptimp = (regem1 + 99)  // py:449
  }
  if (pyTruthy((pyTruthy(eq(ncar13, ncar15)) && pyTruthy(safeGt(ncar13, ncar17)) && pyTruthy(ne(regem1, regem2))))) {  // py:450
    mjbyptimp = 60999  // py:450
  }
  if (pyTruthy((pyTruthy(eq(ncar13, ncar17)) && pyTruthy(safeGt(ncar13, ncar15)) && pyTruthy(regem1) && pyTruthy(eq(regem1, regem3))))) {  // py:451
    mjbyptimp = (regem1 + 99)  // py:451
  }
  if (pyTruthy((pyTruthy(eq(ncar13, ncar17)) && pyTruthy(safeGt(ncar13, ncar15)) && pyTruthy(ne(regem1, regem3))))) {  // py:452
    mjbyptimp = 60999  // py:452
  }
  if (pyTruthy((pyTruthy(eq(ncar15, ncar17)) && pyTruthy(safeGt(ncar15, ncar13)) && pyTruthy(regem2) && pyTruthy(eq(regem2, regem3))))) {  // py:453
    mjbyptimp = (regem2 + 99)  // py:453
  }
  if (pyTruthy((pyTruthy(eq(ncar15, ncar17)) && pyTruthy(safeGt(ncar15, ncar17)) && pyTruthy(ne(regem2, regem3))))) {  // py:454
    mjbyptimp = 60999  // py:454
  }
  if (pyTruthy((pyTruthy((pyTruthy(pctemb) && pyTruthy(safeLt(pctemb, 0.5)))) || pyTruthy((pyTruthy(safeLt(ncartot, 50)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp))))))) {  // py:456
    if (pyTruthy((pyTruthy(eq(ncar13, 0)) && pyTruthy(safeGt(ncar15, 0)) && pyTruthy(safeGt(ncar17, 0))))) {  // py:457
      mjbyptimp = _places[0]  // py:457
    }
    if (pyTruthy((pyTruthy(safeGt(ncar13, 0)) && pyTruthy(eq(ncar15, 0)) && pyTruthy(safeGt(ncar17, 0))))) {  // py:458
      mjbyptimp = _places[1]  // py:458
    }
    if (pyTruthy((pyTruthy(safeGt(ncar13, 0)) && pyTruthy(safeGt(ncar15, 0)) && pyTruthy(eq(ncar17, 0))))) {  // py:459
      mjbyptimp = _places[2]  // py:459
    }
    if (pyTruthy((pyTruthy(eq(ncar13, 0)) && pyTruthy(safeGt(ncar15, 0)) && pyTruthy(eq(ncar17, 0)) && pyTruthy((_places[2] === null))))) {  // py:460
      mjbyptimp = _places[0]  // py:460
    }
    if (pyTruthy((pyTruthy(safeGt(ncar13, 0)) && pyTruthy(eq(ncar15, 0)) && pyTruthy(eq(ncar17, 0)) && pyTruthy(_places[1]) && pyTruthy((_places[2] === null))))) {  // py:461
      mjbyptimp = _places[1]  // py:461
    }
    if (pyTruthy((pyTruthy(eq(ncar13, 0)) && pyTruthy(eq(ncar15, 0)) && pyTruthy(safeGt(ncar17, 0)) && pyTruthy(!pyTruthy((regem1 === null))) && pyTruthy(eq(regem1, regem2))))) {  // py:462
      mjbyptimp = (regem1 + 99)  // py:462
    }
    if (pyTruthy((pyTruthy(eq(ncar13, 0)) && pyTruthy(safeGt(ncar15, 0)) && pyTruthy(eq(ncar17, 0)) && pyTruthy(!pyTruthy((regem1 === null))) && pyTruthy(eq(regem1, regem3))))) {  // py:463
      mjbyptimp = (regem1 + 99)  // py:463
    }
    if (pyTruthy((pyTruthy(safeGt(ncar13, 0)) && pyTruthy(eq(ncar15, 0)) && pyTruthy(eq(ncar17, 0)) && pyTruthy(!pyTruthy((regem2 === null))) && pyTruthy(eq(regem2, regem3))))) {  // py:464
      mjbyptimp = (regem2 + 99)  // py:464
    }
    if (pyTruthy((pyTruthy(eq(ncar13, 0)) && pyTruthy(eq(ncar15, 0)) && pyTruthy(safeGt(ncar17, 0)) && pyTruthy(ne(regem1, regem2)) && pyTruthy(regem1) && pyTruthy(regem2)))) {  // py:465
      mjbyptimp = 60999  // py:465
    }
    if (pyTruthy((pyTruthy(eq(ncar13, 0)) && pyTruthy(safeGt(ncar15, 0)) && pyTruthy(eq(ncar17, 0)) && pyTruthy(ne(regem1, regem3)) && pyTruthy(regem1) && pyTruthy(regem3)))) {  // py:466
      mjbyptimp = 60999  // py:466
    }
    if (pyTruthy((pyTruthy(safeGt(ncar13, 0)) && pyTruthy(eq(ncar15, 0)) && pyTruthy(eq(ncar17, 0)) && pyTruthy(ne(regem2, regem3)) && pyTruthy(regem2) && pyTruthy(regem3)))) {  // py:467
      mjbyptimp = 60999  // py:467
    }
  }
  if (pyTruthy(!pyTruthy(ncartot))) {  // py:469
    if (pyTruthy((pyTruthy(safeGe(_places[0], 1)) && pyTruthy(safeGe(_places[1], 1)) && pyTruthy((_places[2] === null)) && pyTruthy(!pyTruthy((regem1 === null))) && pyTruthy(regem1) && pyTruthy(eq(regem1, regem2))))) {  // py:470
      mjbyptimp = (regem1 + 99)  // py:470
    }
    if (pyTruthy((pyTruthy(safeGe(_places[0], 1)) && pyTruthy(safeGe(_places[2], 1)) && pyTruthy((_places[1] === null)) && pyTruthy(!pyTruthy((regem1 === null))) && pyTruthy(regem1) && pyTruthy(eq(regem1, regem3))))) {  // py:471
      mjbyptimp = (regem1 + 99)  // py:471
    }
    if (pyTruthy((pyTruthy(safeGe(_places[1], 1)) && pyTruthy(safeGe(_places[2], 1)) && pyTruthy((_places[0] === null)) && pyTruthy(!pyTruthy((regem2 === null))) && pyTruthy(regem2) && pyTruthy(eq(regem2, regem3))))) {  // py:472
      mjbyptimp = (regem2 + 99)  // py:472
    }
    if (pyTruthy((pyTruthy(safeGe(_places[0], 1)) && pyTruthy(safeGe(_places[1], 1)) && pyTruthy((_places[2] === null)) && pyTruthy(ne(regem1, regem2))))) {  // py:473
      mjbyptimp = 60999  // py:473
    }
    if (pyTruthy((pyTruthy(safeGe(_places[0], 1)) && pyTruthy(safeGe(_places[2], 1)) && pyTruthy((_places[1] === null)) && pyTruthy(ne(regem1, regem3))))) {  // py:474
      mjbyptimp = 60999  // py:474
    }
    if (pyTruthy((pyTruthy(safeGe(_places[1], 1)) && pyTruthy(safeGe(_places[2], 1)) && pyTruthy((_places[0] === null)) && pyTruthy(ne(regem2, regem3))))) {  // py:475
      mjbyptimp = 60999  // py:475
    }
    if (pyTruthy((pyTruthy(safeGe(_places[0], 1)) && pyTruthy(safeGe(_places[1], 1)) && pyTruthy(safeGe(_places[2], 1)) && pyTruthy(regem1) && pyTruthy(eq(regem1, regem2))))) {  // py:476
      mjbyptimp = (regem1 + 99)  // py:476
    }
    if (pyTruthy((pyTruthy(safeGe(_places[0], 1)) && pyTruthy(safeGe(_places[1], 1)) && pyTruthy(safeGe(_places[2], 1)) && pyTruthy(regem1) && pyTruthy(eq(regem1, regem3))))) {  // py:477
      mjbyptimp = (regem1 + 99)  // py:477
    }
    if (pyTruthy((pyTruthy(safeGe(_places[0], 1)) && pyTruthy(safeGe(_places[1], 1)) && pyTruthy(safeGe(_places[2], 1)) && pyTruthy(regem2) && pyTruthy(eq(regem2, regem3))))) {  // py:478
      mjbyptimp = (regem2 + 99)  // py:478
    }
    if (pyTruthy((pyTruthy(safeGe(_places[0], 1)) && pyTruthy(safeGe(_places[1], 1)) && pyTruthy(safeGe(_places[2], 1)) && pyTruthy(ne(regem1, regem2)) && pyTruthy(ne(regem1, regem3)) && pyTruthy(ne(regem2, regem3))))) {  // py:479
      mjbyptimp = 60999  // py:479
    }
  }
  _no_places = (pyTruthy((_places[0] === null)) && pyTruthy((_places[1] === null)) && pyTruthy((_places[2] === null)))  // py:481
  if (pyTruthy((pyTruthy(embport) && pyTruthy((embport2 === null)) && pyTruthy(_no_places)))) {  // py:482
    mjbyptimp = embport  // py:483
  }
  if (pyTruthy((pyTruthy(embport2) && pyTruthy(_no_places)))) {  // py:484
    mjbyptimp = embport2  // py:485
  }
  if (pyTruthy((pyTruthy(!pyTruthy(mjbyptimp)) && pyTruthy(ne(getObjValue(iv.imputed_outcome_of_voyage_for_slaves), 2)) && pyTruthy((pyTruthy(embport) || pyTruthy(embport2) || pyTruthy(safeGt(ncartot, 0)) || pyTruthy(safeGe(_places[0], 1)) || pyTruthy(safeGe(_places[1], 1)) || pyTruthy(safeGe(_places[2], 1))))))) {  // py:486
    mjbyptimp = 60999  // py:487
  }
  majbuypt = getObjValue(iv.principal_place_of_slave_purchase)  // py:489
  if (pyTruthy((pyTruthy(!pyTruthy(mjbyptimp)) && pyTruthy(safeGe(majbuypt, 1))))) {  // py:490
    mjbyptimp = majbuypt  // py:490
  }
  if (pyTruthy(is_iam)) {  // py:492
    plac1tra = getObjValue(iv.first_place_of_slave_purchase)  // py:494
    plac2tra = getObjValue(iv.second_place_of_slave_purchase)  // py:495
    if (pyTruthy((pyTruthy(safeGe(plac1tra, 1)) && pyTruthy((pyTruthy((plac2tra === null)) || pyTruthy(safeGt(ncar13, ncar15))))))) {  // py:496
      mjbyptimp = plac1tra  // py:496
    }
    if (pyTruthy(safeGt(ncar15, ncar13))) {  // py:497
      mjbyptimp = plac2tra  // py:497
    }
    if (pyTruthy((pyTruthy(eq(ncar13, ncar15)) && pyTruthy(eq(regem1, regem2))))) {  // py:498
      mjbyptimp = (regem1 + 99)  // py:498
    }
    if (pyTruthy((pyTruthy(eq(ncar13, ncar15)) && pyTruthy(ne(regem1, regem2))))) {  // py:499
      mjbyptimp = 80299  // py:499
    }
    if (pyTruthy((pyTruthy((mjbyptimp === null)) && pyTruthy(safeGe(majbuypt, 1))))) {  // py:500
      mjbyptimp = majbuypt  // py:500
    }
  }
  sla1port = getObjValue(iv.first_place_of_landing)  // py:504
  adpsale1 = getObjValue(iv.second_place_of_landing)  // py:505
  adpsale2 = getObjValue(iv.third_place_of_landing)  // py:506
  arrport = getObjValue(iv.first_port_intended_disembarkation)  // py:507
  arrport2 = getObjValue(iv.second_port_intended_disembarkation)  // py:508
  if (pyTruthy(is_iam)) {  // py:509
    arrport2 = null  // py:509
  }
  mjslptimp = null  // py:510
  if (pyTruthy((pyTruthy(sla1port) && pyTruthy(!pyTruthy(adpsale1)) && pyTruthy(!pyTruthy(adpsale2))))) {  // py:511
    mjslptimp = sla1port  // py:511
  }
  if (pyTruthy((pyTruthy(adpsale1) && pyTruthy(!pyTruthy(sla1port)) && pyTruthy(!pyTruthy(adpsale2))))) {  // py:512
    mjslptimp = adpsale1  // py:512
  }
  if (pyTruthy((pyTruthy(adpsale2) && pyTruthy(!pyTruthy(sla1port)) && pyTruthy(!pyTruthy(adpsale1))))) {  // py:513
    mjslptimp = adpsale2  // py:513
  }
  regarr = regionValue(arrport)  // py:515
  regarr2 = regionValue(arrport2)  // py:516
  if (pyTruthy((pyTruthy(!pyTruthy(sla1port)) && pyTruthy(!pyTruthy(adpsale1)) && pyTruthy(!pyTruthy(adpsale2))))) {  // py:518
    if (pyTruthy((pyTruthy(safeGe(arrport, 1)) && pyTruthy(!pyTruthy(arrport2))))) {  // py:519
      mjslptimp = arrport  // py:519
    }
    if (pyTruthy((pyTruthy(!pyTruthy(arrport)) && pyTruthy(safeGe(arrport2, 1))))) {  // py:520
      mjslptimp = arrport2  // py:520
    }
    if (pyTruthy((pyTruthy(safeGe(arrport, 1)) && pyTruthy(safeGe(arrport2, 1)) && pyTruthy(regarr) && pyTruthy(eq(regarr, regarr2))))) {  // py:521
      mjslptimp = (regarr + 99)  // py:521
    }
    if (pyTruthy((pyTruthy(safeGe(arrport, 1)) && pyTruthy(safeGe(arrport2, 1)) && pyTruthy(ne(regarr, regarr2))))) {  // py:522
      mjslptimp = 99801  // py:522
    }
  }
  regdis1 = regionValue(sla1port)  // py:524
  regdis2 = regionValue(adpsale1)  // py:525
  regdis3 = regionValue(adpsale2)  // py:526
  if (pyTruthy((pyTruthy(regdis1) && pyTruthy(eq(regdis1, regdis2)) && pyTruthy(!pyTruthy(regdis3))))) {  // py:528
    mjslptimp = (regdis1 + 99)  // py:528
  }
  if (pyTruthy((pyTruthy(regdis1) && pyTruthy(eq(regdis1, regdis3)) && pyTruthy(!pyTruthy(regdis2))))) {  // py:529
    mjslptimp = (regdis1 + 99)  // py:529
  }
  if (pyTruthy((pyTruthy(regdis2) && pyTruthy(eq(regdis2, regdis3)) && pyTruthy(!pyTruthy(regdis1))))) {  // py:530
    mjslptimp = (regdis2 + 99)  // py:530
  }
  if (pyTruthy((pyTruthy(regdis1) && pyTruthy(eq(regdis1, regdis2)) && pyTruthy(eq(regdis1, regdis3))))) {  // py:531
    mjslptimp = (regdis1 + 99)  // py:531
  }
  if (pyTruthy((pyTruthy(ne(regdis1, regdis2)) && pyTruthy(ne(regdis1, regdis3)) && pyTruthy(ne(regdis2, regdis3))))) {  // py:532
    mjslptimp = 99801  // py:532
  }
  if (pyTruthy((pyTruthy(sla1port) && pyTruthy(eq(sla1port, adpsale1))))) {  // py:534
    mjslptimp = sla1port  // py:534
  }
  if (pyTruthy((pyTruthy(sla1port) && pyTruthy(eq(sla1port, adpsale2))))) {  // py:535
    mjslptimp = sla1port  // py:535
  }
  if (pyTruthy((pyTruthy(adpsale1) && pyTruthy(eq(adpsale1, adpsale2))))) {  // py:536
    mjslptimp = adpsale1  // py:536
  }
  slas32 = dictGet(_numbers, "SLAS32", 0)  // py:538
  slas36 = dictGet(_numbers, "SLAS36", 0)  // py:539
  slas39 = dictGet(_numbers, "SLAS39", 0)  // py:540
  if (pyTruthy((pyTruthy(safeGt(slas32, slas36)) && pyTruthy(safeGt(slas32, slas39))))) {  // py:542
    mjslptimp = sla1port  // py:542
  }
  if (pyTruthy((pyTruthy(safeGt(slas36, slas32)) && pyTruthy(safeGt(slas36, slas39))))) {  // py:543
    mjslptimp = adpsale1  // py:543
  }
  if (pyTruthy((pyTruthy(safeGt(slas39, slas32)) && pyTruthy(safeGt(slas39, slas36))))) {  // py:544
    mjslptimp = adpsale2  // py:544
  }
  if (pyTruthy((pyTruthy(eq(slas32, slas36)) && pyTruthy(safeGt(slas32, slas39)) && pyTruthy(regdis1) && pyTruthy(eq(regdis1, regdis2))))) {  // py:546
    mjslptimp = (regdis1 + 99)  // py:546
  }
  if (pyTruthy((pyTruthy(eq(slas32, slas36)) && pyTruthy(safeGt(slas32, slas39)) && pyTruthy(ne(regdis1, regdis2))))) {  // py:547
    mjslptimp = 99801  // py:547
  }
  if (pyTruthy((pyTruthy(eq(slas32, slas39)) && pyTruthy(safeGt(slas32, slas36)) && pyTruthy(regdis1) && pyTruthy(eq(regdis1, regdis3))))) {  // py:548
    mjslptimp = (regdis1 + 99)  // py:548
  }
  if (pyTruthy((pyTruthy(eq(slas32, slas39)) && pyTruthy(safeGt(slas32, slas36)) && pyTruthy(ne(regdis1, regdis3))))) {  // py:549
    mjslptimp = 99801  // py:549
  }
  if (pyTruthy((pyTruthy(eq(slas36, slas39)) && pyTruthy(safeGt(slas36, slas32)) && pyTruthy(regdis2) && pyTruthy(eq(regdis2, regdis3))))) {  // py:550
    mjslptimp = (regdis2 + 99)  // py:550
  }
  if (pyTruthy((pyTruthy(eq(slas36, slas39)) && pyTruthy(safeGt(slas36, slas39)) && pyTruthy(ne(regdis2, regdis3))))) {  // py:551
    mjslptimp = 99801  // py:551
  }
  slaarriv = dictGet(_numbers, "SLAARRIV", 0)  // py:553
  slastot = ((slas32 + slas36) + slas39)  // py:554
  pctdis = (pyTruthy(slaarriv) ? (slastot / slaarriv) : null)  // py:555
  if (pyTruthy((pyTruthy((pyTruthy((pyTruthy((pctdis !== null)) && pyTruthy(safeLt(pctdis, 0.5)))) || pyTruthy((pyTruthy(safeLt(slastot, 50)) && pyTruthy(!pyTruthy(slaarriv)))))) && pyTruthy(sla1port) && pyTruthy(adpsale1)))) {  // py:556
    if (pyTruthy(adpsale2)) {  // py:557
      mjslptimp = 99801  // py:558
    } else {
      if (pyTruthy((pyTruthy(eq(slas32, 0)) && pyTruthy(safeGe(slas36, 1))))) {  // py:560
        mjslptimp = sla1port  // py:560
      }
      if (pyTruthy((pyTruthy(eq(slas36, 0)) && pyTruthy(safeGe(slas32, 1))))) {  // py:561
        mjslptimp = adpsale1  // py:561
      }
      if (pyTruthy((pyTruthy(safeGe(slas36, 1)) && pyTruthy(safeGe(slas32, 1)) && pyTruthy(eq(regdis1, regdis2))))) {  // py:562
        mjslptimp = (regdis1 + 99)  // py:562
      }
      if (pyTruthy((pyTruthy(safeGe(slas36, 1)) && pyTruthy(safeGe(slas32, 1)) && pyTruthy(ne(regdis1, regdis2))))) {  // py:563
        mjslptimp = 99801  // py:563
      }
    }
  }
  if (pyTruthy(!pyTruthy(slastot))) {  // py:565
    if (pyTruthy((pyTruthy(sla1port) && pyTruthy(adpsale1) && pyTruthy(!pyTruthy(adpsale2)) && pyTruthy(eq(regdis1, regdis2))))) {  // py:566
      mjslptimp = (regdis1 + 99)  // py:566
    }
    if (pyTruthy((pyTruthy(sla1port) && pyTruthy(adpsale2) && pyTruthy(!pyTruthy(adpsale1)) && pyTruthy(eq(regdis1, regdis3))))) {  // py:567
      mjslptimp = (regdis1 + 99)  // py:567
    }
    if (pyTruthy((pyTruthy(adpsale1) && pyTruthy(adpsale2) && pyTruthy(!pyTruthy(sla1port)) && pyTruthy(eq(regdis2, regdis3))))) {  // py:568
      mjslptimp = (regdis2 + 99)  // py:568
    }
    if (pyTruthy((pyTruthy(sla1port) && pyTruthy(adpsale1) && pyTruthy(!pyTruthy(adpsale2)) && pyTruthy(ne(regdis1, regdis2))))) {  // py:569
      mjslptimp = 99801  // py:569
    }
    if (pyTruthy((pyTruthy(sla1port) && pyTruthy(adpsale2) && pyTruthy(!pyTruthy(adpsale1)) && pyTruthy(ne(regdis1, regdis3))))) {  // py:570
      mjslptimp = 99801  // py:570
    }
    if (pyTruthy((pyTruthy(adpsale1) && pyTruthy(adpsale2) && pyTruthy(!pyTruthy(sla1port)) && pyTruthy(ne(regdis2, regdis3))))) {  // py:571
      mjslptimp = 99801  // py:571
    }
    if (pyTruthy((pyTruthy(sla1port) && pyTruthy(adpsale1) && pyTruthy(adpsale2) && pyTruthy(eq(regdis1, regdis2))))) {  // py:572
      mjslptimp = (regdis1 + 99)  // py:572
    }
    if (pyTruthy((pyTruthy(sla1port) && pyTruthy(adpsale1) && pyTruthy(adpsale2) && pyTruthy(eq(regdis1, regdis3))))) {  // py:573
      mjslptimp = (regdis1 + 99)  // py:573
    }
    if (pyTruthy((pyTruthy(sla1port) && pyTruthy(adpsale1) && pyTruthy(adpsale2) && pyTruthy(eq(regdis2, regdis3))))) {  // py:574
      mjslptimp = (regdis2 + 99)  // py:574
    }
    if (pyTruthy((pyTruthy(sla1port) && pyTruthy(adpsale1) && pyTruthy(adpsale2) && pyTruthy(ne(regdis1, regdis2)) && pyTruthy(ne(regdis1, regdis3)) && pyTruthy(ne(regdis2, regdis3))))) {  // py:575
      mjslptimp = 99801  // py:575
    }
  }
  if (pyTruthy((pyTruthy(arrport) && pyTruthy(!pyTruthy(sla1port)) && pyTruthy(!pyTruthy(adpsale1)) && pyTruthy(!pyTruthy(adpsale2))))) {  // py:577
    mjslptimp = arrport  // py:577
  }
  if (pyTruthy((pyTruthy(!pyTruthy(mjslptimp)) && pyTruthy((pyTruthy(eq(fate2, 1)) || pyTruthy(eq(fate2, 3)) || pyTruthy(eq(fate2, 5)))) && pyTruthy((pyTruthy(arrport) || pyTruthy(arrport2) || pyTruthy(sla1port) || pyTruthy(adpsale1) || pyTruthy(adpsale2) || pyTruthy(safeGt(slastot, 0))))))) {  // py:579
    mjslptimp = 99801  // py:580
  }
  majselpt = getObjValue(iv.principal_place_of_slave_disembarkation)  // py:582
  if (pyTruthy((pyTruthy(!pyTruthy(mjslptimp)) && pyTruthy(safeGe(majselpt, 1))))) {  // py:583
    mjslptimp = majselpt  // py:583
  }
  portdep = getObjValue(iv.port_of_departure)  // py:586
  ptdepimp = portdep  // py:587
  if (pyTruthy((pyTruthy(safeGe(mjslptimp, 50200)) && pyTruthy(safeLt(mjslptimp, 50300)) && pyTruthy((portdep === null))))) {  // py:588
    ptdepimp = 50299  // py:588
  }
  if (pyTruthy((pyTruthy(safeGe(mjslptimp, 50300)) && pyTruthy(safeLt(mjslptimp, 50400)) && pyTruthy((portdep === null))))) {  // py:589
    ptdepimp = 50399  // py:589
  }
  if (pyTruthy((pyTruthy(safeGe(mjslptimp, 50400)) && pyTruthy(safeLt(mjslptimp, 50500)) && pyTruthy((portdep === null))))) {  // py:590
    ptdepimp = 50422  // py:590
  }
  _region_mod = 100  // py:592
  deptregimp = clearMod(ptdepimp, _region_mod)  // py:593
  majbyimp = clearMod(mjbyptimp, _region_mod)  // py:594
  mjselimp = clearMod(mjslptimp, _region_mod)  // py:595
  deptregimp1 = broadValue(ptdepimp)  // py:596
  majbyimp1 = broadValue(mjbyptimp)  // py:597
  mjselimp1 = broadValue(mjslptimp)  // py:598
  portret = getObjValue(iv.port_voyage_ended)  // py:599
  retrnreg1 = broadValue(portret)  // py:600
  xmimpflag = null  // py:603
  rig = getObjValue(iv.rig_of_vessel)  // py:604
  if (pyTruthy((pyTruthy((pyTruthy(eq(rig, 26)) || pyTruthy(eq(rig, 29)) || pyTruthy(eq(rig, 42)) || pyTruthy(eq(rig, 43)) || pyTruthy(eq(rig, 54)) || pyTruthy(eq(rig, 59)) || pyTruthy(eq(rig, 61)) || pyTruthy(eq(rig, 65)) || pyTruthy(eq(rig, 80)) || pyTruthy(eq(rig, 86)) || pyTruthy((rig === null)))) && pyTruthy(safeGe(yearam, 1626)) && pyTruthy(safeLt(yearam, 1651))))) {  // py:605
    xmimpflag = 127  // py:605
  }
  if (pyTruthy((pyTruthy((pyTruthy(eq(rig, 26)) || pyTruthy(eq(rig, 29)) || pyTruthy(eq(rig, 42)) || pyTruthy(eq(rig, 43)) || pyTruthy(eq(rig, 54)) || pyTruthy(eq(rig, 59)) || pyTruthy(eq(rig, 61)) || pyTruthy(eq(rig, 65)) || pyTruthy(eq(rig, 80)) || pyTruthy(eq(rig, 86)) || pyTruthy((rig === null)))) && pyTruthy(safeGe(yearam, 1651)) && pyTruthy(safeLt(yearam, 1676))))) {  // py:606
    xmimpflag = 128  // py:606
  }
  if (pyTruthy((pyTruthy((pyTruthy(eq(rig, 26)) || pyTruthy(eq(rig, 29)) || pyTruthy(eq(rig, 42)) || pyTruthy(eq(rig, 43)) || pyTruthy(eq(rig, 54)) || pyTruthy(eq(rig, 59)) || pyTruthy(eq(rig, 61)) || pyTruthy(eq(rig, 65)) || pyTruthy(eq(rig, 80)) || pyTruthy(eq(rig, 86)) || pyTruthy((rig === null)))) && pyTruthy(safeGe(yearam, 1676)) && pyTruthy(safeLt(yearam, 1701))))) {  // py:607
    xmimpflag = 129  // py:607
  }
  if (pyTruthy((pyTruthy((pyTruthy(eq(rig, 26)) || pyTruthy(eq(rig, 29)) || pyTruthy(eq(rig, 42)) || pyTruthy(eq(rig, 43)) || pyTruthy(eq(rig, 54)) || pyTruthy(eq(rig, 59)) || pyTruthy(eq(rig, 61)) || pyTruthy(eq(rig, 65)) || pyTruthy(eq(rig, 80)) || pyTruthy(eq(rig, 86)) || pyTruthy((rig === null)))) && pyTruthy(safeGe(yearam, 1701)) && pyTruthy(safeLt(yearam, 1726))))) {  // py:608
    xmimpflag = 130  // py:608
  }
  if (pyTruthy((pyTruthy((pyTruthy(eq(rig, 26)) || pyTruthy(eq(rig, 29)) || pyTruthy(eq(rig, 42)) || pyTruthy(eq(rig, 43)) || pyTruthy(eq(rig, 54)) || pyTruthy(eq(rig, 59)) || pyTruthy(eq(rig, 61)) || pyTruthy(eq(rig, 65)) || pyTruthy(eq(rig, 80)) || pyTruthy(eq(rig, 86)) || pyTruthy((rig === null)))) && pyTruthy(safeGe(yearam, 1726)) && pyTruthy(safeLt(yearam, 1751))))) {  // py:609
    xmimpflag = 131  // py:609
  }
  if (pyTruthy((pyTruthy((pyTruthy(eq(rig, 26)) || pyTruthy(eq(rig, 29)) || pyTruthy(eq(rig, 42)) || pyTruthy(eq(rig, 43)) || pyTruthy(eq(rig, 54)) || pyTruthy(eq(rig, 59)) || pyTruthy(eq(rig, 61)) || pyTruthy(eq(rig, 65)) || pyTruthy(eq(rig, 80)) || pyTruthy(eq(rig, 86)) || pyTruthy((rig === null)))) && pyTruthy(safeGe(yearam, 1751)) && pyTruthy(safeLt(yearam, 1776))))) {  // py:610
    xmimpflag = 132  // py:610
  }
  if (pyTruthy((pyTruthy((pyTruthy(eq(rig, 26)) || pyTruthy(eq(rig, 29)) || pyTruthy(eq(rig, 42)) || pyTruthy(eq(rig, 43)) || pyTruthy(eq(rig, 54)) || pyTruthy(eq(rig, 59)) || pyTruthy(eq(rig, 61)) || pyTruthy(eq(rig, 65)) || pyTruthy(eq(rig, 80)) || pyTruthy(eq(rig, 86)) || pyTruthy((rig === null)))) && pyTruthy(safeGe(yearam, 1776)) && pyTruthy(safeLt(yearam, 1801))))) {  // py:611
    xmimpflag = 133  // py:611
  }
  if (pyTruthy((pyTruthy((pyTruthy(eq(rig, 26)) || pyTruthy(eq(rig, 29)) || pyTruthy(eq(rig, 42)) || pyTruthy(eq(rig, 43)) || pyTruthy(eq(rig, 54)) || pyTruthy(eq(rig, 59)) || pyTruthy(eq(rig, 61)) || pyTruthy(eq(rig, 65)) || pyTruthy(eq(rig, 80)) || pyTruthy(eq(rig, 86)) || pyTruthy((rig === null)))) && pyTruthy(safeGe(yearam, 1801)) && pyTruthy(safeLt(yearam, 1826))))) {  // py:612
    xmimpflag = 134  // py:612
  }
  if (pyTruthy((pyTruthy((pyTruthy(eq(rig, 26)) || pyTruthy(eq(rig, 29)) || pyTruthy(eq(rig, 42)) || pyTruthy(eq(rig, 43)) || pyTruthy(eq(rig, 54)) || pyTruthy(eq(rig, 59)) || pyTruthy(eq(rig, 61)) || pyTruthy(eq(rig, 65)) || pyTruthy(eq(rig, 80)) || pyTruthy(eq(rig, 86)) || pyTruthy((rig === null)))) && pyTruthy(safeGe(yearam, 1826)) && pyTruthy(safeLt(yearam, 1851))))) {  // py:613
    xmimpflag = 135  // py:613
  }
  if (pyTruthy((pyTruthy((pyTruthy(eq(rig, 26)) || pyTruthy(eq(rig, 29)) || pyTruthy(eq(rig, 42)) || pyTruthy(eq(rig, 43)) || pyTruthy(eq(rig, 54)) || pyTruthy(eq(rig, 59)) || pyTruthy(eq(rig, 61)) || pyTruthy(eq(rig, 65)) || pyTruthy(eq(rig, 80)) || pyTruthy(eq(rig, 86)) || pyTruthy((rig === null)))) && pyTruthy(safeGe(yearam, 1851)) && pyTruthy(safeLt(yearam, 1876))))) {  // py:614
    xmimpflag = 136  // py:614
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeLt(yearam, 1700)) && pyTruthy(eq(majbyimp, 60100))))) {  // py:615
    xmimpflag = 101  // py:615
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGe(yearam, 1700)) && pyTruthy(safeLt(yearam, 1801)) && pyTruthy(eq(majbyimp, 60100))))) {  // py:616
    xmimpflag = 102  // py:616
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGe(yearam, 1800)) && pyTruthy(eq(majbyimp, 60100))))) {  // py:617
    xmimpflag = 103  // py:617
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeLt(yearam, 1700)) && pyTruthy(eq(majbyimp, 60200))))) {  // py:618
    xmimpflag = 104  // py:618
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGe(yearam, 1700)) && pyTruthy(safeLt(yearam, 1801)) && pyTruthy(eq(majbyimp, 60200))))) {  // py:619
    xmimpflag = 105  // py:619
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGe(yearam, 1800)) && pyTruthy(eq(majbyimp, 60200))))) {  // py:620
    xmimpflag = 106  // py:620
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeLt(yearam, 1700)) && pyTruthy(eq(majbyimp, 60400))))) {  // py:621
    xmimpflag = 107  // py:621
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGe(yearam, 1700)) && pyTruthy(safeLt(yearam, 1801)) && pyTruthy(eq(majbyimp, 60400))))) {  // py:622
    xmimpflag = 108  // py:622
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeLt(yearam, 1700)) && pyTruthy(eq(majbyimp, 60500))))) {  // py:623
    xmimpflag = 110  // py:623
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGe(yearam, 1700)) && pyTruthy(safeLt(yearam, 1801)) && pyTruthy(eq(majbyimp, 60500))))) {  // py:624
    xmimpflag = 111  // py:624
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGe(yearam, 1800)) && pyTruthy(eq(majbyimp, 60500))))) {  // py:625
    xmimpflag = 112  // py:625
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeLt(yearam, 1700)) && pyTruthy(eq(majbyimp, 60600))))) {  // py:626
    xmimpflag = 113  // py:626
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGe(yearam, 1700)) && pyTruthy(safeLt(yearam, 1801)) && pyTruthy(eq(majbyimp, 60600))))) {  // py:627
    xmimpflag = 114  // py:627
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGe(yearam, 1800)) && pyTruthy(eq(majbyimp, 60600))))) {  // py:628
    xmimpflag = 115  // py:628
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeLt(yearam, 1700)) && pyTruthy(eq(majbyimp, 60700))))) {  // py:629
    xmimpflag = 116  // py:629
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGe(yearam, 1700)) && pyTruthy(safeLt(yearam, 1801)) && pyTruthy(eq(majbyimp, 60700))))) {  // py:630
    xmimpflag = 117  // py:630
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGe(yearam, 1800)) && pyTruthy(eq(majbyimp, 60700))))) {  // py:631
    xmimpflag = 118  // py:631
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGe(yearam, 1700)) && pyTruthy(safeLt(yearam, 1801)) && pyTruthy(eq(majbyimp, 60300))))) {  // py:632
    xmimpflag = 120  // py:632
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGe(yearam, 1800)) && pyTruthy(eq(majbyimp, 60300))))) {  // py:633
    xmimpflag = 121  // py:633
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeLt(yearam, 1700)) && pyTruthy(eq(majbyimp, 60800))))) {  // py:634
    xmimpflag = 122  // py:634
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGe(yearam, 1700)) && pyTruthy(safeLt(yearam, 1801)) && pyTruthy(eq(majbyimp, 60800))))) {  // py:635
    xmimpflag = 123  // py:635
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGe(yearam, 1800)) && pyTruthy(eq(majbyimp, 60800))))) {  // py:636
    xmimpflag = 124  // py:636
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeLt(yearam, 1627))))) {  // py:637
    xmimpflag = 1  // py:637
  }
  if (pyTruthy((pyTruthy((pyTruthy(safeGe(yearam, 1626)) && pyTruthy(safeLt(yearam, 1642)))) && pyTruthy((pyTruthy((pyTruthy(safeGe(mjselimp, 31100)) && pyTruthy(safeLt(mjselimp, 32000)))) || pyTruthy(eq(mjselimp1, 40000)) || pyTruthy(eq(mjselimp, 80400))))))) {  // py:638
    xmimpflag = 2  // py:638
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeLt(yearam, 1716)) && pyTruthy(safeGe(mjselimp, 36100)) && pyTruthy(safeLt(mjselimp, 37000))))) {  // py:639
    xmimpflag = 3  // py:639
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeLt(yearam, 1701)) && pyTruthy(eq(mjselimp, 50300))))) {  // py:640
    xmimpflag = 4  // py:640
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGe(yearam, 1700)) && pyTruthy(safeLt(yearam, 1800)) && pyTruthy(eq(mjselimp, 50300))))) {  // py:641
    xmimpflag = 5  // py:641
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGt(yearam, 1799)) && pyTruthy(eq(mjselimp, 50300))))) {  // py:642
    xmimpflag = 6  // py:642
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeLt(yearam, 1650)) && pyTruthy(eq(natinimp, 8))))) {  // py:643
    xmimpflag = 7  // py:643
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGe(yearam, 1650)) && pyTruthy(safeLt(yearam, 1674)) && pyTruthy(eq(natinimp, 8))))) {  // py:644
    xmimpflag = 8  // py:644
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGe(yearam, 1674)) && pyTruthy(safeLt(yearam, 1731)) && pyTruthy(eq(natinimp, 8))))) {  // py:645
    xmimpflag = 9  // py:645
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGt(yearam, 1730)) && pyTruthy(eq(natinimp, 8))))) {  // py:646
    xmimpflag = 10  // py:646
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeLt(yearam, 1751)) && pyTruthy(eq(mjselimp, 50200))))) {  // py:647
    xmimpflag = 11  // py:647
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGe(yearam, 1751)) && pyTruthy(safeLt(yearam, 1776)) && pyTruthy(eq(mjselimp, 50200))))) {  // py:648
    xmimpflag = 12  // py:648
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGe(yearam, 1776)) && pyTruthy(safeLt(yearam, 1801)) && pyTruthy(eq(mjselimp, 50200))))) {  // py:649
    xmimpflag = 13  // py:649
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGe(yearam, 1801)) && pyTruthy(safeLt(yearam, 1826)) && pyTruthy(eq(mjselimp, 50200))))) {  // py:650
    xmimpflag = 14  // py:650
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGt(yearam, 1825)) && pyTruthy(eq(mjselimp, 50200))))) {  // py:651
    xmimpflag = 15  // py:651
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGe(yearam, 1642)) && pyTruthy(safeLt(yearam, 1663)) && pyTruthy((pyTruthy((pyTruthy(safeGe(mjselimp, 31100)) && pyTruthy(safeLt(mjselimp, 32000)))) || pyTruthy(eq(mjselimp1, 40000)) || pyTruthy(eq(mjselimp, 80400))))))) {  // py:652
    xmimpflag = 16  // py:652
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGe(yearam, 1794)) && pyTruthy(safeLt(yearam, 1807)) && pyTruthy(eq(natinimp, 15))))) {  // py:653
    xmimpflag = 157  // py:653
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeLt(yearam, 1794)) && pyTruthy(eq(natinimp, 15))))) {  // py:654
    xmimpflag = 159  // py:654
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeLt(yearam, 1851)) && pyTruthy(eq(natinimp, 9))))) {  // py:655
    xmimpflag = 99  // py:655
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGe(yearam, 1851)) && pyTruthy(safeLt(yearam, 1876)) && pyTruthy(eq(natinimp, 9))))) {  // py:656
    xmimpflag = 100  // py:656
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeLt(yearam, 1751)) && pyTruthy(eq(rig, 1))))) {  // py:657
    xmimpflag = 17  // py:657
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGe(yearam, 1751)) && pyTruthy(safeLt(yearam, 1776)) && pyTruthy(eq(rig, 1))))) {  // py:658
    xmimpflag = 98  // py:658
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGe(yearam, 1776)) && pyTruthy(safeLt(yearam, 1801)) && pyTruthy(eq(rig, 1))))) {  // py:659
    xmimpflag = 18  // py:659
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGe(yearam, 1801)) && pyTruthy(safeLt(yearam, 1826)) && pyTruthy(eq(rig, 1))))) {  // py:660
    xmimpflag = 19  // py:660
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGe(yearam, 1826)) && pyTruthy(safeLt(yearam, 1851)) && pyTruthy(eq(rig, 1))))) {  // py:661
    xmimpflag = 20  // py:661
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGe(yearam, 1851)) && pyTruthy(safeLt(yearam, 1876)) && pyTruthy(eq(rig, 1))))) {  // py:662
    xmimpflag = 21  // py:662
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeLt(yearam, 1776)) && pyTruthy(eq(rig, 2))))) {  // py:663
    xmimpflag = 22  // py:663
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGe(yearam, 1776)) && pyTruthy(safeLt(yearam, 1801)) && pyTruthy(eq(rig, 2))))) {  // py:664
    xmimpflag = 23  // py:664
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGe(yearam, 1801)) && pyTruthy(safeLt(yearam, 1826)) && pyTruthy(eq(rig, 2))))) {  // py:665
    xmimpflag = 24  // py:665
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGe(yearam, 1826)) && pyTruthy(safeLt(yearam, 1851)) && pyTruthy(eq(rig, 2))))) {  // py:666
    xmimpflag = 25  // py:666
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGe(yearam, 1851)) && pyTruthy(safeLt(yearam, 1876)) && pyTruthy(eq(rig, 2))))) {  // py:667
    xmimpflag = 26  // py:667
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeLt(yearam, 1751)) && pyTruthy(eq(rig, 3))))) {  // py:668
    xmimpflag = 27  // py:668
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGe(yearam, 1751)) && pyTruthy(safeLt(yearam, 1776)) && pyTruthy(eq(rig, 3))))) {  // py:669
    xmimpflag = 28  // py:669
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGe(yearam, 1776)) && pyTruthy(safeLt(yearam, 1801)) && pyTruthy(eq(rig, 3))))) {  // py:670
    xmimpflag = 29  // py:670
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGe(yearam, 1801)) && pyTruthy(safeLt(yearam, 1876)) && pyTruthy(eq(rig, 3))))) {  // py:671
    xmimpflag = 30  // py:671
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeLt(yearam, 1726)) && pyTruthy(eq(rig, 4))))) {  // py:672
    xmimpflag = 31  // py:672
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGe(yearam, 1726)) && pyTruthy(safeLt(yearam, 1751)) && pyTruthy(eq(rig, 4))))) {  // py:673
    xmimpflag = 32  // py:673
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGe(yearam, 1751)) && pyTruthy(safeLt(yearam, 1776)) && pyTruthy(eq(rig, 4))))) {  // py:674
    xmimpflag = 33  // py:674
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGe(yearam, 1776)) && pyTruthy(safeLt(yearam, 1801)) && pyTruthy(eq(rig, 4))))) {  // py:675
    xmimpflag = 34  // py:675
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGe(yearam, 1801)) && pyTruthy(safeLt(yearam, 1826)) && pyTruthy(eq(rig, 4))))) {  // py:676
    xmimpflag = 35  // py:676
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGe(yearam, 1826)) && pyTruthy(safeLt(yearam, 1851)) && pyTruthy(eq(rig, 4))))) {  // py:677
    xmimpflag = 36  // py:677
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGe(yearam, 1851)) && pyTruthy(safeLt(yearam, 1876)) && pyTruthy(eq(rig, 4))))) {  // py:678
    xmimpflag = 37  // py:678
  }
  if (pyTruthy(eq(rig, 5))) {  // py:679
    xmimpflag = 38  // py:679
  }
  if (pyTruthy(eq(rig, 6))) {  // py:680
    xmimpflag = 39  // py:680
  }
  if (pyTruthy(eq(rig, 7))) {  // py:681
    xmimpflag = 40  // py:681
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeLt(yearam, 1776)) && pyTruthy(eq(rig, 8))))) {  // py:682
    xmimpflag = 41  // py:682
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGe(yearam, 1776)) && pyTruthy(safeLt(yearam, 1801)) && pyTruthy(eq(rig, 8))))) {  // py:683
    xmimpflag = 42  // py:683
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGe(yearam, 1801)) && pyTruthy(safeLt(yearam, 1826)) && pyTruthy(eq(rig, 8))))) {  // py:684
    xmimpflag = 43  // py:684
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGe(yearam, 1826)) && pyTruthy(safeLt(yearam, 1851)) && pyTruthy(eq(rig, 8))))) {  // py:685
    xmimpflag = 44  // py:685
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGe(yearam, 1851)) && pyTruthy(safeLt(yearam, 1876)) && pyTruthy(eq(rig, 8))))) {  // py:686
    xmimpflag = 45  // py:686
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeLt(yearam, 1826)) && pyTruthy((pyTruthy(eq(rig, 9)) || pyTruthy(eq(rig, 31))))))) {  // py:687
    xmimpflag = 46  // py:687
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGe(yearam, 1826)) && pyTruthy(safeLt(yearam, 1851)) && pyTruthy((pyTruthy(eq(rig, 9)) || pyTruthy(eq(rig, 31))))))) {  // py:688
    xmimpflag = 47  // py:688
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGe(yearam, 1851)) && pyTruthy(safeLt(yearam, 1876)) && pyTruthy((pyTruthy(eq(rig, 9)) || pyTruthy(eq(rig, 31))))))) {  // py:689
    xmimpflag = 48  // py:689
  }
  if (pyTruthy((pyTruthy(eq(rig, 10)) || pyTruthy(eq(rig, 24))))) {  // py:690
    xmimpflag = 49  // py:690
  }
  if (pyTruthy((pyTruthy(eq(rig, 11)) || pyTruthy(eq(rig, 12))))) {  // py:691
    xmimpflag = 50  // py:691
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeLt(yearam, 1751)) && pyTruthy(eq(rig, 13))))) {  // py:692
    xmimpflag = 51  // py:692
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGe(yearam, 1751)) && pyTruthy(safeLt(yearam, 1776)) && pyTruthy(eq(rig, 13))))) {  // py:693
    xmimpflag = 52  // py:693
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGe(yearam, 1776)) && pyTruthy(safeLt(yearam, 1801)) && pyTruthy(eq(rig, 13))))) {  // py:694
    xmimpflag = 53  // py:694
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGe(yearam, 1801)) && pyTruthy(safeLt(yearam, 1826)) && pyTruthy(eq(rig, 13))))) {  // py:695
    xmimpflag = 54  // py:695
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGe(yearam, 1826)) && pyTruthy(safeLt(yearam, 1877)) && pyTruthy(eq(rig, 13))))) {  // py:696
    xmimpflag = 55  // py:696
  }
  if (pyTruthy(eq(rig, 15))) {  // py:697
    xmimpflag = 56  // py:697
  }
  if (pyTruthy(eq(rig, 20))) {  // py:698
    xmimpflag = 57  // py:698
  }
  if (pyTruthy(eq(rig, 21))) {  // py:699
    xmimpflag = 58  // py:699
  }
  if (pyTruthy(eq(rig, 23))) {  // py:700
    xmimpflag = 59  // py:700
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeLt(yearam, 1751)) && pyTruthy(eq(rig, 25))))) {  // py:701
    xmimpflag = 60  // py:701
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGe(yearam, 1751)) && pyTruthy(safeLt(yearam, 1776)) && pyTruthy(eq(rig, 25))))) {  // py:702
    xmimpflag = 61  // py:702
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGe(yearam, 1776)) && pyTruthy(safeLt(yearam, 1801)) && pyTruthy(eq(rig, 25))))) {  // py:703
    xmimpflag = 62  // py:703
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGe(yearam, 1801)) && pyTruthy(safeLt(yearam, 1826)) && pyTruthy(eq(rig, 25))))) {  // py:704
    xmimpflag = 63  // py:704
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGe(yearam, 1826)) && pyTruthy(safeLt(yearam, 1851)) && pyTruthy(eq(rig, 25))))) {  // py:705
    xmimpflag = 160  // py:705
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGe(yearam, 1851)) && pyTruthy(safeLt(yearam, 1877)) && pyTruthy(eq(rig, 25))))) {  // py:706
    xmimpflag = 64  // py:706
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeLt(yearam, 1751)) && pyTruthy(eq(rig, 27))))) {  // py:707
    xmimpflag = 65  // py:707
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGe(yearam, 1751)) && pyTruthy(safeLt(yearam, 1776)) && pyTruthy(eq(rig, 27))))) {  // py:708
    xmimpflag = 66  // py:708
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGe(yearam, 1776)) && pyTruthy(safeLt(yearam, 1801)) && pyTruthy(eq(rig, 27))))) {  // py:709
    xmimpflag = 67  // py:709
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGe(yearam, 1801)) && pyTruthy(safeLt(yearam, 1877)) && pyTruthy(eq(rig, 27))))) {  // py:710
    xmimpflag = 68  // py:710
  }
  if (pyTruthy(eq(rig, 28))) {  // py:711
    xmimpflag = 69  // py:711
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeLt(yearam, 1726)) && pyTruthy((pyTruthy(eq(rig, 30)) || pyTruthy(eq(rig, 45)) || pyTruthy(eq(rig, 63))))))) {  // py:712
    xmimpflag = 70  // py:712
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGe(yearam, 1726)) && pyTruthy(safeLt(yearam, 1776)) && pyTruthy((pyTruthy(eq(rig, 30)) || pyTruthy(eq(rig, 45)) || pyTruthy(eq(rig, 63))))))) {  // py:713
    xmimpflag = 71  // py:713
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGe(yearam, 1776)) && pyTruthy(safeLt(yearam, 1801)) && pyTruthy((pyTruthy(eq(rig, 30)) || pyTruthy(eq(rig, 45)) || pyTruthy(eq(rig, 63))))))) {  // py:714
    xmimpflag = 97  // py:714
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGe(yearam, 1801)) && pyTruthy(safeLt(yearam, 1826)) && pyTruthy((pyTruthy(eq(rig, 30)) || pyTruthy(eq(rig, 45)) || pyTruthy(eq(rig, 63))))))) {  // py:715
    xmimpflag = 72  // py:715
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGe(yearam, 1826)) && pyTruthy(safeLt(yearam, 1876)) && pyTruthy((pyTruthy(eq(rig, 30)) || pyTruthy(eq(rig, 45)) || pyTruthy(eq(rig, 63))))))) {  // py:716
    xmimpflag = 85  // py:716
  }
  if (pyTruthy((pyTruthy(eq(rig, 32)) || pyTruthy(eq(rig, 39))))) {  // py:717
    xmimpflag = 73  // py:717
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeLt(yearam, 1726)) && pyTruthy(eq(rig, 35))))) {  // py:718
    xmimpflag = 74  // py:718
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGe(yearam, 1726)) && pyTruthy(safeLt(yearam, 1751)) && pyTruthy(eq(rig, 35))))) {  // py:719
    xmimpflag = 75  // py:719
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGe(yearam, 1751)) && pyTruthy(safeLt(yearam, 1776)) && pyTruthy(eq(rig, 35))))) {  // py:720
    xmimpflag = 76  // py:720
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGe(yearam, 1776)) && pyTruthy(safeLt(yearam, 1801)) && pyTruthy(eq(rig, 35))))) {  // py:721
    xmimpflag = 77  // py:721
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGe(yearam, 1801)) && pyTruthy(safeLt(yearam, 1877)) && pyTruthy(eq(rig, 35))))) {  // py:722
    xmimpflag = 78  // py:722
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeLt(yearam, 1776)) && pyTruthy(eq(rig, 40))))) {  // py:723
    xmimpflag = 79  // py:723
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGe(yearam, 1776)) && pyTruthy(safeLt(yearam, 1801)) && pyTruthy(eq(rig, 40))))) {  // py:724
    xmimpflag = 80  // py:724
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGe(yearam, 1801)) && pyTruthy(safeLt(yearam, 1826)) && pyTruthy(eq(rig, 40))))) {  // py:725
    xmimpflag = 81  // py:725
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGe(yearam, 1826)) && pyTruthy(safeLt(yearam, 1876)) && pyTruthy(eq(rig, 40))))) {  // py:726
    xmimpflag = 82  // py:726
  }
  if (pyTruthy((pyTruthy(eq(rig, 41)) || pyTruthy(eq(rig, 57))))) {  // py:727
    xmimpflag = 83  // py:727
  }
  if (pyTruthy(eq(rig, 44))) {  // py:728
    xmimpflag = 84  // py:728
  }
  if (pyTruthy(eq(rig, 47))) {  // py:729
    xmimpflag = 86  // py:729
  }
  if (pyTruthy(eq(rig, 48))) {  // py:730
    xmimpflag = 87  // py:730
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeLt(yearam, 1826)) && pyTruthy((pyTruthy(eq(rig, 14)) || pyTruthy(eq(rig, 36)) || pyTruthy(eq(rig, 49))))))) {  // py:731
    xmimpflag = 88  // py:731
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGe(yearam, 1826)) && pyTruthy(safeLt(yearam, 1876)) && pyTruthy((pyTruthy(eq(rig, 14)) || pyTruthy(eq(rig, 36)) || pyTruthy(eq(rig, 49))))))) {  // py:732
    xmimpflag = 89  // py:732
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeLt(yearam, 1826)) && pyTruthy((pyTruthy(eq(rig, 16)) || pyTruthy(eq(rig, 51))))))) {  // py:733
    xmimpflag = 90  // py:733
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGe(yearam, 1826)) && pyTruthy(safeLt(yearam, 1851)) && pyTruthy((pyTruthy(eq(rig, 16)) || pyTruthy(eq(rig, 51))))))) {  // py:734
    xmimpflag = 91  // py:734
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGe(yearam, 1851)) && pyTruthy(safeLt(yearam, 1876)) && pyTruthy((pyTruthy(eq(rig, 16)) || pyTruthy(eq(rig, 51))))))) {  // py:735
    xmimpflag = 92  // py:735
  }
  if (pyTruthy((pyTruthy(eq(rig, 17)) || pyTruthy(eq(rig, 19)) || pyTruthy(eq(rig, 52)) || pyTruthy(eq(rig, 53))))) {  // py:736
    xmimpflag = 93  // py:736
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeLt(yearam, 1726)) && pyTruthy(eq(rig, 60))))) {  // py:737
    xmimpflag = 94  // py:737
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGe(yearam, 1726)) && pyTruthy(safeLt(yearam, 1826)) && pyTruthy(eq(rig, 60))))) {  // py:738
    xmimpflag = 95  // py:738
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGe(yearam, 1826)) && pyTruthy(safeLt(yearam, 1876)) && pyTruthy(eq(rig, 60))))) {  // py:739
    xmimpflag = 96  // py:739
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeLt(yearam, 1776)) && pyTruthy(eq(rig, 1)) && pyTruthy(eq(natinimp, 9))))) {  // py:740
    xmimpflag = 137  // py:740
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGe(yearam, 1776)) && pyTruthy(safeLt(yearam, 1801)) && pyTruthy(eq(rig, 1)) && pyTruthy(eq(natinimp, 9))))) {  // py:741
    xmimpflag = 138  // py:741
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGe(yearam, 1801)) && pyTruthy(safeLt(yearam, 1826)) && pyTruthy(eq(rig, 1)) && pyTruthy(eq(natinimp, 9))))) {  // py:742
    xmimpflag = 139  // py:742
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGt(yearam, 1825)) && pyTruthy(eq(rig, 1)) && pyTruthy(eq(natinimp, 9))))) {  // py:743
    xmimpflag = 140  // py:743
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeLt(yearam, 1776)) && pyTruthy((pyTruthy(eq(rig, 2)) || pyTruthy(eq(rig, 5)))) && pyTruthy(eq(natinimp, 9))))) {  // py:744
    xmimpflag = 141  // py:744
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGe(yearam, 1776)) && pyTruthy(safeLt(yearam, 1801)) && pyTruthy((pyTruthy(eq(rig, 2)) || pyTruthy(eq(rig, 5)))) && pyTruthy(eq(natinimp, 9))))) {  // py:745
    xmimpflag = 142  // py:745
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGe(yearam, 1801)) && pyTruthy(safeLt(yearam, 1826)) && pyTruthy(eq(rig, 5)) && pyTruthy(eq(natinimp, 9))))) {  // py:746
    xmimpflag = 143  // py:746
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGt(yearam, 1825)) && pyTruthy((pyTruthy(eq(rig, 2)) || pyTruthy(eq(rig, 5)))) && pyTruthy(eq(natinimp, 9))))) {  // py:747
    xmimpflag = 145  // py:747
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeLt(yearam, 1776)) && pyTruthy(eq(rig, 4)) && pyTruthy(eq(natinimp, 9))))) {  // py:748
    xmimpflag = 146  // py:748
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGe(yearam, 1776)) && pyTruthy(safeLt(yearam, 1801)) && pyTruthy(eq(rig, 4)) && pyTruthy(eq(natinimp, 9))))) {  // py:749
    xmimpflag = 147  // py:749
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGe(yearam, 1801)) && pyTruthy(safeLt(yearam, 1826)) && pyTruthy(eq(rig, 4)) && pyTruthy(eq(natinimp, 9))))) {  // py:750
    xmimpflag = 148  // py:750
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGt(yearam, 1825)) && pyTruthy(eq(rig, 4)) && pyTruthy(eq(natinimp, 9))))) {  // py:751
    xmimpflag = 149  // py:751
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeLt(yearam, 1776)) && pyTruthy(eq(rig, 8)) && pyTruthy(eq(natinimp, 9))))) {  // py:752
    xmimpflag = 150  // py:752
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGe(yearam, 1776)) && pyTruthy(safeLt(yearam, 1826)) && pyTruthy(eq(rig, 8)) && pyTruthy(eq(natinimp, 9))))) {  // py:753
    xmimpflag = 151  // py:753
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGt(yearam, 1825)) && pyTruthy(eq(rig, 8)) && pyTruthy(eq(natinimp, 9))))) {  // py:754
    xmimpflag = 152  // py:754
  }
  if (pyTruthy((pyTruthy(yearam) && pyTruthy(safeGe(yearam, 1826)) && pyTruthy(safeLt(yearam, 1876)) && pyTruthy(eq(rig, 9)) && pyTruthy(eq(natinimp, 9))))) {  // py:755
    xmimpflag = 154  // py:755
  }
  if (pyTruthy((pyTruthy(eq(rig, 27)) && pyTruthy(eq(natinimp, 9))))) {  // py:756
    xmimpflag = 155  // py:756
  }
  if (pyTruthy((pyTruthy(eq(rig, 35)) && pyTruthy(eq(natinimp, 9))))) {  // py:757
    xmimpflag = 156  // py:757
  }
  slaximp = null  // py:762
  slamimp = null  // py:763
  captive_threshold = (pyTruthy(is_iam) ? 0 : 50)  // py:764
  if (pyTruthy(safeGe(tslavesd, 1))) {  // py:765
    slaximp = tslavesd  // py:765
  }
  if (pyTruthy((pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(safeGe(tslavesp, 1))))) {  // py:766
    slaximp = tslavesp  // py:766
  }
  if (pyTruthy((pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(safeGt(ncartot, slaarriv)) && pyTruthy(slaarriv)))) {  // py:767
    slaximp = ncartot  // py:767
  }
  if (pyTruthy((pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(safeGt(ncartot, slastot)) && pyTruthy(slastot)))) {  // py:768
    slaximp = ncartot  // py:768
  }
  if (pyTruthy((pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot)) && pyTruthy(safeLt(ncartot, captive_threshold))))) {  // py:769
    ncartot = null  // py:769
  }
  if (pyTruthy((pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot)) && pyTruthy(safeGe(ncartot, captive_threshold))))) {  // py:770
    slaximp = ncartot  // py:770
  }
  if (pyTruthy(safeGe(slaarriv, 1))) {  // py:772
    slamimp = slaarriv  // py:772
  }
  if (pyTruthy((pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(safeLe(slastot, tslavesd))))) {  // py:773
    slamimp = slastot  // py:773
  }
  if (pyTruthy((pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(safeLe(slastot, tslavesp))))) {  // py:774
    slamimp = slastot  // py:774
  }
  if (pyTruthy((pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(safeLe(slastot, ncartot))))) {  // py:775
    slamimp = slastot  // py:775
  }
  if (pyTruthy((pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(safeLt(slastot, captive_threshold))))) {  // py:776
    slastot = null  // py:776
  }
  if (pyTruthy((pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(safeGe(slastot, captive_threshold))))) {  // py:777
    slamimp = slastot  // py:777
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 127)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:779
    slamimp = (slaximp - (slaximp * 0.165107561642471))  // py:779
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 127)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:780
    slaximp = (slamimp / (1 - 0.165107561642471))  // py:780
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 127)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:781
    slamimp = 163.181286549708  // py:781
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 127)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:782
    slaximp = (163.181286549708 / (1 - 0.165107561642471))  // py:782
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 128)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:783
    slamimp = (slaximp - (slaximp * 0.230972326367458))  // py:783
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 128)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:784
    slaximp = (slamimp / (1 - 0.230972326367458))  // py:784
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 128)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:785
    slamimp = 241.774647887324  // py:785
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 128)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:786
    slaximp = (241.774647887324 / (1 - 0.230972326367458))  // py:786
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 129)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:787
    slamimp = (slaximp - (slaximp * 0.218216262481124))  // py:787
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 129)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:788
    slaximp = (slamimp / (1 - 0.218216262481124))  // py:788
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 129)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:789
    slamimp = 249.141527001862  // py:789
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 129)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:790
    slaximp = (249.141527001862 / (1 - 0.218216262481124))  // py:790
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 130)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:791
    slamimp = (slaximp - (slaximp * 0.164154067860228))  // py:791
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 130)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:792
    slaximp = (slamimp / (1 - 0.164154067860228))  // py:792
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 130)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:793
    slamimp = 227.680034129693  // py:793
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 130)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:794
    slaximp = (227.680034129693 / (1 - 0.164154067860228))  // py:794
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 131)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:795
    slamimp = (slaximp - (slaximp * 0.153670852602567))  // py:795
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 131)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:796
    slaximp = (slamimp / (1 - 0.153670852602567))  // py:796
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 131)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:797
    slamimp = 272.60549132948  // py:797
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 131)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:798
    slaximp = (272.60549132948 / (1 - 0.153670852602567))  // py:798
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 132)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:799
    slamimp = (slaximp - (slaximp * 0.120410468186061))  // py:799
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 132)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:800
    slaximp = (slamimp / (1 - 0.120410468186061))  // py:800
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 132)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:801
    slamimp = 268.071314102564  // py:801
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 132)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:802
    slaximp = (268.071314102564 / (1 - 0.120410468186061))  // py:802
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 133)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:803
    slamimp = (slaximp - (slaximp * 0.126821090786133))  // py:803
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 133)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:804
    slaximp = (slamimp / (1 - 0.126821090786133))  // py:804
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 133)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:805
    slamimp = 290.826654240447  // py:805
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 133)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:806
    slaximp = (290.826654240447 / (1 - 0.126821090786133))  // py:806
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 134)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:807
    slamimp = (slaximp - (slaximp * 0.105799354866935))  // py:807
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 134)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:808
    slaximp = (slamimp / (1 - 0.105799354866935))  // py:808
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 134)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:809
    slamimp = 225.932515337423  // py:809
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 134)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:810
    slaximp = (225.932515337423 / (1 - 0.105799354866935))  // py:810
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 135)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:811
    slamimp = (slaximp - (slaximp * 0.114160782328086))  // py:811
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 135)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:812
    slaximp = (slamimp / (1 - 0.114160782328086))  // py:812
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 135)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:813
    slamimp = 391.452674897119  // py:813
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 135)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:814
    slaximp = (391.452674897119 / (1 - 0.114160782328086))  // py:814
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 136)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:815
    slamimp = (slaximp - (slaximp * 0.170755559662484))  // py:815
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 136)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:816
    slaximp = (slamimp / (1 - 0.170755559662484))  // py:816
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 136)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:817
    slamimp = 480.734042553191  // py:817
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 136)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:818
    slaximp = (480.734042553191 / (1 - 0.170755559662484))  // py:818
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 101)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:819
    slamimp = (slaximp - (slaximp * 0.142415261804064))  // py:819
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 101)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:820
    slaximp = (slamimp / (1 - 0.142415261804064))  // py:820
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 101)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:821
    slamimp = 163.80243902439  // py:821
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 101)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:822
    slaximp = (163.80243902439 / (1 - 0.142415261804064))  // py:822
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 102)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:823
    slamimp = (slaximp - (slaximp * 0.104951847967976))  // py:823
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 102)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:824
    slaximp = (slamimp / (1 - 0.104951847967976))  // py:824
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 102)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:825
    slamimp = 153.265497076023  // py:825
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 102)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:826
    slaximp = (153.265497076023 / (1 - 0.104951847967976))  // py:826
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 103)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:827
    slamimp = (slaximp - (slaximp * 0.0794334443169517))  // py:827
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 103)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:828
    slaximp = (slamimp / (1 - 0.0794334443169517))  // py:828
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 103)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:829
    slamimp = 138.094017094017  // py:829
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 103)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:830
    slaximp = (138.094017094017 / (1 - 0.0794334443169517))  // py:830
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 104)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:831
    slamimp = (slaximp - (slaximp * 0.125269157905197))  // py:831
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 104)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:832
    slaximp = (slamimp / (1 - 0.125269157905197))  // py:832
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 104)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:833
    slaximp = 107.64  // py:833
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 104)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:834
    slamimp = (107.64 - (107.64 * 0.125269157905197))  // py:834
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 105)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:835
    slamimp = (slaximp - (slaximp * 0.0887057111704602))  // py:835
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 105)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:836
    slaximp = (slamimp / (1 - 0.0887057111704602))  // py:836
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 105)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:837
    slamimp = 191.988789237668  // py:837
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 105)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:838
    slaximp = (191.988789237668 / (1 - 0.0887057111704602))  // py:838
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 106)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:839
    slamimp = (slaximp - (slaximp * 0.0985396051230542))  // py:839
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 106)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:840
    slaximp = (slamimp / (1 - 0.0985396051230542))  // py:840
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 106)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:841
    slamimp = 188.140969162996  // py:841
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 106)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:842
    slaximp = (188.140969162996 / (1 - 0.0985396051230542))  // py:842
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 107)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:843
    slamimp = (slaximp - (slaximp * 0.199714956235816))  // py:843
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 107)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:844
    slaximp = (slamimp / (1 - 0.199714956235816))  // py:844
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 107)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:845
    slamimp = 239.363636363636  // py:845
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 107)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:846
    slaximp = (239.363636363636 / (1 - 0.199714956235816))  // py:846
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 108)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:847
    slamimp = (slaximp - (slaximp * 0.116764553914052))  // py:847
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 108)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:848
    slaximp = (slamimp / (1 - 0.116764553914052))  // py:848
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 108)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:849
    slamimp = 241.066480055983  // py:849
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 108)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:850
    slaximp = (241.066480055983 / (1 - 0.116764553914052))  // py:850
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 110)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:851
    slamimp = (slaximp - (slaximp * 0.217817105373686))  // py:851
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 110)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:852
    slaximp = (slamimp / (1 - 0.217817105373686))  // py:852
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 110)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:853
    slamimp = 321.139784946236  // py:853
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 110)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:854
    slaximp = (321.139784946236 / (1 - 0.217817105373686))  // py:854
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 111)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:855
    slamimp = (slaximp - (slaximp * 0.134584278813695))  // py:855
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 111)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:856
    slaximp = (slamimp / (1 - 0.134584278813695))  // py:856
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 111)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:857
    slamimp = 320.396527777777  // py:857
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 111)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:858
    slaximp = (320.396527777777 / (1 - 0.134584278813695))  // py:858
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 112)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:859
    slamimp = (slaximp - (slaximp * 0.0649564900465187))  // py:859
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 112)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:860
    slaximp = (slamimp / (1 - 0.0649564900465187))  // py:860
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 112)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:861
    slamimp = 302.919243986254  // py:861
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 112)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:862
    slaximp = (302.919243986254 / (1 - 0.0649564900465187))  // py:862
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 113)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:863
    slamimp = (slaximp - (slaximp * 0.294943293777566))  // py:863
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 113)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:864
    slaximp = (slamimp / (1 - 0.294943293777566))  // py:864
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 113)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:865
    slamimp = 178.191780821918  // py:865
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 113)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:866
    slaximp = (178.191780821918 / (1 - 0.294943293777566))  // py:866
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 114)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:867
    slamimp = (slaximp - (slaximp * 0.190466263797331))  // py:867
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 114)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:868
    slaximp = (slamimp / (1 - 0.190466263797331))  // py:868
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 114)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:869
    slamimp = 268.709993468321  // py:869
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 114)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:870
    slaximp = (268.709993468321 / (1 - 0.190466263797331))  // py:870
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 115)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:871
    slamimp = (slaximp - (slaximp * 0.165262209695588))  // py:871
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 115)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:872
    slaximp = (slamimp / (1 - 0.165262209695588))  // py:872
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 115)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:873
    slamimp = 265.480215827338  // py:873
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 115)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:874
    slaximp = (265.480215827338 / (1 - 0.165262209695588))  // py:874
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 116)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:875
    slamimp = (slaximp - (slaximp * 0.250590294065011))  // py:875
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 116)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:876
    slaximp = (slamimp / (1 - 0.250590294065011))  // py:876
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 116)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:877
    slamimp = 216.026607538803  // py:877
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 116)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:878
    slaximp = (216.026607538803 / (1 - 0.250590294065011))  // py:878
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 117)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:879
    slamimp = (slaximp - (slaximp * 0.0862116624182079))  // py:879
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 117)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:880
    slaximp = (slamimp / (1 - 0.0862116624182079))  // py:880
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 117)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:881
    slamimp = 341.979498861048  // py:881
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 117)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:882
    slaximp = (341.979498861048 / (1 - 0.0862116624182079))  // py:882
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 118)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:883
    slamimp = (slaximp - (slaximp * 0.0795782666543268))  // py:883
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 118)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:884
    slaximp = (slamimp / (1 - 0.0795782666543268))  // py:884
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 118)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:885
    slamimp = 382.444580777097  // py:885
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 118)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:886
    slaximp = (382.444580777097 / (1 - 0.0795782666543268))  // py:886
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 120)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:887
    slamimp = (slaximp - (slaximp * 0.100542298212489))  // py:887
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 120)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:888
    slaximp = (slamimp / (1 - 0.100542298212489))  // py:888
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 120)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:889
    slamimp = 191.62583518931  // py:889
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 120)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:890
    slaximp = (191.62583518931 / (1 - 0.100542298212489))  // py:890
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 121)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:891
    slamimp = (slaximp - (slaximp * 0.0690791392436498))  // py:891
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 121)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:892
    slaximp = (slamimp / (1 - 0.0690791392436498))  // py:892
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 121)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:893
    slamimp = 162.041666666667  // py:893
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 121)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:894
    slaximp = (162.041666666667 / (1 - 0.0690791392436498))  // py:894
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 122)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:895
    slamimp = (slaximp - (slaximp * 0.274602006426542))  // py:895
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 122)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:896
    slaximp = (slamimp / (1 - 0.274602006426542))  // py:896
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 122)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:897
    slamimp = 173.454545454545  // py:897
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 122)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:898
    slaximp = (173.454545454545 / (1 - 0.274602006426542))  // py:898
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 123)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:899
    slamimp = (slaximp - (slaximp * 0.274602006426542))  // py:899
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 123)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:900
    slaximp = (slamimp / (1 - 0.274602006426542))  // py:900
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 123)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:901
    slamimp = 255.028571428571  // py:901
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 123)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:902
    slaximp = (255.028571428571 / (1 - 0.274602006426542))  // py:902
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 124)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:903
    slamimp = (slaximp - (slaximp * 0.181330570603409))  // py:903
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 124)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:904
    slaximp = (slamimp / (1 - 0.181330570603409))  // py:904
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 124)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:905
    slamimp = 447.532008830022  // py:905
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 124)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:906
    slaximp = (447.532008830022 / (1 - 0.181330570603409))  // py:906
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 1)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:907
    slamimp = (slaximp - (slaximp * 0.255634697158707))  // py:907
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 1)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:908
    slaximp = (slamimp / (1 - 0.255634697158707))  // py:908
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:909
    slamimp = 166.401374570447  // py:909
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:910
    slaximp = (166.401374570447 / (1 - 0.255634697158707))  // py:910
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 2)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:911
    slamimp = (slaximp - (slaximp * 0.173114449095158))  // py:911
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 2)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:912
    slaximp = (slamimp / (1 - 0.173114449095158))  // py:912
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 2)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:913
    slamimp = 152.863945578231  // py:913
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 2)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:914
    slaximp = (152.863945578231 / (1 - 0.173114449095158))  // py:914
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 3)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:915
    slamimp = (slaximp - (slaximp * 0.191426939591589))  // py:915
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 3)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:916
    slaximp = (slamimp / (1 - 0.191426939591589))  // py:916
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 3)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:917
    slamimp = 250.179245283019  // py:917
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 3)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:918
    slaximp = (250.179245283019 / (1 - 0.191426939591589))  // py:918
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 4)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:919
    slamimp = (slaximp - (slaximp * 0.143739162059858))  // py:919
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 4)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:920
    slaximp = (slamimp / (1 - 0.143739162059858))  // py:920
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 4)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:921
    slaximp = 273.896226415094  // py:921
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 4)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:922
    slamimp = (273.896226415094 - (273.896226415094 * 0.143739162059858))  // py:922
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 5)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:923
    slamimp = (slaximp - (slaximp * 0.0703329947332674))  // py:923
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 5)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:924
    slaximp = (slamimp / (1 - 0.0703329947332674))  // py:924
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 5)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:925
    slaximp = 380.04854368932  // py:925
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 5)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:926
    slamimp = (380.04854368932 - (380.04854368932 * 0.0703329947332674))  // py:926
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 6)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:927
    slamimp = (slaximp - (slaximp * 0.117444418143106))  // py:927
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 6)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:928
    slaximp = (slamimp / (1 - 0.117444418143106))  // py:928
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 6)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:929
    slamimp = 305.868020304568  // py:929
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 6)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:930
    slaximp = (305.868020304568 / (1 - 0.117444418143106))  // py:930
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 7)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:931
    slamimp = (slaximp - (slaximp * 0.126779394689057))  // py:931
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 7)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:932
    slaximp = (slamimp / (1 - 0.126779394689057))  // py:932
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 7)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:933
    slaximp = 265.88  // py:933
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 7)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:934
    slamimp = (265.88 - (265.88 * 0.126779394689057))  // py:934
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 8)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:935
    slamimp = (slaximp - (slaximp * 0.189011301766662))  // py:935
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 8)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:936
    slaximp = (slamimp / (1 - 0.189011301766662))  // py:936
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 8)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:937
    slamimp = 281.325  // py:937
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 8)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:938
    slaximp = (281.325 / (1 - 0.189011301766662))  // py:938
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 9)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:939
    slamimp = (slaximp - (slaximp * 0.140365224720275))  // py:939
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 9)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:940
    slaximp = (slamimp / (1 - 0.140365224720275))  // py:940
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 9)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:941
    slamimp = 402.502202643172  // py:941
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 9)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:942
    slaximp = (402.502202643172 / (1 - 0.140365224720275))  // py:942
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 10)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:943
    slamimp = (slaximp - (slaximp * 0.107188743129005))  // py:943
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 10)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:944
    slaximp = (slamimp / (1 - 0.107188743129005))  // py:944
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 10)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:945
    slamimp = 277.059842519684  // py:945
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 10)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:946
    slaximp = (277.059842519684 / (1 - 0.107188743129005))  // py:946
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 11)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:947
    slamimp = (slaximp - (slaximp * 0.126901348540731))  // py:947
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 11)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:948
    slaximp = (slamimp / (1 - 0.126901348540731))  // py:948
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 11)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:949
    slamimp = 355.810945273632  // py:949
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 11)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:950
    slaximp = (355.810945273632 / (1 - 0.126901348540731))  // py:950
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 12)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:951
    slamimp = (slaximp - (slaximp * 0.0655772248600899))  // py:951
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 12)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:952
    slaximp = (slamimp / (1 - 0.0655772248600899))  // py:952
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 12)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:953
    slamimp = 309.533898305085  // py:953
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 12)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:954
    slaximp = (309.533898305085 / (1 - 0.0655772248600899))  // py:954
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 13)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:955
    slamimp = (slaximp - (slaximp * 0.0778021073375869))  // py:955
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 13)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:956
    slaximp = (slamimp / (1 - 0.0778021073375869))  // py:956
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 13)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:957
    slamimp = 305.812154696132  // py:957
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 13)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:958
    slaximp = (305.812154696132 / (1 - 0.0778021073375869))  // py:958
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 14)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:959
    slamimp = (slaximp - (slaximp * 0.0654921908875572))  // py:959
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 14)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:960
    slaximp = (slamimp / (1 - 0.0654921908875572))  // py:960
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 14)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:961
    slamimp = 285.054112554113  // py:961
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 14)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:962
    slaximp = (285.054112554113 / (1 - 0.0654921908875572))  // py:962
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 15)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:963
    slamimp = (slaximp - (slaximp * 0.0671696102131247))  // py:963
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 15)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:964
    slaximp = (slamimp / (1 - 0.0671696102131247))  // py:964
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 15)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:965
    slamimp = 361.638059701493  // py:965
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 15)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:966
    slaximp = (361.638059701493 / (1 - 0.0671696102131247))  // py:966
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 16)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:967
    slamimp = (slaximp - (slaximp * 0.371414750110571))  // py:967
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 16)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:968
    slaximp = (slamimp / (1 - 0.371414750110571))  // py:968
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 16)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:969
    slamimp = 239.9  // py:969
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 16)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:970
    slaximp = (239.9 / (1 - 0.371414750110571))  // py:970
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 157)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:971
    slamimp = (slaximp - (slaximp * 0.230610260687796))  // py:971
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 157)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:972
    slaximp = (slamimp / (1 - 0.230610260687796))  // py:972
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 157)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:973
    slamimp = 139.029411764706  // py:973
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 157)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:974
    slaximp = (139.029411764706 / (1 - 0.230610260687796))  // py:974
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 159)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:975
    slamimp = (slaximp - (slaximp * 0.154487726688789))  // py:975
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 159)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:976
    slaximp = (slamimp / (1 - 0.154487726688789))  // py:976
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 159)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:977
    slamimp = 245.12676056338  // py:977
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 159)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:978
    slaximp = (245.12676056338 / (1 - 0.154487726688789))  // py:978
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 99)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:979
    slamimp = (slaximp - (slaximp * 0.166050441674744))  // py:979
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 99)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:980
    slaximp = (slamimp / (1 - 0.166050441674744))  // py:980
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 99)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:981
    slamimp = 125.619750283768  // py:981
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 99)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:982
    slaximp = (125.619750283768 / (1 - 0.166050441674744))  // py:982
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 100)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:983
    slamimp = (slaximp - (slaximp * 0.178717812379779))  // py:983
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 100)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:984
    slaximp = (slamimp / (1 - 0.178717812379779))  // py:984
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 100)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:985
    slamimp = 565.645161290322  // py:985
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 100)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:986
    slaximp = (565.645161290322 / (1 - 0.178717812379779))  // py:986
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 17)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:987
    slamimp = (slaximp - (slaximp * 0.0557746478873239))  // py:987
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 17)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:988
    slaximp = (slamimp / (1 - 0.0557746478873239))  // py:988
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 17)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:989
    slamimp = 148.882352941176  // py:989
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 17)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:990
    slaximp = (148.882352941176 / (1 - 0.0557746478873239))  // py:990
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 98)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:991
    slamimp = (slaximp - (slaximp * 0.126563817175912))  // py:991
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 98)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:992
    slaximp = (slamimp / (1 - 0.126563817175912))  // py:992
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 98)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:993
    slamimp = 132.596685082873  // py:993
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 98)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:994
    slaximp = (132.596685082873 / (1 - 0.126563817175912))  // py:994
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 18)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:995
    slamimp = (slaximp - (slaximp * 0.093544030879478))  // py:995
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 18)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:996
    slaximp = (slamimp / (1 - 0.093544030879478))  // py:996
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 18)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:997
    slamimp = 184.486013986014  // py:997
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 18)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:998
    slaximp = (184.486013986014 / (1 - 0.093544030879478))  // py:998
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 19)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:999
    slamimp = (slaximp - (slaximp * 0.0985982521761244))  // py:999
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 19)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1000
    slaximp = (slamimp / (1 - 0.0985982521761244))  // py:1000
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 19)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1001
    slamimp = 230.298469387755  // py:1001
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 19)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1002
    slaximp = (230.298469387755 / (1 - 0.0985982521761244))  // py:1002
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 20)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1003
    slamimp = (slaximp - (slaximp * 0.0944678720322908))  // py:1003
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 20)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1004
    slaximp = (slamimp / (1 - 0.0944678720322908))  // py:1004
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 20)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1005
    slamimp = 444.290145985401  // py:1005
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 20)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1006
    slaximp = (444.290145985401 / (1 - 0.0944678720322908))  // py:1006
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 21)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1007
    slamimp = (slaximp - (slaximp * 0.167379623404603))  // py:1007
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 21)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1008
    slaximp = (slamimp / (1 - 0.167379623404603))  // py:1008
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 21)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1009
    slamimp = 492.946428571429  // py:1009
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 21)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1010
    slaximp = (492.946428571429 / (1 - 0.167379623404603))  // py:1010
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 22)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1011
    slamimp = (slaximp - (slaximp * 0.183801786070534))  // py:1011
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 22)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1012
    slaximp = (slamimp / (1 - 0.183801786070534))  // py:1012
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 22)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1013
    slamimp = 91.9594594594595  // py:1013
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 22)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1014
    slaximp = (91.9594594594595 / (1 - 0.183801786070534))  // py:1014
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 23)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1015
    slamimp = (slaximp - (slaximp * 0.102358180948044))  // py:1015
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 23)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1016
    slaximp = (slamimp / (1 - 0.102358180948044))  // py:1016
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 23)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1017
    slamimp = 95.972972972973  // py:1017
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 23)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1018
    slaximp = (95.972972972973 / (1 - 0.102358180948044))  // py:1018
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 24)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1019
    slamimp = (slaximp - (slaximp * 0.122708750828674))  // py:1019
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 24)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1020
    slaximp = (slamimp / (1 - 0.122708750828674))  // py:1020
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 24)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1021
    slamimp = 146.31  // py:1021
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 24)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1022
    slaximp = (146.31 / (1 - 0.122708750828674))  // py:1022
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 25)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1023
    slamimp = (slaximp - (slaximp * 0.101742168136026))  // py:1023
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 25)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1024
    slaximp = (slamimp / (1 - 0.101742168136026))  // py:1024
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 25)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1025
    slamimp = 279.357142857143  // py:1025
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 25)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1026
    slaximp = (279.357142857143 / (1 - 0.101742168136026))  // py:1026
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 26)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1027
    slamimp = (slaximp - (slaximp * 0.0830808603000646))  // py:1027
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 26)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1028
    slaximp = (slamimp / (1 - 0.0830808603000646))  // py:1028
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 26)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1029
    slamimp = 341.5  // py:1029
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 26)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1030
    slaximp = (341.5 / (1 - 0.0830808603000646))  // py:1030
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 27)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1031
    slamimp = (slaximp - (slaximp * 0.0951735364832193))  // py:1031
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 27)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1032
    slaximp = (slamimp / (1 - 0.0951735364832193))  // py:1032
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 27)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1033
    slaximp = 335.546666666667  // py:1033
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 27)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1034
    slamimp = (335.546666666667 - (335.546666666667 * 0.0951735364832193))  // py:1034
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 28)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1035
    slamimp = (slaximp - (slaximp * 0.0599984615282753))  // py:1035
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 28)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1036
    slaximp = (slamimp / (1 - 0.0599984615282753))  // py:1036
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 28)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1037
    slaximp = 348.926267281106  // py:1037
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 28)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1038
    slamimp = (348.926267281106 - (348.926267281106 * 0.0599984615282753))  // py:1038
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 29)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1039
    slamimp = (slaximp - (slaximp * 0.0849037398486349))  // py:1039
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 29)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1040
    slaximp = (slamimp / (1 - 0.0849037398486349))  // py:1040
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 29)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1041
    slamimp = 323.539358600583  // py:1041
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 29)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1042
    slaximp = (323.539358600583 / (1 - 0.0849037398486349))  // py:1042
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 30)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1043
    slamimp = (slaximp - (slaximp * 0.0831292966753462))  // py:1043
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 30)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1044
    slaximp = (slamimp / (1 - 0.0831292966753462))  // py:1044
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 30)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1045
    slamimp = 435.738461538461  // py:1045
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 30)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1046
    slaximp = (435.738461538461 / (1 - 0.0831292966753462))  // py:1046
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 31)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1047
    slamimp = (slaximp - (slaximp * 0.154603810637904))  // py:1047
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 31)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1048
    slaximp = (slamimp / (1 - 0.154603810637904))  // py:1048
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 31)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1049
    slamimp = 221.279220779221  // py:1049
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 31)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1050
    slaximp = (221.279220779221 / (1 - 0.154603810637904))  // py:1050
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 32)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1051
    slamimp = (slaximp - (slaximp * 0.169381440464976))  // py:1051
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 32)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1052
    slaximp = (slamimp / (1 - 0.169381440464976))  // py:1052
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 32)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1053
    slamimp = 296.593103448276  // py:1053
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 32)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1054
    slaximp = (296.593103448276 / (1 - 0.169381440464976))  // py:1054
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 33)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1055
    slamimp = (slaximp - (slaximp * 0.183684529291394))  // py:1055
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 33)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1056
    slaximp = (slamimp / (1 - 0.183684529291394))  // py:1056
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 33)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1057
    slamimp = 281.452966714906  // py:1057
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 33)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1058
    slaximp = (281.452966714906 / (1 - 0.183684529291394))  // py:1058
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 34)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1059
    slamimp = (slaximp - (slaximp * 0.0864964921326426))  // py:1059
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 34)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1060
    slaximp = (slamimp / (1 - 0.0864964921326426))  // py:1060
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 34)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1061
    slamimp = 325.652360515021  // py:1061
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 34)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1062
    slaximp = (325.652360515021 / (1 - 0.0864964921326426))  // py:1062
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 35)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1063
    slamimp = (slaximp - (slaximp * 0.176037224384829))  // py:1063
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 35)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1064
    slaximp = (slamimp / (1 - 0.176037224384829))  // py:1064
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 35)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1065
    slamimp = 272.474358974359  // py:1065
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 35)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1066
    slaximp = (272.474358974359 / (1 - 0.176037224384829))  // py:1066
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 36)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1067
    slamimp = (slaximp - (slaximp * 0.116937605450612))  // py:1067
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 36)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1068
    slaximp = (slamimp / (1 - 0.116937605450612))  // py:1068
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 36)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1069
    slamimp = 556.677419354839  // py:1069
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 36)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1070
    slaximp = (556.677419354839 / (1 - 0.116937605450612))  // py:1070
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 37)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1071
    slamimp = (slaximp - (slaximp * 0.172812495199871))  // py:1071
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 37)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1072
    slaximp = (slamimp / (1 - 0.172812495199871))  // py:1072
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 37)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1073
    slamimp = 890.470588235294  // py:1073
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 37)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1074
    slaximp = (890.470588235294 / (1 - 0.172812495199871))  // py:1074
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 38)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1075
    slamimp = (slaximp - (slaximp * 0.105087524949968))  // py:1075
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 38)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1076
    slaximp = (slamimp / (1 - 0.105087524949968))  // py:1076
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 38)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1077
    slamimp = 335.813953488372  // py:1077
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 38)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1078
    slaximp = (335.813953488372 / (1 - 0.105087524949968))  // py:1078
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 39)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1079
    slamimp = (slaximp - (slaximp * 0.0856667000685018))  // py:1079
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 39)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1080
    slaximp = (slamimp / (1 - 0.0856667000685018))  // py:1080
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 39)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1081
    slamimp = 257.263157894737  // py:1081
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 39)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1082
    slaximp = (257.263157894737 / (1 - 0.0856667000685018))  // py:1082
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 40)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1083
    slamimp = (slaximp - (slaximp * 0.0865650987499053))  // py:1083
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 40)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1084
    slaximp = (slamimp / (1 - 0.0865650987499053))  // py:1084
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 40)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1085
    slamimp = 328.195266272189  // py:1085
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 40)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1086
    slaximp = (328.195266272189 / (1 - 0.0865650987499053))  // py:1086
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 41)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1087
    slamimp = (slaximp - (slaximp * 0.171814252005436))  // py:1087
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 41)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1088
    slaximp = (slamimp / (1 - 0.171814252005436))  // py:1088
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 41)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1089
    slamimp = 129.145454545455  // py:1089
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 41)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1090
    slaximp = (129.145454545455 / (1 - 0.171814252005436))  // py:1090
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 42)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1091
    slamimp = (slaximp - (slaximp * 0.0610387045813586))  // py:1091
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 42)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1092
    slaximp = (slamimp / (1 - 0.0610387045813586))  // py:1092
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 42)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1093
    slamimp = 158.1  // py:1093
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 42)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1094
    slaximp = (158.1 / (1 - 0.0610387045813586))  // py:1094
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 43)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1095
    slamimp = (slaximp - (slaximp * 0.159823459162871))  // py:1095
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 43)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1096
    slaximp = (slamimp / (1 - 0.159823459162871))  // py:1096
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 43)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1097
    slamimp = 247.759689922481  // py:1097
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 43)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1098
    slaximp = (247.759689922481 / (1 - 0.159823459162871))  // py:1098
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 44)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1099
    slamimp = (slaximp - (slaximp * 0.0988853555387519))  // py:1099
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 44)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1100
    slaximp = (slamimp / (1 - 0.0988853555387519))  // py:1100
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 44)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1101
    slamimp = 363  // py:1101
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 44)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1102
    slaximp = (363 / (1 - 0.0988853555387519))  // py:1102
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 45)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1103
    slamimp = (slaximp - (slaximp * 0.0904513085721602))  // py:1103
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 45)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1104
    slaximp = (slamimp / (1 - 0.0904513085721602))  // py:1104
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 45)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1105
    slamimp = 466.25641025641  // py:1105
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 45)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1106
    slaximp = (466.25641025641 / (1 - 0.0904513085721602))  // py:1106
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 46)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1107
    slamimp = (slaximp - (slaximp * 0.082310278477633))  // py:1107
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 46)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1108
    slaximp = (slamimp / (1 - 0.082310278477633))  // py:1108
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 46)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1109
    slamimp = 159.810810810811  // py:1109
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 46)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1110
    slaximp = (159.810810810811 / (1 - 0.082310278477633))  // py:1110
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 47)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1111
    slamimp = (slaximp - (slaximp * 0.104714300552102))  // py:1111
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 47)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1112
    slaximp = (slamimp / (1 - 0.104714300552102))  // py:1112
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 47)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1113
    slamimp = 638.25  // py:1113
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 47)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1114
    slaximp = (638.25 / (1 - 0.104714300552102))  // py:1114
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 48)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1115
    slamimp = (slaximp - (slaximp * 0.193439630544956))  // py:1115
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 48)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1116
    slaximp = (slamimp / (1 - 0.193439630544956))  // py:1116
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 48)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1117
    slamimp = 608.392156862745  // py:1117
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 48)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1118
    slaximp = (608.392156862745 / (1 - 0.193439630544956))  // py:1118
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 49)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1119
    slamimp = (slaximp - (slaximp * 0.145583038352611))  // py:1119
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 49)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1120
    slaximp = (slamimp / (1 - 0.145583038352611))  // py:1120
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 49)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1121
    slamimp = 428.888888888889  // py:1121
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 49)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1122
    slaximp = (428.888888888889 / (1 - 0.145583038352611))  // py:1122
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 50)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1123
    slamimp = (slaximp - (slaximp * 0.233333333333333))  // py:1123
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 50)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1124
    slaximp = (slamimp / (1 - 0.233333333333333))  // py:1124
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 50)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1125
    slamimp = 270.846153846154  // py:1125
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 50)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1126
    slaximp = (270.846153846154 / (1 - 0.233333333333333))  // py:1126
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 51)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1127
    slamimp = (slaximp - (slaximp * 0.179223522528989))  // py:1127
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 51)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1128
    slaximp = (slamimp / (1 - 0.179223522528989))  // py:1128
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 51)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1129
    slamimp = 229.64  // py:1129
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 51)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1130
    slaximp = (229.64 / (1 - 0.179223522528989))  // py:1130
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 52)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1131
    slamimp = (slaximp - (slaximp * 0.0819156347249732))  // py:1131
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 52)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1132
    slaximp = (slamimp / (1 - 0.0819156347249732))  // py:1132
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 52)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1133
    slaximp = 290.164383561644  // py:1133
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 52)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1134
    slamimp = (290.164383561644 - (290.164383561644 * 0.0819156347249732))  // py:1134
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 53)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1135
    slamimp = (slaximp - (slaximp * 0.0540922242825536))  // py:1135
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 53)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1136
    slaximp = (slamimp / (1 - 0.0540922242825536))  // py:1136
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 53)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1137
    slamimp = 256.548387096774  // py:1137
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 53)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1138
    slaximp = (256.548387096774 / (1 - 0.0540922242825536))  // py:1138
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 54)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1139
    slamimp = (slaximp - (slaximp * 0.0913651933726713))  // py:1139
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 54)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1140
    slaximp = (slamimp / (1 - 0.0913651933726713))  // py:1140
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 54)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1141
    slamimp = 216.907894736842  // py:1141
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 54)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1142
    slaximp = (216.907894736842 / (1 - 0.0913651933726713))  // py:1142
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 55)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1143
    slamimp = (slaximp - (slaximp * 0.0604022380426763))  // py:1143
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 55)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1144
    slaximp = (slamimp / (1 - 0.0604022380426763))  // py:1144
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 55)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1145
    slamimp = 241.461538461538  // py:1145
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 55)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1146
    slaximp = (241.461538461538 / (1 - 0.0604022380426763))  // py:1146
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 56)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1147
    slamimp = (slaximp - (slaximp * 0.0542026549646127))  // py:1147
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 56)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1148
    slaximp = (slamimp / (1 - 0.0542026549646127))  // py:1148
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 56)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1149
    slamimp = 340.230769230769  // py:1149
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 56)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1150
    slaximp = (340.230769230769 / (1 - 0.0542026549646127))  // py:1150
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 57)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1151
    slamimp = (slaximp - (slaximp * 0.0974564330758702))  // py:1151
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 57)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1152
    slaximp = (slamimp / (1 - 0.0974564330758702))  // py:1152
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 57)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1153
    slamimp = 516.45  // py:1153
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 57)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1154
    slaximp = (516.45 / (1 - 0.0974564330758702))  // py:1154
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 58)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1155
    slamimp = (slaximp - (slaximp * 0.162886379968412))  // py:1155
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 58)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1156
    slaximp = (slamimp / (1 - 0.162886379968412))  // py:1156
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 58)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1157
    slaximp = 447.518072289157  // py:1157
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 58)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1158
    slamimp = (447.518072289157 - (447.518072289157 * 0.162886379968412))  // py:1158
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 59)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1159
    slamimp = (slaximp - (slaximp * 0.0561646667118922))  // py:1159
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 59)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1160
    slaximp = (slamimp / (1 - 0.0561646667118922))  // py:1160
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 59)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1161
    slamimp = 152.923076923077  // py:1161
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 59)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1162
    slaximp = (152.923076923077 / (1 - 0.0561646667118922))  // py:1162
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 60)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1163
    slamimp = (slaximp - (slaximp * 0.133468501803896))  // py:1163
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 60)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1164
    slaximp = (slamimp / (1 - 0.133468501803896))  // py:1164
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 60)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1165
    slamimp = 403.292993630573  // py:1165
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 60)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1166
    slaximp = (403.292993630573 / (1 - 0.133468501803896))  // py:1166
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 61)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1167
    slamimp = (slaximp - (slaximp * 0.106708705390018))  // py:1167
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 61)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1168
    slaximp = (slamimp / (1 - 0.106708705390018))  // py:1168
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 61)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1169
    slamimp = 285.644444444444  // py:1169
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 61)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1170
    slaximp = (285.644444444444 / (1 - 0.106708705390018))  // py:1170
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 62)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1171
    slamimp = (slaximp - (slaximp * 0.0785278768682708))  // py:1171
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 62)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1172
    slaximp = (slamimp / (1 - 0.0785278768682708))  // py:1172
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 62)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1173
    slamimp = 335.658227848101  // py:1173
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 62)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1174
    slaximp = (335.658227848101 / (1 - 0.0785278768682708))  // py:1174
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 63)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1175
    slamimp = (slaximp - (slaximp * 0.107782269167156))  // py:1175
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 63)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1176
    slaximp = (slamimp / (1 - 0.107782269167156))  // py:1176
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 63)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1177
    slamimp = 472.267857142857  // py:1177
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 63)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1178
    slaximp = (472.267857142857 / (1 - 0.107782269167156))  // py:1178
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 160)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1179
    slamimp = (slaximp - (slaximp * 0.0779281672325541))  // py:1179
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 160)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1180
    slaximp = (slamimp / (1 - 0.0779281672325541))  // py:1180
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 160)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1181
    slamimp = 536.842857142857  // py:1181
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 160)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1182
    slaximp = (536.842857142857 / (1 - 0.0779281672325541))  // py:1182
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 65)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1183
    slamimp = (slaximp - (slaximp * 0.115409873680179))  // py:1183
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 65)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1184
    slaximp = (slamimp / (1 - 0.115409873680179))  // py:1184
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 65)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1185
    slamimp = 103.376146788991  // py:1185
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 65)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1186
    slaximp = (103.376146788991 / (1 - 0.115409873680179))  // py:1186
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 66)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1187
    slamimp = (slaximp - (slaximp * 0.207088877726936))  // py:1187
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 66)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1188
    slaximp = (slamimp / (1 - 0.207088877726936))  // py:1188
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 66)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1189
    slamimp = 68.1506849315068  // py:1189
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 66)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1190
    slaximp = (68.1506849315068 / (1 - 0.207088877726936))  // py:1190
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 67)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1191
    slamimp = (slaximp - (slaximp * 0.110922605367631))  // py:1191
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 67)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1192
    slaximp = (slamimp / (1 - 0.110922605367631))  // py:1192
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 67)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1193
    slamimp = 80.0491803278688  // py:1193
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 67)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1194
    slaximp = (80.0491803278688 / (1 - 0.110922605367631))  // py:1194
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 68)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1195
    slamimp = (slaximp - (slaximp * 0.127935729778166))  // py:1195
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 68)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1196
    slaximp = (slamimp / (1 - 0.127935729778166))  // py:1196
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 68)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1197
    slaximp = 84  // py:1197
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 68)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1198
    slamimp = (84 - (84 * 0.127935729778166))  // py:1198
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 69)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1199
    slamimp = (slaximp - (slaximp * 0.206358225584424))  // py:1199
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 69)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1200
    slaximp = (slamimp / (1 - 0.206358225584424))  // py:1200
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 69)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1201
    slamimp = 1004.47058823529  // py:1201
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 69)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1202
    slaximp = (1004.47058823529 / (1 - 0.206358225584424))  // py:1202
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 70)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1203
    slamimp = (slaximp - (slaximp * 0.142775407154303))  // py:1203
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 70)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1204
    slaximp = (slamimp / (1 - 0.142775407154303))  // py:1204
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 70)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1205
    slamimp = 311.222222222222  // py:1205
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 70)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1206
    slaximp = (311.222222222222 / (1 - 0.142775407154303))  // py:1206
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 71)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1207
    slamimp = (slaximp - (slaximp * 0.106323148232566))  // py:1207
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 71)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1208
    slaximp = (slamimp / (1 - 0.106323148232566))  // py:1208
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 71)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1209
    slamimp = 310.39837398374  // py:1209
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 71)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1210
    slaximp = (310.39837398374 / (1 - 0.106323148232566))  // py:1210
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 97)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1211
    slamimp = (slaximp - (slaximp * 0.138965456634756))  // py:1211
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 97)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1212
    slaximp = (slamimp / (1 - 0.138965456634756))  // py:1212
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 97)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1213
    slamimp = 259.21875  // py:1213
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 97)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1214
    slaximp = (259.21875 / (1 - 0.138965456634756))  // py:1214
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 72)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1215
    slamimp = (slaximp - (slaximp * 0.169436742362705))  // py:1215
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 72)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1216
    slaximp = (slamimp / (1 - 0.169436742362705))  // py:1216
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 72)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1217
    slamimp = 265.325842696629  // py:1217
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 72)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1218
    slaximp = (265.325842696629 / (1 - 0.169436742362705))  // py:1218
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 85)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1219
    slamimp = (slaximp - (slaximp * 0.339905284604731))  // py:1219
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 85)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1220
    slaximp = (slamimp / (1 - 0.339905284604731))  // py:1220
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 85)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1221
    slamimp = 563.333333333333  // py:1221
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 85)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1222
    slaximp = (563.333333333333 / (1 - 0.339905284604731))  // py:1222
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 73)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1223
    slamimp = (slaximp - (slaximp * 0.129605450439467))  // py:1223
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 73)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1224
    slaximp = (slamimp / (1 - 0.129605450439467))  // py:1224
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 73)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1225
    slamimp = 407.289473684211  // py:1225
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 73)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1226
    slaximp = (407.289473684211 / (1 - 0.129605450439467))  // py:1226
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 74)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1227
    slamimp = (slaximp - (slaximp * 0.0794384325299229))  // py:1227
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 74)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1228
    slaximp = (slamimp / (1 - 0.0794384325299229))  // py:1228
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 74)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1229
    slamimp = 117.137931034483  // py:1229
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 74)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1230
    slaximp = (117.137931034483 / (1 - 0.0794384325299229))  // py:1230
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 75)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1231
    slamimp = (slaximp - (slaximp * 0.189369734252207))  // py:1231
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 75)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1232
    slaximp = (slamimp / (1 - 0.189369734252207))  // py:1232
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 75)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1233
    slamimp = 192.772020725389  // py:1233
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 75)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1234
    slaximp = (192.772020725389 / (1 - 0.189369734252207))  // py:1234
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 76)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1235
    slamimp = (slaximp - (slaximp * 0.131187789757565))  // py:1235
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 76)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1236
    slaximp = (slamimp / (1 - 0.131187789757565))  // py:1236
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 76)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1237
    slamimp = 199.041666666667  // py:1237
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 76)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1238
    slaximp = (199.041666666667 / (1 - 0.131187789757565))  // py:1238
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 77)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1239
    slamimp = (slaximp - (slaximp * 0.136342992788614))  // py:1239
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 77)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1240
    slaximp = (slamimp / (1 - 0.136342992788614))  // py:1240
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 77)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1241
    slamimp = 186.407894736842  // py:1241
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 77)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1242
    slaximp = (186.407894736842 / (1 - 0.136342992788614))  // py:1242
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 78)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1243
    slamimp = (slaximp - (slaximp * 0.103049659988616))  // py:1243
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 78)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1244
    slaximp = (slamimp / (1 - 0.103049659988616))  // py:1244
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 78)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1245
    slamimp = 155.470588235294  // py:1245
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 78)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1246
    slaximp = (155.470588235294 / (1 - 0.103049659988616))  // py:1246
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 79)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1247
    slamimp = (slaximp - (slaximp * 0.35))  // py:1247
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 79)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1248
    slaximp = (slamimp / (1 - 0.35))  // py:1248
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 79)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1249
    slamimp = 193.74358974359  // py:1249
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 79)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1250
    slaximp = (193.74358974359 / (1 - 0.35))  // py:1250
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 80)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1251
    slamimp = (slaximp - (slaximp * 0.0732085200996002))  // py:1251
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 80)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1252
    slaximp = (slamimp / (1 - 0.0732085200996002))  // py:1252
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 80)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1253
    slamimp = 249.692307692308  // py:1253
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 80)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1254
    slaximp = (249.692307692308 / (1 - 0.0732085200996002))  // py:1254
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 81)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1255
    slamimp = (slaximp - (slaximp * 0.0934359066589073))  // py:1255
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 81)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1256
    slaximp = (slamimp / (1 - 0.0934359066589073))  // py:1256
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 81)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1257
    slamimp = 352.952806122449  // py:1257
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 81)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1258
    slaximp = (352.952806122449 / (1 - 0.0934359066589073))  // py:1258
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 82)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1259
    slamimp = (slaximp - (slaximp * 0.07182740558555))  // py:1259
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 82)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1260
    slaximp = (slamimp / (1 - 0.07182740558555))  // py:1260
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 82)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1261
    slamimp = 419.619047619047  // py:1261
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 82)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1262
    slaximp = (419.619047619047 / (1 - 0.07182740558555))  // py:1262
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 83)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1263
    slamimp = (slaximp - (slaximp * 0.0956449943871365))  // py:1263
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 83)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1264
    slaximp = (slamimp / (1 - 0.0956449943871365))  // py:1264
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 83)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1265
    slaximp = 304.5625  // py:1265
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 83)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1266
    slamimp = (304.5625 - (304.5625 * 0.0956449943871365))  // py:1266
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 84)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1267
    slamimp = (slaximp - (slaximp * 0.163929225997462))  // py:1267
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 84)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1268
    slaximp = (slamimp / (1 - 0.163929225997462))  // py:1268
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 84)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1269
    slamimp = 319.285714285714  // py:1269
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 84)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1270
    slaximp = (319.285714285714 / (1 - 0.163929225997462))  // py:1270
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 86)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1271
    slamimp = (slaximp - (slaximp * 0.112733293827202))  // py:1271
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 86)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1272
    slaximp = (slamimp / (1 - 0.112733293827202))  // py:1272
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 86)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1273
    slamimp = 129.277777777778  // py:1273
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 86)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1274
    slaximp = (129.277777777778 / (1 - 0.112733293827202))  // py:1274
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 87)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1275
    slamimp = (slaximp - (slaximp * 0.0655504344628028))  // py:1275
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 87)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1276
    slaximp = (slamimp / (1 - 0.0655504344628028))  // py:1276
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 87)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1277
    slamimp = 211  // py:1277
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 87)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1278
    slaximp = (211 / (1 - 0.0655504344628028))  // py:1278
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 88)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1279
    slamimp = (slaximp - (slaximp * 0.198929221794951))  // py:1279
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 88)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1280
    slaximp = (slamimp / (1 - 0.198929221794951))  // py:1280
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 88)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1281
    slaximp = 296.473684210526  // py:1281
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 88)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1282
    slamimp = (296.473684210526 - (296.473684210526 * 0.198929221794951))  // py:1282
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 89)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1283
    slamimp = (slaximp - (slaximp * 0.107517933823928))  // py:1283
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 89)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1284
    slaximp = (slamimp / (1 - 0.107517933823928))  // py:1284
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 89)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1285
    slamimp = 281.958333333333  // py:1285
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 89)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1286
    slaximp = (281.958333333333 / (1 - 0.107517933823928))  // py:1286
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 90)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1287
    slamimp = (slaximp - (slaximp * 0.028250184258012))  // py:1287
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 90)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1288
    slaximp = (slamimp / (1 - 0.028250184258012))  // py:1288
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 90)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1289
    slamimp = 208.341176470588  // py:1289
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 90)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1290
    slaximp = (208.341176470588 / (1 - 0.028250184258012))  // py:1290
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 91)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1291
    slamimp = (slaximp - (slaximp * 0.0487771272192143))  // py:1291
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 91)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1292
    slaximp = (slamimp / (1 - 0.0487771272192143))  // py:1292
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 91)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1293
    slamimp = 267.896551724138  // py:1293
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 91)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1294
    slaximp = (267.896551724138 / (1 - 0.0487771272192143))  // py:1294
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 92)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1295
    slamimp = (slaximp - (slaximp * 0.111975986975987))  // py:1295
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 92)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1296
    slaximp = (slamimp / (1 - 0.111975986975987))  // py:1296
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 92)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1297
    slamimp = 328.555555555556  // py:1297
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 92)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1298
    slaximp = (328.555555555556 / (1 - 0.111975986975987))  // py:1298
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 93)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1299
    slamimp = (slaximp - (slaximp * 0.0979648763988006))  // py:1299
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 93)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1300
    slaximp = (slamimp / (1 - 0.0979648763988006))  // py:1300
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 93)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1301
    slamimp = 101.111111111111  // py:1301
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 93)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1302
    slaximp = (101.111111111111 / (1 - 0.0979648763988006))  // py:1302
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 94)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1303
    slamimp = (slaximp - (slaximp * 0.297737659966491))  // py:1303
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 94)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1304
    slaximp = (slamimp / (1 - 0.297737659966491))  // py:1304
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 94)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1305
    slamimp = 319.733333333333  // py:1305
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 94)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1306
    slaximp = (319.733333333333 / (1 - 0.297737659966491))  // py:1306
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 95)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1307
    slamimp = (slaximp - (slaximp * 0.0220048899755501))  // py:1307
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 95)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1308
    slaximp = (slamimp / (1 - 0.0220048899755501))  // py:1308
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 95)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1309
    slamimp = 220.428571428571  // py:1309
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 95)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1310
    slaximp = (220.428571428571 / (1 - 0.0220048899755501))  // py:1310
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 96)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1311
    slamimp = (slaximp - (slaximp * 0))  // py:1311
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 96)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1312
    slaximp = (slamimp / (1 - 0))  // py:1312
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 96)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1313
    slamimp = 433  // py:1313
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 96)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1314
    slaximp = (433 / (1 - 0))  // py:1314
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 137)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1315
    slamimp = (slaximp - (slaximp * 0.12659407459354))  // py:1315
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 137)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1316
    slaximp = (slamimp / (1 - 0.12659407459354))  // py:1316
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 137)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1317
    slamimp = 104.986301369863  // py:1317
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 137)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1318
    slaximp = (104.986301369863 / (1 - 0.12659407459354))  // py:1318
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 138)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1319
    slamimp = (slaximp - (slaximp * 0.179201806454531))  // py:1319
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 138)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1320
    slaximp = (slamimp / (1 - 0.179201806454531))  // py:1320
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 138)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1321
    slaximp = 108.37037037037  // py:1321
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 138)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1322
    slamimp = (108.37037037037 - (108.37037037037 * 0.179201806454531))  // py:1322
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 139)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1323
    slamimp = (slaximp - (slaximp * 0.162003845923261))  // py:1323
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 139)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1324
    slaximp = (slamimp / (1 - 0.162003845923261))  // py:1324
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 139)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1325
    slamimp = 128.438775510204  // py:1325
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 139)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1326
    slaximp = (128.438775510204 / (1 - 0.162003845923261))  // py:1326
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 140)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1327
    slamimp = (slaximp - (slaximp * 0.171264386321147))  // py:1327
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 140)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1328
    slaximp = (slamimp / (1 - 0.171264386321147))  // py:1328
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 140)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1329
    slamimp = 557.6  // py:1329
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 140)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1330
    slaximp = (557.6 / (1 - 0.171264386321147))  // py:1330
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 141)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1331
    slamimp = (slaximp - (slaximp * 0.213152374545978))  // py:1331
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 141)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1332
    slaximp = (slamimp / (1 - 0.213152374545978))  // py:1332
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 141)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1333
    slamimp = 74  // py:1333
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 141)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1334
    slaximp = (74 / (1 - 0.213152374545978))  // py:1334
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 142)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1335
    slamimp = (slaximp - (slaximp * 0.190548809128441))  // py:1335
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 142)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1336
    slaximp = (slamimp / (1 - 0.190548809128441))  // py:1336
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 142)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1337
    slaximp = 80.5625  // py:1337
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 142)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1338
    slamimp = (80.5625 - (80.5625 * 0.190548809128441))  // py:1338
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 145)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1339
    slamimp = (slaximp - (slaximp * 0.0577485174550083))  // py:1339
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 145)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1340
    slaximp = (slamimp / (1 - 0.0577485174550083))  // py:1340
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 145)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1341
    slamimp = 376.928571428571  // py:1341
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 145)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1342
    slaximp = (376.928571428571 / (1 - 0.0577485174550083))  // py:1342
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 146)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1343
    slamimp = (slaximp - (slaximp * 0.153749295952981))  // py:1343
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 146)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1344
    slaximp = (slamimp / (1 - 0.153749295952981))  // py:1344
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 146)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1345
    slamimp = 154.307692307692  // py:1345
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 146)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1346
    slaximp = (154.307692307692 / (1 - 0.153749295952981))  // py:1346
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 147)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1347
    slamimp = (slaximp - (slaximp * 0.143606923731731))  // py:1347
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 147)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1348
    slaximp = (slamimp / (1 - 0.143606923731731))  // py:1348
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 147)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1349
    slaximp = 165.903225806452  // py:1349
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 147)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1350
    slamimp = (165.903225806452 - (165.903225806452 * 0.143606923731731))  // py:1350
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 148)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1351
    slamimp = (slaximp - (slaximp * 0.254317624200109))  // py:1351
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 148)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1352
    slaximp = (slamimp / (1 - 0.254317624200109))  // py:1352
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 148)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1353
    slamimp = 199.730769230769  // py:1353
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 148)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1354
    slaximp = (199.730769230769 / (1 - 0.254317624200109))  // py:1354
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 149)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1355
    slamimp = (slaximp - (slaximp * 0.136559928551299))  // py:1355
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 149)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1356
    slaximp = (slamimp / (1 - 0.136559928551299))  // py:1356
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 149)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1357
    slamimp = 1003  // py:1357
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 149)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1358
    slaximp = (1003 / (1 - 0.136559928551299))  // py:1358
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 150)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1359
    slamimp = (slaximp - (slaximp * 0.182187702624498))  // py:1359
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 150)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1360
    slaximp = (slamimp / (1 - 0.182187702624498))  // py:1360
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 150)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1361
    slamimp = 100.090909090909  // py:1361
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 150)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1362
    slaximp = (100.090909090909 / (1 - 0.182187702624498))  // py:1362
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 151)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1363
    slamimp = (slaximp - (slaximp * 0.00833333333333333))  // py:1363
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 151)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1364
    slaximp = (slamimp / (1 - 0.00833333333333333))  // py:1364
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 151)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1365
    slamimp = 127.103448275862  // py:1365
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 151)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1366
    slaximp = (127.103448275862 / (1 - 0.00833333333333333))  // py:1366
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 152)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1367
    slamimp = (slaximp - (slaximp * 0.100333848361108))  // py:1367
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 152)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1368
    slaximp = (slamimp / (1 - 0.100333848361108))  // py:1368
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 152)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1369
    slamimp = 436.5  // py:1369
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 152)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1370
    slaximp = (436.5 / (1 - 0.100333848361108))  // py:1370
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 154)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1371
    slamimp = (slaximp - (slaximp * 0.235321405225611))  // py:1371
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 154)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1372
    slaximp = (slamimp / (1 - 0.235321405225611))  // py:1372
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 154)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1373
    slamimp = 580.060606060606  // py:1373
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 154)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1374
    slaximp = (580.060606060606 / (1 - 0.235321405225611))  // py:1374
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 155)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1375
    slamimp = (slaximp - (slaximp * 0.157476046121814))  // py:1375
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 155)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1376
    slaximp = (slamimp / (1 - 0.157476046121814))  // py:1376
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 155)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1377
    slamimp = 70.0833333333334  // py:1377
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 155)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1378
    slaximp = (70.0833333333334 / (1 - 0.157476046121814))  // py:1378
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 156)) && pyTruthy(safeGe(slaximp, 1)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1379
    slamimp = (slaximp - (slaximp * 0.17641709128796))  // py:1379
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 156)) && pyTruthy(safeGe(slamimp, 1)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot))))) {  // py:1380
    slaximp = (slamimp / (1 - 0.17641709128796))  // py:1380
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 156)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1381
    slamimp = 118.333333333333  // py:1381
  }
  if (pyTruthy((pyTruthy(eq(xmimpflag, 156)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1382
    slaximp = (118.333333333333 / (1 - 0.17641709128796))  // py:1382
  }
  sladvoy = dictGet(_numbers, "SLADVOY", null)  // py:1384
  if (pyTruthy((pyTruthy(safeGt(sladvoy, 0)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(safeGe(slastot, 50))))) {  // py:1385
    slaximp = (slastot + sladvoy)  // py:1385
  }
  if (pyTruthy((pyTruthy(safeGt(sladvoy, 0)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(safeGt(slaarriv, 1))))) {  // py:1386
    slaximp = (slaarriv + sladvoy)  // py:1386
  }
  if (pyTruthy((pyTruthy(safeGt(sladvoy, 0)) && pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(!pyTruthy(tslavesp)) && pyTruthy(!pyTruthy(ncartot)) && pyTruthy(!pyTruthy(slaarriv)) && pyTruthy(!pyTruthy(slastot))))) {  // py:1387
    slaximp = (slamimp + sladvoy)  // py:1387
  }
  slaximp = (pyTruthy(slaximp) ? pyRound(slaximp) : null)  // py:1389
  slamimp = (pyTruthy(slamimp) ? pyRound(slamimp) : null)  // py:1390
  vymrtimp = sladvoy  // py:1396
  tslmtimp = null  // py:1397
  slaarriv = dictGet(_numbers, "SLAARRIV", null)  // py:1398
  if (pyTruthy((pyTruthy((sladvoy === null)) && pyTruthy((slaarriv !== null)) && pyTruthy(safeLe(slaarriv, tslavesd))))) {  // py:1399
    vymrtimp = (tslavesd - slaarriv)  // py:1399
  }
  if (pyTruthy(safeGe(vymrtimp, 0))) {  // py:1400
    tslmtimp = tslavesd  // py:1400
  }
  if (pyTruthy((pyTruthy((pyTruthy(!pyTruthy(tslavesd)) && pyTruthy(safeGe(vymrtimp, 0)))) && pyTruthy(safeGe(slaarriv, 1))))) {  // py:1401
    tslmtimp = (slaarriv + vymrtimp)  // py:1401
  }
  vymrtrat = (pyTruthy((pyTruthy(vymrtimp) && pyTruthy(tslmtimp))) ? (vymrtimp / tslmtimp) : null)  // py:1402
  men1 = dictGet(_numbers, "MEN1", 0)  // py:1425
  men4 = dictGet(_numbers, "MEN4", 0)  // py:1426
  men5 = dictGet(_numbers, "MEN5", 0)  // py:1427
  women1 = dictGet(_numbers, "WOMEN1", 0)  // py:1429
  women4 = dictGet(_numbers, "WOMEN4", 0)  // py:1430
  women5 = dictGet(_numbers, "WOMEN5", 0)  // py:1431
  adult1 = dictGet(_numbers, "ADULT1", 0)  // py:1433
  adult4 = dictGet(_numbers, "ADULT4", 0)  // py:1434
  adult5 = dictGet(_numbers, "ADULT5", 0)  // py:1435
  girl1 = dictGet(_numbers, "GIRL1", 0)  // py:1437
  girl4 = dictGet(_numbers, "GIRL4", 0)  // py:1438
  girl5 = dictGet(_numbers, "GIRL5", 0)  // py:1439
  boy1 = dictGet(_numbers, "BOY1", 0)  // py:1441
  boy4 = dictGet(_numbers, "BOY4", 0)  // py:1442
  boy5 = dictGet(_numbers, "BOY5", 0)  // py:1443
  child1 = dictGet(_numbers, "CHILD1", 0)  // py:1445
  child4 = dictGet(_numbers, "CHILD4", 0)  // py:1446
  child5 = dictGet(_numbers, "CHILD5", 0)  // py:1447
  infant1 = dictGet(_numbers, "INFANT1", 0)  // py:1449
  infant4 = dictGet(_numbers, "INFANT4", 0)  // py:1450
  male1 = dictGet(_numbers, "MALE1", 0)  // py:1452
  male4 = dictGet(_numbers, "MALE4", 0)  // py:1453
  male5 = dictGet(_numbers, "MALE5", 0)  // py:1454
  female1 = dictGet(_numbers, "FEMALE1", 0)  // py:1456
  female4 = dictGet(_numbers, "FEMALE4", 0)  // py:1457
  female5 = dictGet(_numbers, "FEMALE5", 0)  // py:1458
  adlt1imp = ((((((((men1 + women1) + adult1) + men4) + women4) + adult4) + men5) + women5) + adult5)  // py:1460
  chil1imp = ((((((((((boy1 + girl1) + child1) + infant1) + boy4) + girl4) + child4) + infant4) + boy5) + girl5) + child5)  // py:1461
  male1imp = ((male1 + male4) + male5)  // py:1462
  feml1imp = ((female1 + female4) + female5)  // py:1463
  if (pyTruthy(!pyTruthy(male1imp))) {  // py:1464
    male1imp = (((((men1 + boy1) + men4) + boy4) + men5) + boy5)  // py:1465
  }
  if (pyTruthy(!pyTruthy(feml1imp))) {  // py:1466
    feml1imp = (((((women1 + girl1) + women4) + girl4) + women5) + girl5)  // py:1467
  }
  slavema1 = threshold((adlt1imp + chil1imp), 20)  // py:1468
  slavemx1 = threshold((male1imp + feml1imp), 20)  // py:1469
  slavmax1 = threshold((((((((((((men1 + women1) + boy1) + girl1) + men4) + women4) + boy4) + girl4) + men5) + women5) + boy5) + girl5), 20)  // py:1470
  if (pyTruthy((slavema1 === null))) {  // py:1471
    adlt1imp = null  // py:1472
    chil1imp = null  // py:1473
  }
  if (pyTruthy((slavemx1 === null))) {  // py:1474
    feml1imp = null  // py:1475
    male1imp = null  // py:1476
  }
  chilrat1 = (pyTruthy(slavema1) ? (chil1imp / slavema1) : null)  // py:1477
  malrat1 = (pyTruthy(slavemx1) ? (male1imp / slavemx1) : null)  // py:1478
  menrat1 = null  // py:1479
  womrat1 = null  // py:1480
  boyrat1 = null  // py:1481
  girlrat1 = null  // py:1482
  if (pyTruthy(safeGe(slavmax1, 20))) {  // py:1483
    menrat1 = (((men1 + men4) + men5) / slavmax1)  // py:1483
  }
  if (pyTruthy(safeGe(slavmax1, 20))) {  // py:1484
    womrat1 = (((women1 + women4) + women5) / slavmax1)  // py:1484
  }
  if (pyTruthy(safeGe(slavmax1, 20))) {  // py:1485
    boyrat1 = (((boy1 + boy4) + boy5) / slavmax1)  // py:1485
  }
  if (pyTruthy(safeGe(slavmax1, 20))) {  // py:1486
    girlrat1 = (((girl1 + girl4) + girl5) / slavmax1)  // py:1486
  }
  men3 = dictGet(_numbers, "MEN3", 0)  // py:1502
  men6 = dictGet(_numbers, "MEN6", 0)  // py:1503
  women3 = dictGet(_numbers, "WOMEN3", 0)  // py:1505
  women6 = dictGet(_numbers, "WOMEN6", 0)  // py:1506
  adult3 = dictGet(_numbers, "ADULT3", 0)  // py:1508
  adult6 = dictGet(_numbers, "ADULT6", 0)  // py:1509
  girl3 = dictGet(_numbers, "GIRL3", 0)  // py:1511
  girl6 = dictGet(_numbers, "GIRL6", 0)  // py:1512
  boy3 = dictGet(_numbers, "BOY3", 0)  // py:1514
  boy6 = dictGet(_numbers, "BOY6", 0)  // py:1515
  child3 = dictGet(_numbers, "CHILD3", 0)  // py:1517
  child6 = dictGet(_numbers, "CHILD6", 0)  // py:1518
  infant3 = dictGet(_numbers, "INFANT3", 0)  // py:1520
  male3 = dictGet(_numbers, "MALE3", 0)  // py:1522
  male6 = dictGet(_numbers, "MALE6", 0)  // py:1523
  female3 = dictGet(_numbers, "FEMALE3", 0)  // py:1525
  female6 = dictGet(_numbers, "FEMALE6", 0)  // py:1526
  adlt3imp = (((((men3 + women3) + adult3) + men6) + women6) + adult6)  // py:1528
  chil3imp = ((((((boy3 + girl3) + child3) + infant3) + boy6) + girl6) + child6)  // py:1529
  male3imp = (male3 + male6)  // py:1531
  feml3imp = (female3 + female6)  // py:1532
  if (pyTruthy(eq(male3imp, 0))) {  // py:1533
    male3imp = (((men3 + boy3) + men6) + boy6)  // py:1533
  }
  if (pyTruthy(eq(feml3imp, 0))) {  // py:1534
    feml3imp = (((women3 + girl3) + women6) + girl6)  // py:1534
  }
  slavema3 = threshold((adlt3imp + chil3imp), 20)  // py:1536
  slavemx3 = threshold((male3imp + feml3imp), 20)  // py:1537
  slavmax3 = threshold((((((((men3 + women3) + boy3) + girl3) + men6) + women6) + boy6) + girl6), 20)  // py:1538
  if (pyTruthy((slavema3 === null))) {  // py:1540
    adlt3imp = null  // py:1541
    chil3imp = null  // py:1542
  }
  if (pyTruthy((slavemx3 === null))) {  // py:1543
    feml3imp = null  // py:1544
    male3imp = null  // py:1545
  }
  chilrat3 = (pyTruthy(slavema3) ? (chil3imp / slavema3) : null)  // py:1547
  malrat3 = (pyTruthy(slavemx3) ? (male3imp / slavemx3) : null)  // py:1548
  menrat3 = null  // py:1549
  womrat3 = null  // py:1550
  boyrat3 = null  // py:1551
  girlrat3 = null  // py:1552
  if (pyTruthy(safeGe(slavmax3, 20))) {  // py:1553
    menrat3 = ((men3 + men6) / slavmax3)  // py:1553
  }
  if (pyTruthy(safeGe(slavmax3, 20))) {  // py:1554
    womrat3 = ((women3 + women6) / slavmax3)  // py:1554
  }
  if (pyTruthy(safeGe(slavmax3, 20))) {  // py:1555
    boyrat3 = ((boy3 + boy6) / slavmax3)  // py:1555
  }
  if (pyTruthy(safeGe(slavmax3, 20))) {  // py:1556
    girlrat3 = ((girl3 + girl6) / slavmax3)  // py:1556
  }
  men7 = null  // py:1575
  women7 = null  // py:1576
  boy7 = null  // py:1577
  girl7 = null  // py:1578
  adult7 = null  // py:1579
  child7 = null  // py:1580
  male7 = null  // py:1581
  female7 = null  // py:1582
  slavema7 = null  // py:1583
  slavemx7 = null  // py:1584
  slavmax7 = null  // py:1585
  menrat7 = null  // py:1586
  womrat7 = null  // py:1587
  boyrat7 = null  // py:1588
  girlrat7 = null  // py:1589
  chilrat7 = null  // py:1590
  malrat7 = null  // py:1591
  if (pyTruthy(safeGe(slavema3, 20))) {  // py:1593
    slavema7 = slavema3  // py:1593
  }
  if (pyTruthy(safeGe(slavemx3, 20))) {  // py:1594
    slavemx7 = slavemx3  // py:1594
  }
  if (pyTruthy(safeGe(slavmax3, 20))) {  // py:1595
    slavmax7 = slavmax3  // py:1595
  }
  if (pyTruthy(safeGe(slavmax7, 20))) {  // py:1596
    men7 = (men3 + men6)  // py:1596
  }
  if (pyTruthy(safeGe(slavmax7, 20))) {  // py:1597
    women7 = (women3 + women6)  // py:1597
  }
  if (pyTruthy(safeGe(slavmax7, 20))) {  // py:1598
    boy7 = (boy3 + boy6)  // py:1598
  }
  if (pyTruthy(safeGe(slavmax7, 20))) {  // py:1599
    girl7 = (girl3 + girl6)  // py:1599
  }
  if (pyTruthy(safeGe(slavema7, 20))) {  // py:1600
    adult7 = adlt3imp  // py:1600
  }
  if (pyTruthy(safeGe(slavema7, 20))) {  // py:1601
    child7 = chil3imp  // py:1601
  }
  if (pyTruthy(safeGe(slavemx7, 20))) {  // py:1602
    male7 = male3imp  // py:1602
  }
  if (pyTruthy(safeGe(slavemx7, 20))) {  // py:1603
    female7 = feml3imp  // py:1603
  }
  if (pyTruthy(safeGe(menrat3, 0))) {  // py:1604
    menrat7 = menrat3  // py:1604
  }
  if (pyTruthy(safeGe(womrat3, 0))) {  // py:1605
    womrat7 = womrat3  // py:1605
  }
  if (pyTruthy(safeGe(boyrat3, 0))) {  // py:1606
    boyrat7 = boyrat3  // py:1606
  }
  if (pyTruthy(safeGe(girlrat3, 0))) {  // py:1607
    girlrat7 = girlrat3  // py:1607
  }
  if (pyTruthy(safeGe(malrat3, 0))) {  // py:1608
    malrat7 = malrat3  // py:1608
  }
  if (pyTruthy(safeGe(chilrat3, 0))) {  // py:1609
    chilrat7 = chilrat3  // py:1609
  }
  if (pyTruthy((pyTruthy((slavema3 === null)) && pyTruthy(safeGe(slavema1, 20))))) {  // py:1611
    slavema7 = slavema1  // py:1611
  }
  if (pyTruthy((pyTruthy((slavemx3 === null)) && pyTruthy(safeGe(slavemx1, 20))))) {  // py:1612
    slavemx7 = slavemx1  // py:1612
  }
  if (pyTruthy((pyTruthy((slavmax3 === null)) && pyTruthy(safeGe(slavmax1, 20))))) {  // py:1613
    slavmax7 = slavmax1  // py:1613
  }
  if (pyTruthy((pyTruthy((slavmax3 === null)) && pyTruthy(safeGe(slavmax1, 20))))) {  // py:1614
    men7 = ((men1 + men4) + men5)  // py:1614
  }
  if (pyTruthy((pyTruthy((slavmax3 === null)) && pyTruthy(safeGe(slavmax1, 20))))) {  // py:1615
    women7 = ((women1 + women4) + women5)  // py:1615
  }
  if (pyTruthy((pyTruthy((slavmax3 === null)) && pyTruthy(safeGe(slavmax1, 20))))) {  // py:1616
    boy7 = ((boy1 + boy4) + boy5)  // py:1616
  }
  if (pyTruthy((pyTruthy((slavmax3 === null)) && pyTruthy(safeGe(slavmax1, 20))))) {  // py:1617
    girl7 = ((girl1 + girl4) + girl5)  // py:1617
  }
  if (pyTruthy((pyTruthy((slavema3 === null)) && pyTruthy(safeGe(slavema1, 20))))) {  // py:1618
    adult7 = adlt1imp  // py:1618
  }
  if (pyTruthy((pyTruthy((slavema3 === null)) && pyTruthy(safeGe(slavema1, 20))))) {  // py:1619
    child7 = chil1imp  // py:1619
  }
  if (pyTruthy((pyTruthy((slavemx3 === null)) && pyTruthy(safeGe(slavemx1, 20))))) {  // py:1620
    male7 = male1imp  // py:1620
  }
  if (pyTruthy((pyTruthy((slavemx3 === null)) && pyTruthy(safeGe(slavemx1, 20))))) {  // py:1621
    female7 = feml1imp  // py:1621
  }
  if (pyTruthy((pyTruthy((menrat3 === null)) && pyTruthy(safeGe(menrat1, 0))))) {  // py:1622
    menrat7 = menrat1  // py:1622
  }
  if (pyTruthy((pyTruthy((womrat3 === null)) && pyTruthy(safeGe(womrat1, 0))))) {  // py:1623
    womrat7 = womrat1  // py:1623
  }
  if (pyTruthy((pyTruthy((boyrat3 === null)) && pyTruthy(safeGe(boyrat1, 0))))) {  // py:1624
    boyrat7 = boyrat1  // py:1624
  }
  if (pyTruthy((pyTruthy((girlrat3 === null)) && pyTruthy(safeGe(girlrat1, 0))))) {  // py:1625
    girlrat7 = girlrat1  // py:1625
  }
  if (pyTruthy((pyTruthy((malrat3 === null)) && pyTruthy(safeGe(malrat1, 0))))) {  // py:1626
    malrat7 = malrat1  // py:1626
  }
  if (pyTruthy((pyTruthy((chilrat3 === null)) && pyTruthy(safeGe(chilrat1, 0))))) {  // py:1627
    chilrat7 = chilrat1  // py:1627
  }
  men2 = dictGet(_numbers, "MEN2", 0)  // py:1633
  women2 = dictGet(_numbers, "WOMEN2", 0)  // py:1634
  adult2 = dictGet(_numbers, "ADULT2", 0)  // py:1635
  girl2 = dictGet(_numbers, "GIRL2", 0)  // py:1636
  boy2 = dictGet(_numbers, "BOY2", 0)  // py:1637
  child2 = dictGet(_numbers, "CHILD2", 0)  // py:1638
  male2 = dictGet(_numbers, "MALE2", 0)  // py:1639
  female2 = dictGet(_numbers, "FEMALE2", 0)  // py:1640
  adlt2imp = ((men2 + women2) + adult2)  // py:1642
  chil2imp = ((boy2 + girl2) + child2)  // py:1643
  male2imp = male2  // py:1645
  feml2imp = female2  // py:1646
  if (pyTruthy(!pyTruthy(male2imp))) {  // py:1647
    male2imp = (men2 + boy2)  // py:1647
  }
  if (pyTruthy(!pyTruthy(feml2imp))) {  // py:1648
    feml2imp = (women2 + girl2)  // py:1648
  }
  if (pyTruthy((pyTruthy(safeGe(sladvoy, 1)) && pyTruthy(safeGe(chil2imp, 1)) && pyTruthy(eq(adlt2imp, 0)) && pyTruthy(safeGt(sladvoy, chil2imp)) && pyTruthy(chil2imp)))) {  // py:1650
    adlt2imp = (sladvoy - chil2imp)  // py:1650
  }
  if (pyTruthy((pyTruthy(safeGe(sladvoy, 1)) && pyTruthy(safeGe(adlt2imp, 1)) && pyTruthy(eq(chil2imp, 0)) && pyTruthy(safeGt(sladvoy, adlt2imp)) && pyTruthy(adlt2imp)))) {  // py:1651
    chil2imp = (sladvoy - adlt2imp)  // py:1651
  }
  if (pyTruthy((pyTruthy(safeGe(sladvoy, 1)) && pyTruthy(safeGe(feml2imp, 1)) && pyTruthy(eq(male2imp, 0)) && pyTruthy(safeGt(sladvoy, feml2imp)) && pyTruthy(feml2imp)))) {  // py:1652
    male2imp = (sladvoy - feml2imp)  // py:1652
  }
  if (pyTruthy((pyTruthy(safeGe(sladvoy, 1)) && pyTruthy(safeGe(male2imp, 1)) && pyTruthy(eq(feml2imp, 0)) && pyTruthy(safeGt(sladvoy, male2imp)) && pyTruthy(male2imp)))) {  // py:1653
    feml2imp = (sladvoy - male2imp)  // py:1653
  }

  return {
    yeardep,
    yearaf,
    yearam,
    year5,
    year10,
    year25,
    year100,
    voy1imp,
    voy2imp,
    natinimp,
    tonnage,
    tonmod,
    tontype,
    fate2,
    fate3,
    fate4,
    embport,
    embport2,
    ncar13,
    ncar15,
    ncar17,
    ncartot,
    tslavesd,
    tslavesp,
    pctemb,
    regem1,
    regem2,
    regem3,
    mjbyptimp,
    embreg,
    embreg2,
    majbuypt,
    plac1tra,
    plac2tra,
    sla1port,
    adpsale1,
    adpsale2,
    arrport,
    arrport2,
    mjslptimp,
    regarr,
    regarr2,
    regdis1,
    regdis2,
    regdis3,
    slas32,
    slas36,
    slas39,
    slaarriv,
    slastot,
    pctdis,
    majselpt,
    portdep,
    ptdepimp,
    deptregimp,
    majbyimp,
    mjselimp,
    deptregimp1,
    majbyimp1,
    mjselimp1,
    portret,
    retrnreg1,
    xmimpflag,
    rig,
    slaximp,
    slamimp,
    captive_threshold,
    sladvoy,
    vymrtimp,
    tslmtimp,
    vymrtrat,
    men1,
    men4,
    men5,
    women1,
    women4,
    women5,
    adult1,
    adult4,
    adult5,
    girl1,
    girl4,
    girl5,
    boy1,
    boy4,
    boy5,
    child1,
    child4,
    child5,
    infant1,
    infant4,
    male1,
    male4,
    male5,
    female1,
    female4,
    female5,
    adlt1imp,
    chil1imp,
    male1imp,
    feml1imp,
    slavema1,
    slavemx1,
    slavmax1,
    chilrat1,
    malrat1,
    menrat1,
    womrat1,
    boyrat1,
    girlrat1,
    men3,
    men6,
    women3,
    women6,
    adult3,
    adult6,
    girl3,
    girl6,
    boy3,
    boy6,
    child3,
    child6,
    infant3,
    male3,
    male6,
    female3,
    female6,
    adlt3imp,
    chil3imp,
    male3imp,
    feml3imp,
    slavema3,
    slavemx3,
    slavmax3,
    chilrat3,
    malrat3,
    menrat3,
    womrat3,
    boyrat3,
    girlrat3,
    men7,
    women7,
    boy7,
    girl7,
    adult7,
    child7,
    male7,
    female7,
    slavema7,
    slavemx7,
    slavmax7,
    menrat7,
    womrat7,
    boyrat7,
    girlrat7,
    chilrat7,
    malrat7,
    men2,
    women2,
    adult2,
    girl2,
    boy2,
    child2,
    male2,
    female2,
    adlt2imp,
    chil2imp,
    male2imp,
    feml2imp,
  }
}
