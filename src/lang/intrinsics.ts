import { Scope, VMValue } from "./vm";

export function add_intrinsics(scope: Scope) {
    scope.constants.set("split", {
        kind: "instrinsic", argname: "splitter", fn: (splitter: VMValue) => {
            if (splitter.kind !== "string") throw new Error("split: Expected string");
            return {
                kind: "instrinsic", argname: "str", fn: (str: VMValue) => {
                    if (str.kind !== "string") throw new Error("split: Expected string");
                    return { kind: "list", elements: str.value.split(splitter.value).map(l => ({ kind: "string", value: l })) };
                }
            }
        }
    });

    scope.constants.set("first", {
        kind: "instrinsic", argname: "list", fn: list => {
            if (list.kind !== "list") throw new Error("first: Expected list");
            if (list.elements.length === 0) throw new Error("first: Empty list");
            return list.elements[0];
        }
    });

    scope.constants.set("nth", {
        kind: "instrinsic", argname: "index", fn: index => {
            if (index.kind !== "number") throw new Error("nth: Expected number");
            return {
                kind: "instrinsic", argname: "list", fn: list => {
                    if (list.kind !== "list") throw new Error("nth: Expected list");
                    if (list.elements.length <= index.value) throw new Error("nth: Index out of bounds");
                    return list.elements[index.value];
                }
            }
        }
    });

    scope.constants.set("map", {
        kind: "instrinsic", argname: "fn", fn: (mapper: VMValue, scope: Scope) => {
            if (mapper.kind !== "lambda") throw new Error("map: Expected lambda");
            return {
                kind: "instrinsic", argname: "list", fn: (list: VMValue) => {
                    if (list.kind !== "list") throw new Error("map: Expected list");
                    return {
                        kind: "list",
                        elements: list.elements.map(l => scope.apply_lambda(mapper, l))
                    };
                }
            }
        }
    });

    scope.constants.set("filter", {
        kind: "instrinsic", argname: "predicate", fn: (predicate: VMValue, scope: Scope) => {
            if (predicate.kind !== "lambda") throw new Error("filter: Expected lambda");
            return {
                kind: "instrinsic", argname: "list", fn: (list: VMValue) => {
                    if (list.kind !== "list") throw new Error("filter: Expected list");
                    return {
                        kind: "list",
                        elements: list.elements.filter(l => {
                            const result = scope.apply_lambda(predicate, l);
                            return result.kind === "number" && result.value !== 0;
                        })
                    };
                }
            }
        }
    });

    scope.constants.set("regex", {
        kind: "instrinsic", argname: "pattern", fn: (pattern: VMValue, scope: Scope) => {
            if (pattern.kind !== "string") throw new Error("regex: Expected pattern");
            return {
                kind: "instrinsic", argname: "str", fn: (str: VMValue) => {
                    if (str.kind !== "string") throw new Error("regex: Expected string");

                    const regex = new RegExp(pattern.value);
                    const results = regex.exec(str.value);
                    if (results === null || results.groups === undefined) return { kind: "record", fields: new Map() };
                    const fields = new Map<string, VMValue>();
                    for (const groupkey of Object.keys(results.groups)) {
                        fields.set(groupkey, { kind: "string", value: results.groups[groupkey] });
                    }
                    return { kind: "record", fields };
                }
            }
        }
    });

    scope.constants.set("toNum", {
        kind: "instrinsic", argname: "str", fn: string => {
            if (string.kind !== "string") throw new Error("num: Expected string");
            const result = parseFloat(string.value);
            if (isNaN(result)) throw new Error("num: String evaluates to NaN");
            return { kind: "number", value: result };
        }
    });
}