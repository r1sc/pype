import { BinaryExpr, Expr, NumberExpr, StringExpr } from "./parser";

export type LambdaValue = {
    kind: "lambda",
    subkind: "expr",
    scope_defined_in: Scope,
    argname: string,
    expr: Expr
} | {
    kind: "lambda",
    subkind: "intrinsic",
    argname: string,
    fn: (value: VMValue, scope: Scope) => VMValue
}

export interface RecordValue {
    kind: "record",
    fields: Map<string, VMValue>
}

export interface ListValue {
    kind: "list",
    elements: VMValue[]
}

export type VMValue = NumberExpr | StringExpr | RecordValue | LambdaValue | ListValue;


export function stringify(v: VMValue): string {
    switch (v.kind) {
        case "number": return v.value.toString();
        case "string": return `"${v.value}"`;
        case "record": return `{ ${Array.from(v.fields.entries()).map(([k, v]) => `${k}: ${stringify(v)}`).join(", ")} }`;
        case "lambda": return `lambda<${v.argname}>`;
        case "list": return `[${v.elements.map(l => stringify(l)).join(", ")}]`;
    }
}

export class Scope {
    constants = new Map<string, VMValue>();
    constructor(private parent: Scope | null = null) { }

    get_constant(name: string): VMValue {
        const v = this.constants.get(name);

        if (v !== undefined) return v;

        if (this.parent !== null) return this.parent.get_constant(name);
        throw new Error(`Undefined variable ${name}`);
    }

    eval_expr(e: Expr): VMValue {
        switch (e.kind) {
            case "lambda": return { kind: "lambda", subkind: "expr", argname: e.argname, scope_defined_in: this, expr: e.expr };
            case "record": {
                const fields = new Map<string, VMValue>();
                for (const [key, value] of Object.entries(e.fields)) {
                    fields.set(key, this.eval_expr(value));
                }
                return { kind: "record", fields };
            }
            case "list": {
                return { kind: "list", elements: e.elements.map(el => this.eval_expr(el)) };
            }
            case "string":
            case "number": return e;
            case "let": {
                this.constants.set(e.name, this.eval_expr(e.expr));
                return this.eval_expr(e.next);
            }
            case "ident": {
                const v = this.get_constant(e.value);
                if (v === undefined) throw new Error(`Undefined variable ${e.value}`);
                return v;
            }
            case "field": {
                const left = this.eval_expr(e.left);
                let cur = left;
                for (const field of e.fieldnames) {
                    if (cur.kind !== "record") {
                        throw new Error("Field access (.) only works on records");
                    }
                    const value = cur.fields.get(field);
                    if (value === undefined) throw new Error(`Undefined field '${field}' in record`);
                    cur = value;
                }
                return cur;
            }
            case "apply": {
                let lambda = this.eval_expr(e.left);
                for (const arg of e.args) {
                    if (lambda.kind !== "lambda") {
                        throw new Error(`Error during apply. Expected lambda, found ${lambda.kind}`);
                    }
                    lambda = this.apply_lambda(lambda, this.eval_expr(arg));
                }
                return lambda;
            }
            case "pipe": {
                let cur = this.eval_expr(e.left);
                for (const section of e.sections) {
                    const lambda = this.eval_expr(section);
                    if (lambda.kind !== "lambda") throw new Error("Can only pipe into lambdas");
                    cur = this.apply_lambda(lambda, cur);
                }
                return cur;
            }
            case "if": {
                const cond_result = this.eval_expr(e.cond);
                if (cond_result.kind !== "number") throw new Error("Only numbers can be used as if conditions");
                if (cond_result.value !== 0) return this.eval_expr(e.then);
                return this.eval_expr(e._else);
            }
            case "not": {
                const result = this.eval_expr(e.left);
                if(result.kind !== "number") throw new Error("Only numbers can be used as not conditions");
                return { kind: "number", value: result.value === 0 ? 1 : 0 };
            }
            case "*":
            case "/":
            case "+":
            case "-":
            case "==":
            case "%":
            case "<":
            case "<=":
            case ">":
            case ">=":
            case "and":
            case "or": return this.eval_binary(e);
        }
    }

    apply_lambda(lambda: LambdaValue, arg: VMValue): VMValue {
        if (lambda.subkind === "expr") {
            let curscope = new Scope(lambda.scope_defined_in);
            curscope.constants.set(lambda.argname, arg);
            return curscope.eval_expr(lambda.expr);
        } else {
            return lambda.fn(arg, this);
        }
    }


    eval_equals(left: VMValue, right: VMValue): boolean {
        if (left.kind !== right.kind) return false;
        if (left.kind === "string" && right.kind === "string") return left.value === right.value ? true : false;
        if (left.kind === "number" && right.kind === "number") return left.value === right.value ? true : false;
        if (left.kind === "record" && right.kind === "record") {
            if (left.fields.size !== right.fields.size) return false;
            console.log(Array.from(left.fields.keys()));
            const keys = new Set([...Array.from(left.fields.keys()), ...Array.from(right.fields.keys())]);
            if (keys.size !== left.fields.size) return false;
            for (const key of keys) {
                const l = left.fields.get(key);
                const r = right.fields.get(key);
                if (l === undefined || r === undefined) return false;
                if (!this.eval_equals(l, r)) return false;
            }
            return true;
        }
        return false;
    }

    eval_binary(e: BinaryExpr): VMValue {
        const left = this.eval_expr(e.left);
        const right = this.eval_expr(e.right);

        if (e.kind === "+" && left.kind === "string" && right.kind === "string") {
            return { kind: "string", value: left.value + right.value };
        }

        if (e.kind === "==") {
            return { kind: "number", value: this.eval_equals(left, right) ? 1 : 0 };
        }

        if (left.kind !== "number") throw new Error(`Expected number to the left of '${e.kind}', found ${left.kind}`);
        if (right.kind !== "number") throw new Error(`Expected number to the right of '${e.kind}' found ${right.kind}`);

        switch (e.kind) {
            case "*": return { kind: "number", value: left.value * right.value };
            case "/": return { kind: "number", value: left.value / right.value };
            case "+": return { kind: "number", value: left.value + right.value };
            case "-": return { kind: "number", value: left.value - right.value };
            case "%": return { kind: "number", value: left.value % right.value };
            case "<": return { kind: "number", value: left.value < right.value ? 1 : 0 };
            case "<=": return { kind: "number", value: left.value <= right.value ? 1 : 0 };
            case ">": return { kind: "number", value: left.value > right.value ? 1 : 0 };
            case ">=": return { kind: "number", value: left.value >= right.value ? 1 : 0 };
            case "and": return { kind: "number", value: left.value !== 0 && right.value !== 0 ? 1 : 0 };
            case "or": return { kind: "number", value: left.value !== 0 || right.value !== 0 ? 1 : 0 };
        }
    }
}