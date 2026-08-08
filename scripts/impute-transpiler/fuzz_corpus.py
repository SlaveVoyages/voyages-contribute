#!/usr/bin/env python3
"""
Generate an adversarial impute corpus, in the same shape `build_corpus.py`
emits, so it drives the existing harness unchanged.

Real voyages cluster: most take the same few paths, so a published corpus leaves
rare branches unexercised however many rows it has. This biases towards what the
calculation actually branches on -- missing values, zeros, ties between the
counts it compares, and the era and code boundaries that select a mortality
group -- to reach the arms real data does not.

Deterministic: the seed is the only entropy, so a failing case is reproducible.

    python scripts/impute-transpiler/fuzz_corpus.py <out.json> [--rows=N] [--seed=N] [--iam]
"""
import json
import random
import sys

from build_corpus import CODED, DATES, NUMBERS, PLAIN

# Boundaries the calculation tests directly, so straddling them exercises both
# arms rather than whichever the data happens to favour.
ERA_EDGES = [1626, 1642, 1650, 1651, 1663, 1674, 1676, 1700, 1701, 1715, 1716,
             1726, 1731, 1751, 1773, 1774, 1776, 1783, 1786, 1794, 1800, 1801,
             1807, 1826, 1851, 1876]
# Place codes chosen to hit region arithmetic: aggregates, region boundaries and
# the sentinels the calculation assigns.
PLACES = [None, 0, 1, 60100, 60199, 60200, 60299, 60300, 60400, 60500, 60600,
          60700, 60800, 60999, 50200, 50299, 50300, 50399, 50400, 50422, 50500,
          31100, 31999, 36100, 36999, 40000, 80299, 80400, 99801, 99899]
TON_TYPES = [None, 1, 2, 3, 4, 5, 6, 7, 9, 13, 14, 15, 16, 17, 21, 22]
RIGS = [None, 1, 2, 3, 4, 5, 8, 9, 13, 25, 26, 27, 29, 30, 31, 35, 40, 42, 43,
        45, 54, 59, 60, 61, 63, 65, 80, 86]
NATIONS = [None, 1, 2, 4, 5, 7, 8, 9, 10, 11, 14, 16, 24, 25]
OUTCOMES = [None, 1, 2, 3, 5, 13, 28, 40, 66, 96, 208, 211, 212, 304, 313]


def maybe(rng, value, p_null=0.35):
    """Missing is the interesting case, so make it common."""
    return None if rng.random() < p_null else value


def a_count(rng):
    """Zero and null are distinct to the calculation, so both are frequent."""
    r = rng.random()
    if r < 0.30:
        return None
    if r < 0.45:
        return 0
    if r < 0.55:
        return rng.choice([1, 49, 50, 51])      # the captive_threshold edge
    return rng.randint(1, 600)


def a_date(rng):
    r = rng.random()
    if r < 0.30:
        return ''
    year = rng.choice(ERA_EDGES) + rng.choice([-1, 0, 1])
    if r < 0.50:
        return ',,%04d' % year                   # year only: a common shape
    month = rng.randint(1, 12)
    day = rng.randint(1, 28)
    return '%02d,%02d,%04d' % (month, day, year)


def build_record(rng, index, is_iam):
    rec = {}
    for attr in CODED:
        if attr == 'ton_type':
            v = rng.choice(TON_TYPES)
        elif attr == 'rig_of_vessel':
            v = rng.choice(RIGS)
        elif attr == 'national_carrier':
            v = rng.choice(NATIONS)
        elif attr in ('voyage_outcome', 'imputed_outcome_of_voyage_for_slaves'):
            v = rng.choice(OUTCOMES)
        else:
            v = rng.choice(PLACES)
        rec[attr] = None if v is None else {'value': v}

    for attr in DATES:
        rec[attr] = a_date(rng)

    rec['tonnage_of_vessel'] = maybe(rng, rng.choice(
        [0, 1, 150, 151, 250, 251, rng.randint(1, 900)]), 0.25)
    rec['length_of_middle_passage'] = maybe(rng, rng.choice(
        [0, 1, 9, 10, 11, 19, 20, 21, rng.randint(1, 400)]), 0.3)

    numbers = {}
    for key in NUMBERS:
        v = a_count(rng)
        if v is not None:
            numbers[key] = v
    # Ties drive several branches (`ncar13 == ncar15`, `slas32 == slas36`, ...)
    # and are vanishingly rare in random data, so force them often.
    if rng.random() < 0.35:
        tied = rng.choice([('NCAR13', 'NCAR15', 'NCAR17'),
                           ('SLAS32', 'SLAS36', 'SLAS39')])
        value = rng.choice([0, rng.randint(1, 400)])
        for k in tied[:rng.randint(2, 3)]:
            numbers[k] = value
    rec['slave_numbers'] = numbers

    rec['__id__'] = 'fuzz-%06d' % index
    rec['__is_iam__'] = is_iam
    rec['__published__'] = {}
    return rec


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    flags = {a.split('=')[0]: (a.split('=')[1] if '=' in a else True)
             for a in sys.argv[1:] if a.startswith('--')}
    if len(args) != 1:
        print(__doc__)
        return 2
    rows = int(flags.get('--rows', 20000))
    seed = int(flags.get('--seed', 20260806))
    is_iam = '--iam' in flags

    rng = random.Random(seed)
    out = [build_record(rng, i, is_iam) for i in range(rows)]
    json.dump(out, open(args[0], 'w', encoding='utf-8'), separators=(',', ':'))
    print('rows   : %d' % rows)
    print('seed   : %d' % seed)
    print('is_iam : %s' % is_iam)
    print('wrote %s' % args[0])
    return 0


if __name__ == '__main__':
    sys.exit(main())
