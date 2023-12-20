import { Scope, VMValue } from "./vm";

const num = (v: number): VMValue => ({ kind: "number", value: v });
const string = (v: string): VMValue => ({ kind: "string", value: v });
const list = (v: VMValue[]): VMValue => ({ kind: "list", elements: v });
const record = <T extends Record<string, VMValue>>(v: T): VMValue => ({ kind: "record", fields: new Map(Object.entries(v)) });
const intrinsic = (argname: string, fn: (value: VMValue, scope: Scope) => VMValue): VMValue => ({ kind: "lambda", subkind: "intrinsic", argname, fn });

const typed_intrinsic = <T extends VMValue, K extends T["kind"]>(argname: string, kind: K, fn: (value: Extract<VMValue, T & { kind: K }>, scope: Scope) => VMValue) =>
    intrinsic(argname, (value, scope) => {
        if (value.kind !== kind) throw new Error(`${argname}: Expected ${kind}`);
        return fn(value as Extract<VMValue, T & { kind: K }>, scope);
    });



export function add_list_module(scope: Scope) {
    scope.constants.set("len", typed_intrinsic("list", "list", list => {
        return num(list.elements.length);
    }));

    scope.constants.set("first", typed_intrinsic("list", "list", list => {
        if (list.elements.length === 0) throw new Error("first: Empty list");
        return list.elements[0];
    }));

    scope.constants.set("last", typed_intrinsic("list", "list", list => {
        if (list.elements.length === 0) throw new Error("last: Empty list");
        return list.elements[list.elements.length - 1];
    }));

    scope.constants.set("take",
        typed_intrinsic("count", "number", count =>
            typed_intrinsic("list", "list", lst => {
                return list(lst.elements.slice(0, count.value));
            })
        )
    );

    scope.constants.set("skip",
        typed_intrinsic("count", "number", count =>
            typed_intrinsic("list", "list", lst => {
                return list(lst.elements.slice(count.value));
            })
        )
    );

    scope.constants.set("nth",
        typed_intrinsic("index", "number", index =>
            typed_intrinsic("list", "list", list => {
                if (list.elements.length <= index.value) throw new Error("nth: Index out of bounds");
                return list.elements[index.value];
            })
        )
    );

    scope.constants.set("map",
        typed_intrinsic("mapper", "lambda", (mapper, scope) =>
            typed_intrinsic("list", "list", lst =>
                list(lst.elements.map(l => scope.apply_lambda(mapper, l)))
            )
        )
    );

    scope.constants.set("filter",
        typed_intrinsic("predicate", "lambda", (predicate, scope) =>
            typed_intrinsic("list", "list", lst =>
                list(lst.elements.filter(l => {
                    const result = scope.apply_lambda(predicate, l);
                    return result.kind === "number" && result.value !== 0;
                }))
            )
        )
    );

    scope.constants.set("reduce",
        typed_intrinsic("acc", "lambda", (accumulator, scope) =>
            intrinsic("seed", seed =>
                typed_intrinsic("list", "list", lst =>
                    lst.elements.reduce((acc, l) => {
                        const result = scope.apply_lambda(accumulator, acc);
                        if (result.kind !== "lambda") throw new Error("reduce: Expected current value lambda");
                        return scope.apply_lambda(result, l);
                    }, seed)
                )
            )
        )
    );

    scope.constants.set("append",
        intrinsic("value", value =>
            typed_intrinsic("list", "list", lst =>
                list([...lst.elements, value])
            )
        )
    );
}

export function add_num_intrinsics(scope: Scope) {
    scope.constants.set("toStr", typed_intrinsic("num", "number", num => string(num.value.toString())));
}

export function add_string_intrinsics(scope: Scope) {
    scope.constants.set("split",
        typed_intrinsic("splitter", "string", splitter =>
            typed_intrinsic("str", "string", str =>
                list(str.value.split(splitter.value).map(l => string(l)))
            )
        )
    );
    scope.constants.set("regex",
        typed_intrinsic("pattern", "string", pattern =>
            typed_intrinsic("str", "string", str => {
                const regex = new RegExp(pattern.value);
                const results = regex.exec(str.value);
                if (results === null || results.groups === undefined) return record({});
                return record(Object.entries(results.groups)
                    .reduce((acc, [k, v]) => {
                        acc[k] = string(v);
                        return acc;
                    }, {} as Record<string, VMValue>)
                );
            })
        )
    );

    scope.constants.set("isNum",
        typed_intrinsic("str", "string", str => {
            const result = parseFloat(str.value);
            return num(isNaN(result) ? 0 : 1);
        })
    );

    scope.constants.set("toNum",
        typed_intrinsic("str", "string", str => {
            const result = parseFloat(str.value);
            if (isNaN(result)) throw new Error("num: String evaluates to NaN");
            return num(result);
        })
    );

    scope.constants.set("starts_with",
        typed_intrinsic("prefix", "string", prefix =>
            typed_intrinsic("str", "string", str => {
                return num(str.value.startsWith(prefix.value) ? 1 : 0);
            })
        )
    );

    scope.constants.set("scan",
        typed_intrinsic("acc", "lambda", (accumulator, scope) =>
            intrinsic("seed", seed =>
                typed_intrinsic("str", "string", str => {
                    let acc = record({ i: num(0), value: seed });
                    for (let i = 0; i < str.value.length; i) {
                        const curstr_lambda = scope.apply_lambda(accumulator, acc);
                        if (curstr_lambda.kind !== "lambda") throw new Error("scan: Expected current value lambda");
                        acc = scope.apply_lambda(curstr_lambda, string(str.value.slice(i)));
                        if (acc.kind !== "record") throw new Error("scan: Expected record");
                        const ii = acc.fields.get("i");
                        if (ii === undefined) throw new Error("scan: Expected i field");
                        if (ii.kind !== "number") throw new Error("scan: Expected number");
                        i = ii.value;
                    }
                    return acc;
                })
            )
        )
    );
}