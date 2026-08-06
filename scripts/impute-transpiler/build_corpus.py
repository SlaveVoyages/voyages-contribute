#!/usr/bin/env python3
"""
Build an impute corpus from a published voyages CSV export.

Each row becomes one record shaped like the generated `ImputeInput`, so the same
JSON drives both the original Python and the transpiled TypeScript. The row's
*published* imputed values are carried alongside under `__published__`, which
gives a second, independent check: agreeing with the shipped dataset catches
input-adaptation mistakes that a Python-vs-TypeScript diff cannot see, because
both sides would be reading the same wrong input.

    python scripts/impute-transpiler/build_corpus.py <csv> <out.json> [--limit N] [--iam]
"""
import csv
import io
import json
import os
import sys
import zipfile

# InterimVoyage attribute <- codebook column carrying a place/nation/type code.
CODED = {
    'national_carrier': 'national',
    'ton_type': 'tontype',
    'rig_of_vessel': 'rig',
    'voyage_outcome': 'fate',
    'imputed_outcome_of_voyage_for_slaves': 'fate2',
    'first_port_intended_embarkation': 'embport',
    'second_port_intended_embarkation': 'embport2',
    'first_port_intended_disembarkation': 'arrport',
    'second_port_intended_disembarkation': 'arrport2',
    'first_place_of_slave_purchase': 'plac1tra',
    'second_place_of_slave_purchase': 'plac2tra',
    'third_place_of_slave_purchase': 'plac3tra',
    'principal_place_of_slave_purchase': 'majbuypt',
    'first_place_of_landing': 'sla1port',
    'second_place_of_landing': 'adpsale1',
    'third_place_of_landing': 'adpsale2',
    'principal_place_of_slave_disembarkation': 'majselpt',
    'port_of_departure': 'portdep',
    'port_voyage_ended': 'portret',
}

# InterimVoyage date attribute <- (day, month, year) columns, as importcsv.py reads them.
DATES = {
    'date_departure': ('datedepa', 'datedepb', 'datedepc'),
    'date_slave_purchase_began': ('d1slatra', 'd1slatrb', 'd1slatrc'),
    'date_vessel_left_last_slaving_port': ('dlslatra', 'dlslatrb', 'dlslatrc'),
    'date_first_slave_disembarkation': ('datarr32', 'datarr33', 'datarr34'),
    'date_return_departure': ('ddepam', 'ddepamb', 'ddepamc'),
    'date_voyage_completed': ('datarr43', 'datarr44', 'datarr45'),
}

PLAIN = {
    'tonnage_of_vessel': 'tonnage',
    'length_of_middle_passage': 'voyage',
}

# Every slave-number key the calculation reads, by codebook name.
NUMBERS = [
    'NCAR13', 'NCAR15', 'NCAR17', 'TSLAVESD', 'TSLAVESP', 'SLAS32', 'SLAS36',
    'SLAS39', 'SLAARRIV', 'SLADVOY',
    'MEN1', 'MEN2', 'MEN3', 'MEN4', 'MEN5', 'MEN6',
    'WOMEN1', 'WOMEN2', 'WOMEN3', 'WOMEN4', 'WOMEN5', 'WOMEN6',
    'BOY1', 'BOY2', 'BOY3', 'BOY4', 'BOY5', 'BOY6',
    'GIRL1', 'GIRL2', 'GIRL3', 'GIRL4', 'GIRL5', 'GIRL6',
    'ADULT1', 'ADULT2', 'ADULT3', 'ADULT4', 'ADULT5', 'ADULT6',
    'CHILD1', 'CHILD2', 'CHILD3', 'CHILD4', 'CHILD5', 'CHILD6',
    'INFANT1', 'INFANT3', 'INFANT4',
    'MALE1', 'MALE2', 'MALE3', 'MALE4', 'MALE5', 'MALE6',
    'FEMALE1', 'FEMALE2', 'FEMALE3', 'FEMALE4', 'FEMALE5', 'FEMALE6',
]

# Published outputs, for the second check. Keyed by the calculation's own name.
PUBLISHED = [
    'natinimp', 'tonmod', 'fate2', 'fate3', 'fate4', 'ptdepimp', 'mjbyptimp',
    'mjslptimp', 'yeardep', 'yearaf', 'yearam', 'voy1imp', 'voy2imp',
    'xmimpflag', 'slaximp', 'slamimp', 'tslmtimp', 'vymrtimp', 'vymrtrat',
    'adlt1imp', 'chil1imp', 'male1imp', 'feml1imp', 'adlt2imp', 'chil2imp',
    'male2imp', 'feml2imp', 'adlt3imp', 'chil3imp', 'male3imp', 'feml3imp',
    'men7', 'women7', 'boy7', 'girl7', 'adult7', 'child7', 'male7', 'female7',
    'slavema1', 'slavemx1', 'slavmax1', 'slavema3', 'slavemx3', 'slavmax3',
    'slavema7', 'slavemx7', 'slavmax7',
    'menrat1', 'womrat1', 'boyrat1', 'girlrat1', 'chilrat1', 'malrat1',
    'menrat3', 'womrat3', 'boyrat3', 'girlrat3', 'chilrat3', 'malrat3',
    'menrat7', 'womrat7', 'boyrat7', 'girlrat7', 'chilrat7', 'malrat7',
]


def num(raw):
    if raw is None:
        return None
    raw = raw.strip()
    if raw == '':
        return None
    try:
        f = float(raw)
    except ValueError:
        return None
    return int(f) if f.is_integer() else f


def pad(raw, width):
    """A date component, zero-padded as `date_csv` does; '' when absent."""
    if raw is None:
        return ''
    raw = raw.strip()
    if raw == '':
        return ''
    try:
        raw = str(int(float(raw)))
    except ValueError:
        return ''
    if len(raw) < width:
        raw = raw.rjust(width, '0')
    return raw if len(raw) == width else ''


def build(row, is_iam):
    rec = {}
    for attr, col in CODED.items():
        v = num(row.get(col))
        rec[attr] = None if v is None else {'value': v}
    for attr, (d, m, y) in DATES.items():
        day, month, year = pad(row.get(d), 2), pad(row.get(m), 2), pad(row.get(y), 4)
        rec[attr] = ('%s,%s,%s' % (month, day, year)) if (month or day or year) else ''
    for attr, col in PLAIN.items():
        rec[attr] = num(row.get(col))
    numbers = {}
    for key in NUMBERS:
        v = num(row.get(key.lower()))
        if v is not None:
            numbers[key] = v
    rec['slave_numbers'] = numbers
    rec['__id__'] = (row.get('voyageid') or '').strip()
    rec['__is_iam__'] = is_iam
    rec['__published__'] = {k: num(row.get(k)) for k in PUBLISHED if k in row}
    return rec


def open_csv(path):
    """The vendored corpora are zipped, being immutable and large."""
    if path.lower().endswith('.zip'):
        with zipfile.ZipFile(path) as z:
            name = next(n for n in z.namelist() if n.lower().endswith('.csv'))
            data = z.read(name)
        return io.StringIO(data.decode('utf-8-sig', errors='replace'))
    return open(path, newline='', encoding='utf-8-sig', errors='replace')


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    flags = {a for a in sys.argv[1:] if a.startswith('--')}
    if len(args) != 2:
        print(__doc__)
        return 2
    csv_path, out_path = args
    limit = None
    for f in flags:
        if f.startswith('--limit='):
            limit = int(f.split('=')[1])
    is_iam = '--iam' in flags

    csv.field_size_limit(10 ** 7)
    out = []
    with open_csv(csv_path) as fh:
        reader = csv.DictReader(fh)
        reader.fieldnames = [c.strip().lower() for c in reader.fieldnames]
        for i, row in enumerate(reader):
            if limit is not None and i >= limit:
                break
            out.append(build(row, is_iam))

    json.dump(out, open(out_path, 'w', encoding='utf-8'), separators=(',', ':'))
    print('rows           : %d' % len(out))
    print('is_iam         : %s' % is_iam)
    filled = sum(1 for r in out if r['slave_numbers'])
    print('with numbers   : %d' % filled)
    print('wrote %s (%.1f MB)' % (out_path, os.path.getsize(out_path) / 1e6))
    return 0


if __name__ == '__main__':
    sys.exit(main())
