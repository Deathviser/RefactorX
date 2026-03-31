# 🔍 Unique Selling Points (USP) — C Code Static Analyzer

## 1. Real-Time Bug Detection
Bugs and errors are detected **live as you type** — no compilation, no button clicks. A debounced analysis engine runs automatically after 400ms of inactivity, giving instant feedback.

## 2. Fuzzy Keyword Typo Detection (Damerau-Levenshtein Algorithm)
Uses the **Damerau-Levenshtein distance algorithm** to detect keyword typos (e.g., `itn` → `int`, `retrun` → `return`). Accounts for insertions, deletions, substitutions, and **transpositions** — going far beyond simple spell-check.

## 3. Multi-Phase Compiler Pipeline
Implements a **full compiler pipeline** entirely in the browser:
- Lexical Analysis → Syntax Analysis → Semantic Analysis → Code Optimization → Code Generation
- Includes **constant folding**, **dead code elimination**, and **strength reduction**

## 4. Memory Leak & Resource Leak Detection
- Detects `malloc()`/`calloc()`/`realloc()` without matching `free()`
- Detects `fopen()` without matching `fclose()`
- Catches **double-free** bugs that cause crashes

## 5. Pointer Safety Analysis
- **NULL pointer dereference** — Flags usage of pointers after `= NULL`
- **Use-after-free** — Detects memory access after `free()` is called
- Pattern-based multi-line analysis

## 6. Buffer Overflow & Security Vulnerability Detection
- Flags **unsafe C functions**: `gets()`, `strcpy()`, `strcat()`, `sprintf()`, `scanf("%s")`
- **Format string vulnerability**: `printf(variable)` without format specifier — exploitable security flaw
- Suggests safer alternatives (e.g., `fgets`, `strncpy`, `snprintf`)

## 7. Intelligent Control Flow Analysis
Detects complex issues simple linters miss:
- **Infinite loops** — `while(1)` without `break`, contradictory conditions, loop variables that never converge
- **Unreachable code** — Statements after `return`
- **Empty bodies** — Empty `if`, `while`, `for`, and function blocks

## 8. Array Bounds Checking (Static + Loop-Based)
- Detects **constant out-of-bounds** access (e.g., `arr[10]` on size-5 array)
- Analyzes **for-loop bounds** to catch loop-driven overflow

## 9. Type Safety Checking
- **Float-to-int truncation** — Warns when decimal part is silently lost
- **Char overflow** — Flags assignment of larger types to `char`
- **Integer division precision loss** — Detects `int/int` assigned to `float`/`double`

## 10. Code Quality Analysis
- **Deep nesting** (>4 levels) — Flags unreadable nested code
- **Long functions** (>50 lines) — Suggests refactoring
- **Magic numbers** — Recommends named constants
- **Per-function cyclomatic complexity** (>10 threshold)
- **Naming convention checker** — Single-letter variables outside loops
- **Stack allocation warning** — Arrays >8KB on the stack

## 11. Severity Filter & Learning Mode
- **Severity filter** — Pill buttons to show only Critical / Error / Warning / Info bugs
- **Learning mode** — Toggle explanations that teach *why* each bug is dangerous (CS education angle)

## 12. Before/After Split View & Code Diff
- **Side-by-side split view** — Original Code vs Refactored Code
- **Inline diff toggle** — Green additions, red strikethrough removals

## 13. Exportable HTML Analysis Report
One-click download of a **styled, self-contained HTML report** with source code, all issues with severity badges, and summary cards — ready for documentation or submission.

## 14. Code Metrics Dashboard
Real-time stats: lines of code, function count, variable count, #include count, **cyclomatic complexity**, and total issues — all updating live as you type.

## 15. Zero-Dependency, Browser-Based
Runs entirely in the browser with **pure JavaScript** — no backend, no installation, no build tools. Open `index.html` and analyze.
