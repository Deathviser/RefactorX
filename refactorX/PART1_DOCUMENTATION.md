# Part 1 — Lexical & Syntax Analysis Documentation

> **File:** `analyzer-part1-lexical-syntax.js`
> Contains the `CAnalyzer` class definition, constructor, entry points, and all syntax analysis methods.

---

# 🔬 Algorithms Used & Alternate Approaches

| # | Algorithm | Purpose | How It Works |
|---|---|---|---|
| 1 | **Stack-Based Delimiter Matching** | Detects mismatched `[]`, `()`, `{}` | Push opening delimiters → pop on closing → unmatched items = errors. O(n) time. |
| 2 | **Regex Pattern Matching** | Detects missing semicolons, malformed control structures | Per-line regex with exception patterns to avoid false positives. |
| 3 | **String Literal State Tracking** (FSM) | Ignores delimiters inside `"strings"` and `'chars'` | Toggles `inString`/`inChar` flags on `"` and `'` characters. |

### Alternate Algorithms

| Alternate | Trade-off |
|---|---|
| **Recursive Descent Parser** | Far more accurate; parses full C grammar. Much more complex. |
| **LR/LALR Parser (Yacc/Bison)** | Industry standard; handles full C grammar. Requires grammar spec. |
| **PEG Parser (tree-sitter)** | Unambiguous, handles C-like syntax well. |
| **Earley Parser** | Handles ambiguous grammars. O(n³) worst case. |
| **Shunting-Yard Algorithm** | Relevant for expression parsing in conditions. |
| **AST-Based Analysis** | Industry standard. Enables much deeper analysis. |

---

## Class Definition

### `constructor()`
Initializes all internal state: bugs array, symbol tables (`variables`, `arrays`, `functions`), optimization stats counters, variable rename map, and tracking sets for undefined/unused/uninitialized items.

### `analyzeOnly(code)`
**Entry point for "Analyze Code" button.** Resets state, splits code into lines, then calls all detection methods in order (Phases 1→6). Returns `{ bugs: [...] }` sorted by line number.

### `analyzeAndRefactor(code)`
**Entry point for "Change Code" button.** Same detection as `analyzeOnly`, plus calls `generateRefactoredCode()` (in Part 2) to produce fixed code. Returns `{ bugs, refactoredCode, stats }`.

### `addBug(type, severity, line, message, suggestion, explanation)`
Adds a bug to the collection. **Deduplicates** by checking if same type+line+message already exists.

---

## Syntax Analysis Methods

### `detectMissingSemicolons()`
Applies regex patterns to detect lines that should end with `;` but don't. Handles: variable declarations, assignments, function calls, return/break/continue, increment/decrement. Exception patterns skip comments, preprocessor directives, control structures, and function definitions.

### `detectMismatchedBrackets()`
**Stack-based** approach for `[` and `]`. Pushes opening brackets with line/col info, pops on closing. Reports unmatched items.

### `detectMismatchedParentheses()`
Same stack approach for `(` and `)`. Also **tracks string/char literals** to avoid counting inside strings.

### `detectMismatchedBraces()`
Same stack approach for `{` and `}`. Tracks string literals.

### `detectMalformedControlStructures()`
Detects structural syntax errors:
- `}` used instead of `)` in conditions
- `{` inside condition parentheses
- `while`/`if` without opening `(`
- `for` loops with wrong semicolon count (must be exactly 2)
- `switch` without parentheses
