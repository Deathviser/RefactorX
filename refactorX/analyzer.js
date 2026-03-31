/*
 * INTELLIGENT STATIC CODE ANALYZER
 * 
 * COMPILER PHASES IMPLEMENTED:
 * 1. Lexical Analysis - Token identification
 * 2. Syntax Analysis - Grammar checking  
 * 3. Symbol Table Management - Variable/function tracking
 * 4. Semantic Analysis - Meaning validation
 * 5. Control Flow Analysis - Execution path tracing
 * 6. Code Optimization - Performance improvements
 * 7. Code Generation - Output corrected code
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
    // FUZZY MATCHING ENGINE (Damerau-Levenshtein Distance Algorithm)
    // Uses edit-distance to detect typos in C keywords and correct
    // them automatically. Max distance threshold = 2 edits.
    // Supports: insertions, deletions, substitutions, AND transpositions.
    // ============================================================

    /**
     * Compute the Damerau-Levenshtein distance between two strings.
     * This counts the minimum number of single-character edits
     * (insertions, deletions, substitutions, AND adjacent transpositions)
     * to transform str1 into str2.
     *
     * Unlike standard Levenshtein, swapping two adjacent characters
     * (e.g., 'itn' -> 'int') counts as 1 edit instead of 2.
     */
    damerauLevenshteinDistance(str1, str2) {
        const m = str1.length;
        const n = str2.length;

        // Create a (m+1) x (n+1) matrix
        const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

        // Base cases: transforming empty string
        for (let i = 0; i <= m; i++) dp[i][0] = i;
        for (let j = 0; j <= n; j++) dp[0][j] = j;

        // Fill the matrix
        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
                dp[i][j] = Math.min(
                    dp[i - 1][j] + 1,       // Deletion
                    dp[i][j - 1] + 1,       // Insertion
                    dp[i - 1][j - 1] + cost  // Substitution
                );

                // Transposition: swap two adjacent characters (e.g., 'ab' -> 'ba')
                if (i > 1 && j > 1 &&
                    str1[i - 1] === str2[j - 2] &&
                    str1[i - 2] === str2[j - 1]) {
                    dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + 1);
                }
            }
        }

        return dp[m][n];
    }

    /**
     * Attempt to fuzzy-match a token against the known C keyword list.
     * Returns { match: 'correctKeyword', distance: N } or null if no close match.
     * Uses a max edit-distance threshold of 2 to avoid false positives.
     */
    fuzzyMatchKeyword(token) {
        // All C keywords and common types that we want to catch typos for
        const cKeywords = [
            // Type keywords
            'int', 'float', 'char', 'double', 'void', 'long', 'short',
            'unsigned', 'signed', 'const', 'static', 'extern', 'struct',
            'enum', 'typedef', 'union', 'volatile', 'register', 'auto',
            // Control flow keywords
            'if', 'else', 'while', 'for', 'do', 'switch', 'case',
            'break', 'continue', 'return', 'goto', 'default',
            // Other keywords
            'sizeof', 'include', 'define', 'main', 'printf', 'scanf',
            'malloc', 'free', 'NULL', 'stdin', 'stdout', 'stderr'
        ];

        const lowerToken = token.toLowerCase();

        // Skip if it already exactly matches a keyword (case-insensitive)
        if (cKeywords.some(k => k.toLowerCase() === lowerToken)) return null;

        // Skip tokens that are too short (1 char) or too long to be typos
        if (token.length < 2 || token.length > 12) return null;

        let bestMatch = null;
        let bestDistance = Infinity;

        for (const keyword of cKeywords) {
            // Only compare tokens of similar length (±2 chars)
            if (Math.abs(token.length - keyword.length) > 2) continue;

            const distance = this.damerauLevenshteinDistance(lowerToken, keyword.toLowerCase());

            // Threshold: max 2 edits, but for very short keywords (2-3 chars) only allow 1 edit
            const maxAllowed = keyword.length <= 3 ? 1 : 2;

            if (distance > 0 && distance <= maxAllowed && distance < bestDistance) {
                bestDistance = distance;
                bestMatch = keyword;
            }
        }

        return bestMatch ? { match: bestMatch, distance: bestDistance } : null;
    }

    /**
     * Phase 1 (Lexical Analysis): Detect keyword typos using fuzzy matching.
     * Scans each line for tokens that look like misspelled C keywords.
     */
    detectKeywordTypos() {
        this.keywordTypoFixes = new Map();

        // Tokens to never flag (common variable names, standard functions, etc.)
        const ignoreTokens = new Set([
            'argc', 'argv', 'NULL', 'true', 'false', 'EOF', 'size', 'file',
            'data', 'temp', 'result', 'count', 'index', 'value', 'total',
            'sum', 'flag', 'test', 'node', 'list', 'next', 'prev', 'head',
            'tail', 'left', 'right', 'root', 'key', 'num', 'str', 'ptr',
            'len', 'max', 'min', 'arr', 'buf', 'ret', 'err', 'msg', 'log',
            'end', 'start', 'pos', 'cur', 'new', 'old', 'src', 'dst',
            'tmp', 'val', 'idx', 'cnt', 'var', 'res', 'out', 'die',
            'counter', 'number', 'decimal', 'letter', 'symbol', 'amount'
        ]);

        this.lines.forEach((line, idx) => {
            const trimmed = line.trim();

            // Skip comments and preprocessor directives
            if (trimmed.startsWith('//') || trimmed.startsWith('/*') ||
                trimmed.startsWith('*') || trimmed.startsWith('#')) return;

            // Skip string literals by removing them first
            const lineWithoutStrings = trimmed.replace(/"[^"]*"/g, '""').replace(/'[^']*'/g, "''");

            // Extract word tokens (identifiers)
            const tokens = lineWithoutStrings.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g);
            if (!tokens) return;

            for (const token of tokens) {
                // Skip if it's a known variable, function name, or ignored token
                if (ignoreTokens.has(token)) continue;
                if (this.variables.has(token)) continue;
                if (this.functions.has(token)) continue;
                if (this.isStandardFunction(token)) continue;

                const fuzzyResult = this.fuzzyMatchKeyword(token);
                if (fuzzyResult) {
                    // Store the fix for use during refactoring
                    this.keywordTypoFixes.set(token, fuzzyResult.match);

                    this.addBug(
                        'KeywordTypo',
                        'error',
                        idx + 1,
                        `Possible typo: '${token}' — did you mean '${fuzzyResult.match}'? (Damerau-Levenshtein distance: ${fuzzyResult.distance})`,
                        `Replace '${token}' with '${fuzzyResult.match}'`,
                        `'${token}' is not a valid C keyword but is ${fuzzyResult.distance} edit(s) away from '${fuzzyResult.match}'. ` +
                        `Using fuzzy matching (Damerau-Levenshtein distance algorithm) to detect likely typos.`
                    );
                }
            }
        });
    }

    /**
     * Phase 7 (Code Generation): Fix keyword typos in a line using the fuzzy match results.
     * Replaces misspelled keywords with their correct counterparts.
     */
    fixKeywordTypos(line) {
        if (this.keywordTypoFixes.size === 0) return line;

        let fixed = line;
        for (const [typo, correction] of this.keywordTypoFixes) {
            const typoRegex = new RegExp(`\\b${typo}\\b`, 'g');
            if (typoRegex.test(fixed)) {
                fixed = fixed.replace(typoRegex, correction);
                this.stats.conditionsFixed++;
            }
        }
        return fixed;
    }

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

    // Phase 1 & 3: Lexical Analysis & Symbol Table - Function Detection
    detectFunctions() {
        const funcDefPattern = /\b(int|float|char|double|void|long|short)\s+(\w+)\s*\(([^)]*)\)\s*\{?/g;
        const funcCallPattern = /\b(\w+)\s*\(/g;

        const keywords = ['if', 'while', 'for', 'switch', 'return', 'int', 'float', 'char',
            'double', 'void', 'printf', 'scanf', 'sizeof', 'malloc', 'free', 'strlen'];

        // Find function definitions first
        this.lines.forEach((line, idx) => {
            funcDefPattern.lastIndex = 0;
            let match;
            while ((match = funcDefPattern.exec(line)) !== null) {
                const funcName = match[2];
                const params = match[3];
                if (!keywords.includes(funcName)) {
                    this.functions.set(funcName, {
                        line: idx + 1,
                        returnType: match[1],
                        params: params,
                        hasBody: line.includes('{') || (idx + 1 < this.lines.length && this.lines[idx + 1].trim().startsWith('{'))
                    });
                }
            }
        });

        // Find function calls (exclude function definitions)
        this.lines.forEach((line, idx) => {
            // Skip if this line is a function definition
            const isFuncDef = /^\s*(int|float|char|double|void|long|short)\s+\w+\s*\([^)]*\)\s*\{?\s*(\/\/.*)?$/.test(line);
            if (isFuncDef) return;

            funcCallPattern.lastIndex = 0;
            let match;
            while ((match = funcCallPattern.exec(line)) !== null) {
                const funcName = match[1];
                if (!keywords.includes(funcName)) {
                    this.functionCalls.add(funcName);
                }
            }
        });
    }

    // Phase 4: Semantic Analysis - Function Errors
    detectFunctionErrors() {
        // Detect function calls to undefined functions
        this.functionCalls.forEach(funcName => {
            if (!this.functions.has(funcName) && !this.isStandardFunction(funcName)) {
                this.undefinedFunctions.add(funcName);  // Track for removal
                // Find where it's called
                this.lines.forEach((line, idx) => {
                    if (new RegExp(`\\b${funcName}\\s*\\(`).test(line)) {
                        this.addBug(
                            'UndefinedFunction',
                            'error',
                            idx + 1,
                            `Function '${funcName}' is called but not defined`,
                            `Remove the call or define the function '${funcName}'`,
                            `Functions must be defined before they can be called.`
                        );
                    }
                });
            }
        });

        // Detect function definition issues
        this.functions.forEach((info, funcName) => {
            // Check for missing function body
            if (!info.hasBody) {
                let hasBodyBelow = false;
                for (let i = info.line; i < Math.min(info.line + 2, this.lines.length); i++) {
                    if (this.lines[i] && this.lines[i].includes('{')) {
                        hasBodyBelow = true;
                        break;
                    }
                }
                if (!hasBodyBelow) {
                    this.addBug(
                        'MissingFunctionBody',
                        'error',
                        info.line,
                        `Function '${funcName}' is declared but has no body '{}'`,
                        `Add function body with '{' and '}' or add ';' for declaration`,
                        `Functions need a body to be defined.`
                    );
                }
            }

            // Check parameter syntax
            if (info.params && info.params.trim() !== '' && info.params.trim() !== 'void') {
                const params = info.params.split(',');
                params.forEach((param, pIdx) => {
                    const trimmedParam = param.trim();
                    if (trimmedParam && !/^(int|float|char|double|void|long|short)\s+\w+/.test(trimmedParam) &&
                        !/^(int|float|char|double|void|long|short)\s*\*\s*\w+/.test(trimmedParam) &&
                        trimmedParam !== '...' && trimmedParam !== 'void') {
                        this.addBug(
                            'InvalidParameter',
                            'error',
                            info.line,
                            `Invalid parameter '${trimmedParam}' in function '${funcName}'`,
                            `Parameters should be: type name (e.g., 'int x')`,
                            `Function parameters need both type and name.`
                        );
                    }
                });
            }
        });
    }

    // Check if name is a standard C library function
    isStandardFunction(name) {
        const standardFuncs = ['printf', 'scanf', 'malloc', 'free', 'strlen', 'strcpy', 'strcmp',
            'fopen', 'fclose', 'fread', 'fwrite', 'fprintf', 'fscanf',
            'getchar', 'putchar', 'gets', 'puts', 'exit', 'abs', 'sqrt',
            'pow', 'sin', 'cos', 'tan', 'log', 'exp', 'rand', 'srand', 'time',
            'memset', 'memcpy', 'memmove', 'atoi', 'atof', 'sizeof'];
        return standardFuncs.includes(name);
    }

    // Phase 4: Semantic Analysis - Missing Return
    detectMissingReturn() {
        this.functions.forEach((info, funcName) => {
            if (info.returnType !== 'void' && funcName !== 'main') {
                // Find function body and check for return
                let inFunction = false;
                let braceCount = 0;
                let hasReturn = false;
                let functionEndLine = info.line;

                for (let i = info.line - 1; i < this.lines.length; i++) {
                    const line = this.lines[i];
                    if (line.includes('{')) {
                        if (!inFunction) inFunction = true;
                        braceCount++;
                    }
                    if (line.includes('}')) {
                        braceCount--;
                        if (braceCount === 0 && inFunction) {
                            functionEndLine = i + 1;
                            break;
                        }
                    }
                    if (inFunction && /\breturn\b/.test(line)) {
                        hasReturn = true;
                    }
                }

                if (!hasReturn && inFunction) {
                    this.addBug(
                        'MissingReturn',
                        'warning',
                        functionEndLine,
                        `Function '${funcName}' has return type '${info.returnType}' but may not return a value`,
                        `Add 'return value;' before the closing '}'`,
                        `Non-void functions should return a value.`
                    );
                }
            }
        });
    }

    // Phase 4: Semantic Analysis - Unused Functions
    detectUnusedFunctions() {
        const unusedFuncs = [];

        this.functions.forEach((info, funcName) => {
            if (funcName !== 'main' && !this.functionCalls.has(funcName)) {
                unusedFuncs.push(funcName);
                this.unusedFunctions.add(funcName);
                this.addBug(
                    'UnusedFunction',
                    'warning',
                    info.line,
                    `Function '${funcName}' is defined but never called`,
                    `Add '${funcName}();' in main() or remove the function`,
                    `Unused functions increase code size without providing value.`
                );
            }
        });

        // Add summary info about all uncalled functions
        if (unusedFuncs.length > 0) {
            this.addBug(
                'UncalledFunctionsSummary',
                'info',
                1,
                `Uncalled functions: ${unusedFuncs.join(', ')}`,
                `Consider calling these functions in main() or remove them if not needed`,
                `These functions are defined but never used in the program.`
            );
        }
    }

    // Phase 4: Semantic Analysis - Assignment in Condition
    detectAssignmentInCondition() {
        const conditionPatterns = [
            /if\s*\(\s*([^)]+)\s*\)/g,
            /while\s*\(\s*([^)]+)\s*\)/g,
            /for\s*\([^;]*;\s*([^;]+)\s*;/g
        ];

        this.lines.forEach((line, idx) => {
            for (const pattern of conditionPatterns) {
                pattern.lastIndex = 0;
                let match;
                while ((match = pattern.exec(line)) !== null) {
                    const condition = match[1];
                    // Single = not preceded by !, <, >, = and not followed by =
                    if (/[^=!<>]=[^=]/.test(condition) && !/==|!=|<=|>=/.test(condition)) {
                        this.addBug(
                            'AssignmentInCondition',
                            'warning',
                            idx + 1,
                            `Assignment '=' used instead of comparison '==' in condition`,
                            `Change '=' to '==' for comparison`,
                            `Using '=' performs assignment, not comparison.`
                        );
                    }
                }
            }
        });
    }

    // Phase 3 & 4: Symbol Table & Semantic - Variable Issues
    detectVariableIssues() {
        const declPattern = /\b(int|float|char|double|long|short)\s+(\w+)\s*(=\s*[^;,]+)?[;,]/g;

        const declared = new Map();

        // First pass: Find all declarations
        this.lines.forEach((line, idx) => {
            declPattern.lastIndex = 0;
            let match;
            while ((match = declPattern.exec(line)) !== null) {
                const varType = match[1];
                const varName = match[2];
                const hasInit = match[3] !== undefined;

                const keywords = ['int', 'float', 'char', 'double', 'void', 'if', 'while', 'for', 'return', 'main'];
                if (!keywords.includes(varName)) {
                    declared.set(varName, { line: idx + 1, type: varType, initialized: hasInit });
                    this.variables.set(varName, { type: varType, line: idx + 1 });
                }
            }
        });

        // Second pass: For each uninitialized variable, check if it's used before any assignment
        declared.forEach((info, varName) => {
            // Skip if initialized at declaration
            if (info.initialized) return;

            let isInitialized = false;
            let usedBeforeInit = false;
            let useLine = -1;

            // Scan lines after declaration
            for (let i = info.line; i < this.lines.length; i++) {
                const line = this.lines[i];
                const lineNum = i + 1;

                // Check if this line assigns to the variable (varName = ...)
                // Must be at start or after operators/keywords, followed by = but not ==
                const isAssignment = new RegExp(`(^|[;{}\\s])\\s*${varName}\\s*=[^=]`).test(line);

                // Check if variable is used (appears in the line)
                const isUsed = new RegExp(`\\b${varName}\\b`).test(line);

                if (isAssignment) {
                    // Check if the right side of assignment also uses the variable (like x = x + 1)
                    const afterEquals = line.split('=')[1] || '';
                    if (new RegExp(`\\b${varName}\\b`).test(afterEquals) && !isInitialized) {
                        usedBeforeInit = true;
                        useLine = lineNum;
                    }
                    isInitialized = true;
                } else if (isUsed && !isInitialized) {
                    usedBeforeInit = true;
                    useLine = lineNum;
                    break;
                }
            }

            if (usedBeforeInit && useLine !== -1) {
                this.uninitializedVariables.set(varName, {
                    declLine: info.line,
                    useLine: useLine,
                    type: info.type
                });
                this.addBug(
                    'UninitializedVariable',
                    'error',
                    useLine,
                    `Variable '${varName}' is used without being initialized`,
                    `Initialize '${varName}' to 0 at declaration (line ${info.line})`,
                    `Using uninitialized variables causes undefined behavior - contains garbage value.`
                );
            }
        });

        // Track for unused variable detection
        declared.forEach((info, varName) => {
            let count = 0;
            this.lines.forEach(line => {
                // Strip comments before counting variable occurrences
                const lineWithoutComment = line.replace(/\/\/.*$/, '').replace(/\/\*.*?\*\//g, '');
                const matches = lineWithoutComment.match(new RegExp(`\\b${varName}\\b`, 'g'));
                if (matches) count += matches.length;
            });

            if (count <= 1) {
                this.unusedVariables.add(varName);
                this.addBug(
                    'UnusedVariable',
                    'warning',
                    info.line,
                    `Variable '${varName}' is declared but never used`,
                    `Remove the unused variable or use it`,
                    `Unused variables waste memory.`
                );
            }
        });
    }

    // Phase 5: Control Flow Analysis - Unreachable Code
    detectUnreachableCode() {
        let afterReturn = false;
        let braceDepth = 0;

        this.lines.forEach((line, idx) => {
            const trimmed = line.trim();

            if (trimmed.includes('{')) braceDepth++;
            if (trimmed.includes('}')) {
                braceDepth--;
                afterReturn = false;
            }

            if (afterReturn && trimmed.length > 0 && trimmed !== '}' &&
                !trimmed.startsWith('//') && !trimmed.startsWith('/*')) {
                this.addBug(
                    'UnreachableCode',
                    'warning',
                    idx + 1,
                    `Unreachable code after return statement`,
                    `Remove the unreachable code`,
                    `Code after return will never execute.`
                );
                afterReturn = false;
            }

            if (/\breturn\b.*;/.test(trimmed)) {
                afterReturn = true;
            }
        });
    }

    // Phase 6: Optimization - Redundant Expressions
    detectRedundantExpressions() {
        const patterns = [
            { regex: /(\w+)\s*\+\s*0\b/, msg: 'Adding 0 has no effect' },
            { regex: /(\w+)\s*-\s*0\b/, msg: 'Subtracting 0 has no effect' },
            { regex: /(\w+)\s*\*\s*1\b/, msg: 'Multiplying by 1 has no effect' },
            { regex: /(\w+)\s*\/\s*1\b/, msg: 'Dividing by 1 has no effect' },
            { regex: /(\w+)\s*\*\s*0\b/, msg: 'Multiplying by 0 always gives 0' },
        ];

        this.lines.forEach((line, idx) => {
            patterns.forEach(({ regex, msg }) => {
                if (regex.test(line)) {
                    this.addBug(
                        'RedundantExpression',
                        'info',
                        idx + 1,
                        msg,
                        `Simplify the expression`,
                        `Redundant operations can be removed.`
                    );
                }
            });
        });
    }

    // Phase 4: Semantic Analysis - Division by Zero
    detectDivisionByZero() {
        const pattern = /\/\s*0(?!\d)/g;
        this.lines.forEach((line, idx) => {
            if (pattern.test(line)) {
                this.addBug('DivisionByZero', 'critical', idx + 1,
                    `Division by zero detected`, `Use a non-zero divisor`,
                    `Division by zero causes runtime errors.`);
            }
            pattern.lastIndex = 0;
        });
    }

    // Phase 5: Control Flow Analysis - Infinite Loops
    detectInfiniteLoops() {
        this.lines.forEach((line, idx) => {
            // Detect while(1) or while(true)
            if (/while\s*\(\s*(1|true)\s*\)/.test(line)) {
                let hasBreak = false;
                for (let i = idx + 1; i < Math.min(idx + 20, this.lines.length); i++) {
                    if (/\bbreak\b|\breturn\b/.test(this.lines[i])) { hasBreak = true; break; }
                    if (/^\s*}\s*$/.test(this.lines[i])) break;
                }
                if (!hasBreak) {
                    this.addBug('InfiniteLoop', 'warning', idx + 1,
                        `Potential infinite loop (while(1) without break)`,
                        `Add a break condition or remove the loop`,
                        `Infinite loops can hang the program.`);
                }
            }

            // Detect for(;;)
            if (/for\s*\(\s*;\s*;\s*\)/.test(line)) {
                this.addBug('InfiniteLoop', 'warning', idx + 1,
                    `Infinite loop detected (for(;;))`,
                    `Add loop conditions or remove the loop`,
                    `Infinite loops can hang the program.`);
            }

            // Detect for loops with contradictory conditions
            // e.g., for(int i = 0; i >= 0; i++) - i starts at 0, always >= 0 while incrementing
            const forLoopMatch = line.match(/for\s*\(\s*(?:int\s+)?(\w+)\s*=\s*(\d+)\s*;\s*(\w+)\s*(>=|>|<=|<)\s*(-?\d+)\s*;\s*(\w+)(\+\+|--|\s*\+=\s*\d+|\s*-=\s*\d+)/);
            if (forLoopMatch) {
                const [, initVar, initVal, condVar, condOp, condVal, incrVar, incrOp] = forLoopMatch;
                const initNum = parseInt(initVal);
                const condNum = parseInt(condVal);

                // Make sure all parts refer to the same variable
                if (initVar === condVar && condVar === incrVar) {
                    let isInfinite = false;
                    let reason = '';

                    // Case: i = 0; i >= 0; i++ (always true, incrementing away from condition)
                    if ((condOp === '>=' || condOp === '>') && (incrOp === '++' || incrOp.includes('+='))) {
                        if (initNum >= condNum) {
                            isInfinite = true;
                            reason = `'${initVar}' starts at ${initNum}, condition '${initVar} ${condOp} ${condNum}' is always true while incrementing`;
                        }
                    }

                    // Case: i = 0; i <= 10; i-- (always true, decrementing when should increment)
                    if ((condOp === '<=' || condOp === '<') && (incrOp === '--' || incrOp.includes('-='))) {
                        if (initNum <= condNum) {
                            isInfinite = true;
                            reason = `'${initVar}' starts at ${initNum}, condition '${initVar} ${condOp} ${condNum}' while decrementing never terminates`;
                        }
                    }

                    if (isInfinite) {
                        this.addBug('InfiniteLoop', 'warning', idx + 1,
                            `Infinite loop detected: ${reason}`,
                            `Fix the loop condition or change the increment/decrement`,
                            `The loop condition will never become false.`);
                    }
                }
            }

            // Detect while(variable) that only increases or never changes
            const whileVarMatch = line.match(/while\s*\(\s*(\w+)\s*\)/);
            if (whileVarMatch) {
                const loopVar = whileVarMatch[1];
                // Skip if it's a constant like while(1) or while(0)
                if (/^\d+$/.test(loopVar)) return;

                let hasDecrement = false;
                let hasBreak = false;
                let onlyIncrement = false;

                // Check loop body for changes to the variable
                for (let i = idx + 1; i < Math.min(idx + 30, this.lines.length); i++) {
                    const bodyLine = this.lines[i];

                    // Check for break/return
                    if (/\bbreak\b|\breturn\b/.test(bodyLine)) {
                        hasBreak = true;
                        break;
                    }

                    // Check for decrement or assignment to zero/false
                    if (new RegExp(`${loopVar}\\s*--`).test(bodyLine) ||
                        new RegExp(`--\\s*${loopVar}`).test(bodyLine) ||
                        new RegExp(`${loopVar}\\s*=\\s*0\\s*;`).test(bodyLine) ||
                        new RegExp(`${loopVar}\\s*=\\s*false\\s*;`).test(bodyLine) ||
                        new RegExp(`${loopVar}\\s*-=`).test(bodyLine)) {
                        hasDecrement = true;
                    }

                    // Check for increment only
                    if (new RegExp(`${loopVar}\\s*\\+\\+`).test(bodyLine) ||
                        new RegExp(`\\+\\+\\s*${loopVar}`).test(bodyLine) ||
                        new RegExp(`${loopVar}\\s*\\+=`).test(bodyLine) ||
                        new RegExp(`${loopVar}\\s*=\\s*${loopVar}\\s*\\+`).test(bodyLine)) {
                        onlyIncrement = true;
                    }

                    // End of loop body
                    if (/^\s*}\s*$/.test(bodyLine)) break;
                }

                // If variable only increases (never decreases) and no break, likely infinite
                if (onlyIncrement && !hasDecrement && !hasBreak) {
                    this.addBug('InfiniteLoop', 'warning', idx + 1,
                        `Potential infinite loop: '${loopVar}' only increases, never becomes 0/false`,
                        `Add a decrement, break condition, or change the loop logic`,
                        `while(x) loops exit when x becomes 0/false. Incrementing moves away from termination.`);
                }
            }

            // Detect while(var op value) where var is never modified
            const whileCompMatch = line.match(/while\s*\(\s*(\w+)\s*(<=?|>=?|==|!=)\s*\d+\s*\)/);
            if (whileCompMatch) {
                const loopVar = whileCompMatch[1];

                let varModified = false;
                let hasBreak = false;

                // Check loop body for changes to the variable
                for (let i = idx + 1; i < Math.min(idx + 30, this.lines.length); i++) {
                    const bodyLine = this.lines[i];

                    // Check for break/return
                    if (/\bbreak\b|\breturn\b/.test(bodyLine)) {
                        hasBreak = true;
                        break;
                    }

                    // Check if variable is modified in any way
                    if (new RegExp(`${loopVar}\\s*\\+\\+`).test(bodyLine) ||
                        new RegExp(`\\+\\+\\s*${loopVar}`).test(bodyLine) ||
                        new RegExp(`${loopVar}\\s*--`).test(bodyLine) ||
                        new RegExp(`--\\s*${loopVar}`).test(bodyLine) ||
                        new RegExp(`${loopVar}\\s*\\+=`).test(bodyLine) ||
                        new RegExp(`${loopVar}\\s*-=`).test(bodyLine) ||
                        new RegExp(`${loopVar}\\s*=`).test(bodyLine)) {
                        varModified = true;
                    }

                    // End of loop body
                    if (/^\s*}\s*$/.test(bodyLine)) break;
                }

                // If variable is never modified and no break, it's infinite
                if (!varModified && !hasBreak) {
                    this.addBug('InfiniteLoop', 'warning', idx + 1,
                        `Infinite loop: '${loopVar}' is never modified inside the loop`,
                        `Add '${loopVar}++' or '${loopVar}--' inside the loop body`,
                        `Loop variable must change for the condition to eventually become false.`);
                }
            }
        });
    }

    // Phase 5: Control Flow Analysis - Empty Bodies
    detectEmptyBodies() {
        // Single-line empty patterns
        const singleLinePatterns = [
            { regex: /if\s*\([^)]+\)\s*{\s*}/, type: 'if' },
            { regex: /if\s*\([^)]+\)\s*;/, type: 'if' },
            { regex: /else\s*{\s*}/, type: 'else' },
            { regex: /else\s*;/, type: 'else' },
            { regex: /while\s*\([^)]+\)\s*{\s*}/, type: 'while' },
            { regex: /while\s*\([^)]+\)\s*;/, type: 'while' },
            { regex: /for\s*\([^)]+\)\s*{\s*}/, type: 'for' },
            { regex: /for\s*\([^)]+\)\s*;/, type: 'for' },
        ];

        this.lines.forEach((line, idx) => {
            singleLinePatterns.forEach(({ regex, type }) => {
                if (regex.test(line)) {
                    this.addBug('EmptyBody', 'warning', idx + 1,
                        `Empty ${type} body detected`,
                        `Add code to the body or remove the statement`,
                        `Empty control structures are usually unintentional.`);
                }
            });
        });

        // Detect multi-line empty blocks (if/else/while/for with { on next line and } immediately after)
        for (let idx = 0; idx < this.lines.length; idx++) {
            const rawLine = this.lines[idx].trim();
            // Strip comments for proper detection
            const line = rawLine.replace(/\/\/.*$/, '').trim();
            const nextRawLine = idx + 1 < this.lines.length ? this.lines[idx + 1].trim() : '';
            const nextLine = nextRawLine.replace(/\/\/.*$/, '').trim();
            const lineAfterNextRaw = idx + 2 < this.lines.length ? this.lines[idx + 2].trim() : '';
            const lineAfterNext = lineAfterNextRaw.replace(/\/\/.*$/, '').trim();

            // Check for: if/while/for/else { followed by }
            if (/^(if\s*\([^)]+\)|else\s*if\s*\([^)]+\)|else|while\s*\([^)]+\)|for\s*\([^)]+\))\s*\{?$/.test(line)) {
                if (line.endsWith('{') && nextLine === '}') {
                    const type = line.startsWith('if') ? 'if' :
                        line.startsWith('else if') ? 'else if' :
                            line.startsWith('else') ? 'else' :
                                line.startsWith('while') ? 'while' : 'for';
                    this.addBug('EmptyBody', 'warning', idx + 1,
                        `Empty ${type} block detected (body has no statements)`,
                        `Add code to the body or remove the block`,
                        `Empty control structures are usually unintentional.`);
                } else if (!line.endsWith('{') && nextLine === '{' && lineAfterNext === '}') {
                    const type = line.startsWith('if') ? 'if' :
                        line.startsWith('else if') ? 'else if' :
                            line.startsWith('else') ? 'else' :
                                line.startsWith('while') ? 'while' : 'for';
                    this.addBug('EmptyBody', 'warning', idx + 1,
                        `Empty ${type} block detected (body has no statements)`,
                        `Add code to the body or remove the block`,
                        `Empty control structures are usually unintentional.`);
                }
            }
        }

        // Detect empty functions
        this.functions.forEach((info, funcName) => {
            const startLine = info.line - 1;  // 0-indexed
            let braceCount = 0;
            let foundOpen = false;
            let bodyLines = 0;

            for (let i = startLine; i < this.lines.length; i++) {
                const line = this.lines[i];
                if (line.includes('{')) {
                    foundOpen = true;
                    braceCount++;
                }
                if (line.includes('}')) {
                    braceCount--;
                    if (braceCount === 0 && foundOpen) {
                        // Check if function body is empty (only contains braces and whitespace)
                        if (bodyLines === 0 || (bodyLines === 1 && i === startLine)) {
                            this.addBug('EmptyFunction', 'warning', info.line,
                                `Function '${funcName}' has an empty body`,
                                `Add code to the function or remove it`,
                                `Empty functions serve no purpose.`);
                        }
                        break;
                    }
                }
                if (foundOpen && braceCount > 0) {
                    const trimmed = line.trim();
                    if (trimmed !== '' && trimmed !== '{' && trimmed !== '}' && !trimmed.startsWith('//')) {
                        bodyLines++;
                    }
                }
            }
        });
    }

    // Phase 6: Optimization - Constant Conditions
    detectConstantConditions() {
        const patterns = [
            { regex: /if\s*\(\s*0\s*\)/, msg: 'Condition is always false - code never executes', isDeadCode: true },
            { regex: /if\s*\(\s*false\s*\)/, msg: 'Condition is always false - code never executes', isDeadCode: true },
            { regex: /if\s*\(\s*1\s*\)/, msg: 'Condition is always true' },
            { regex: /while\s*\(\s*(0|false)\s*\)/, msg: 'Loop condition is always false - code never executes', isDeadCode: true },
        ];
        this.lines.forEach((line, idx) => {
            patterns.forEach(({ regex, msg, isDeadCode }) => {
                if (regex.test(line)) {
                    this.addBug('ConstantCondition', 'warning', idx + 1, msg,
                        `Remove the dead code block`,
                        isDeadCode ? `Code inside this block will never execute - dead code.` : `Consider simplifying the condition.`);
                }
            });
        });
    }

    // Phase 6: Optimization - Self-Assignment
    detectSelfAssignment() {
        const pattern = /(\w+)\s*=\s*\1\s*;/g;
        this.lines.forEach((line, idx) => {
            pattern.lastIndex = 0;
            let match;
            while ((match = pattern.exec(line)) !== null) {
                this.addBug('SelfAssignment', 'warning', idx + 1,
                    `Self-assignment detected: '${match[1]} = ${match[1]}'`,
                    `Remove the redundant assignment`,
                    `Assigning a variable to itself has no effect.`);
            }
        });
    }

    // Phase 4: Semantic Analysis - Printf/Scanf Errors
    detectPrintfScanfErrors() {
        this.lines.forEach((line, idx) => {
            // Detect printf with variable only (no format string)
            // Match printf(variable) or printf(variable);
            const printfPattern = /\bprintf\s*\(\s*([^")][^,)]*)\s*\)/g;
            let match;

            printfPattern.lastIndex = 0;
            while ((match = printfPattern.exec(line)) !== null) {
                const arg = match[1].trim();
                // Check if it's NOT a string literal (doesn't start with ")
                // and NOT a macro or special case
                if (arg && !arg.startsWith('"') && !arg.startsWith("'") &&
                    !/^[A-Z_]+$/.test(arg)) { // Skip macros like EOF, NULL

                    // Determine the format specifier based on variable type
                    let formatSpec = '%d'; // default to int
                    if (this.variables.has(arg)) {
                        const varInfo = this.variables.get(arg);
                        switch (varInfo.type) {
                            case 'float': formatSpec = '%f'; break;
                            case 'double': formatSpec = '%lf'; break;
                            case 'char': formatSpec = '%c'; break;
                            case 'long': formatSpec = '%ld'; break;
                            default: formatSpec = '%d';
                        }
                    }

                    this.addBug('InvalidPrintf', 'error', idx + 1,
                        `printf() requires a format string, got variable '${arg}' directly`,
                        `Use printf("${formatSpec}", ${arg}); instead of printf(${arg});`,
                        `printf's first argument must be a format string like "%d" or "Hello".`);
                }
            }

            // Detect printf format-argument count mismatch
            // Matches: printf("...format...") or printf("...format...", args...)
            const printfFmtPattern = /\bprintf\s*\(\s*"([^"]*)"\s*(?:,\s*([^)]*))??\s*\)/g;
            printfFmtPattern.lastIndex = 0;
            while ((match = printfFmtPattern.exec(line)) !== null) {
                const formatStr = match[1];
                const argsStr = match[2] || '';

                // Count format specifiers (skip %% which is literal %)
                const fmtSpecs = formatStr.match(/%(?!%)[diouxXeEfFgGaAcspnld]+/g) || [];
                const specCount = fmtSpecs.length;

                // Count arguments (split by comma, filter empty)
                const argList = argsStr.trim() === '' ? [] : argsStr.split(',').map(a => a.trim()).filter(a => a.length > 0);
                const argCount = argList.length;

                if (specCount > 0 && argCount === 0) {
                    // Case: printf("%d") — format specifier but no argument at all
                    this.addBug('PrintfArgMismatch', 'error', idx + 1,
                        `printf() has ${specCount} format specifier(s) (${fmtSpecs.join(', ')}) but no arguments provided`,
                        `Add the missing argument(s): printf("${formatStr}", ${fmtSpecs.map((s, i) => `var${i + 1}`).join(', ')});`,
                        `Each format specifier like %d or %f must have a matching argument. Missing arguments cause undefined behavior.`);
                } else if (specCount > argCount && argCount > 0) {
                    // Case: printf("%d %f", x) — more specifiers than arguments
                    this.addBug('PrintfArgMismatch', 'error', idx + 1,
                        `printf() has ${specCount} format specifier(s) but only ${argCount} argument(s)`,
                        `Add ${specCount - argCount} more argument(s) or remove extra format specifiers`,
                        `Each format specifier must have a matching argument. Missing arguments cause undefined behavior.`);
                } else if (argCount > specCount && specCount > 0) {
                    // Case: printf("%d", x, y) — more arguments than specifiers
                    this.addBug('PrintfArgMismatch', 'warning', idx + 1,
                        `printf() has ${specCount} format specifier(s) but ${argCount} argument(s) — ${argCount - specCount} extra argument(s) will be ignored`,
                        `Remove extra arguments or add format specifiers for them`,
                        `Extra arguments beyond the format specifiers are silently ignored.`);
                }
            }

            // Detect scanf format-argument count mismatch
            const scanfFmtPattern = /\bscanf\s*\(\s*"([^"]*)"\s*(?:,\s*([^)]*))??\s*\)/g;
            scanfFmtPattern.lastIndex = 0;
            while ((match = scanfFmtPattern.exec(line)) !== null) {
                const formatStr = match[1];
                const argsStr = match[2] || '';

                const fmtSpecs = formatStr.match(/%(?!%)[diouxXeEfFgGaAcspnld]+/g) || [];
                const specCount = fmtSpecs.length;

                const argList = argsStr.trim() === '' ? [] : argsStr.split(',').map(a => a.trim()).filter(a => a.length > 0);
                const argCount = argList.length;

                if (specCount > 0 && argCount === 0) {
                    this.addBug('ScanfArgMismatch', 'error', idx + 1,
                        `scanf() has ${specCount} format specifier(s) (${fmtSpecs.join(', ')}) but no arguments provided`,
                        `Add the missing argument(s): scanf("${formatStr}", ${fmtSpecs.map((s, i) => `&var${i + 1}`).join(', ')});`,
                        `Each format specifier must have a matching argument. Missing arguments cause undefined behavior.`);
                } else if (specCount > argCount && argCount > 0) {
                    this.addBug('ScanfArgMismatch', 'error', idx + 1,
                        `scanf() has ${specCount} format specifier(s) but only ${argCount} argument(s)`,
                        `Add ${specCount - argCount} more argument(s) or remove extra format specifiers`,
                        `Each format specifier must have a matching argument.`);
                } else if (argCount > specCount && specCount > 0) {
                    this.addBug('ScanfArgMismatch', 'warning', idx + 1,
                        `scanf() has ${specCount} format specifier(s) but ${argCount} argument(s) — ${argCount - specCount} extra`,
                        `Remove extra arguments or add format specifiers`,
                        `Extra arguments beyond the format specifiers are ignored.`);
                }

                // Also check for missing & (existing check, now integrated)
                for (let i = 0; i < Math.min(specCount, argCount); i++) {
                    const arg = argList[i];
                    const spec = fmtSpecs[i];

                    if (spec !== '%s' && arg && !arg.startsWith('&') &&
                        /^[a-zA-Z_]\w*$/.test(arg)) {
                        this.addBug('InvalidScanf', 'error', idx + 1,
                            `scanf() requires address of variable, missing '&' before '${arg}'`,
                            `Use scanf("${formatStr}", &${arg}); instead of scanf("${formatStr}", ${arg});`,
                            `scanf needs memory address (pointer) to store input value.`);
                    }
                }
            }
        });
    }

    // Phase 4: Semantic Analysis - Array Bounds Checking
    detectArrayOutOfBounds() {
        // Step 1: Detect array declarations and store their sizes
        const arrayDeclPattern = /\b(int|float|char|double|long|short)\s+(\w+)\s*\[\s*(\d+)\s*\]/g;

        this.lines.forEach((line, idx) => {
            arrayDeclPattern.lastIndex = 0;
            let match;
            while ((match = arrayDeclPattern.exec(line)) !== null) {
                const arrayType = match[1];
                const arrayName = match[2];
                const arraySize = parseInt(match[3], 10);
                this.arrays.set(arrayName, { type: arrayType, size: arraySize, line: idx + 1 });
            }
        });

        // Step 2: Check for constant index out of bounds
        const accessPattern = /(\w+)\s*\[\s*(\d+)\s*\]/g;

        this.lines.forEach((line, idx) => {
            // Skip array declarations
            if (/\b(int|float|char|double|long|short)\s+\w+\s*\[/.test(line)) return;

            accessPattern.lastIndex = 0;
            let match;
            while ((match = accessPattern.exec(line)) !== null) {
                const arrayName = match[1];
                const accessIndex = parseInt(match[2], 10);

                if (this.arrays.has(arrayName)) {
                    const arrayInfo = this.arrays.get(arrayName);
                    if (accessIndex >= arrayInfo.size) {
                        this.addBug('ArrayOutOfBounds', 'critical', idx + 1,
                            `Array '${arrayName}' accessed at index ${accessIndex}, but size is ${arrayInfo.size} (valid indices: 0-${arrayInfo.size - 1})`,
                            `Use an index less than ${arrayInfo.size}`,
                            `Accessing array out of bounds causes undefined behavior and can crash the program.`);
                    }
                    if (accessIndex < 0) {
                        this.addBug('ArrayOutOfBounds', 'critical', idx + 1,
                            `Array '${arrayName}' accessed at negative index ${accessIndex}`,
                            `Use a non-negative index`,
                            `Negative array indices cause undefined behavior.`);
                    }
                }
            }
        });

        // Step 3: Check for loop-based array access with potential overflow
        const forLoopPattern = /for\s*\(\s*(?:int\s+)?(\w+)\s*=\s*(\d+)\s*;\s*\1\s*(<|<=|>|>=)\s*(\d+|\w+)\s*;/g;

        this.lines.forEach((line, idx) => {
            forLoopPattern.lastIndex = 0;
            let match;
            while ((match = forLoopPattern.exec(line)) !== null) {
                const loopVar = match[1];
                const startVal = parseInt(match[2], 10);
                const operator = match[3];
                const limitStr = match[4];

                // Check if limit is a number
                const limitVal = parseInt(limitStr, 10);
                if (isNaN(limitVal)) continue;  // Skip if limit is a variable

                // Calculate maximum index reached
                let maxIndex;
                if (operator === '<') {
                    maxIndex = limitVal - 1;
                } else if (operator === '<=') {
                    maxIndex = limitVal;
                } else if (operator === '>') {
                    maxIndex = startVal; // counting down
                } else if (operator === '>=') {
                    maxIndex = startVal;
                }

                // Look for array access using the loop variable in nearby lines
                for (let j = idx; j < Math.min(idx + 10, this.lines.length); j++) {
                    const innerLine = this.lines[j];
                    const arrayAccessPattern = new RegExp(`(\\w+)\\s*\\[\\s*${loopVar}\\s*\\]`, 'g');
                    let accessMatch;
                    while ((accessMatch = arrayAccessPattern.exec(innerLine)) !== null) {
                        const arrayName = accessMatch[1];
                        if (this.arrays.has(arrayName)) {
                            const arrayInfo = this.arrays.get(arrayName);
                            if (maxIndex !== undefined && maxIndex >= arrayInfo.size) {
                                this.addBug('ArrayOutOfBounds', 'critical', idx + 1,
                                    `Loop may access '${arrayName}[${maxIndex}]' but array size is ${arrayInfo.size} (valid: 0-${arrayInfo.size - 1})`,
                                    `Change loop condition to '${loopVar} < ${arrayInfo.size}'`,
                                    `The loop iterates beyond the array bounds which causes undefined behavior.`);
                            }
                        }
                    }
                }
            }
        });
    }

    // Phase 7: Code Generation - Variable Naming
    generateClearName(varName, varType) {
        const clearNames = ['result', 'count', 'index', 'value', 'total', 'sum', 'main', 'argc', 'argv'];
        if (clearNames.includes(varName) || varName.length > 3) return varName;

        const typePrefix = {
            'int': ['counter', 'number', 'value', 'index', 'count'],
            'float': ['decimal', 'ratio', 'amount', 'rate'],
            'double': ['preciseValue', 'calculation'],
            'char': ['character', 'letter', 'symbol']
        };

        const prefixes = typePrefix[varType] || typePrefix['int'];
        this.variableCounter[varType] = (this.variableCounter[varType] || 0) + 1;
        const idx = this.variableCounter[varType] - 1;
        return idx < prefixes.length ? prefixes[idx] : `${prefixes[0]}${idx + 1}`;
    }

    // Phase 6 & 7: Optimization & Code Generation
    generateRefactoredCode() {
        let lines = this.originalCode.split('\n');

        this.variables.forEach((info, varName) => {
            const newName = this.generateClearName(varName, info.type);
            if (newName !== varName) this.variableRenameMap.set(varName, newName);
        });

        // Pass 1: Line-by-line fixes
        let processedLines = [];
        let skipUntilBrace = false;
        let skipBraceCount = 0;
        let skipNextLine = false;
        let skipUnusedFunction = false;
        let unusedFuncBraceCount = 0;

        for (let idx = 0; idx < lines.length; idx++) {
            let line = lines[idx];

            // Fix keyword typos FIRST (before any removal logic)
            // This ensures 'itn main()' becomes 'int main()' before
            // the undefined function check would wrongly remove it
            line = this.fixKeywordTypos(line);

            const trimmed = line.trim();

            // Skip this line if flagged from previous iteration
            if (skipNextLine) {
                skipNextLine = false;
                this.stats.deadCodeRemoved++;
                continue;
            }

            // Skip unused function definitions
            if (skipUnusedFunction) {
                if (line.includes('{')) unusedFuncBraceCount++;
                if (line.includes('}')) {
                    unusedFuncBraceCount--;
                    if (unusedFuncBraceCount === 0) {
                        skipUnusedFunction = false;
                        this.stats.unusedRemoved++;
                    }
                }
                continue;
            }

            // Check if this line starts an unused function definition
            if (this.unusedFunctions && this.unusedFunctions.size > 0) {
                for (const funcName of this.unusedFunctions) {
                    const funcDefPattern = new RegExp(`^\\s*(int|float|char|double|void|long|short)\\s+${funcName}\\s*\\(`);
                    if (funcDefPattern.test(trimmed)) {
                        skipUnusedFunction = true;
                        unusedFuncBraceCount = 0;
                        if (line.includes('{')) unusedFuncBraceCount = 1;
                        break;
                    }
                }
                if (skipUnusedFunction) continue;
            }

            if (skipUntilBrace) {
                if (line.includes('{')) skipBraceCount++;
                if (line.includes('}')) {
                    skipBraceCount--;
                    if (skipBraceCount === 0) skipUntilBrace = false;
                }
                this.stats.deadCodeRemoved++;
                continue;
            }

            // Remove calls to undefined functions
            // BUT skip lines that are now valid function definitions (after typo fix)
            let skipLine = false;
            const isFuncDefAfterFix = /^\s*(int|float|char|double|void|long|short)\s+\w+\s*\([^)]*\)\s*\{?\s*(\/\/.*)?$/.test(trimmed);
            if (!isFuncDefAfterFix && this.undefinedFunctions && this.undefinedFunctions.size > 0) {
                for (const funcName of this.undefinedFunctions) {
                    const callPattern = new RegExp(`^\\s*${funcName}\\s*\\([^)]*\\)\\s*;?\\s*$`);
                    const callInLine = new RegExp(`\\b${funcName}\\s*\\([^)]*\\)\\s*;?`);
                    if (callPattern.test(trimmed) || callInLine.test(trimmed)) {
                        skipLine = true;
                        this.stats.deadCodeRemoved++;
                        break;
                    }
                }
            }
            if (skipLine) continue;

            // Strip comments for pattern matching
            const codeWithoutComment = trimmed.replace(/\/\/.*$/, '').trim();

            // Fix malformed control structures - } or { in wrong places
            // Fix: (x > 0} -> (x > 0) - brace used instead of parenthesis
            line = line.replace(/\(\s*([^(){}]+)\s*\}\s*\{/g, '($1) {');
            line = line.replace(/\(\s*([^(){}]+)\s*\}/g, '($1)');
            // Fix: while(x}{ -> while(x) {
            line = line.replace(/\b(while|if)\s*\(\s*(\w+)\s*\}\s*\{/, '$1($2) {');
            // Fix: while(x{ -> while(x) {  
            line = line.replace(/\b(while|if)\s*\(\s*(\w+)\s*\{/, '$1($2) {');
            // Fix: (condition){ -> (condition) {
            line = line.replace(/\)\s*\{/g, ') {');

            if (/\b(while|if|for)\s*\([^)]*[\{\}]/.test(codeWithoutComment)) {
                this.stats.conditionsFixed++;
            }

            // Fix uninitialized variables - add = 0 initialization
            if (this.uninitializedVariables.size > 0) {
                for (const [varName, info] of this.uninitializedVariables) {
                    // Match declaration without initialization: int x;
                    const declPattern = new RegExp(`(int|float|char|double|long|short)\\s+${varName}\\s*;`);
                    if (declPattern.test(line)) {
                        // Get the appropriate default value based on type
                        const defaultVal = info.type === 'char' ? "'\\0'" :
                            (info.type === 'float' || info.type === 'double') ? '0.0' : '0';
                        line = line.replace(declPattern, `$1 ${varName} = ${defaultVal};`);
                        this.stats.conditionsFixed++;
                    }
                }
            }

            // Remove while(false) or while(0) loops - dead code
            if (/while\s*\(\s*(0|false)\s*\)/.test(codeWithoutComment)) {
                if (trimmed.includes('{')) {
                    skipUntilBrace = true;
                    skipBraceCount = 1;
                }
                this.stats.deadCodeRemoved++;
                continue;
            }

            // Remove if(false) or if(0) blocks - dead code
            if (/if\s*\(\s*(0|false)\s*\)/.test(codeWithoutComment)) {
                if (trimmed.includes('{')) {
                    skipUntilBrace = true;
                    skipBraceCount = 1;
                }
                this.stats.deadCodeRemoved++;
                continue;
            }

            // Remove unused variable declarations (but preserve lines with function calls)
            if (this.unusedVariables.size > 0) {
                let isUnusedDecl = false;
                for (const unusedVar of this.unusedVariables) {
                    // Match: int x; or int x = value;
                    const declPattern = new RegExp(`^\\s*(int|float|char|double|long|short)\\s+${unusedVar}\\s*(=\\s*[^;]+)?\\s*;\\s*$`);
                    if (declPattern.test(codeWithoutComment)) {
                        // Check if there's a function call in the initialization - if so, keep the line
                        const funcCallMatch = codeWithoutComment.match(/=\s*([a-zA-Z_]\w*)\s*\([^)]*\)/);
                        if (funcCallMatch && !['int', 'float', 'char', 'double', 'void'].includes(funcCallMatch[1])) {
                            // Has function call - keep the entire line as-is
                            break;
                        }
                        isUnusedDecl = true;
                        this.stats.unusedRemoved++;
                        break;
                    }
                }
                if (isUnusedDecl) continue;
            }

            // Remove self-assignments (standalone line)
            if (/^(\w+)\s*=\s*\1\s*;?\s*$/.test(codeWithoutComment)) {
                this.stats.expressionsSimplified++;
                continue;
            }

            // Remove self-assignments within a line (e.g., in if block: x = x;)
            line = line.replace(/(\w+)\s*=\s*\1\s*;/g, (match, varName) => {
                this.stats.expressionsSimplified++;
                return '';  // Remove self-assignment
            });

            // If line became empty after removing self-assignment, skip it
            if (line.trim() === '' || line.trim() === '//') {
                continue;
            }

            // Remove empty statements (single line)
            const codeForEmptyCheck = line.replace(/\/\/.*$/, '').trim();
            if (/if\s*\([^)]+\)\s*;\s*$/.test(codeForEmptyCheck) ||
                /while\s*\([^)]+\)\s*;\s*$/.test(codeForEmptyCheck) ||
                /for\s*\([^)]+\)\s*;\s*$/.test(codeForEmptyCheck) ||
                /if\s*\([^)]+\)\s*{\s*}\s*$/.test(codeForEmptyCheck) ||
                /while\s*\([^)]+\)\s*{\s*}\s*$/.test(codeForEmptyCheck) ||
                /for\s*\([^)]+\)\s*{\s*}\s*$/.test(codeForEmptyCheck) ||
                /else\s*{\s*}\s*$/.test(codeForEmptyCheck) ||
                /else\s*;\s*$/.test(codeForEmptyCheck)) {
                this.stats.deadCodeRemoved++;
                continue;
            }

            // Check for multi-line empty blocks: if/while/for/else { followed by }
            const nextLine = idx + 1 < lines.length ? lines[idx + 1].trim() : '';
            if (/^(if\s*\([^)]+\)|else\s*if\s*\([^)]+\)|else|while\s*\([^)]+\)|for\s*\([^)]+\))\s*\{\s*$/.test(codeForEmptyCheck) && nextLine === '}') {
                // Skip this line and flag next line (closing brace) for removal
                this.stats.deadCodeRemoved++;
                skipNextLine = true;
                continue;
            }

            // Remove infinite loops - while(1), while(true), for(;;)
            if (/while\s*\(\s*(1|true)\s*\)/.test(line) || /for\s*\(\s*;\s*;\s*\)/.test(line)) {
                let hasBreak = false;
                for (let j = idx + 1; j < Math.min(idx + 20, lines.length); j++) {
                    if (/\bbreak\b|\breturn\b/.test(lines[j])) { hasBreak = true; break; }
                    if (/^\s*}\s*$/.test(lines[j])) break;
                }
                if (!hasBreak) {
                    skipUntilBrace = true;
                    skipBraceCount = line.includes('{') ? 1 : 0;
                    this.stats.deadCodeRemoved++;
                    continue;
                }
            }

            // Remove contradictory for loops (e.g., for(int i = 0; i >= 0; i++))
            const forLoopMatch = line.match(/for\s*\(\s*(?:int\s+)?(\w+)\s*=\s*(\d+)\s*;\s*(\w+)\s*(>=|>|<=|<)\s*(-?\d+)\s*;\s*(\w+)(\+\+|--|\s*\+=\s*\d+|\s*-=\s*\d+)/);
            if (forLoopMatch) {
                const [, initVar, initVal, condVar, condOp, condVal, incrVar, incrOp] = forLoopMatch;
                const initNum = parseInt(initVal);
                const condNum = parseInt(condVal);

                if (initVar === condVar && condVar === incrVar) {
                    let isInfinite = false;

                    // Case: i = 0; i >= 0; i++ (always true, incrementing)
                    if ((condOp === '>=' || condOp === '>') && (incrOp === '++' || incrOp.includes('+='))) {
                        if (initNum >= condNum) isInfinite = true;
                    }
                    // Case: i = 0; i <= 10; i-- (never terminates, decrementing wrong way)
                    if ((condOp === '<=' || condOp === '<') && (incrOp === '--' || incrOp.includes('-='))) {
                        if (initNum <= condNum) isInfinite = true;
                    }

                    if (isInfinite) {
                        skipUntilBrace = true;
                        skipBraceCount = line.includes('{') ? 1 : 0;
                        this.stats.deadCodeRemoved++;
                        continue;
                    }
                }
            }

            // Detect and add warning comment for while(var) where var only increases
            const whileVarMatch = line.match(/while\s*\(\s*(\w+)\s*\)/);
            if (whileVarMatch) {
                const loopVar = whileVarMatch[1];
                if (!/^\d+$/.test(loopVar)) { // Not a constant
                    let hasDecrement = false;
                    let hasBreak = false;
                    let onlyIncrement = false;

                    for (let j = idx + 1; j < Math.min(idx + 30, lines.length); j++) {
                        const bodyLine = lines[j];
                        if (/\bbreak\b|\breturn\b/.test(bodyLine)) { hasBreak = true; break; }
                        if (new RegExp(`${loopVar}\\s*--`).test(bodyLine) ||
                            new RegExp(`--\\s*${loopVar}`).test(bodyLine) ||
                            new RegExp(`${loopVar}\\s*=\\s*0\\s*;`).test(bodyLine) ||
                            new RegExp(`${loopVar}\\s*-=`).test(bodyLine)) {
                            hasDecrement = true;
                        }
                        if (new RegExp(`${loopVar}\\s*\\+\\+`).test(bodyLine) ||
                            new RegExp(`\\+\\+\\s*${loopVar}`).test(bodyLine) ||
                            new RegExp(`${loopVar}\\s*\\+=`).test(bodyLine) ||
                            new RegExp(`${loopVar}\\s*=\\s*${loopVar}\\s*\\+`).test(bodyLine)) {
                            onlyIncrement = true;
                        }
                        if (/^\s*}\s*$/.test(bodyLine)) break;
                    }

                    // If definitely infinite (only increments, no break), remove it
                    if (onlyIncrement && !hasDecrement && !hasBreak) {
                        skipUntilBrace = true;
                        skipBraceCount = line.includes('{') ? 1 : 0;
                        this.stats.deadCodeRemoved++;
                        continue;
                    }
                }
            }

            // Remove while(var op value) where var is never modified
            const whileCompMatch = line.match(/while\s*\(\s*(\w+)\s*(<=?|>=?|==|!=)\s*\d+\s*\)/);
            if (whileCompMatch) {
                const loopVar = whileCompMatch[1];
                let varModified = false;
                let hasBreak = false;

                for (let j = idx + 1; j < Math.min(idx + 30, lines.length); j++) {
                    const bodyLine = lines[j];
                    if (/\bbreak\b|\breturn\b/.test(bodyLine)) { hasBreak = true; break; }
                    if (new RegExp(`${loopVar}\\s*\\+\\+`).test(bodyLine) ||
                        new RegExp(`\\+\\+\\s*${loopVar}`).test(bodyLine) ||
                        new RegExp(`${loopVar}\\s*--`).test(bodyLine) ||
                        new RegExp(`--\\s*${loopVar}`).test(bodyLine) ||
                        new RegExp(`${loopVar}\\s*\\+=`).test(bodyLine) ||
                        new RegExp(`${loopVar}\\s*-=`).test(bodyLine) ||
                        new RegExp(`${loopVar}\\s*=`).test(bodyLine)) {
                        varModified = true;
                    }
                    if (/^\s*}\s*$/.test(bodyLine)) break;
                }

                // If variable is never modified and no break, remove the infinite loop
                if (!varModified && !hasBreak) {
                    skipUntilBrace = true;
                    skipBraceCount = line.includes('{') ? 1 : 0;
                    this.stats.deadCodeRemoved++;
                    continue;
                }
            }

            // (keyword typos already fixed at top of loop)

            // Fix missing semicolons
            line = this.fixMissingSemicolon(line, idx);

            // Fix missing brackets - close unclosed ones at end of array access
            line = this.fixMissingBrackets(line);

            // Fix invalid function parameters (add types)
            line = this.fixInvalidParameters(line);

            // Fix assignments in conditions
            line = line.replace(/if\s*\(\s*(\w+)\s*=\s*([^=)]+)\)/g, (match, v, val) => {
                if (!val.includes('=') && !val.includes('!') && !val.includes('<') && !val.includes('>')) {
                    this.stats.conditionsFixed++;
                    return `if (${v} == ${val.trim()})`;
                }
                return match;
            });

            // Fix array out of bounds in for loops
            line = this.fixArrayOutOfBounds(line);

            // Fix printf/scanf errors
            line = this.fixPrintfScanf(line);

            // Constant folding
            line = line.replace(/(\d+)\s*\+\s*(\d+)/g, (m, a, b) => { this.stats.constantsFolded++; return String(parseInt(a) + parseInt(b)); });
            line = line.replace(/(\d+)\s*\*\s*(\d+)/g, (m, a, b) => { this.stats.constantsFolded++; return String(parseInt(a) * parseInt(b)); });

            // Algebraic simplification
            line = line.replace(/(\w+)\s*\+\s*0\b/g, (m, v) => { this.stats.expressionsSimplified++; return v; });
            line = line.replace(/(\w+)\s*\*\s*1\b/g, (m, v) => { this.stats.expressionsSimplified++; return v; });

            // Variable renaming
            this.variableRenameMap.forEach((newName, oldName) => {
                const regex = new RegExp(`\\b${oldName}\\b`, 'g');
                if (regex.test(line)) { line = line.replace(regex, newName); this.stats.variablesRenamed++; }
            });

            processedLines.push(line);
        }

        // Pass 2: Remove unreachable code
        let finalLines = [];
        let afterReturn = false;
        let braceDepth = 0;

        for (let line of processedLines) {
            const trimmed = line.trim();
            if (trimmed.includes('{')) braceDepth++;
            if (trimmed.includes('}')) { braceDepth--; afterReturn = false; }
            if (afterReturn && trimmed.length > 0 && trimmed !== '}' && !trimmed.startsWith('//')) {
                this.stats.deadCodeRemoved++;
                continue;
            }
            if (/\breturn\b.*;/.test(trimmed)) afterReturn = true;
            finalLines.push(line);
        }

        // Pass 2.5: Add missing closing braces
        let openBraces = 0;
        for (const line of finalLines) {
            const stripped = line.replace(/\/\/.*$/, '').replace(/"[^"]*"/g, '').replace(/'[^']*'/g, '');
            for (const ch of stripped) {
                if (ch === '{') openBraces++;
                if (ch === '}') openBraces--;
            }
        }
        // Append missing closing braces
        while (openBraces > 0) {
            finalLines.push('}');
            openBraces--;
            this.stats.conditionsFixed++;
        }

        // Pass 3: Format output
        const formattedCode = this.formatCode(finalLines.join('\n'));
        this.refactoredCode = formattedCode || finalLines.join('\n');
    }

    // Phase 7: Code Generation - Fix Semicolons
    fixMissingSemicolon(line, idx) {
        const trimmed = line.trim();

        // Skip if empty or is full-line comment
        if (trimmed === '' || trimmed.startsWith('//') || trimmed.startsWith('#') ||
            trimmed.startsWith('/*') || trimmed.startsWith('*')) {
            return line;
        }

        // Extract comment if exists
        const commentMatch = line.match(/(\/\/.*)$/);
        const comment = commentMatch ? commentMatch[1] : '';
        const codeOnly = comment ? line.replace(comment, '').trimEnd() : line.trimEnd();
        const codeOnlyTrimmed = codeOnly.trim();

        // Skip if already has semicolon, or ends with braces
        if (codeOnlyTrimmed.endsWith(';') || codeOnlyTrimmed.endsWith('{') ||
            codeOnlyTrimmed.endsWith('}') || codeOnlyTrimmed === '}') {
            return line;
        }

        // Skip control structures
        if (/^(if|else|while|for|switch|do)\s*[\({]/.test(codeOnlyTrimmed) || codeOnlyTrimmed === 'else') {
            return line;
        }

        // Skip function definitions (with opening brace or without)
        if (/^(int|float|char|double|void|long|short)\s+\w+\s*\([^)]*\)\s*\{?$/.test(codeOnlyTrimmed)) {
            return line;
        }

        // Patterns that need semicolons
        const needsSemicolon = [
            /^(int|float|char|double|long|short)\s+\w+(\s*\[[^\]]*\])?\s*(=\s*[^;{]+)?$/,  // Variable/array declaration
            /^\w+\s*=\s*[^;{]+$/,  // Assignment
            /^\w+\s*\([^)]*\)$/,  // Function call like func() or printf("hello")
            /^return\s+[^;]*$/,  // Return
            /^return$/,  // Just return
            /^(break|continue)$/,  // break/continue
            /^\w+\s*(\+\+|--)$/,  // Postfix increment/decrement
            /^(\+\+|--)\s*\w+$/,  // Prefix increment/decrement
        ];

        for (const pattern of needsSemicolon) {
            if (pattern.test(codeOnlyTrimmed)) {
                this.stats.expressionsSimplified++;
                // Add semicolon before comment if there's a comment
                if (comment) {
                    return codeOnly + '; ' + comment;
                }
                return codeOnly + ';';
            }
        }

        return line;
    }

    // Phase 7: Code Generation - Fix Parameters
    fixInvalidParameters(line) {
        // Extract comment if exists
        const commentMatch = line.match(/(\/\/.*)$/);
        const comment = commentMatch ? commentMatch[1] : '';
        const codeOnly = comment ? line.replace(comment, '').trimEnd() : line;

        // Match function definition with parameters missing types
        const funcDefMatch = codeOnly.match(/^(\s*)(int|float|char|double|void|long|short)\s+(\w+)\s*\(([^)]*)\)\s*(\{?)\s*$/);
        if (funcDefMatch) {
            const indent = funcDefMatch[1];
            const returnType = funcDefMatch[2];
            const funcName = funcDefMatch[3];
            const params = funcDefMatch[4];
            const brace = funcDefMatch[5] || '';

            if (params.trim() !== '' && params.trim() !== 'void') {
                let needsFix = false;
                const paramList = params.split(',');
                const fixedParams = paramList.map(p => {
                    const trimmedP = p.trim();
                    // Check if parameter has a type
                    if (!/^(int|float|char|double|void|long|short)\s+/.test(trimmedP) &&
                        !/^(int|float|char|double|void|long|short)\s*\*/.test(trimmedP) &&
                        trimmedP !== '...' && trimmedP !== 'void' && trimmedP !== '') {
                        // Add int type by default
                        needsFix = true;
                        this.stats.expressionsSimplified++;
                        return `int ${trimmedP}`;
                    }
                    return trimmedP;
                });
                if (needsFix) {
                    let result = `${indent}${returnType} ${funcName}(${fixedParams.join(', ')})`;
                    if (brace) result += ' ' + brace;
                    if (comment) result += ' ' + comment;
                    return result.trimEnd();
                }
            }
        }
        return line;
    }

    // Phase 7: Code Generation - Fix Brackets
    fixMissingBrackets(line) {
        // Extract comment if exists
        const commentMatch = line.match(/(\/\/.*)$/);
        const comment = commentMatch ? commentMatch[1] : '';
        const codeOnly = comment ? line.replace(comment, '').trimEnd() : line;

        let openBrackets = 0;
        let closeBrackets = 0;
        let inString = false;

        for (let i = 0; i < codeOnly.length; i++) {
            const char = codeOnly[i];
            const prevChar = i > 0 ? codeOnly[i - 1] : '';

            if (char === '"' && prevChar !== '\\') inString = !inString;
            if (inString) continue;

            if (char === '[') openBrackets++;
            if (char === ']') closeBrackets++;
        }

        // Add missing closing brackets
        if (openBrackets > closeBrackets) {
            const missing = openBrackets - closeBrackets;

            // Find position to insert - before semicolon if exists
            const semiIdx = codeOnly.lastIndexOf(';');
            let fixedCode;
            if (semiIdx > 0) {
                fixedCode = codeOnly.substring(0, semiIdx) + ']'.repeat(missing) + codeOnly.substring(semiIdx);
            } else {
                // No semicolon - add bracket and semicolon if it's a declaration
                if (/^\s*(int|float|char|double|long|short|void)\s+\w+\s*\[/.test(codeOnly) ||
                    /^\s*\w+\s*\[/.test(codeOnly)) {
                    fixedCode = codeOnly.trimEnd() + ']'.repeat(missing) + ';';
                } else {
                    fixedCode = codeOnly.trimEnd() + ']'.repeat(missing);
                }
            }
            this.stats.expressionsSimplified++;
            return comment ? fixedCode + ' ' + comment : fixedCode;
        }

        return line;
    }

    // Phase 7: Code Generation - Fix Array Bounds
    fixArrayOutOfBounds(line) {
        // Match for loop pattern: for(int i=0; i<LIMIT; i++)
        const forLoopPattern = /for\s*\(\s*(?:int\s+)?(\w+)\s*=\s*(\d+)\s*;\s*\1\s*(<|<=)\s*(\d+)\s*;/;
        const match = line.match(forLoopPattern);

        if (!match) return line;

        const loopVar = match[1];
        const operator = match[3];
        const limitVal = parseInt(match[4], 10);

        // Calculate max index
        let maxIndex;
        if (operator === '<') {
            maxIndex = limitVal - 1;
        } else if (operator === '<=') {
            maxIndex = limitVal;
        }

        // Find the line index of this for loop in the original lines
        const lineIdx = this.lines.findIndex(l => l.includes(line.trim()) || l.trim() === line.trim());

        // Look at the loop body (next few lines) to find array access with loop variable
        let needsFix = false;
        let correctLimit = null;

        if (lineIdx !== -1) {
            for (let j = lineIdx; j < Math.min(lineIdx + 15, this.lines.length); j++) {
                const innerLine = this.lines[j];
                // Check for array access with the loop variable
                const arrayAccessPattern = new RegExp(`(\\w+)\\s*\\[\\s*${loopVar}\\s*\\]`);
                const accessMatch = innerLine.match(arrayAccessPattern);

                if (accessMatch) {
                    const arrayName = accessMatch[1];
                    if (this.arrays.has(arrayName)) {
                        const arrayInfo = this.arrays.get(arrayName);
                        if (maxIndex !== undefined && maxIndex >= arrayInfo.size) {
                            needsFix = true;
                            correctLimit = arrayInfo.size;
                            break;
                        }
                    }
                }

                // Stop if we hit a closing brace at indent level 0 (end of loop)
                if (j > lineIdx && /^\s*\}\s*$/.test(innerLine)) break;
            }
        }

        if (needsFix && correctLimit !== null) {
            // Fix the loop condition
            const oldCondition = new RegExp(`${loopVar}\\s*(<=?)\\s*${limitVal}`);
            line = line.replace(oldCondition, `${loopVar} < ${correctLimit}`);
            this.stats.conditionsFixed++;
        }

        return line;
    }

    // Phase 7: Code Generation - Fix Printf/Scanf
    fixPrintfScanf(line) {
        // Fix printf(variable) -> printf("%d", variable) or appropriate format
        const printfPattern = /\bprintf\s*\(\s*([^")][^,)]*)\s*\)/g;

        line = line.replace(printfPattern, (match, arg) => {
            const varName = arg.trim();

            // Skip if it's a string literal, macro, or empty
            if (!varName || varName.startsWith('"') || varName.startsWith("'") ||
                /^[A-Z_]+$/.test(varName)) {
                return match;
            }

            // Determine format specifier based on variable type
            let formatSpec = '%d'; // default to int
            if (this.variables.has(varName)) {
                const varInfo = this.variables.get(varName);
                switch (varInfo.type) {
                    case 'float': formatSpec = '%f'; break;
                    case 'double': formatSpec = '%lf'; break;
                    case 'char': formatSpec = '%c'; break;
                    case 'long': formatSpec = '%ld'; break;
                    default: formatSpec = '%d';
                }
            }

            this.stats.expressionsSimplified++;
            return `printf("${formatSpec}", ${varName})`;
        });

        // Fix scanf without & for non-string arguments
        const scanfPattern = /\bscanf\s*\(\s*"([^"]*)"\s*,\s*([^)]+)\)/g;

        line = line.replace(scanfPattern, (match, formatStr, args) => {
            const formatSpecs = formatStr.match(/%[diouxXeEfFgGaAcspn]/g) || [];
            const argList = args.split(',').map(a => a.trim());
            let changed = false;

            const fixedArgs = argList.map((arg, i) => {
                const spec = formatSpecs[i] || '%d';

                // Add & if missing for non-string types
                if (spec !== '%s' && arg && !arg.startsWith('&') &&
                    /^[a-zA-Z_]\w*$/.test(arg)) {
                    changed = true;
                    return `&${arg}`;
                }
                return arg;
            });

            if (changed) {
                this.stats.expressionsSimplified++;
                return `scanf("${formatStr}", ${fixedArgs.join(', ')})`;
            }
            return match;
        });

        // Fix printf format-argument mismatch: remove extra specifiers if no args
        // e.g., printf("%d") -> printf("%d", 0) — adds a default placeholder argument
        const printfFmtMismatchPattern = /\bprintf\s*\(\s*"([^"]*)"\s*\)/g;
        line = line.replace(printfFmtMismatchPattern, (match, formatStr) => {
            const fmtSpecs = formatStr.match(/%(?!%)[diouxXeEfFgGaAcspnld]+/g) || [];
            if (fmtSpecs.length === 0) return match; // No specifiers, just a plain string — fine

            // Generate default arguments for each specifier
            const defaultArgs = fmtSpecs.map(spec => {
                if (spec === '%s') return '""';
                if (spec === '%c') return "'\\0'";
                if (spec === '%f' || spec === '%lf') return '0.0';
                return '0';
            });

            this.stats.conditionsFixed++;
            return `printf("${formatStr}", ${defaultArgs.join(', ')}) /* TODO: replace placeholder args */`;
        });

        // Fix printf with more specifiers than arguments: add placeholder args
        const printfPartialPattern = /\bprintf\s*\(\s*"([^"]*)"\s*,\s*([^)]+)\)/g;
        line = line.replace(printfPartialPattern, (match, formatStr, argsStr) => {
            const fmtSpecs = formatStr.match(/%(?!%)[diouxXeEfFgGaAcspnld]+/g) || [];
            const argList = argsStr.split(',').map(a => a.trim()).filter(a => a.length > 0);

            if (fmtSpecs.length <= argList.length) return match; // Enough args already

            // Add placeholder args for missing ones
            const extraArgs = [];
            for (let i = argList.length; i < fmtSpecs.length; i++) {
                const spec = fmtSpecs[i];
                if (spec === '%s') extraArgs.push('""');
                else if (spec === '%c') extraArgs.push("'\\0'");
                else if (spec === '%f' || spec === '%lf') extraArgs.push('0.0');
                else extraArgs.push('0');
            }

            this.stats.conditionsFixed++;
            const allArgs = [...argList, ...extraArgs].join(', ');
            return `printf("${formatStr}", ${allArgs}) /* TODO: replace placeholder args */`;
        });

        return line;
    }

    // Phase 7: Code Generation - Format Code
    formatCode(code) {
        const lines = code.split('\n');
        let indentLevel = 0;
        const indentStr = '    ';
        let formattedLines = [];
        let lastLineWasEmpty = false;

        for (let i = 0; i < lines.length; i++) {
            let trimmed = lines[i].trim();

            // Skip multiple consecutive empty lines
            if (trimmed === '') {
                if (!lastLineWasEmpty && formattedLines.length > 0) {
                    formattedLines.push('');
                    lastLineWasEmpty = true;
                }
                continue;
            }
            lastLineWasEmpty = false;

            // Count braces to adjust indent
            let openBraces = (trimmed.match(/\{/g) || []).length;
            let closeBraces = (trimmed.match(/\}/g) || []).length;

            // Decrease indent before closing brace (if line starts with })
            if (trimmed.startsWith('}')) {
                indentLevel = Math.max(0, indentLevel - 1);
            }

            // Separate code and comment
            let code = trimmed;
            let comment = '';
            const commentIdx = trimmed.indexOf('//');
            if (commentIdx !== -1) {
                code = trimmed.substring(0, commentIdx).trim();
                comment = trimmed.substring(commentIdx);
            }

            // Fix spacing in code part only (not in strings or comments)
            if (code && !code.includes('"')) {
                // Add space around binary operators
                code = code.replace(/([a-zA-Z0-9_\)])\s*([+\-*/%])\s*([a-zA-Z0-9_\(])/g, '$1 $2 $3');
                code = code.replace(/([a-zA-Z0-9_\)])\s*([<>=!]=?)\s*([a-zA-Z0-9_\(])/g, '$1 $2 $3');
                code = code.replace(/([a-zA-Z0-9_\)])\s*(&&|\|\|)\s*([a-zA-Z0-9_\(])/g, '$1 $2 $3');

                // Fix assignment operator
                code = code.replace(/([a-zA-Z0-9_\]])\s*=\s*([^=])/g, '$1 = $2');

                // Fix comparison operators that got messed up
                code = code.replace(/= =/g, '==');
                code = code.replace(/! =/g, '!=');
                code = code.replace(/< =/g, '<=');
                code = code.replace(/> =/g, '>=');

                // Fix increment/decrement
                code = code.replace(/\+ \+/g, '++');
                code = code.replace(/- -/g, '--');

                // Fix compound assignment
                code = code.replace(/\+ =/g, '+=');
                code = code.replace(/- =/g, '-=');
                code = code.replace(/\* =/g, '*=');
                code = code.replace(/\/ =/g, '/=');
            }

            // Fix comma spacing
            code = code.replace(/\s*,\s*/g, ', ');

            // Remove space before semicolon
            code = code.replace(/\s+;/g, ';');

            // Fix parentheses spacing
            code = code.replace(/\(\s+/g, '(');
            code = code.replace(/\s+\)/g, ')');

            // Fix bracket spacing
            code = code.replace(/\[\s+/g, '[');
            code = code.replace(/\s+\]/g, ']');

            // Remove multiple spaces
            code = code.replace(/\s{2,}/g, ' ');

            // Reconstruct line
            let finalLine = code;
            if (comment) {
                finalLine = code ? code + '  ' + comment : comment;
            }

            // Add the line with proper indentation
            formattedLines.push(indentStr.repeat(indentLevel) + finalLine);

            // Increase indent after opening brace (if line ends with { and doesn't start with })
            if (trimmed.endsWith('{') && !trimmed.startsWith('}')) {
                indentLevel++;
            } else if (openBraces > closeBraces && !trimmed.startsWith('}')) {
                // Handle cases like "} else {"
                indentLevel += (openBraces - closeBraces);
            }
        }

        // Second pass: add blank lines for readability
        let result = [];
        for (let i = 0; i < formattedLines.length; i++) {
            const line = formattedLines[i];
            const nextLine = i + 1 < formattedLines.length ? formattedLines[i + 1] : '';
            const prevLine = i > 0 ? formattedLines[i - 1] : '';

            result.push(line);

            // Add blank line after #include blocks
            if (line.trim().startsWith('#include') && nextLine.trim() && !nextLine.trim().startsWith('#include')) {
                result.push('');
            }

            // Add blank line after closing brace of function (at indent level 0)
            if (line.trim() === '}' && !line.startsWith(' ') && nextLine.trim() && !nextLine.trim().startsWith('#')) {
                result.push('');
            }
        }

        return result.join('\n');
    }
}


// UI Functions

// Analyze Code button
function analyzeCode() {
    const code = document.getElementById('codeInput').value;
    if (!code.trim()) { alert('Please enter some C code to analyze'); return; }

    const analyzer = new CAnalyzer();
    const result = analyzer.analyzeOnly(code);

    displayBugs(result.bugs);
    document.getElementById('refactoredOutput').innerHTML =
        '<span style="color: #808080;">Click "Change Code" to see refactored version...</span>';
}

// Change Code button
function changeCode() {
    const code = document.getElementById('codeInput').value;
    if (!code.trim()) { alert('Please enter some C code to analyze'); return; }

    try {
        const analyzer = new CAnalyzer();
        const result = analyzer.analyzeAndRefactor(code);

        displayBugs(result.bugs);

        if (result.refactoredCode && result.refactoredCode.trim() !== '') {
            document.getElementById('refactoredOutput').textContent = result.refactoredCode;
        } else {
            document.getElementById('refactoredOutput').innerHTML =
                '<span style="color: #ff6b6b;">No refactored code generated. Check console for errors.</span>';
        }
    } catch (error) {
        console.error('Error during refactoring:', error);
        document.getElementById('refactoredOutput').innerHTML =
            '<span style="color: #ff6b6b;">Error: ' + error.message + '</span>';
        alert('Error during refactoring: ' + error.message);
    }
}

// Display bugs in UI
function displayBugs(bugs) {
    const bugReport = document.getElementById('bugReport');
    const summaryBar = document.getElementById('summaryBar');

    if (bugs.length === 0) {
        bugReport.innerHTML = '<div class="no-bugs">✅ No bugs found! Your code looks clean.</div>';
        summaryBar.style.display = 'none';
        return;
    }

    const counts = { critical: 0, error: 0, warning: 0, info: 0 };
    bugs.forEach(bug => counts[bug.severity]++);

    summaryBar.style.display = 'flex';
    summaryBar.innerHTML = `
        <div class="summary-item"><span class="summary-count" style="color: #f44336;">${counts.critical}</span> Critical</div>
        <div class="summary-item"><span class="summary-count" style="color: #e91e63;">${counts.error}</span> Errors</div>
        <div class="summary-item"><span class="summary-count" style="color: #ff9800;">${counts.warning}</span> Warnings</div>
        <div class="summary-item"><span class="summary-count" style="color: #2196f3;">${counts.info}</span> Info</div>
        <div class="summary-item" style="margin-left: auto;">Total: <span class="summary-count">${bugs.length}</span></div>
    `;

    bugReport.innerHTML = bugs.map(bug => `
        <div class="bug-item">
            <span class="severity-badge severity-${bug.severity}">${bug.severity}</span>
            <div class="bug-details">
                <div class="bug-message">${bug.message}</div>
                <div class="bug-location">Line ${bug.line} • ${bug.type}</div>
                ${bug.suggestion ? `<div class="bug-suggestion">💡 ${bug.suggestion}</div>` : ''}
            </div>
        </div>
    `).join('');
}

// Line numbers
function updateLineNumbers() {
    const textarea = document.getElementById('codeInput');
    const lineNumbers = document.getElementById('lineNumbers');
    const lines = textarea.value.split('\n');

    let numbersHtml = '';
    for (let i = 1; i <= lines.length; i++) {
        numbersHtml += `<span>${i}</span>`;
    }

    lineNumbers.innerHTML = numbersHtml;
}

// Sync scroll
function syncScroll() {
    const textarea = document.getElementById('codeInput');
    const lineNumbers = document.getElementById('lineNumbers');
    lineNumbers.scrollTop = textarea.scrollTop;
}

// Page init
document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('codeInput').value = '';
    updateLineNumbers();
});
