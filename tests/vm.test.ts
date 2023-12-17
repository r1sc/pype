import { TokenStream, lex } from "../src/lang/lexer";
import { parse_expr } from "../src/lang/parser";
import { Scope } from "../src/lang/vm";
import { Test, assert } from './testrunner';

export const vm_tests: Test = {
    test_a: () => {
        const tokens = lex(`
        let hej = 2 + 5 * 324; 
        let b = 34; 
        let add = \\x:\\y: x + y;
        let addtwo = add 2;
        let addfive = add 5;
        let not = \\x: if x then 0 else 1;
        
        if {a: 23, b: 8} == {b: 8, a: 23} then 3 else 8
        
        
        `);
        const ast = parse_expr(new TokenStream(tokens));
        const scope = new Scope();
        const result = scope.eval_expr(ast);
        return assert(scope.stringify(result), "3");
    }
};
