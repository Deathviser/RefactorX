/*
 * PART 1: LEXICAL & SYNTAX ANALYSIS
 * 
 * ═══════════════════════════════════════════════════════════════════
 * ALGORITHMS USED IN THIS FILE:
 * ═══════════════════════════════════════════════════════════════════
 * 
 * 1. Stack-Based Bracket/Brace/Parenthesis Matching
 *    - Uses a LIFO stack to push opening delimiters and pop on closing
 *    - Detects unmatched [], (), {} pairs
 *    - Time: O(n), Space: O(n) worst case
 *    ALTERNATES:
 *    • Counter-Based Matching — simpler but can't pinpoint which bracket is unmatched
 *    • Recursive Descent Parser — more accurate, parses full C grammar
 *    • LR/LALR Parser (Yacc/Bison) — industry standard, handles full grammar
 *    • PEG (Parsing Expression Grammar) — unambiguous, used by tree-sitter
 *    • Earley Parser — handles ambiguous grammars, O(n³) worst case
 * 
 * 2. Regex Pattern Matching for Syntax Errors
 *    - Applies regex patterns per line to detect missing semicolons
 *    - Exception patterns prevent false positives (comments, preprocessor, control structures)
 *    ALTERNATES:
 *    • Tokenizer/Lexer (Flex) — proper token stream instead of line-by-line regex
 *    • Abstract Syntax Tree (AST) — full parse tree enables precise detection
 *    • Shunting-Yard Algorithm (Dijkstra) — for expression parsing
 * 
 * 3. String Literal Tracking (Finite State Machine)
 *    - Toggles inString/inChar flags to skip delimiters inside string/char literals
 *    - Prevents false positives from characters inside "strings"
 *    ALTERNATES:
 *    • Full Lexer with Token Categories — proper tokenization handles all literal types
 *    • State Machine with Escape Handling — more robust for escaped quotes
 * 
 * 4. Malformed Control Structure Detection
 *    - Regex patterns detect wrong delimiters in conditions (} instead of ))
 *    - Validates for-loop semicolon count (must be exactly 2)
 *    ALTERNATES:
 *    • LL(k) Parser — top-down parser with lookahead for structure validation
 *    • Grammar-Based Validation — formal grammar rules catch all malformed constructs
 * ═══════════════════════════════════════════════════════════════════
 * 
 * COMPILER PHASES IN THIS FILE:
 * - Phase 2: Syntax Analysis (Grammar checking)
 * - Class definition with constructor and entry points
 */

class CAnalyzer {
    constructor() {
        this.bugs = [];

        // Phase 3: Symbol Table Management
        this.variables = new Map();
        this.arrays = new Map();
        this.functions = new Map();
        this.functionCalls = new Set();

        this.lines = [];
        this.originalCode = '';
        this.refactoredCode = '';
        this.currentFunction = null;

        // Phase 6: Optimization stats
        this.stats = {
            constantsFolded: 0,       // How many constant expressions computed
            deadCodeRemoved: 0,       // Lines of unreachable code removed
            expressionsSimplified: 0, // Redundant operations simplified
            conditionsFixed: 0,       // Wrong conditions corrected
            unusedRemoved: 0,         // Unused variables/functions removed
            functionsAdded: 0,        // Missing function calls added
            variablesRenamed: 0       // Variables renamed for clarity
        };

        // For code generation - variable renaming
        this.variableRenameMap = new Map();
        this.variableCounter = { int: 0, float: 0, char: 0, double: 0, default: 0 };
        this.undefinedFunctions = new Set();
        this.unusedVariables = new Set();
        this.uninitializedVariables = new Map();
        this.unusedFunctions = new Set();
        this.keywordTypoFixes = new Map(); // Tracks typo -> correction mappings found
    }

    // Analyze Code - detect bugs only
    analyzeOnly(code) {
        this.bugs = [];
        this.variables = new Map();
        this.arrays = new Map();
        this.functions = new Map();
        this.functionCalls = new Set();
        this.undefinedFunctions = new Set();
        this.unusedVariables = new Set();
        this.uninitializedVariables = new Map();
        this.unusedFunctions = new Set();
        this.lines = code.split('\n');
        this.originalCode = code;

        // Phase 1: Lexical Analysis - Fuzzy Keyword Matching (run first to flag typos)
        this.detectKeywordTypos();

        // Phase 2: Syntax Analysis
        this.detectMissingSemicolons();
        this.detectMismatchedBrackets();
        this.detectMismatchedParentheses();
        this.detectMismatchedBraces();
        this.detectMalformedControlStructures();

        // Phase 1, 3, 4: Lexical, Symbol Table, Semantic
        this.detectFunctions();
        this.detectFunctionErrors();
        this.detectAssignmentInCondition();
        this.detectVariableIssues();

        // Phase 5: Control Flow Analysis
        this.detectUnreachableCode();
        this.detectInfiniteLoops();
        this.detectEmptyBodies();

        // Phase 4: Additional Semantic Checks
        this.detectRedundantExpressions();
        this.detectDivisionByZero();
        this.detectConstantConditions();
        this.detectSelfAssignment();
        this.detectPrintfScanfErrors();
        this.detectArrayOutOfBounds();
        this.detectUnusedFunctions();
        this.detectMissingReturn();

        // Advanced Analysis
        this.detectMemoryLeaks();
        this.detectCodeSmells();
        this.detectPointerIssues();
        this.detectTypeIssues();
        this.detectBufferOverflow();
        this.detectFormatStringVuln();
        this.detectLargeStackAlloc();
        this.detectHighComplexity();
        this.detectNamingIssues();

        // Sort bugs by line number
        this.bugs.sort((a, b) => a.line - b.line);

        return { bugs: this.bugs };
    }

    // Change Code - detect bugs and generate refactored code
    analyzeAndRefactor(code) {
        this.bugs = [];
        this.variables = new Map();
        this.arrays = new Map();
        this.functions = new Map();
        this.functionCalls = new Set();
        this.undefinedFunctions = new Set();
        this.unusedVariables = new Set();
        this.uninitializedVariables = new Map();
        this.unusedFunctions = new Set();
        this.lines = code.split('\n');
        this.originalCode = code;
        this.refactoredCode = code;
        this.variableRenameMap = new Map();
        this.stats = {
            constantsFolded: 0, deadCodeRemoved: 0, expressionsSimplified: 0,
            conditionsFixed: 0, unusedRemoved: 0, functionsAdded: 0, variablesRenamed: 0
        };

        // Phase 1: Lexical Analysis - Fuzzy Keyword Matching (run first to flag typos)
        this.detectKeywordTypos();

        // Phases 1-5: Detection
        this.detectMissingSemicolons();
        this.detectMismatchedBrackets();
        this.detectMismatchedParentheses();
        this.detectMismatchedBraces();
        this.detectMalformedControlStructures();
        this.detectFunctions();
        this.detectFunctionErrors();
        this.detectAssignmentInCondition();
        this.detectVariableIssues();
        this.detectUnreachableCode();
        this.detectRedundantExpressions();
        this.detectDivisionByZero();
        this.detectInfiniteLoops();
        this.detectEmptyBodies();
        this.detectConstantConditions();
        this.detectSelfAssignment();
        this.detectPrintfScanfErrors();
        this.detectArrayOutOfBounds();
        this.detectUnusedFunctions();
        this.detectMissingReturn();

        // Advanced Analysis
        this.detectMemoryLeaks();
        this.detectCodeSmells();
        this.detectPointerIssues();
        this.detectTypeIssues();

        // Phase 6 & 7: Optimization and Code Generation
        this.generateRefactoredCode();

        this.bugs.sort((a, b) => a.line - b.line);

        return {
            bugs: this.bugs,
            refactoredCode: this.refactoredCode,
            stats: this.stats
        };
    }

    // Add bug to collection
    addBug(type, severity, line, message, suggestion = null, explanation = null) {
        const exists = this.bugs.some(b => b.line === line && b.type === type && b.message === message);
        if (!exists) {
            this.bugs.push({ type, severity, line, message, suggestion, explanation });
        }
    }

    // ============================================================
    // PHASE 2: SYNTAX ANALYSIS
    // Missing Semicolons, Mismatched Brackets/Parens/Braces,
    // Malformed Control Structures
    // ============================================================

    // Phase 2: Syntax Analysis - Missing Semicolons
    detectMissingSemicolons() {
        const needsSemicolon = [
            /^\s*(int|float|char|double|long|short|void)\s+\w+\s*(=\s*[^;{]+)?$/,  // Variable declaration
            /^\s*\w+\s*=\s*[^;{]+$/,  // Assignment
            /^\s*\w+\s*\([^)]*\)\s*$/,  // Function call without semicolon
            /^\s*(return)\s+[^;]+$/,  // Return statement
            /^\s*(break|continue)\s*$/,  // break/continue
            /^\s*\w+\s*(\+\+|--)\s*$/,  // Increment/decrement
            /^\s*(\+\+|--)\s*\w+\s*$/,  // Pre-increment/decrement
        ];

        const exceptions = [
            /^\s*\/\//,  // Comments
            /^\s*\/\*/,  // Multi-line comment start
            /^\s*\*/,    // Multi-line comment
            /^\s*#/,     // Preprocessor
            /^\s*$/,     // Empty line
            /\{\s*$/,    // Opening brace
            /^\s*\}/,    // Closing brace
            /^\s*(if|else|while|for|switch|do)\s*[\({]/,  // Control structures
            /^\s*else\s*$/,  // else keyword
            /^\s*(int|float|char|double|void|long|short)\s+\w+\s*\([^)]*\)\s*\{?$/,  // Function definition
        ];

        this.lines.forEach((line, idx) => {
            const trimmed = line.trim();
            if (trimmed === '') return;

            // Skip exceptions
            for (const exc of exceptions) {
                if (exc.test(trimmed)) return;
            }

            // Check if line needs semicolon but doesn't have one
            for (const pattern of needsSemicolon) {
                if (pattern.test(trimmed) && !trimmed.endsWith(';') && !trimmed.endsWith('{') && !trimmed.endsWith('}')) {
                    this.addBug(
                        'MissingSemicolon',
                        'error',
                        idx + 1,
                        `Missing semicolon at end of statement`,
                        `Add ';' at the end of line ${idx + 1}`,
                        `Every statement in C must end with a semicolon.`
                    );
                }
            }

            // Specific check: statement that looks complete but missing semicolon
            if (/^\s*(int|float|char|double)\s+\w+\s*=\s*[\w\d+\-*\/\s()]+$/.test(trimmed) && !trimmed.endsWith(';')) {
                this.addBug(
                    'MissingSemicolon',
                    'error',
                    idx + 1,
                    `Missing semicolon after variable initialization`,
                    `Add ';' at the end: ${trimmed};`,
                    `Variable declarations must end with semicolon.`
                );
            }

            // Check for return without semicolon
            if (/^\s*return\s+[\w\d+\-*\/\s()]+$/.test(trimmed) && !trimmed.endsWith(';')) {
                this.addBug(
                    'MissingSemicolon',
                    'error',
                    idx + 1,
                    `Missing semicolon after return statement`,
                    `Add ';' at the end`,
                    `Return statements must end with semicolon.`
                );
            }
        });
    }

    // Phase 2: Syntax Analysis - Mismatched Brackets []
    detectMismatchedBrackets() {
        let bracketStack = [];

        this.lines.forEach((line, idx) => {
            // Skip comments
            if (line.trim().startsWith('//')) return;

            for (let i = 0; i < line.length; i++) {
                if (line[i] === '[') {
                    bracketStack.push({ line: idx + 1, col: i + 1 });
                } else if (line[i] === ']') {
                    if (bracketStack.length === 0) {
                        this.addBug(
                            'MismatchedBracket',
                            'error',
                            idx + 1,
                            `Unexpected closing bracket ']' without matching '['`,
                            `Remove the extra ']' or add matching '['`,
                            `Every ']' must have a corresponding '['.`
                        );
                    } else {
                        bracketStack.pop();
                    }
                }
            }
        });

        // Check for unclosed brackets
        bracketStack.forEach(bracket => {
            this.addBug(
                'MismatchedBracket',
                'error',
                bracket.line,
                `Unclosed bracket '[' - missing ']'`,
                `Add matching ']' for the '[' on line ${bracket.line}`,
                `Every '[' must have a corresponding ']'.`
            );
        });
    }

    // Phase 2: Syntax Analysis - Mismatched Parentheses ()
    detectMismatchedParentheses() {
        let parenStack = [];
        let inString = false;
        let inChar = false;

        this.lines.forEach((line, idx) => {
            // Skip comments
            if (line.trim().startsWith('//')) return;

            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                const prevChar = i > 0 ? line[i - 1] : '';

                // Track string literals
                if (char === '"' && prevChar !== '\\') inString = !inString;
                if (char === "'" && prevChar !== '\\') inChar = !inChar;

                if (inString || inChar) continue;

                if (char === '(') {
                    parenStack.push({ line: idx + 1, col: i + 1 });
                } else if (char === ')') {
                    if (parenStack.length === 0) {
                        this.addBug(
                            'MismatchedParenthesis',
                            'error',
                            idx + 1,
                            `Unexpected closing parenthesis ')' without matching '('`,
                            `Remove the extra ')' or add matching '('`,
                            `Every ')' must have a corresponding '('.`
                        );
                    } else {
                        parenStack.pop();
                    }
                }
            }
        });

        parenStack.forEach(paren => {
            this.addBug(
                'MismatchedParenthesis',
                'error',
                paren.line,
                `Unclosed parenthesis '(' - missing ')'`,
                `Add matching ')' for the '(' on line ${paren.line}`,
                `Every '(' must have a corresponding ')'.`
            );
        });
    }

    // Phase 2: Syntax Analysis - Mismatched Braces {}
    detectMismatchedBraces() {
        let braceStack = [];
        let inString = false;

        this.lines.forEach((line, idx) => {
            // Skip comments
            if (line.trim().startsWith('//')) return;

            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                const prevChar = i > 0 ? line[i - 1] : '';

                if (char === '"' && prevChar !== '\\') inString = !inString;
                if (inString) continue;

                if (char === '{') {
                    braceStack.push({ line: idx + 1, col: i + 1 });
                } else if (char === '}') {
                    if (braceStack.length === 0) {
                        this.addBug(
                            'MismatchedBrace',
                            'error',
                            idx + 1,
                            `Unexpected closing brace '}' without matching '{'`,
                            `Remove the extra '}' or add matching '{'`,
                            `Every '}' must have a corresponding '{'.`
                        );
                    } else {
                        braceStack.pop();
                    }
                }
            }
        });

        braceStack.forEach(brace => {
            this.addBug(
                'MismatchedBrace',
                'error',
                brace.line,
                `Unclosed brace '{' - missing '}'`,
                `Add matching '}' for the '{' on line ${brace.line}`,
                `Every '{' must have a corresponding '}'.`
            );
        });
    }

    // Phase 2: Syntax Analysis - Malformed Control Structures
    detectMalformedControlStructures() {
        this.lines.forEach((line, idx) => {
            const trimmed = line.trim();

            // Detect } used instead of ) in conditions like (x > 0}
            if (/\([^()]*\}/.test(trimmed)) {
                this.addBug('MalformedSyntax', 'error', idx + 1,
                    `'}' used instead of ')' to close condition/expression`,
                    `Replace '}' with ')' to close the parenthesis`,
                    `Parentheses () must be closed with ')' not '}'.`);
            }

            // Detect while/if/for with malformed parentheses (like "while(x}{")
            // Check for brace inside what should be a condition
            if (/\b(while|if|for)\s*\([^)]*\{/.test(trimmed)) {
                this.addBug('MalformedSyntax', 'error', idx + 1,
                    `Malformed control structure: '{' found inside condition parentheses`,
                    `Check for missing ')' before '{'`,
                    `Control structures like while(condition) must have proper parentheses before the body.`);
            }

            // Detect closing brace inside condition
            if (/\b(while|if|for)\s*\([^)]*\}/.test(trimmed)) {
                this.addBug('MalformedSyntax', 'error', idx + 1,
                    `Malformed control structure: '}' found instead of ')' in condition`,
                    `Change '}' to ')' to properly close the condition`,
                    `Conditions cannot contain braces. Use ')' to close.`);
            }

            // Detect while/if/for without opening parenthesis
            if (/\b(while|if)\s+[^(]\w/.test(trimmed) && !/\b(while|if)\s*\(/.test(trimmed)) {
                this.addBug('MalformedSyntax', 'error', idx + 1,
                    `Control structure missing '(' after keyword`,
                    `Add '(' after while/if keyword`,
                    `Syntax: while(condition) or if(condition).`);
            }

            // Detect for loop with wrong number of semicolons
            const forMatch = trimmed.match(/\bfor\s*\(([^)]*)\)/);
            if (forMatch) {
                const forContent = forMatch[1];
                const semicolonCount = (forContent.match(/;/g) || []).length;
                if (semicolonCount !== 2) {
                    this.addBug('MalformedSyntax', 'error', idx + 1,
                        `for loop must have exactly 2 semicolons, found ${semicolonCount}`,
                        `Use format: for(init; condition; update)`,
                        `for loops require: initialization; condition; update.`);
                }
            }

            // Detect switch without parentheses
            if (/\bswitch\s+[^(]/.test(trimmed) && !/\bswitch\s*\(/.test(trimmed)) {
                this.addBug('MalformedSyntax', 'error', idx + 1,
                    `switch statement missing '(' after keyword`,
                    `Add '(' after switch keyword`,
                    `Syntax: switch(expression).`);
            }
        });
    }
}
