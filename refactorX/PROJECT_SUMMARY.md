# C Code Static Analyzer — Project Summary

A **browser-based static analysis and refactoring tool** for C code. Built with pure HTML, CSS, and JavaScript — no backend, no installation. Open `index.html` and start analyzing.

## How It Works

Type C code in the editor. Bugs are detected **in real-time** (400ms debounce) without pressing any button. Click **"Change Code"** to generate refactored output with fixes applied automatically.

## Compiler Pipeline

The analyzer implements a **multi-phase compiler design**:

1. **Lexical Analysis** — Tokenization + Damerau-Levenshtein fuzzy matching for keyword typo detection (`itn` → `int`)
2. **Syntax Analysis** — Stack-based bracket/brace/parenthesis matching, missing semicolons, malformed control structures
3. **Semantic Analysis** — Symbol table management, variable tracking, function signature validation, scope analysis
4. **Code Optimization** — Constant folding, dead code elimination, strength reduction, redundant expression removal
5. **Code Generation** — Produces clean, refactored C output

## Bug Detection Categories

**Critical:** Array out-of-bounds (constant + loop-based), memory leaks (`malloc` without `free`), resource leaks (`fopen` without `fclose`), double-free, NULL pointer dereference, use-after-free, buffer overflow (`gets`, `strcpy`, `strcat`, `sprintf`, `scanf %s`), format string vulnerability (`printf(variable)`)

**Errors:** Keyword typos (fuzzy matching), uninitialized variables, missing semicolons, mismatched brackets/parentheses/braces, undefined functions, missing function bodies, invalid parameters, missing return statements, printf/scanf argument mismatches, scanf missing `&` operator

**Warnings:** Unused variables, unused functions, assignment `=` in conditions, infinite loops (`while(1)`, `for(;;)`, unmodified loop vars, contradictory conditions), unreachable code after `return`, empty if/while/for/function bodies, self-assignment, constant conditions, redundant expressions, division by zero, type truncation (float→int), char overflow, integer division loss, deep nesting (>4 levels), long functions (>50 lines), high complexity (>10 per function), large stack allocation (>8KB)

**Info:** Magic number detection, naming convention violations, uncalled function summaries

## Key Algorithms

- **Damerau-Levenshtein Distance** — Fuzzy keyword matching with transposition support
- **Stack-Based Delimiter Matching** — O(n) bracket/brace/parenthesis validation
- **Finite State Machine** — String literal tracking to prevent false positives
- **Pattern-Based Control Flow Analysis** — Infinite loop and unreachable code detection
- **Cyclomatic Complexity Calculation** — Per-function decision point counting (if, while, for, case, &&, ||, ternary)

## UI Features

- **Syntax Highlighting** — Keywords, types, strings, numbers, functions, comments colored in the editor
- **Code Metrics Dashboard** — Live stats: lines, functions, variables, includes, complexity, issues
- **Before/After Split View** — Side-by-side original vs refactored code panels
- **Code Diff View** — Toggle inline diff (green additions, red removals) vs plain output
- **Severity Filter** — Pill buttons to show only Critical / Error / Warning / Info bugs
- **Learning Mode** — Toggle "📚 Learn" to show explanations of why each bug is dangerous
- **Click-to-Highlight** — Click any bug → editor scrolls to that line and highlights it
- **Export Report** — Download a styled HTML report with all issues and source code
- **Dark/Light Theme** — Toggle with persistent localStorage preference
- **Copy to Clipboard** — One-click copy of refactored code
- **Toast Notifications** — Feedback on actions (copy, export, refactor)

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Frontend | HTML5, CSS3, JavaScript (ES6) |
| Fonts | Inter, JetBrains Mono (Google Fonts) |
| Backend | None — fully client-side |
| Dependencies | Zero |

## File Structure

| File | Purpose |
|------|---------|
| `index.html` | UI layout with metrics, panels, filters, split view |
| `styles.css` | Theming, animations, responsive design |
| `analyzer-part1-lexical-syntax.js` | CAnalyzer class, lexical & syntax analysis |
| `analyzer-part2-optimization-codegen.js` | Optimization passes & code generation |
| `analyzer-part3-semantics-controlflow-ui.js` | Semantic analysis, control flow, advanced detectors, UI functions |
