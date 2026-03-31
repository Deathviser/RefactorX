# Part 2 — Code Optimization & Code Generation Documentation

> **File:** `analyzer-part2-optimization-codegen.js`  
> Contains all optimization detection (Phase 6) and code generation/fixing methods (Phase 7), added via `CAnalyzer.prototype`.

---

# 🔬 Algorithms Used & Alternate Approaches

## Optimization Detection Algorithms

| # | Algorithm | Purpose | How It Works |
|---|---|---|---|
| 1 | **Algebraic Identity Detection** (Pattern Matching) | Flags `x+0`, `x*1`, `x*0` etc. | Regex patterns match known algebraic identity operations that have no effect or known results. |
| 2 | **Constant Expression Detection** | Flags `if(0)`, `if(1)`, `while(0)` | Pattern matches literal constants in condition positions to identify always-true/false branches. |
| 3 | **Division by Zero Detection** | Flags `/ 0` patterns | Regex `/\s*0(?!\d)` detects division by literal zero. Negative lookahead avoids matching `/10`, `/0.5`. |
| 4 | **Self-Assignment Detection** (Backreference Regex) | Catches `x = x;` | Uses regex `(\w+)\s*=\s*\1\s*;` where `\1` is a backreference to the captured variable name. |

### Alternate Algorithms for Optimization Detection

| Alternate | Description | Trade-off |
|---|---|---|
| **Constant Folding / Propagation** | Evaluates constant expressions at compile time and propagates known values through the program | More thorough than pattern matching; tracks constants across assignments. Used in all production compilers (GCC, LLVM). |
| **Common Subexpression Elimination (CSE)** | Identifies and reuses repeated computations like `a*b + a*b` | Requires expression DAG or value numbering. Reduces redundant calculations. |
| **Dead Code Elimination (DCE)** | Removes code that has no effect on program output using liveness analysis | Uses data flow analysis on CFG. More precise than regex-based constant condition detection. |
| **Strength Reduction** | Replaces expensive operations with cheaper equivalents, e.g., `x * 2` → `x << 1`, `x * 4` → `x << 2` | Classic loop optimization. Reduces computation cost at the instruction level. |
| **Loop-Invariant Code Motion (LICM)** | Moves computations that don't change inside a loop to before the loop | Reduces per-iteration work. Requires reaching definition analysis to verify invariance. |
| **Peephole Optimization** | Examines small windows (2-3 instructions) and replaces with faster equivalents | What the current analyzer partially implements. Could be extended to catch more patterns. |
| **Global Value Numbering (GVN)** | Assigns numbers to computed values to detect equivalences across basic blocks | More powerful than CSE; can detect `a+b == c+d` if `a==c` and `b==d`. Used in LLVM. |
| **Partial Redundancy Elimination (PRE)** | Combines CSE and LICM into a unified framework | Eliminates both fully and partially redundant computations. Optimal placement of computations. |
| **Abstract Interpretation** | Executes program on abstract domains (intervals, signs, etc.) to prove properties | Can prove absence of division by zero, overflow. Foundation: Cousot & Cousot (1977). |

---

## Code Generation Algorithms

| # | Algorithm | Purpose | How It Works |
|---|---|---|---|
| 5 | **Multi-Pass Line-by-Line Transformation** | Main refactoring engine | 4 passes: line fixes → unreachable code → brace balancing → formatting. |
| 6 | **Constant Folding via Regex** | `3 + 5` → `8`, `4 * 3` → `12` | Regex captures two adjacent numbers with operator, replaces with computed result. |
| 7 | **Algebraic Simplification** | `x + 0` → `x`, `x * 1` → `x` | Regex-based pattern replacement removes identity operations. |
| 8 | **Type-Based Variable Renaming** | `x` → `counter`, `f` → `decimal` | Predefined name pools per type. Skips names already > 3 chars or well-known names. |
| 9 | **Indentation-Based Code Formatter** | Proper code formatting | Tracks brace depth; applies 4-space indentation per level. Normalizes operator/comma spacing. |
| 10 | **Brace Balancing** (Count & Append) | Fixes missing closing `}` | Counts all `{` and `}` (excluding strings/comments); appends missing `}` at end. |

### Alternate Algorithms for Code Generation

| Alternate | Description | Trade-off |
|---|---|---|
| **AST-Based Code Generation** | Transform AST back into source code (pretty-printing) | Preserves code semantics perfectly. Industry standard: clang-format, Prettier, gofmt. |
| **Source-to-Source Transformation (Transpilation)** | Rewrite code using AST pattern matching rules | More precise than regex line transforms. Used by Coccinelle (Linux kernel), Clang-Tidy. |
| **Template-Based Code Generation** | Uses code templates with placeholder substitution | Cleaner for large-scale generation. Used in code generators, IDEs, and scaffolding tools. |
| **SSA-Based Optimization + Emission** | Optimize on SSA form, then emit code | Production compiler approach (LLVM IR → Machine Code). Maximum optimization power. |
| **Automated Program Repair (GenProg)** | Uses genetic programming to evolve bug fixes | Can fix bugs automatically without predefined patterns. Research-stage technology. |
| **Syntax-Guided Synthesis (SyGuS)** | Synthesizes code from specifications | Can generate correct fixes from examples/specs. Uses SMT solvers. Cutting-edge research. |
| **Tree-Walking Evaluator** | Evaluate AST nodes recursively for constant folding | More robust than regex-based folding; handles nested expressions like `(3+5)*2`. |

---

## Detailed Method Documentation

---

### `detectRedundantExpressions()`

**Purpose:** Flags algebraic identity operations that have no effect or predictable results.

**How it works:**
1. Defines 5 regex patterns for redundant operations
2. Tests each line against all patterns
3. Reports matching lines as `info` severity

**Patterns detected:**

| Pattern | Example | Message |
|---|---|---|
| `(\w+)\s*\+\s*0\b` | `x + 0` | Adding 0 has no effect |
| `(\w+)\s*-\s*0\b` | `x - 0` | Subtracting 0 has no effect |
| `(\w+)\s*\*\s*1\b` | `x * 1` | Multiplying by 1 has no effect |
| `(\w+)\s*\/\s*1\b` | `x / 1` | Dividing by 1 has no effect |
| `(\w+)\s*\*\s*0\b` | `x * 0` | Multiplying by 0 always gives 0 |

---

### `detectDivisionByZero()`

**Purpose:** Detects division by literal zero, which causes runtime crashes.

**How it works:**
- Uses regex `/\/\s*0(?!\d)/g` — matches `/` followed by `0` but NOT followed by another digit
- This prevents false positives on `/10` or `/0.5`
- Reports as `critical` severity

**Example:**
```c
int y = x / 0;  // ✗ DETECTED: Division by zero
int z = x / 10; // ✓ Not flagged (negative lookahead prevents match)
```

---

### `detectConstantConditions()`

**Purpose:** Detects conditions that are always true or always false (dead code).

**Patterns:**

| Code | Message | Dead Code? |
|---|---|---|
| `if(0)` | Condition is always false — code never executes | ✓ |
| `if(false)` | Condition is always false — code never executes | ✓ |
| `if(1)` | Condition is always true | ✗ (warning only) |
| `while(0)` / `while(false)` | Loop condition is always false — code never executes | ✓ |

---

### `detectSelfAssignment()`

**Purpose:** Detects `x = x;` patterns that have no effect.

**How it works:**
- Uses backreference regex: `(\w+)\s*=\s*\1\s*;`
- `\1` refers back to the first capture group — so `x = x` matches but `x = y` does not
- Reports as `warning` severity

**Example:**
```c
count = count;  // ✗ DETECTED: Self-assignment 'count = count'
count = total;  // ✓ Not flagged (different variable)
```

---

### `generateClearName(varName, varType)`

**Purpose:** Renames short variable names (≤3 chars) to descriptive names based on their type.

**Name pools:**

| Type | Suggested Names (in order) |
|---|---|
| `int` | counter, number, value, index, count |
| `float` | decimal, ratio, amount, rate |
| `double` | preciseValue, calculation |
| `char` | character, letter, symbol |

**Rules:**
- Skips variables already longer than 3 characters
- Skips well-known names: `result`, `count`, `index`, `value`, `total`, `sum`, `main`, `argc`, `argv`
- If all names in a pool are used, appends a number: `counter1`, `counter2`, etc.

**Example:**
```c
int x;     // → int counter;
float f;   // → float decimal;
char c;    // → char character;
int total; // → int total;  (unchanged — already clear)
```

---

### `generateRefactoredCode()`

**Purpose:** The main refactoring engine. Applies all bug fixes and optimizations to produce corrected code.

**Multi-pass transformation pipeline:**

#### Pass 1 — Line-by-line fixes (largest pass):
For each line, applies fixes in this order:
1. **Fix keyword typos** — `itn` → `int` (using fuzzy match results from Part 3)
2. **Skip unused function definitions** — tracks brace depth to skip entire function bodies
3. **Skip dead code blocks** — `while(0)`, `if(0)` bodies
4. **Remove calls to undefined functions** — BUT preserves lines that became valid after typo fix
5. **Fix malformed control structures** — `(x > 0}` → `(x > 0)`, `while(x}{` → `while(x) {`
6. **Initialize uninitialized variables** — `int x;` → `int x = 0;` (type-appropriate defaults)
7. **Remove unused variable declarations** — preserves if initialization has a function call
8. **Remove self-assignments** — both standalone (`x = x;`) and inline
9. **Remove empty control structures** — `if(x) ;`, `while(x) {}`, etc.
10. **Remove infinite loops** — `while(1)` without break, contradictory for-loops
11. **Fix missing semicolons** — via `fixMissingSemicolon()`
12. **Fix missing brackets** — via `fixMissingBrackets()`
13. **Fix invalid parameters** — via `fixInvalidParameters()`
14. **Fix assignment in condition** — `if(x = 5)` → `if(x == 5)`
15. **Fix array out of bounds** — via `fixArrayOutOfBounds()`
16. **Fix printf/scanf** — via `fixPrintfScanf()`
17. **Constant folding** — `3 + 5` → `8`, `4 * 3` → `12`
18. **Algebraic simplification** — `x + 0` → `x`, `x * 1` → `x`
19. **Variable renaming** — short names → descriptive names

#### Pass 2 — Unreachable code removal:
- Scans processed lines for `return` statements
- Removes any non-empty, non-brace, non-comment lines after return
- Resets at `}`

#### Pass 2.5 — Missing brace insertion:
- Counts all `{` and `}` in the code (excluding strings and comments)
- If `{` count > `}` count, appends missing `}` at the end

#### Pass 3 — Formatting:
- Calls `formatCode()` to apply proper indentation and spacing

---

### `fixMissingSemicolon(line, idx)`

**Purpose:** Adds `;` to lines that need it.

**How it works:**
1. Skips: empty lines, comments, preprocessor directives, lines already ending with `;` or `{` or `}`
2. Skips: control structures (`if`, `while`, `for`, `switch`, `else`)
3. Skips: function definitions
4. Checks against 8 patterns that need semicolons (declarations, assignments, function calls, return, break/continue, increment/decrement)
5. If inline comment exists, inserts `;` before the `//`

**Example:**
```c
int x = 5          // → int x = 5;
return 0            // → return 0;
printf("hello")     // → printf("hello");
x++                 // → x++;
if (x > 0) {        // → unchanged (control structure)
```

---

### `fixInvalidParameters(line)`

**Purpose:** Adds missing type annotations to function parameters. Defaults to `int` if no type given.

**Example:**
```c
void foo(x, y)      // → void foo(int x, int y)
void bar(int x, y)  // → void bar(int x, int y)
```

---

### `fixMissingBrackets(line)`

**Purpose:** Closes unclosed `[` brackets in array expressions.

**How it works:**
1. Counts `[` and `]` (tracking string literals to skip those inside strings)
2. If `[` count > `]` count, adds missing `]`
3. Inserts before `;` if semicolon exists, or appends at end

**Example:**
```c
arr[5          // → arr[5];
int arr[10     // → int arr[10];
```

---

### `fixArrayOutOfBounds(line)`

**Purpose:** Adjusts for-loop bounds when they would exceed an array's declared size.

**How it works:**
1. Matches for-loop pattern: `for(int i=0; i<LIMIT; i++)`
2. Calculates maximum index reached (`<` → limit-1, `<=` → limit)
3. Searches loop body for array access using the loop variable
4. If max index ≥ array size, changes condition to `< arraySize`

**Example:**
```c
int arr[10];
for(i=0; i<=10; i++) {    // → for(i=0; i<10; i++) {
    arr[i] = 0;            //    arr[i] = 0;
}                          // }
```

---

### `fixPrintfScanf(line)`

**Purpose:** Fixes 4 types of printf/scanf errors.

**Fix 1 — printf without format string:**
```c
printf(x)              // → printf("%d", x)
printf(myFloat)        // → printf("%f", myFloat)  (auto-detects type)
```

**Fix 2 — scanf without `&`:**
```c
scanf("%d", x)         // → scanf("%d", &x)
scanf("%s", str)       // → scanf("%s", str)  (no & for %s)
```

**Fix 3 — printf with specifiers but no args:**
```c
printf("%d")           // → printf("%d", 0) /* TODO: replace placeholder args */
printf("%d %f")        // → printf("%d %f", 0, 0.0) /* TODO: replace placeholder args */
```

**Fix 4 — printf with more specifiers than args:**
```c
printf("%d %f", x)     // → printf("%d %f", x, 0.0) /* TODO: replace placeholder args */
```

**Type-appropriate defaults:** `%d` → `0`, `%f/%lf` → `0.0`, `%s` → `""`, `%c` → `'\0'`

---

### `formatCode(code)`

**Purpose:** Full code formatter with indentation and spacing normalization.

**Pass 1 — Indentation:**
- Tracks brace depth (`{` increments, `}` decrements)
- Applies 4-space indentation per level
- Handles `} else {` correctly (close + open on same line)
- Collapses multiple consecutive empty lines into one

**Spacing normalization (only outside string literals):**
- Binary operators: `x+y` → `x + y`
- Comparison operators: `x==y` → `x == y`
- Assignment: `x=5` → `x = 5`
- Fixes over-corrected operators: `= =` → `==`, `+ +` → `++`, `+ =` → `+=`
- Comma spacing: `a,b` → `a, b`
- Removes space before `;`: `x ;` → `x;`
- Removes space inside parens/brackets: `( x )` → `(x)`, `[ i ]` → `[i]`

**Pass 2 — Readability:**
- Adds blank line after `#include` blocks
- Adds blank line after top-level closing `}` (function boundaries)
