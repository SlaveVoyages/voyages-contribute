#!/usr/bin/env python3
"""
Run a corpus of impute inputs through the original `vendor/imputed.py` and write
the results, so the TypeScript port can be diffed against them.

The vendored module imports Django, so a minimal stub stands in: the impute
calculation only ever reads `.value` off a model instance and only ever calls
`Model.objects.get(value=...)` when mapping results back to fields.

    python scripts/impute-transpiler/differential.py corpus.json expected.json

`corpus.json` is a list of records shaped like the generated `ImputeInput`.
"""
import json
import os
import sys
import types

HERE = os.path.dirname(os.path.abspath(__file__))


# -- Django stand-ins ----------------------------------------------------

class _Obj:
    """A model instance, which the calculation only ever reads `.value` from."""

    def __init__(self, value):
        self.value = value

    def __repr__(self):
        return 'Obj(%r)' % (self.value,)


class _Manager:
    def get(self, value=None, **_):
        return _Obj(value)


class _Model:
    objects = _Manager()


def install_stubs():
    models = types.ModuleType('voyages.apps.voyage.models')
    for name in ('Place', 'Region', 'BroadRegion', 'Nationality', 'TonType',
                 'RigOfVessel', 'ParticularOutcome', 'SlavesOutcome',
                 'VesselCapturedOutcome', 'OwnerOutcome', 'Resistance',
                 'VoyageGroupings', 'Voyage', 'VoyageShip', 'VoyageItinerary',
                 'VoyageDates', 'VoyageCrew', 'VoyageSlavesNumbers',
                 'LinkedVoyages', 'AfricanInfo', 'CargoType', 'CargoUnit'):
        setattr(models, name, _Model)

    voyages = types.ModuleType('voyages')
    apps = types.ModuleType('voyages.apps')
    voyage = types.ModuleType('voyages.apps.voyage')
    voyages.apps = apps
    apps.voyage = voyage
    voyage.models = models

    exceptions = types.ModuleType('django.core.exceptions')

    class ObjectDoesNotExist(Exception):
        pass

    exceptions.ObjectDoesNotExist = ObjectDoesNotExist
    django = types.ModuleType('django')
    core = types.ModuleType('django.core')
    django.core = core
    core.exceptions = exceptions

    for name, mod in [
        ('voyages', voyages), ('voyages.apps', apps),
        ('voyages.apps.voyage', voyage), ('voyages.apps.voyage.models', models),
        ('django', django), ('django.core', core),
        ('django.core.exceptions', exceptions),
    ]:
        sys.modules[name] = mod


# -- Input adaptation ----------------------------------------------------

class _SlaveNumber:
    def __init__(self, var_name, number):
        self.var_name = var_name
        self.number = number


class _RelatedManager:
    def __init__(self, items):
        self._items = items

    def all(self):
        return self._items


class InterimStub:
    """Mirrors the InterimVoyage attributes the calculation reads."""

    def __init__(self, record):
        for key, value in record.items():
            if key == 'slave_numbers':
                setattr(self, key, _RelatedManager(
                    [_SlaveNumber(k, v) for k, v in value.items()]))
            elif isinstance(value, dict) and 'value' in value:
                setattr(self, key, _Obj(value['value']))
            else:
                setattr(self, key, value)


def jsonable(value):
    if isinstance(value, _Obj):
        return value.value
    if isinstance(value, (list, tuple)):
        return [jsonable(v) for v in value]
    if isinstance(value, dict):
        return {k: jsonable(v) for k, v in value.items()}
    if isinstance(value, (int, float, str, bool)) or value is None:
        return value
    return None      # managers, functions and other non-data locals


def main():
    if len(sys.argv) != 3:
        print(__doc__)
        return 2
    corpus_path, out_path = sys.argv[1], sys.argv[2]

    install_stubs()
    sys.path.insert(0, os.path.join(HERE, 'vendor'))
    import imputed                                    # noqa: E402

    corpus = json.load(open(corpus_path, encoding='utf-8'))
    results = []
    failures = []
    for i, record in enumerate(corpus):
        is_iam = bool(record.pop('__is_iam__', False))
        try:
            fields, numbers, env = imputed.compute_imputed_vars(
                InterimStub(record), is_iam)
            results.append({
                'id': record.get('__id__', i),
                'fields': {k: jsonable(v) for k, v in fields.items()},
                'numbers': {k: jsonable(v) for k, v in numbers.items()},
                'env': {k: jsonable(v) for k, v in env.items()
                        if not k.startswith('_')},
            })
        except Exception as e:                        # noqa: BLE001
            failures.append({'id': record.get('__id__', i),
                             'error': '%s: %s' % (type(e).__name__, e)})
            results.append({'id': record.get('__id__', i), 'error': True})

    json.dump(results, open(out_path, 'w', encoding='utf-8'), indent=1,
              sort_keys=True)
    print('records   : %d' % len(corpus))
    print('failures  : %d' % len(failures))
    for f in failures[:10]:
        print('   id=%s  %s' % (f['id'], f['error']))
    print('wrote %s' % out_path)
    return 0


if __name__ == '__main__':
    sys.exit(main())
