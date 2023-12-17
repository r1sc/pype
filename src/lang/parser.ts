import { TokenStream } from "./lexer";

export interface LetExpr { kind: "let", name: string, expr: Expr, next: Expr }
function parse_let(tokens: TokenStream): LetExpr {
    tokens.expect("let");
    const name = tokens.expect("ident");
    tokens.expect("=");
    const expr = parse_expr(tokens);
    tokens.expect(";");
    const next = parse_expr(tokens);
    return { kind: "let", name: name.value, expr, next };
}

export interface LambdaExpr { kind: "lambda", argname: string, expr: Expr }
function parse_lambda(tokens: TokenStream): LambdaExpr {
    tokens.expect("\\");
    const argname = tokens.expect("ident");
    tokens.expect(":");
    const expr = parse_expr(tokens);
    return { kind: "lambda", argname: argname.value, expr };
}

export interface RecordExpr { kind: "record", fields: Record<string, Expr> }
function parse_record(tokens: TokenStream): RecordExpr {
    tokens.expect("{");
    const fields: Record<string, Expr> = {};
    while (tokens.peek()?.kind !== "}") {
        const name = tokens.expect("ident");
        tokens.expect(":")
        fields[name.value] = parse_expr(tokens);

        if (tokens.peek()?.kind !== "}") {
            tokens.expect(",");
        }
    }
    tokens.advance(); // remove }

    return { kind: "record", fields };
}

export interface IfExpr { kind: "if", cond: Expr, then: Expr, _else: Expr }
function parse_if(tokens: TokenStream): IfExpr {
    tokens.expect("if");
    const cond = parse_expr(tokens);
    tokens.expect("then");
    const then = parse_expr(tokens);
    tokens.expect("else");
    const _else = parse_expr(tokens);
    return { kind: "if", cond, then, _else };
}

export interface ListExpr { kind: "list", elements: Expr[] }
function parse_list(tokens: TokenStream): ListExpr {
    tokens.expect("[");
    const elements: Expr[] = [];
    while (tokens.peek()?.kind !== "]") {
        elements.push(parse_expr(tokens));

        if (tokens.peek()?.kind !== "]") {
            tokens.expect(",");
        }
    }
    tokens.advance(); // remove ]

    return { kind: "list", elements };
}

export interface FieldExpr { kind: "field", left: Expr, fieldnames: string[] }
export interface BinaryExpr { kind: "*" | "/" | "+" | "-" | "==" | "%", left: Expr, right: Expr }
export interface ApplyExpr { kind: "apply", left: Expr, args: Expr[] }
export interface PipeExpr { kind: "pipe", left: Expr, sections: Expr[] }
export interface NumberExpr { kind: "number", value: number }
export interface StringExpr { kind: "string", value: string }
export interface IdentExpr { kind: "ident", value: string }

export type Expr = FieldExpr | BinaryExpr | LetExpr | LambdaExpr
    | NumberExpr | StringExpr | IdentExpr | PipeExpr | ApplyExpr
    | RecordExpr | IfExpr | ListExpr;

export function parse_expr(tokens: TokenStream): Expr {
    const left = parse_apply(tokens);
    if (tokens.peek()?.kind === "|") {
        const sections: Expr[] = [];
        while (tokens.peek()?.kind === "|") {
            tokens.advance();
            sections.push(parse_apply(tokens));
        }
        return { kind: "pipe", left, sections };
    }
    return left;
}

function parse_apply(tokens: TokenStream): Expr {
    const valid_args = ["number", "string", "{", "\\", "let", "ident", "(", "if"] as const;
    const left = parse_field_eqeq(tokens);
    const next = tokens.peek();
    if (valid_args.some(x => x === next?.kind)) {
        let args: Expr[] = [];
        while (valid_args.some(x => x === tokens.peek()?.kind)) {
            args.push(parse_field_eqeq(tokens));
        }
        return { kind: "apply", left, args };
    }
    return left;
}

function parse_field_eqeq(tokens: TokenStream): Expr {
    const left = parse_term(tokens);
    if (tokens.peek()?.kind === "==") {
        tokens.advance();
        const right = parse_field_eqeq(tokens);
        return { kind: "==", left, right };
    }
    return left;
}

function parse_term(tokens: TokenStream): Expr {
    const left = parse_prod(tokens);
    const next = tokens.peek();
    if (next?.kind === "+" || next?.kind === "-") {
        tokens.advance();
        const right = parse_term(tokens);
        return { kind: next.kind, left, right };
    }
    return left;
}

function parse_prod(tokens: TokenStream): Expr {
    const left = parse_fact(tokens);
    const next = tokens.peek();
    if (next?.kind === "*" || next?.kind === "/" || next?.kind === "%") {
        tokens.advance();
        const right = parse_prod(tokens);
        return { kind: next.kind, left, right };
    }
    return left;
}

function parse_number(tokens: TokenStream): NumberExpr {
    return { kind: "number", value: tokens.expect("number").value };
}

function parse_string(tokens: TokenStream): StringExpr {
    return { kind: "string", value: tokens.expect("string").value };
}

function parse_ident(tokens: TokenStream): IdentExpr | FieldExpr {
    const left = tokens.expect("ident");
    if (tokens.peek()?.kind === ".") {
        let fieldnames: string[] = [];
        while (tokens.peek()?.kind === ".") {
            tokens.advance();
            const fieldname = tokens.expect("ident");
            fieldnames.push(fieldname.value)
        }
        return { kind: "field", left, fieldnames };
    }
    return { kind: "ident", value: left.value };
}

function parse_grouped(tokens: TokenStream): Expr {
    tokens.expect("(");
    const expr = parse_expr(tokens);
    tokens.expect(")");
    return expr;
}

function parse_fact(tokens: TokenStream): Expr {
    const next = tokens.peek();
    if (next?.kind === "number") return parse_number(tokens);
    if (next?.kind === "string") return parse_string(tokens);
    if (next?.kind === "\\") return parse_lambda(tokens);
    if (next?.kind === "let") return parse_let(tokens);
    if (next?.kind === "if") return parse_if(tokens);
    if (next?.kind === "ident") return parse_ident(tokens);
    if (next?.kind === "(") return parse_grouped(tokens);
    if (next?.kind === "{") return parse_record(tokens);
    if (next?.kind === "[") return parse_list(tokens);
    throw new Error(`Expected number, string, lambda, let, ident, record or grouped () expression`);
}
