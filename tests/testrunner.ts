export type TestResult = "ok" | { kind: "err", error: string }

export interface Test {
    [K: string]: () => TestResult
}

export const assert = <T>(expected: T, actual: T): TestResult => actual === expected ? "ok" : ({kind: "err", error: `Expected ${expected}, found ${actual}`});

export function run_test(name: string, test: Test) {
    console.log(`Running test '${name}'`);
    for(const key of Object.keys(test)) {
        const result = test[key]();
        if(result === "ok") {
            console.log(`${key}: Pass`);
        } else {
            console.log(`${key}: Fail: ${result.error}`);
        }
    }
}