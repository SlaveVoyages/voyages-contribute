#!/usr/bin/env python3
"""
Diff the Python and TypeScript impute results, and both against the values
published in the source dataset.

    python scripts/impute-transpiler/diff.py <expected.json> <actual.json> [corpus.json]
"""
import collections
import json
import sys


def close(a, b):
    """Exact, except for float noise below the last significant digit."""
    if a is None or b is None:
        return a is None and b is None
    if isinstance(a, bool) or isinstance(b, bool):
        return bool(a) == bool(b)
    if a == b:
        return True
    try:
        scale = max(abs(float(a)), abs(float(b)), 1.0)
        return abs(float(a) - float(b)) <= 1e-9 * scale
    except (TypeError, ValueError):
        return False


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        return 2
    expected = json.load(open(sys.argv[1], encoding='utf-8'))
    actual = json.load(open(sys.argv[2], encoding='utf-8'))
    corpus = json.load(open(sys.argv[3], encoding='utf-8')) if len(sys.argv) > 3 else None

    by_id = {str(r['id']): r for r in actual}
    mismatches = collections.Counter()
    examples = {}
    compared = 0
    rows_with_diff = 0

    for exp in expected:
        rid = str(exp['id'])
        act = by_id.get(rid)
        if act is None or 'env' not in exp or 'env' not in act:
            continue
        differing = False
        for var, want in exp['env'].items():
            if var == 'is_iam':
                continue      # the parameter, not a computed value
            got = act['env'].get(var)
            compared += 1
            if not close(want, got):
                mismatches[var] += 1
                differing = True
                examples.setdefault(var, (rid, want, got))
        rows_with_diff += 1 if differing else 0

    print('=' * 72)
    print('PYTHON vs TYPESCRIPT')
    print('=' * 72)
    print('rows compared     : %d' % len(expected))
    print('values compared   : %d' % compared)
    print('rows with a diff  : %d' % rows_with_diff)
    print('variables differing: %d' % len(mismatches))
    for var, n in mismatches.most_common(30):
        rid, want, got = examples[var]
        print('   %-14s %6d rows   e.g. id=%s py=%r ts=%r' % (var, n, rid, want, got))
    if not mismatches:
        print('   -- identical --')

    if corpus:
        pub_by_id = {str(r['__id__']): r.get('__published__', {}) for r in corpus}
        print('')
        print('=' * 72)
        print('PYTHON vs PUBLISHED DATASET  (informational: an editor may have')
        print('overridden a published value, so this is a signal, not a gate)')
        print('=' * 72)
        agree = collections.Counter()
        total = collections.Counter()
        pex = {}
        for exp in expected:
            pub = pub_by_id.get(str(exp['id']))
            if not pub or 'env' not in exp:
                continue
            for var, want in pub.items():
                if var not in exp['env']:
                    continue
                total[var] += 1
                if close(want, exp['env'][var]):
                    agree[var] += 1
                else:
                    pex.setdefault(var, (exp['id'], want, exp['env'][var]))
        worst = sorted(total, key=lambda v: agree[v] / total[v] if total[v] else 1)
        for var in worst:
            pct = 100.0 * agree[var] / total[var] if total[var] else 0
            flag = '' if pct > 99.5 else ('   <-- ' + repr(pex.get(var)))
            print('   %-14s %6.2f%%  (%d/%d)%s' % (var, pct, agree[var], total[var], flag))
    return 0


if __name__ == '__main__':
    sys.exit(main())
