import { add_list_module, add_num_intrinsics, add_string_intrinsics } from "./lang/intrinsics";
import { TokenStream, lex } from "./lang/lexer";
import { Expr, parse_expr } from "./lang/parser";
import { Scope, VMValue, stringify } from "./lang/vm";

export type EvalResult = { kind: "err"; message: string } | { kind: "ok", data: VMValue, text: string }

export interface Edge { from: CodeNode, to: CodeNode }

interface SerializationObject {
    node_data: { title: string | undefined, src: string, x: number, y: number, w: number, h: number }[],
    edges: { a: number, b: number }[]
}

export class Graph {
    root: Scope;
    nodes: CodeNode[] = [];
    edges: Edge[] = [];

    constructor() {
        this.root = new Scope();
        add_list_module(this.root);
        add_string_intrinsics(this.root);
        add_num_intrinsics(this.root);
    }

    compile_and_run_parent(node: CodeNode) {
        node.scope.constants.clear();
        const edges_from = this.edges.filter(x => x.to === node);
        for (let i = 0; i < edges_from.length; i++) {
            const edge = edges_from[i];
            if (edge.from.output === undefined) {
                this.compile_and_run_parent(edge.from);
            }
            if (edge.from.output === undefined) {
                throw new Error("This should never happen");
            }
            if (edge.from.output?.kind === "err") {
                node.output = { kind: "err", message: "Error in input node" };
                return;
            }
            const varname = 97 + i;
            node.scope.constants.set(String.fromCharCode(varname), edge.from.output?.data);
        }
        node.compile_and_run();
    }

    compile_and_run_node(node: CodeNode) {
        this.compile_and_run_parent(node);

        const edges_to = this.edges.filter(x => x.from === node);
        for(const edge of edges_to) {
            this.compile_and_run_node(edge.to);
        }
    }

    delete_node(node: CodeNode) {
        for (let i = 0; i < this.edges.length; i++) {
            const edge = this.edges[i];
            if (edge.from === node || edge.to === node) {
                this.edges.splice(i, 1);
                i--;
            }
        }

        const idx = this.nodes.indexOf(node);
        this.nodes.splice(idx, 1);
    }

    save_to_localstorage() {
        const edges: SerializationObject["edges"] = [];
        for (const edge of this.edges) {
            const a = this.nodes.indexOf(edge.from);
            const b = this.nodes.indexOf(edge.to);
            edges.push({ a, b });
        }
        const node_data: SerializationObject["node_data"] = [];
        for (const node of this.nodes) {
            node_data.push({
                title: node.title,
                src: node.src,
                x: node.x,
                y: node.y,
                w: node.width,
                h: node.height
            });
        }
        const to_be_serialized: SerializationObject = { node_data, edges };
        const data = JSON.stringify(to_be_serialized);
        localStorage.setItem("data", data);
    }

    load_from_localstorage(): boolean {
        const data_str = localStorage.getItem("data");
        if (data_str === null) return false;

        const data = JSON.parse(data_str) as SerializationObject;
        this.edges = [];
        this.nodes = [];

        for (const node of data.node_data) {
            const codenode = new CodeNode(node.src, node.x, node.y, this.root, node.title);

            codenode.width = node.w;
            codenode.height = node.h;
            this.nodes.push(codenode);
        }

        for (const edge of data.edges) {
            this.edges.push({ from: this.nodes[edge.a], to: this.nodes[edge.b] });
        }

        return true;
    }
}

export class CodeNode {
    width = 0;
    height = 0;

    scope;
    compiled_expr?: Expr;
    output?: EvalResult;

    public constructor(public src: string, public x: number, public y: number, parent_scope: Scope, public title?: string) {
        this.scope = new Scope(parent_scope);
    }

    compile_and_run() {
        try {
            const tokens = new TokenStream(lex(this.src));
            this.compiled_expr = parse_expr(tokens);
            const expr = this.scope.eval_expr(this.compiled_expr);

            this.output = { kind: "ok", data: expr, text: stringify(expr) };
        } catch (e) {
            const err = e as Error;
            this.output = { kind: "err", message: err.message };
        }
    }
}


