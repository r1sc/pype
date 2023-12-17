/*
number = [0-9]+
string = '"' [^"]* '"'
ident = [a-zA-Z_][a-zA-Z_0-9]*

let = 'let' ident '=' expr ';'
lambda = '\' ident ':' expr
record = '{' ident ':' expr [',' ident ':' expr ] '}'

expr = apply { '|' expr }
apply = field { apply }
field = term { ['.' ident] }
term = prod { ('*' | '/') term }
prod = fact { ('+' | '-') prod }
fact = number | string | lambda | let | ident | '(' expr ')' | record
*/

const single_tokens = [";", "\\", ":", "|", ".", "*", "/", "+", "-", "(", ")", "{", "}", ",", "[", "]", "%"] as const;
const ident_tokens = ["let", "if", "then", "else"] as const;
export type Token =
    { kind: "number", value: number }
    | { kind: "string", value: string }
    | { kind: "ident", value: string }
    | { kind: "=" | "==" }
    | { kind: typeof ident_tokens[number] }
    | { kind: typeof single_tokens[number] };

export function lex(src: string): Token[] {
    const ws = [" ", String.fromCharCode(160), "\t", "\n", "\r"];
    const tokens: Token[] = [];

    for (let i = 0; i < src.length; i++) {
        if (ws.some(x => x === src[i])) {
            continue;
        }
        if (src[i] === "#") {
            do {
                i++;
            } while (i < src.length && src[i] !== "\n")
            continue;
        }

        if (src[i] >= "0" && src[i] <= "9") {
            let buffer = "";
            let parsed_dot = false;
            while ((src[i] >= "0" && src[i] <= "9") || (!parsed_dot && src[i] === ".")) {
                if (src[i] === ".") {
                    parsed_dot = true;
                }
                buffer += src[i];
                i++;
            }
            i--;
            tokens.push({ kind: "number", value: parseFloat(buffer) });
        } else if (src[i] === '"') {
            let buffer = "";
            i++;
            while (i < src.length && src[i] !== '"') {
                buffer += src[i];
                i++;
            }
            tokens.push({ kind: "string", value: buffer });
        } else if (src[i] >= "a" && src[i] <= "z") {
            let buffer = "";
            while ((src[i] >= "a" && src[i] <= "z") || (src[i] >= "A" && src[i] <= "Z") || (src[i] >= "0" && src[i] <= "9") || src[i] === "_") {
                buffer += src[i];
                i++;
            }
            i--;
            if (ident_tokens.some(x => x === buffer)) {
                tokens.push({ kind: buffer as typeof ident_tokens[number] });
            } else {
                tokens.push({ kind: "ident", value: buffer });
            }
        } else if (src[i] === "=") {
            if (i < src.length - 1 && src[i + 1] === "=") {
                i++;
                tokens.push({ kind: "==" });
            } else {
                tokens.push({ kind: "=" });
            }
        } else if (single_tokens.some(x => x === src[i])) {
            tokens.push({ kind: src[i] as typeof single_tokens[number] });
        } else {
            throw new Error(`Unrecognized token '${src[i]}'`);
        }
    }

    return tokens;
}

export class TokenStream {
    pos = 0;
    constructor(private tokens: Token[]) { }

    peek() {
        if (this.pos < this.tokens.length) {
            return this.tokens[this.pos];
        }
        return null;
    }

    advance() {
        this.pos++;
    }

    expect<K extends Token["kind"]>(kind: K): Extract<Token, Token & { kind: K }> {
        const t = this.peek();
        if (t === null) throw new Error(`Unexpected EOF, expected ${kind}`);
        if (t.kind !== kind) throw new Error(`Unexpected ${t.kind}, expected ${kind}`);
        this.advance();
        return t as Extract<Token, Token & { kind: K }>;
    }
}
