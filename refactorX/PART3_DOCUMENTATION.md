# Part 3 — Levenshtein Fuzzy Matching, Semantic Analysis, Control Flow & UI Documentation

> **File:** `analyzer-part3-semantics-controlflow-ui.js`  
> Contains the Damerau-Levenshtein fuzzy matching engine, all semantic analysis, control flow analysis, and standalone UI functions. All class methods added via `CAnalyzer.prototype`.

---

# 🔬 Algorithms Used & Alternate Approaches

## Fuzzy Matching Algorithms

| # | Algorithm | Purpose | How It Works |
|---|---|---|---|
| 1 | **Damerau-Levenshtein Distance** (Dynamic Programming) | Detects keyword typos like `itn` → `int` | Builds a `(m+1)×(n+1)` DP matrix computing minimum edits. Supports 4 operations: **insertion**, **deletion**, **substitution**, and **transposition** of adjacent characters. |
| 2 | **Fuzzy Token Matching with Adaptive Thresholds** | Avoids false positives on short vs long keywords | Short keywords (≤3 chars): max 1 edit allowed. Longer keywords: max 2 edits. Length difference filter of ±2 chars prevents comparing "x" against "unsigned". |

### Alternate Algorithms for Fuzzy Matching

| Alternate | Description | Trade-off |
|---|---|---|
| **Standard Levenshtein Distance** | Same as Damerau but without transposition support | Simpler to implement but misses common keyboard typos like `itn`→`int` (counts as 2 edits instead of 1). |
| **Optimal String Alignment (OSA)** | Restricted Damerau-Levenshtein that doesn't allow substring edits after transposition | Slightly faster O(m×n) with smaller constants, but less accurate for chained edits. |
| **Jaro-Winkler Similarity** | Measures character-level similarity with bonus weight for matching prefixes | Returns 0.0–1.0 similarity score. Better for name matching; less suited for short C keywords where single-char differences matter. |
| **Bitap (Shift-Or) Algorithm** | Bit-parallel approximate string matching using bitwise operations | Very fast for fixed max edit distance k. Used by Unix `agrep`. O(n × k) time. |
| **BK-Tree (Burkhard-Keller Tree)** | Metric tree that indexes strings by edit distance | O(log n) lookup instead of O(n) linear scan. Ideal when keyword set is very large (thousands). |
| **Trie with Error Tolerance** | Traverse a trie allowing up to k mismatches per branch | Efficient for dictionary-based spell checking. Used in Norvig's spell corrector. |
| **Soundex / Metaphone** | Phonetic algorithms that encode similar-sounding words identically | Useful for spoken-language typos but not ideal for code identifiers where spelling matters. |
| **N-gram Similarity** | Compares overlapping character n-grams (bigrams, trigrams) between strings | Fast approximate matching with O(n) time. Used in plagiarism detection. Less precise for short tokens. |

---

## Symbol Table & Semantic Algorithms

| # | Algorithm | Purpose | How It Works |
|---|---|---|---|
| 3 | **Hash Map Symbol Table** (`Map`) | Tracks variables, arrays, functions | O(1) lookup with metadata: type, line number, initialization status, parameters. |
| 4 | **Set-Based Call Tracking** (`Set`) | Records all function calls | O(1) membership check when comparing defined vs. called functions. |
| 5 | **Two-Pass Function Detection** | Separates definitions from calls | Pass 1: regex-based definition scan. Pass 2: call scan excluding definition lines. |
| 6 | **Three-Pass Variable Analysis** | Uninitialized + unused detection | Pass 1: declaration scan. Pass 2: usage-before-assignment. Pass 3: occurrence counting. |
| 7 | **Format Specifier Parsing** | Printf/scanf argument mismatches | Counts `%d`, `%f`, `%s` in format strings, compares against argument count. Skips `%%`. |
| 8 | **Array Bounds Analysis** | Out-of-bounds access detection | Constant index check + for-loop bound variable analysis against declared sizes. |
| 9 | **Brace Counting Body Tracing** | Missing return detection | Increments/decrements brace counter to identify function body boundaries, then checks for `return`. |

### Alternate Algorithms for Semantic Analysis

| Alternate | Description | Trade-off |
|---|---|---|
| **Scoped/Nested Symbol Table** (Tree of Hash Maps) | Each `{}` block creates a child scope | Handles variable shadowing and block scoping correctly. More complex to implement. |
| **SSA (Static Single Assignment) Form** | Each variable assigned exactly once; uses φ-functions at join points | Industry standard for optimizing compilers (LLVM, GCC). Enables powerful optimizations and precise analysis. |
| **Use-Def / Def-Use Chains** | Explicitly links each use of a variable to its definition(s) and vice versa | Precise tracking of data flow. Better uninitialized variable detection across branches. |
| **Type Inference (Hindley-Milner)** | Automatically deduces types without explicit annotations | More powerful than regex-based type tracking. Used in Haskell, ML, Rust. |
| **Abstract Interpretation** | Executes program on abstract domains (intervals, signs, etc.) | Can prove absence of runtime errors. Theoretical foundation: Cousot & Cousot (1977). |
| **Data Flow Analysis (Reaching Definitions)** | For each point in code, computes which definitions may reach it | More precise than line-by-line scanning for uninitialized variable detection. |
| **Symbolic Execution** | Treats variables as symbols, explores all execution paths | Can discover deep bugs like buffer overflows across function calls. Used by KLEE. |
| **Taint Analysis** | Tracks flow of untrusted data through the program | Detects security vulnerabilities (SQL injection, buffer overflow). |
| **Constraint-Based Analysis** | Generates and solves constraints over program variables | Can verify array bounds statically. Used in tools like CBMC. |
| **SMT Solvers (Z3, CVC5)** | Satisfiability Modulo Theories — proves/disproves logical formulas about code | Used by advanced static analyzers (Facebook Infer, KLEE) for precise bug detection. |

---

## Control Flow Algorithms

| # | Algorithm | Purpose | How It Works |
|---|---|---|---|
| 10 | **Linear Scan with State Flag** | Unreachable code detection | Sets an "after return" flag; flags subsequent non-empty lines until `}` resets the flag. |
| 11 | **Pattern-Based Infinite Loop Detection** | Catches `while(1)`, `for(;;)`, contradictory loops | Regex-matches loop constructs, analyzes conditions, checks loop body for `break`/`return`. |
| 12 | **Loop Body Variable Modification Analysis** | Detects loops where condition variable never changes | Scans loop body for assignments to the condition variable. No modification → infinite loop. |
| 13 | **Empty Body Detection** (Single-line & Multi-line) | Catches `if(x) ;`, `while(x) {}` etc. | Pattern matches semicolons after control keywords and `{` immediately followed by `}`. |

### Alternate Algorithms for Control Flow

| Alternate | Description | Trade-off |
|---|---|---|
| **Control Flow Graph (CFG)** | Represents program as a directed graph of basic blocks | Industry standard. Enables dominance analysis, loop detection, reachability. Much more precise. |
| **Dominator Tree (Lengauer-Tarjan)** | Computes dominance relationships in CFG | Can identify unreachable code, natural loops, and back edges precisely. O(n × α(n)) time. |
| **Strongly Connected Components (Tarjan/Kosaraju)** | Finds SCCs in CFG to detect all loops | Catches complex loop structures including mutual recursion and nested loops. |
| **Interval Analysis** | Partitions CFG into nested intervals for structured analysis | Used in decompilers and advanced optimizers for loop analysis. |
| **Termination Analysis (Ranking Functions)** | Proves whether a loop terminates using mathematical ranking functions | Can prove termination for complex loops. Undecidable in general (Halting Problem). |
| **Halting Problem** (Turing, 1936) | It is impossible to decide in general whether a program halts | Infinite loop detection is fundamentally undecidable. Any static analyzer has inherent limitations. |
| **Rice's Theorem** | Any non-trivial semantic property of programs is undecidable | No static analyzer can detect all bugs without false positives or false negatives. |

---

## Detailed Method Documentation

---

### `damerauLevenshteinDistance(str1, str2)`

**Purpose:** Computes the minimum number of single-character edits to transform `str1` into `str2`.

**Algorithm (Dynamic Programming):**
1. Creates a `(m+1) × (n+1)` matrix where `m` and `n` are string lengths
2. **Base case:** transforming an empty string requires `i` insertions
3. For each cell `dp[i][j]`, takes the minimum of:
   - `dp[i-1][j] + 1` — **Deletion** (remove a char from str1)
   - `dp[i][j-1] + 1` — **Insertion** (add a char to str1)
   - `dp[i-1][j-1] + cost` — **Substitution** (replace if chars differ, free if same)
   - `dp[i-2][j-2] + 1` — **Transposition** (swap two adjacent chars, if they match cross-wise)

**Key advantage over standard Levenshtein:** Transpositions like `itn` → `int` count as **1 edit** instead of 2, making it much better for catching common keyboard typos.

**Time Complexity:** O(m × n)  
**Space Complexity:** O(m × n)

**Examples:**
```
damerauLevenshteinDistance("itn", "int")    → 1  (one transposition)
damerauLevenshteinDistance("pritnf", "printf") → 1  (one transposition)
damerauLevenshteinDistance("flot", "float")  → 1  (one insertion)
damerauLevenshteinDistance("retrun", "return") → 1  (one transposition)
```

---

### `fuzzyMatchKeyword(token)`

**Purpose:** Compares a token against 50+ C keywords and returns the closest match.

**Keyword categories (50+ total):**
- **Types (19):** `int`, `float`, `char`, `double`, `void`, `long`, `short`, `unsigned`, `signed`, `const`, `static`, `extern`, `struct`, `enum`, `typedef`, `union`, `volatile`, `register`, `auto`
- **Control flow (12):** `if`, `else`, `while`, `for`, `do`, `switch`, `case`, `break`, `continue`, `return`, `goto`, `default`
- **Other (12):** `sizeof`, `include`, `define`, `main`, `printf`, `scanf`, `malloc`, `free`, `NULL`, `stdin`, `stdout`, `stderr`

**False positive prevention:**
1. Skip if token exactly matches a keyword (case-insensitive)
2. Skip if token length < 2 or > 12
3. Only compare tokens within ±2 characters of keyword length
4. **Adaptive thresholds:** keywords ≤ 3 chars → max 1 edit; keywords > 3 chars → max 2 edits

---

### `detectKeywordTypos()`

**Purpose:** Scans every line for tokens that might be misspelled C keywords.

**Pipeline:**
1. Skip comments (`//`, `/*`, `*`), preprocessor directives (`#`)
2. Remove string literals: `"hello"` → `""`, `'a'` → `''`
3. Extract all identifier tokens using regex `\b[a-zA-Z_][a-zA-Z0-9_]*\b`
4. Skip known variables, function names, standard functions, and **60 common variable names** (`temp`, `count`, `result`, `index`, `value`, `total`, `sum`, `flag`, `test`, `node`, `list`, `next`, `prev`, `head`, `tail`, `left`, `right`, `root`, `key`, `num`, `str`, `ptr`, `len`, `max`, `min`, `arr`, `buf`, `ret`, `err`, `msg`, `log`, `end`, `start`, `pos`, `cur`, `new`, `old`, `src`, `dst`, `tmp`, `val`, `idx`, `cnt`, `var`, `res`, `out`, `die`, `counter`, `number`, `decimal`, `letter`, `symbol`, `amount`, etc.)
5. Run `fuzzyMatchKeyword()` on each remaining token
6. Report matches as `KeywordTypo` errors with the Levenshtein distance

---

### `fixKeywordTypos(line)`

**Purpose:** During refactoring, replaces all detected typos with their corrections.
Uses word-boundary regex `\btypo\b` to avoid replacing partial matches within longer identifiers.

---

### `detectFunctions()`

**Purpose:** Finds all function definitions and function calls in the code.

**Pass 1 — Definition scan:** Uses regex:
```
\b(int|float|char|double|void|long|short)\s+(\w+)\s*\(([^)]*)\)\s*\{?
```
Stores each function's name, return type, parameters, and whether it has a body `{`.

**Pass 2 — Call scan:** Finds identifiers followed by `(` while skipping:
- Function definition lines (to avoid counting the definition as a call)
- C keywords (`if`, `while`, `for`, `switch`, `return`, etc.)
- Standard library functions (`printf`, `scanf`, `malloc`, etc.)

---

### `detectFunctionErrors()`

**Purpose:** Two checks:

**1. Undefined functions:** Called but never defined (and not a standard library function). Tracked in `undefinedFunctions` set for removal during refactoring.

**2. Parameter syntax validation:** Each parameter must have both a type and name:
```c
void foo(int x, float y)  // ✓ Valid
void foo(x, y)            // ✗ Invalid — missing types
void foo(int x, y)        // ✗ Invalid — 'y' missing type
```

---

### `isStandardFunction(name)`

**Purpose:** Returns `true` if the function name is in the standard C library list.

**36 recognized functions:** `printf`, `scanf`, `malloc`, `free`, `strlen`, `strcpy`, `strcmp`, `fopen`, `fclose`, `fread`, `fwrite`, `fprintf`, `fscanf`, `getchar`, `putchar`, `gets`, `puts`, `exit`, `abs`, `sqrt`, `pow`, `sin`, `cos`, `tan`, `log`, `exp`, `rand`, `srand`, `time`, `memset`, `memcpy`, `memmove`, `atoi`, `atof`, `sizeof`

---

### `detectMissingReturn()`

**Purpose:** For non-void functions (except `main`), checks if a `return` statement exists.

**How it works:**
1. For each non-void function, starts from its definition line
2. Tracks brace depth to identify function body boundaries
3. Searches for any `return` keyword within the body
4. If no `return` found, reports a warning at the function's closing `}`

---

### `detectUnusedFunctions()`

**Purpose:** Compares `functions` (defined) against `functionCalls` (called). Any defined function not in calls (except `main`) is flagged as unused.

Also generates a summary info bug listing all uncalled function names.

---

### `detectAssignmentInCondition()`

**Purpose:** Detects `=` (assignment) used instead of `==` (comparison) inside conditions.

**How it works:**
1. Extracts condition content from `if(...)`, `while(...)`, `for(_;...;_)`
2. Checks for single `=` not preceded by `!`, `<`, `>`, or `=`
3. Reports as `warning` — may be intentional but usually a bug

**Example:**
```c
if (x = 5)   // ✗ WARNING: Assignment instead of comparison
if (x == 5)  // ✓ Correct comparison
if (x != 5)  // ✓ Not flagged (inequality comparison)
```

---

### `detectVariableIssues()`

**Purpose:** Three-pass analysis detecting uninitialized usage and unused variables.

**Pass 1 — Declaration scan:**
Finds all variable declarations using regex, records type and initialization status:
```c
int x;          // declared, NOT initialized
int y = 5;      // declared AND initialized
float z, w = 1; // z not initialized, w initialized
```

**Pass 2 — Uninitialized usage:**
For each uninitialized variable, scans lines after its declaration:
- If variable is used before any assignment → `UninitializedVariable` error
- Special case: `x = x + 1` counts as "used before init" if x wasn't initialized

**Pass 3 — Unused detection:**
Counts occurrences of each variable (stripping comments). If ≤ 1 occurrence (just the declaration), it's unused → `UnusedVariable` warning.

---

### `detectUnreachableCode()`

**Purpose:** Flags code that appears after a `return` statement within the same block.

**State machine:**
- `afterReturn = false` initially
- When `return ...;` is encountered → `afterReturn = true`
- Subsequent non-empty, non-comment, non-`}` lines → flagged as unreachable
- When `}` is encountered → `afterReturn = false` (new scope)

---

### `detectInfiniteLoops()`

**Purpose:** Detects 5 types of infinite loops.

**Type 1 — `while(1)` / `while(true)` without break:**
Scans up to 20 lines of loop body for `break` or `return`. If none found → warning.

**Type 2 — `for(;;)` — unconditional infinite loop:**
Always flagged as warning.

**Type 3 — Contradictory for loops:**
Analyzes init, condition, and increment to detect always-true conditions:
```c
for(int i = 0; i >= 0; i++)  // ✗ i starts at 0, always ≥ 0, incrementing
for(int i = 0; i <= 10; i--) // ✗ i starts at 0, decrementing wrong way
```

**Type 4 — `while(var)` where var only increases:**
If the loop variable is only incremented (never decremented, never assigned to 0/false) and no `break`/`return` exists → warning.

**Type 5 — `while(var op value)` where var is never modified:**
If the loop condition variable has no assignment, increment, or decrement in the body → infinite.

---

### `detectEmptyBodies()`

**Purpose:** Checks for control structures with no body.

**Single-line patterns:**
```c
if(x) ;         // ✗ Empty if body (semicolon = null statement)
while(x) {}     // ✗ Empty while body
for(...) ;      // ✗ Empty for body
else ;          // ✗ Empty else body
```

**Multi-line patterns:**
```c
if(x) {         // ✗ Empty if block
}               //   (next line is closing brace)
```

**Empty functions:** Also checks if function bodies contain only braces/whitespace/comments.

---

### `detectPrintfScanfErrors()`

**Purpose:** Five checks for printf/scanf issues.

**Check 1 — printf without format string:**
```c
printf(x)       // ✗ Should be printf("%d", x)
```
Auto-determines format specifier from variable type in symbol table.

**Check 2 — printf format-argument mismatch (3 sub-cases):**

| Code | Bug | Severity |
|---|---|---|
| `printf("%d")` | Format specifier but no argument | error |
| `printf("%d %f", x)` | 2 specifiers but only 1 argument | error |
| `printf("%d", x, y)` | 1 specifier but 2 arguments (extra ignored) | warning |

**Check 3 — scanf format-argument mismatch:** Same 3 sub-cases as printf.

**Check 4 — scanf without address-of (`&`):**
```c
scanf("%d", x)  // ✗ Missing & — should be scanf("%d", &x)
scanf("%s", str) // ✓ No & needed for %s (string = pointer)
```

**Check 5:** Skips `%%` (literal percent sign) when counting format specifiers.

---

### `detectArrayOutOfBounds()`

**Purpose:** Three-step array bounds analysis.

**Step 1 — Collect array declarations:**
Records name, type, and size from patterns like `int arr[10]`.

**Step 2 — Constant index check:**
```c
int arr[5];
arr[10] = 1;   // ✗ CRITICAL: index 10 ≥ size 5 (valid: 0-4)
arr[-1] = 1;   // ✗ CRITICAL: negative index
arr[3] = 1;    // ✓ Valid (3 < 5)
```

**Step 3 — Loop-based check:**
Analyzes `for` loop bounds and checks if the loop variable is used as an array index:
```c
int arr[10];
for(int i = 0; i <= 10; i++) {
    arr[i] = 0;  // ✗ CRITICAL: i reaches 10, but arr size is 10 (valid: 0-9)
}
```

---

## Standalone UI Functions

### `analyzeCode()`
Real-time analysis handler. Gets code from textarea, creates `CAnalyzer` instance, calls `analyzeOnly()`, displays bugs via `displayBugs()`, and updates metrics.

### `changeCode()`
"Change Code" button handler. Calls `analyzeAndRefactor()`, displays bugs, populates the **split view** (original on left, refactored on right). Includes error handling with try-catch and toast notifications.

### `displayBugs(bugs)`
Renders the bug list in the UI:
- **Summary bar:** Shows counts per severity with colored badges
- **Filter bar:** Shows severity filter pill buttons (All / Critical / Error / Warning / Info)
- **Bug cards:** Each bug shows severity badge, message, line number, type, suggestion (💡), and explanation (📖, visible in learning mode)
- Adds `data-severity` attribute for filtering
- If no bugs: shows "✅ No bugs found!"

### `filterBugs(severity)`
Severity filter handler. Toggles `.hidden` class on `.bug-item` elements based on `data-severity` attribute. Updates active state on filter buttons.

### `toggleLearningMode()`
Toggles `learning-mode` class on `<body>`, which shows/hides `.bug-explanation` divs via CSS. Shows toast notification for state change.

### `highlightLine(lineNum)`
Scrolls the editor textarea to the specified line, highlights the line number in the gutter, and selects the full line text. Used when clicking a bug item.

### `updateSyntaxHighlight()`
Applies regex-based syntax coloring to the highlight overlay:
- Comments (gray), preprocessor directives (orange), strings (cyan)
- Keywords (red), types (blue), functions (purple), numbers (blue)
- Uses `escapeHtml()` for XSS prevention

### `updateMetrics(code, bugs)`
Calculates and displays real-time code metrics:
- Lines of code (excluding blanks/comments)
- Function count, variable count, #include count
- Cyclomatic complexity (if + while + for + case + && + ||)
- Issue count

### `toggleDiffView()`
Toggles between plain refactored output and inline diff view. Calls `generateDiff()` to produce color-coded HTML.

### `generateDiff(original, refactored)`
Line-by-line diff comparison. Produces HTML with `.diff-line.added` (green), `.diff-line.removed` (red strikethrough), and `.diff-line.unchanged` spans.

### `copyRefactored()`
Copies refactored code to clipboard using `navigator.clipboard.writeText()` with `document.execCommand('copy')` fallback.

### `exportReport()`
Generates a styled, self-contained HTML report with:
- Source code, all detected issues with severity badges
- Summary cards (Critical, Errors, Warnings, Info)
- Timestamp. Downloads as `c-code-analysis-report.html`.

### `toggleTheme()`
Switches `data-theme` attribute between `dark` and `light` on `<html>`. Persists preference in `localStorage`.

### `showToast(message)`
Displays a temporary notification at the bottom of the screen for 2.5 seconds.

### `updateLineNumbers()` / `syncScroll()`
Line number generation and scroll synchronization between textarea, line numbers gutter, and syntax highlight overlay.

### `debouncedAnalyze()`
400ms debounced wrapper around `analyzeCode()`. Triggered on every `oninput` event to provide real-time feedback without performance issues.

---

## Advanced Analysis Methods

### `detectMemoryLeaks()`
Detects:
- `malloc()` / `calloc()` / `realloc()` without matching `free()`
- `fopen()` without matching `fclose()`
- **Double-free** (same pointer freed twice)

### `detectCodeSmells()`
Three sub-checks:
1. **Deep nesting** — Warns when brace nesting exceeds 4 levels
2. **Long functions** — Flags functions exceeding 50 lines
3. **Magic numbers** — Detects unexplained numeric literals (>1, excluding common values like 10, 100, 255, 256)

### `detectPointerIssues()`
Multi-line pattern analysis:
1. **NULL pointer dereference** — Detects `*ptr`, `ptr->`, `ptr[` after `ptr = NULL` within 10 lines
2. **Use-after-free** — Detects access to pointer after `free()` within 15 lines

### `detectTypeIssues()`
Three type safety checks:
1. **Float-to-int truncation** — `int x = floatVar;`
2. **Char overflow** — `char c = intVar;` (values >127 wrap)
3. **Integer division loss** — `float f = intA / intB;` (truncates before assignment)

### `detectBufferOverflow()`
Flags unsafe C string functions with safer alternatives:

| Function | Why Unsafe | Safe Alternative |
|----------|-----------|------------------|
| `gets()` | No bounds checking | `fgets(buf, sizeof(buf), stdin)` |
| `strcpy()` | No size limit | `strncpy(dest, src, sizeof(dest)-1)` |
| `strcat()` | No remaining space check | `strncat(dest, src, remaining)` |
| `sprintf()` | No bounds checking | `snprintf(buf, sizeof(buf), fmt, ...)` |
| `scanf("%s")` | No width limit | `scanf("%99s", buf)` |

### `detectFormatStringVuln()`
Security-focused: detects `printf(variable)` and `fprintf(file, variable)` without format specifiers. An attacker can exploit `%x` to read memory or `%n` to write memory.

### `detectLargeStackAlloc()`
Warns when array declarations exceed 8KB on the stack. Calculates actual byte size: `array_size × sizeof(type)`. Suggests `malloc()` as alternative.

### `detectHighComplexity()`
Per-function cyclomatic complexity calculation. Counts: `if`, `else if`, `while`, `for`, `case`, `&&`, `||`, ternary `?:`. Flags functions exceeding complexity threshold of 10.

### `detectNamingIssues()`
Flags single-letter variable names (`int a;`) outside of `for`-loop initializers. Exempts common loop vars (`i`, `j`, `k`, `n`, `x`, `y`, `c`).

