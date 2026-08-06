#!/usr/bin/env python3
"""
Transpile the imputed-variable calculation of `vendor/imputed.py` into TypeScript.

This is a mechanical, auditable rewrite rather than a hand translation. Every
Python AST node type has one small named emitter below; an unrecognised node
aborts the run instead of being skipped, so the transform is total over the
input by construction. Each emitted statement carries a `py:NNN` comment
pointing back at its source line, so the two files can be read side by side.

Run:  python scripts/impute-transpiler/transpile.py
Out:  src/impute/generated/impute.ts
"""
import ast
import hashlib
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'vendor', 'imputed.py')
OUT = os.path.join(HERE, '..', '..', 'src', 'impute', 'generated', 'impute.ts')

# The calculation ends where the source starts reflecting over `locals()`. Beyond
# that point it assembles Django field values, which has no faithful mechanical
# translation and is replaced by hand-written TypeScript.
CUT_AT_STATEMENT = 'local_vars'

# `_interim` field types, by name. The generated `ImputeInput` mirrors the shape
# of the legacy InterimVoyage so one JSON record can drive both implementations.
INPUT_KIND = {
    'slave_numbers': 'ReadonlyMap<SlaveNumberVar, number>',
    'length_of_middle_passage': 'PyNum',
    'tonnage_of_vessel': 'PyNum',
}
INPUT_DATE_PREFIX = 'date_'

# Python callables -> runtime helpers. Anything not listed aborts the run.
CALLS = {
    'safe_ge': 'safeGe', 'safe_le': 'safeLe',
    'safe_lt': 'safeLt', 'safe_gt': 'safeGt',
    'get_obj_value': 'getObjValue', 'recode_var': 'recodeVar',
    'threshold': 'threshold', 'region_value': 'regionValue',
    'broad_value': 'broadValue', 'clear_mod': 'clearMod',
    'date_diff': 'dateDiff', 'extract_year': 'extractYear',
    'year_mod': 'yearMod', 'first_valid': 'firstValid',
    'round': 'pyRound', 'int': 'pyInt', 'range': 'pyRange',
}

RUNTIME_IMPORTS = [
    'PyNum', 'CodedValue', 'CsvDate', 'pyTruthy', 'safeGe', 'safeLe', 'safeLt',
    'safeGt', 'floorDiv', 'pyRound', 'pyInt', 'pyRange', 'clearMod',
    'regionValue', 'broadValue', 'recodeVar', 'threshold', 'yearMod',
    'firstValid', 'getObjValue', 'extractYear', 'dateDiff', 'dictGet',
    'eq', 'ne',
    'listRemove',
]

BINOPS = {'Add': '+', 'Sub': '-', 'Mult': '*', 'Div': '/'}
CMPOPS = {'Eq': '===', 'NotEq': '!==', 'Lt': '<', 'Gt': '>',
          'LtE': '<=', 'GtE': '>='}


class TranspileError(Exception):
    pass


class Emitter:
    def __init__(self, source_lines):
        self.lines = source_lines
        self.assigned = []          # hoisted locals, in first-assignment order
        self.inputs = {}            # _interim.<attr> -> True
        self.rules_used = {}        # node type -> count, for the audit report
        self.number_vars = []       # slave-number keys, in first-read order
        self.number_no_default = [] # ... of those, the ones read without a default

    # -- helpers ---------------------------------------------------------

    def fail(self, node, why):
        ln = getattr(node, 'lineno', '?')
        src = self.lines[ln - 1].strip() if isinstance(ln, int) else '?'
        raise TranspileError(f'line {ln}: {why}\n    {src}')

    def track(self, node):
        k = type(node).__name__
        self.rules_used[k] = self.rules_used.get(k, 0) + 1

    def name(self, ident):
        return 'iv' if ident == '_interim' else ident

    def note(self, node):
        return f'  // py:{node.lineno}'

    # -- expressions -----------------------------------------------------

    def expr(self, node):
        self.track(node)
        fn = getattr(self, 'e_' + type(node).__name__, None)
        if fn is None:
            self.fail(node, f'no emitter for expression node {type(node).__name__}')
        return fn(node)

    def e_Constant(self, node):
        v = node.value
        if v is None:
            return 'null'
        if v is True:
            return 'true'
        if v is False:
            return 'false'
        if isinstance(v, str):
            return '"' + v.replace('\\', '\\\\').replace('"', '\\"') + '"'
        if isinstance(v, (int, float)):
            return repr(v)
        self.fail(node, f'unsupported constant {v!r}')

    def e_Name(self, node):
        # A helper can appear as a bare value, e.g. `map(extract_year, ...)`.
        if node.id in CALLS:
            return CALLS[node.id]
        return self.name(node.id)

    def e_Attribute(self, node):
        if isinstance(node.value, ast.Name) and node.value.id == '_interim':
            self.inputs[node.attr] = True
            return f'iv.{node.attr}'
        self.fail(node, f'unsupported attribute access .{node.attr}')

    def e_Subscript(self, node):
        return f'{self.expr(node.value)}[{self.expr(node.slice)}]'

    def e_List(self, node):
        return '[' + ', '.join(self.expr(e) for e in node.elts) + ']'

    def e_Tuple(self, node):
        return self.e_List(node)

    def e_Dict(self, node):
        # Only two shapes occur: recode groups (int -> list) and the named date
        # sources (str -> field). Groups become ordered pairs, because JS object
        # keys that look like integers iterate in ascending numeric order and
        # would silently reorder them.
        pairs = []
        as_pairs = all(isinstance(k, ast.Constant) and isinstance(k.value, int)
                       for k in node.keys)
        for k, v in zip(node.keys, node.values):
            if as_pairs:
                pairs.append(f'[{self.expr(k)}, {self.expr(v)}]')
            else:
                pairs.append(f'{self.expr(k)}: {self.expr(v)}')
        return ('[' + ', '.join(pairs) + ']') if as_pairs else \
               ('{ ' + ', '.join(pairs) + ' }')

    def e_UnaryOp(self, node):
        op = type(node.op).__name__
        if op == 'Not':
            return f'!pyTruthy({self.expr(node.operand)})'
        if op == 'USub':
            return f'-{self.expr(node.operand)}'
        self.fail(node, f'unsupported unary operator {op}')

    def e_BinOp(self, node):
        op = type(node.op).__name__
        if op == 'FloorDiv':
            return f'floorDiv({self.expr(node.left)}, {self.expr(node.right)})'
        if op in BINOPS:
            return f'({self.expr(node.left)} {BINOPS[op]} {self.expr(node.right)})'
        self.fail(node, f'unsupported binary operator {op}')

    def e_BoolOp(self, node):
        # Operands are wrapped unconditionally: pyTruthy is idempotent over
        # booleans, so this needs no judgement about which operands are already
        # boolean, and cannot mis-associate the way a regex would.
        joiner = ' && ' if isinstance(node.op, ast.And) else ' || '
        return '(' + joiner.join(f'pyTruthy({self.expr(v)})'
                                 for v in node.values) + ')'

    def e_Compare(self, node):
        if len(node.ops) != 1:
            self.fail(node, 'chained comparison')
        op = type(node.ops[0]).__name__
        left, right = self.expr(node.left), self.expr(node.comparators[0])
        if op == 'Is':
            return f'({left} === {right})'
        if op == 'IsNot':
            return f'({left} !== {right})'
        if op == 'In':
            return f'{right}.includes({left})'
        # SPSS semantics, not Python's: see `eq`/`ne` in the runtime. `is` and
        # `is not` stay literal, being explicit null tests rather than
        # comparisons of data.
        if op == 'Eq':
            return f'eq({left}, {right})'
        if op == 'NotEq':
            return f'ne({left}, {right})'
        if op in CMPOPS:
            return f'({left} {CMPOPS[op]} {right})'
        self.fail(node, f'unsupported comparison {op}')

    def e_IfExp(self, node):
        return (f'(pyTruthy({self.expr(node.test)}) '
                f'? {self.expr(node.body)} : {self.expr(node.orelse)})')

    def e_ListComp(self, node):
        if len(node.generators) != 1:
            self.fail(node, 'multi-generator comprehension')
        gen = node.generators[0]
        if not isinstance(gen.target, ast.Name):
            self.fail(node, 'destructuring comprehension target')
        var = self.name(gen.target.id)
        out = self.expr(gen.iter)
        for cond in gen.ifs:
            out += f'.filter(({var}: any) => pyTruthy({self.expr(cond)}))'
        return out + f'.map(({var}: any) => {self.expr(node.elt)})'

    def e_Call(self, node):
        f = node.func
        # dict.get(key[, default]) -> dictGet
        if isinstance(f, ast.Attribute) and f.attr == 'get':
            # Record the slave-number keys so the input type can name them: the
            # presence or absence of a default is load-bearing, since a missing
            # key yields 0 in one case and null in the other.
            if (isinstance(f.value, ast.Name) and f.value.id == '_numbers'
                    and isinstance(node.args[0], ast.Constant)):
                key = node.args[0].value
                if key not in self.number_vars:
                    self.number_vars.append(key)
                    if len(node.args) == 1:
                        self.number_no_default.append(key)
            args = [self.expr(a) for a in node.args]
            if len(args) == 1:
                args.append('null')
            return f'dictGet({self.expr(f.value)}, {", ".join(args)})'
        if isinstance(f, ast.Attribute) and f.attr == 'append':
            return f'{self.expr(f.value)}.push({self.expr(node.args[0])})'
        if isinstance(f, ast.Attribute) and f.attr == 'remove':
            return f'listRemove({self.expr(f.value)}, {self.expr(node.args[0])})'
        if isinstance(f, ast.Name) and f.id == 'map':
            # map(fn, seq) -> seq.map(fn)
            return f'{self.expr(node.args[1])}.map({self.expr(node.args[0])})'
        if isinstance(f, ast.Name) and f.id in CALLS:
            return (CALLS[f.id] + '(' +
                    ', '.join(self.expr(a) for a in node.args) + ')')
        if isinstance(f, ast.Name):
            # A nested def declared earlier in the calculation.
            return f.id + '(' + ', '.join(self.expr(a) for a in node.args) + ')'
        self.fail(node, 'unsupported call target')

    # -- statements ------------------------------------------------------

    def stmt(self, node, ind):
        self.track(node)
        fn = getattr(self, 's_' + type(node).__name__, None)
        if fn is None:
            self.fail(node, f'no emitter for statement node {type(node).__name__}')
        return fn(node, ind)

    def block(self, body, ind):
        out = []
        for s in body:
            out.extend(self.stmt(s, ind))
        return out

    def s_Expr(self, node, ind):
        if isinstance(node.value, ast.Constant):
            return []          # a docstring
        return [f'{ind}{self.expr(node.value)}{self.note(node)}']

    def s_Assign(self, node, ind):
        if len(node.targets) != 1:
            self.fail(node, 'multiple assignment targets')
        t = node.targets[0]
        # `_numbers` is built by reflecting over a Django related manager; the
        # input carries the same mapping directly.
        if (isinstance(t, ast.Name) and t.id == '_numbers'
                and isinstance(node.value, ast.DictComp)):
            self.remember(t.id)
            self.inputs['slave_numbers'] = True
            return [f'{ind}_numbers = iv.slave_numbers{self.note(node)}']
        if isinstance(t, ast.Name):
            self.remember(t.id)
            return [f'{ind}{self.name(t.id)} = {self.expr(node.value)}{self.note(node)}']
        if isinstance(t, ast.Subscript):
            return [f'{ind}{self.expr(t)} = {self.expr(node.value)}{self.note(node)}']
        self.fail(node, f'unsupported assignment target {type(t).__name__}')

    def s_If(self, node, ind):
        out = [f'{ind}if (pyTruthy({self.expr(node.test)})) {{{self.note(node)}']
        out += self.block(node.body, ind + '  ')
        if node.orelse:
            out.append(f'{ind}}} else {{')
            out += self.block(node.orelse, ind + '  ')
        out.append(f'{ind}}}')
        return out

    def s_For(self, node, ind):
        if not isinstance(node.target, ast.Name):
            self.fail(node, 'destructuring for-target')
        if node.orelse:
            self.fail(node, 'for/else')
        self.remember(node.target.id)
        out = [f'{ind}for ({self.name(node.target.id)} of '
               f'{self.expr(node.iter)}) {{{self.note(node)}']
        out += self.block(node.body, ind + '  ')
        out.append(f'{ind}}}')
        return out

    def s_Try(self, node, ind):
        if node.orelse or node.finalbody or len(node.handlers) != 1:
            self.fail(node, 'unsupported try shape')
        out = [f'{ind}try {{{self.note(node)}']
        out += self.block(node.body, ind + '  ')
        out.append(f'{ind}}} catch {{')
        out += self.block(node.handlers[0].body, ind + '  ')
        out.append(f'{ind}}}')
        return out

    def s_Return(self, node, ind):
        return [f'{ind}return {self.expr(node.value)}{self.note(node)}']

    def s_FunctionDef(self, node, ind):
        args = ', '.join(a.arg + ': any' for a in node.args.args)
        out = [f'{ind}const {node.name} = ({args}): any => {{{self.note(node)}']
        out += self.block(node.body, ind + '  ')
        out.append(f'{ind}}}')
        return out

    def remember(self, ident):
        if ident not in self.assigned:
            self.assigned.append(ident)


def main():
    source = open(SRC, encoding='utf-8').read()
    digest = hashlib.sha256(source.encode('utf-8')).hexdigest()
    sha = open(os.path.join(HERE, 'vendor', 'PINNED_SHA')).read().strip()
    lines = source.split('\n')
    tree = ast.parse(source)

    fn = next(n for n in tree.body
              if isinstance(n, ast.FunctionDef) and n.name == 'compute_imputed_vars')

    cut = None
    for i, s in enumerate(fn.body):
        if (isinstance(s, ast.Assign) and isinstance(s.targets[0], ast.Name)
                and s.targets[0].id == CUT_AT_STATEMENT):
            cut = i
            break
    if cut is None:
        raise TranspileError(f'cut point `{CUT_AT_STATEMENT} = ...` not found')

    em = Emitter(lines)
    body = em.block(fn.body[:cut], '  ')

    # The tail's recode groups are data, so lift them out rather than letting
    # anyone retype twenty variable names by hand. `_recode_var_names` is
    # rebound before each all_or_nothing call; `_no_zeros` is bound once.
    groups, no_zeros, pending = [], [], None
    for s in fn.body[cut:]:
        if (isinstance(s, ast.Assign) and isinstance(s.targets[0], ast.Name)
                and isinstance(s.value, ast.List)):
            names = [e.value for e in s.value.elts if isinstance(e, ast.Constant)]
            if s.targets[0].id == '_recode_var_names':
                pending = names
            elif s.targets[0].id == '_no_zeros':
                no_zeros = names
        elif (isinstance(s, ast.Expr) and isinstance(s.value, ast.Call)
                and isinstance(s.value.func, ast.Name)
                and s.value.func.id == 'all_or_nothing'):
            if pending is None:
                raise TranspileError('all_or_nothing with no preceding group')
            groups.append(pending)
            pending = None
    if not groups or not no_zeros:
        raise TranspileError('could not lift the tail recode groups')

    locals_ = [n for n in em.assigned if not n.startswith('_')]
    hoisted = [n for n in em.assigned]

    def input_type(attr):
        if attr in INPUT_KIND:
            return INPUT_KIND[attr]
        if attr.startswith(INPUT_DATE_PREFIX):
            return 'CsvDate'
        return 'CodedValue | null'

    o = []
    o.append('/*')
    o.append(' * GENERATED FILE - DO NOT EDIT.')
    o.append(' *')
    o.append(' * Produced by scripts/impute-transpiler/transpile.py from the imputed-')
    o.append(' * variable calculation of IQSS/voyages voyages/apps/contribute/imputed.py.')
    o.append(' *')
    o.append(f' *   source commit : {sha}')
    o.append(f' *   source sha256 : {digest}')
    o.append(' *')
    o.append(' * Every statement carries a `py:NNN` comment giving its line in that')
    o.append(' * source, so the two can be read side by side. Regenerate rather than')
    o.append(' * editing; behaviour is pinned by tests/imputeGoldenTests.ts.')
    o.append(' */')
    o.append('/* eslint-disable */')
    o.append('import {')
    o.append('  ' + ',\n  '.join(RUNTIME_IMPORTS))
    o.append('} from "../spssRuntime"')
    o.append('')
    o.append('/**')
    o.append(' * Every slave-number variable the calculation reads, by codebook name.')
    o.append(' * Naming them keeps the real input surface visible: a mistyped key would')
    o.append(' * otherwise read as absent and silently change the result.')
    o.append(' */')
    o.append('export type SlaveNumberVar =')
    for k in em.number_vars:
        o.append(f'  | "{k}"')
    o.append('')
    o.append('export const SLAVE_NUMBER_VARS: readonly SlaveNumberVar[] = [')
    for i in range(0, len(em.number_vars), 6):
        o.append('  ' + ' '.join(f'"{k}",' for k in em.number_vars[i:i + 6]))
    o.append(']')
    o.append('')
    o.append('/**')
    o.append(' * Read without a default, so an absent key yields null rather than 0. The')
    o.append(' * distinction is load-bearing: null and 0 are both falsy to `pyTruthy`, but')
    o.append(' * they order differently under the safeGe family.')
    o.append(' */')
    o.append('export const SLAVE_NUMBER_VARS_WITHOUT_DEFAULT: readonly SlaveNumberVar[] = [')
    o.append('  ' + ' '.join(f'"{k}",' for k in em.number_no_default))
    o.append(']')
    o.append('')
    o.append('/**')
    o.append(' * Groups recoded together once the calculation is done: if any member is')
    o.append(' * truthy the falsy ones become 0, otherwise all become null.')
    o.append(' */')
    o.append('export const ALL_OR_NOTHING_GROUPS: readonly (readonly string[])[] = [')
    for g in groups:
        o.append('  [' + ', '.join(f'"{n}"' for n in g) + '],')
    o.append(']')
    o.append('')
    o.append('/** Cleared to null when falsy, after the group recodes. */')
    o.append('export const NO_ZERO_VARS: readonly string[] = [')
    o.append('  ' + ', '.join(f'"{n}"' for n in no_zeros))
    o.append(']')
    o.append('')
    o.append('/** The inputs, mirroring the legacy InterimVoyage. */')
    o.append('export interface ImputeInput {')
    for attr in sorted(em.inputs):
        o.append(f'  {attr}: {input_type(attr)}')
    o.append('}')
    o.append('')
    o.append('/** Every local of the source function, which its tail reflects over. */')
    o.append('export type ImputeEnv = Record<string, PyNum>')
    o.append('')
    o.append('export const runImpute = (')
    o.append('  iv: ImputeInput,')
    o.append('  is_iam: boolean')
    o.append('): ImputeEnv => {')
    for n in hoisted:
        o.append(f'  let {n}: any')
    o.append('')
    o.extend(body)
    o.append('')
    o.append('  return {')
    for n in locals_:
        o.append(f'    {n},')
    o.append('  }')
    o.append('}')
    o.append('')

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    open(OUT, 'w', encoding='utf-8', newline='\n').write('\n'.join(o))

    print(f'wrote {OUT}')
    print(f'  statements from py lines {fn.body[0].lineno}..{fn.body[cut].lineno - 1}')
    print(f'  hoisted locals : {len(hoisted)}  (exported: {len(locals_)})')
    print(f'  input fields   : {len(em.inputs)}')
    print('  node types used:')
    for k in sorted(em.rules_used, key=lambda x: -em.rules_used[x]):
        print(f'    {em.rules_used[k]:6d}  {k}')


if __name__ == '__main__':
    try:
        main()
    except TranspileError as e:
        print(f'TRANSPILE FAILED\n{e}', file=sys.stderr)
        sys.exit(1)
