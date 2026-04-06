/*
 * PART 3: LEVENSHTEIN FUZZY MATCHING, SEMANTIC ANALYSIS, CONTROL FLOW & UI
 * 
 * ═══════════════════════════════════════════════════════════════════
 * ALGORITHMS USED IN THIS FILE:
 * ═══════════════════════════════════════════════════════════════════
 * 
 * 1. Damerau-Levenshtein Distance (Dynamic Programming)
 *    - Computes min edits (insert, delete, substitute, transpose)
 *    - Time: O(m*n), Space: O(m*n) where m,n = string lengths
 *    ALTERNATES:
 *    • Standard Levenshtein — no transposition, misses keyboard typos
 *    • Jaro-Winkler Similarity — better for name matching
 *    • Bitap (Shift-Or) — bit-parallel, very fast for fixed k
 *    • BK-Tree — O(log n) lookup for large keyword sets
 *    • N-gram Similarity — fast approximate matching
 * 
 * 2. Fuzzy Token Matching with Adaptive Thresholds
 *    - Short keywords (≤3 chars): max 1 edit
 *    - Longer keywords: max 2 edits, ±2 length filter
 *    ALTERNATES:
 *    • Trie with Error Tolerance — efficient dictionary spell check
 *    • Soundex/Metaphone — phonetic matching
 * 
 * 3. Hash Map Symbol Table (Map) + Two-Pass Function Detection
 *    - O(1) lookup for variables, arrays, functions
 *    ALTERNATES:
 *    • Scoped/Nested Symbol Table — handles variable shadowing
 *    • SSA Form — each variable assigned once, enables optimizations
 *    • Use-Def / Def-Use Chains — precise data flow tracking
 * 
 * 4. Three-Pass Variable Analysis
 *    - Pass 1: declaration scan; Pass 2: usage-before-assignment; Pass 3: unused detection
 *    ALTERNATES:
 *    • Data Flow Analysis (Reaching Definitions) — more precise
 *    • Abstract Interpretation — proves absence of runtime errors
 *    • Symbolic Execution — explores all execution paths
 * 
 * 5. Linear Scan with State Flag (Unreachable Code)
 *    - Sets "after return" flag, resets at closing brace
 *    ALTERNATES:
 *    • Control Flow Graph (CFG) — directed graph of basic blocks
 *    • Dominator Tree (Lengauer-Tarjan) — precise reachability
 * 
 * 6. Pattern-Based Infinite Loop Detection + Loop Body Analysis
 *    - Catches while(1), for(;;), contradictory loops
 *    - Scans body for break/return and variable modification
 *    ALTERNATES:
 *    • Strongly Connected Components (Tarjan) — finds all loops in CFG
 *    • Termination Analysis (Ranking Functions) — proves termination
 *    • Halting Problem (Turing, 1936) — undecidable in general
 * 
 * 7. Format Specifier Parsing (printf/scanf)
 *    - Counts %d, %f, %s etc., compares against argument count
 *    ALTERNATES:
 *    • Type-Checked Format Strings — GCC -Wformat approach
 *    • Taint Analysis — tracks untrusted data flow
 * 
 * 8. Array Bounds Analysis (Constant + Loop-Based)
 *    - Checks constant indices and for-loop bounds vs array size
 *    ALTERNATES:
 *    • Constraint-Based Analysis — SMT solvers verify bounds
 *    • Abstract Interpretation with Interval Domain
 * ═══════════════════════════════════════════════════════════════════
 * 
 * COMPILER PHASES IN THIS FILE:
 * - Phase 1: Lexical Analysis (Damerau-Levenshtein fuzzy matching)
 * - Phase 3: Symbol Table Management
 * - Phase 4: Semantic Analysis
 * - Phase 5: Control Flow Analysis
 */

// ============================================================
// FUZZY MATCHING ENGINE (Damerau-Levenshtein Distance Algorithm)
// ============================================================

CAnalyzer.prototype.damerauLevenshteinDistance = function(str1, str2) {
    const m = str1.length;
    const n = str2.length;
    const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
            dp[i][j] = Math.min(
                dp[i - 1][j] + 1,
                dp[i][j - 1] + 1,
                dp[i - 1][j - 1] + cost
            );
            if (i > 1 && j > 1 &&
                str1[i - 1] === str2[j - 2] &&
                str1[i - 2] === str2[j - 1]) {
                dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + 1);
            }
        }
    }
    return dp[m][n];
};

CAnalyzer.prototype.fuzzyMatchKeyword = function(token) {
    const cKeywords = [
        'int', 'float', 'char', 'double', 'void', 'long', 'short',
        'unsigned', 'signed', 'const', 'static', 'extern', 'struct',
        'enum', 'typedef', 'union', 'volatile', 'register', 'auto',
        'if', 'else', 'while', 'for', 'do', 'switch', 'case',
        'break', 'continue', 'return', 'goto', 'default',
        'sizeof', 'include', 'define', 'main', 'printf', 'scanf',
        'malloc', 'free', 'NULL', 'stdin', 'stdout', 'stderr'
    ];

    const lowerToken = token.toLowerCase();
    if (cKeywords.some(k => k.toLowerCase() === lowerToken)) return null;
    if (token.length < 2 || token.length > 12) return null;

    let bestMatch = null;
    let bestDistance = Infinity;

    for (const keyword of cKeywords) {
        if (Math.abs(token.length - keyword.length) > 2) continue;
        const distance = this.damerauLevenshteinDistance(lowerToken, keyword.toLowerCase());
        const maxAllowed = keyword.length <= 3 ? 1 : 2;
        if (distance > 0 && distance <= maxAllowed && distance < bestDistance) {
            bestDistance = distance;
            bestMatch = keyword;
        }
    }
    return bestMatch ? { match: bestMatch, distance: bestDistance } : null;
};

CAnalyzer.prototype.detectKeywordTypos = function() {
    this.keywordTypoFixes = new Map();
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
        if (trimmed.startsWith('//') || trimmed.startsWith('/*') ||
            trimmed.startsWith('*') || trimmed.startsWith('#')) return;

        const lineWithoutStrings = trimmed.replace(/"[^"]*"/g, '""').replace(/'[^']*'/g, "''");
        const tokens = lineWithoutStrings.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g);
        if (!tokens) return;

        for (const token of tokens) {
            if (ignoreTokens.has(token)) continue;
            if (this.variables.has(token)) continue;
            if (this.functions.has(token)) continue;
            if (this.isStandardFunction(token)) continue;

            const fuzzyResult = this.fuzzyMatchKeyword(token);
            if (fuzzyResult) {
                this.keywordTypoFixes.set(token, fuzzyResult.match);
                this.addBug('KeywordTypo', 'error', idx + 1,
                    `Possible typo: '${token}' — did you mean '${fuzzyResult.match}'? (Damerau-Levenshtein distance: ${fuzzyResult.distance})`,
                    `Replace '${token}' with '${fuzzyResult.match}'`,
                    `'${token}' is not a valid C keyword but is ${fuzzyResult.distance} edit(s) away from '${fuzzyResult.match}'. Using fuzzy matching (Damerau-Levenshtein distance algorithm) to detect likely typos.`
                );
            }
        }
    });
};

CAnalyzer.prototype.fixKeywordTypos = function(line) {
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
};

// ============================================================
// SYMBOL TABLE & SEMANTIC ANALYSIS
// ============================================================

CAnalyzer.prototype.detectFunctions = function() {
    const funcDefPattern = /\b(int|float|char|double|void|long|short)\s+(\w+)\s*\(([^)]*)\)\s*\{?/g;
    const funcCallPattern = /\b(\w+)\s*\(/g;
    const keywords = ['if', 'while', 'for', 'switch', 'return', 'int', 'float', 'char',
        'double', 'void', 'printf', 'scanf', 'sizeof', 'malloc', 'free', 'strlen'];

    this.lines.forEach((line, idx) => {
        funcDefPattern.lastIndex = 0;
        let match;
        while ((match = funcDefPattern.exec(line)) !== null) {
            const funcName = match[2];
            const params = match[3];
            if (!keywords.includes(funcName)) {
                this.functions.set(funcName, {
                    line: idx + 1, returnType: match[1], params: params,
                    hasBody: line.includes('{') || (idx + 1 < this.lines.length && this.lines[idx + 1].trim().startsWith('{'))
                });
            }
        }
    });

    this.lines.forEach((line, idx) => {
        const isFuncDef = /^\s*(int|float|char|double|void|long|short)\s+\w+\s*\([^)]*\)\s*\{?\s*(\/\/.*)?$/.test(line);
        if (isFuncDef) return;
        funcCallPattern.lastIndex = 0;
        let match;
        while ((match = funcCallPattern.exec(line)) !== null) {
            const funcName = match[1];
            if (!keywords.includes(funcName)) this.functionCalls.add(funcName);
        }
    });
};

CAnalyzer.prototype.detectFunctionErrors = function() {
    this.functionCalls.forEach(funcName => {
        if (!this.functions.has(funcName) && !this.isStandardFunction(funcName)) {
            this.undefinedFunctions.add(funcName);
            this.lines.forEach((line, idx) => {
                if (new RegExp(`\\b${funcName}\\s*\\(`).test(line)) {
                    this.addBug('UndefinedFunction', 'error', idx + 1,
                        `Function '${funcName}' is called but not defined`,
                        `Remove the call or define the function '${funcName}'`,
                        `Functions must be defined before they can be called.`);
                }
            });
        }
    });

    this.functions.forEach((info, funcName) => {
        if (!info.hasBody) {
            let hasBodyBelow = false;
            for (let i = info.line; i < Math.min(info.line + 2, this.lines.length); i++) {
                if (this.lines[i] && this.lines[i].includes('{')) { hasBodyBelow = true; break; }
            }
            if (!hasBodyBelow) {
                this.addBug('MissingFunctionBody', 'error', info.line,
                    `Function '${funcName}' is declared but has no body '{}'`,
                    `Add function body with '{' and '}' or add ';' for declaration`,
                    `Functions need a body to be defined.`);
            }
        }
        if (info.params && info.params.trim() !== '' && info.params.trim() !== 'void') {
            const params = info.params.split(',');
            params.forEach((param) => {
                const trimmedParam = param.trim();
                // Valid C parameter forms:
                // int x, float *y, char str[], const int n, unsigned int count,
                // int arr[], void *ptr, long long n, struct Foo *p, ...
                const validParam =
                    trimmedParam === '...' ||
                    trimmedParam === 'void' ||
                    trimmedParam === '' ||
                    // type [* or **] [name] [[]]
                    /^(const\s+|unsigned\s+|signed\s+|long\s+|short\s+)*(int|float|char|double|void|long|short|size_t|FILE)\s*\*{0,2}\s*\w*\s*(\[\s*\d*\s*\])?$/.test(trimmedParam) ||
                    // struct/union/enum type
                    /^(struct|union|enum)\s+\w+\s*\*{0,2}\s*\w*$/.test(trimmedParam);
                if (trimmedParam && !validParam) {
                    this.addBug('InvalidParameter', 'error', info.line,
                        `Invalid parameter '${trimmedParam}' in function '${funcName}'`,
                        `Parameters should be: type name (e.g., 'int x', 'char *str', 'int arr[]')`,
                        `Function parameters need both type and name.`);
                }
            });
        }
    });
};

CAnalyzer.prototype.isStandardFunction = function(name) {
    const standardFuncs = ['printf', 'scanf', 'malloc', 'free', 'strlen', 'strcpy', 'strcmp',
        'fopen', 'fclose', 'fread', 'fwrite', 'fprintf', 'fscanf',
        'getchar', 'putchar', 'gets', 'puts', 'exit', 'abs', 'sqrt',
        'pow', 'sin', 'cos', 'tan', 'log', 'exp', 'rand', 'srand', 'time',
        'memset', 'memcpy', 'memmove', 'atoi', 'atof', 'sizeof'];
    return standardFuncs.includes(name);
};

CAnalyzer.prototype.detectMissingReturn = function() {
    this.functions.forEach((info, funcName) => {
        if (info.returnType !== 'void' && funcName !== 'main') {
            let inFunction = false, braceCount = 0, hasReturn = false, functionEndLine = info.line;
            for (let i = info.line - 1; i < this.lines.length; i++) {
                const line = this.lines[i];
                if (line.includes('{')) { if (!inFunction) inFunction = true; braceCount++; }
                if (line.includes('}')) { braceCount--; if (braceCount === 0 && inFunction) { functionEndLine = i + 1; break; } }
                if (inFunction && /\breturn\b/.test(line)) hasReturn = true;
            }
            if (!hasReturn && inFunction) {
                this.addBug('MissingReturn', 'warning', functionEndLine,
                    `Function '${funcName}' has return type '${info.returnType}' but may not return a value`,
                    `Add 'return value;' before the closing '}'`,
                    `Non-void functions should return a value.`);
            }
        }
    });
};

CAnalyzer.prototype.detectUnusedFunctions = function() {
    const unusedFuncs = [];
    this.functions.forEach((info, funcName) => {
        if (funcName !== 'main' && !this.functionCalls.has(funcName)) {
            unusedFuncs.push(funcName);
            this.unusedFunctions.add(funcName);
            this.addBug('UnusedFunction', 'warning', info.line,
                `Function '${funcName}' is defined but never called`,
                `Add '${funcName}();' in main() or remove the function`,
                `Unused functions increase code size without providing value.`);
        }
    });
    if (unusedFuncs.length > 0) {
        this.addBug('UncalledFunctionsSummary', 'info', 1,
            `Uncalled functions: ${unusedFuncs.join(', ')}`,
            `Consider calling these functions in main() or remove them if not needed`,
            `These functions are defined but never used in the program.`);
    }
};

CAnalyzer.prototype.detectAssignmentInCondition = function() {
    const conditionPatterns = [/if\s*\(\s*([^)]+)\s*\)/g, /while\s*\(\s*([^)]+)\s*\)/g, /for\s*\([^;]*;\s*([^;]+)\s*;/g];
    this.lines.forEach((line, idx) => {
        for (const pattern of conditionPatterns) {
            pattern.lastIndex = 0;
            let match;
            while ((match = pattern.exec(line)) !== null) {
                const condition = match[1];
                if (/[^=!<>]=[^=]/.test(condition) && !/==|!=|<=|>=/.test(condition)) {
                    this.addBug('AssignmentInCondition', 'warning', idx + 1,
                        `Assignment '=' used instead of comparison '==' in condition`,
                        `Change '=' to '==' for comparison`,
                        `Using '=' performs assignment, not comparison.`);
                }
            }
        }
    });
};

CAnalyzer.prototype.detectVariableIssues = function() {
    const declPattern = /\b(int|float|char|double|long|short)\s+(\w+)\s*(=\s*[^;,]+)?[;,]/g;
    const declared = new Map();

    this.lines.forEach((line, idx) => {
        declPattern.lastIndex = 0;
        let match;
        while ((match = declPattern.exec(line)) !== null) {
            const varType = match[1], varName = match[2], hasInit = match[3] !== undefined;
            const keywords = ['int', 'float', 'char', 'double', 'void', 'if', 'while', 'for', 'return', 'main'];
            if (!keywords.includes(varName)) {
                declared.set(varName, { line: idx + 1, type: varType, initialized: hasInit });
                this.variables.set(varName, { type: varType, line: idx + 1 });
            }
        }
    });

    declared.forEach((info, varName) => {
        if (info.initialized) return;
        let isInitialized = false, usedBeforeInit = false, useLine = -1;
        for (let i = info.line; i < this.lines.length; i++) {
            const line = this.lines[i];
            const isAssignment = new RegExp(`(^|[;{}\\s])\\s*${varName}\\s*=[^=]`).test(line);
            const isUsed = new RegExp(`\\b${varName}\\b`).test(line);
            if (isAssignment) {
                const afterEquals = line.split('=')[1] || '';
                if (new RegExp(`\\b${varName}\\b`).test(afterEquals) && !isInitialized) {
                    usedBeforeInit = true; useLine = i + 1;
                }
                isInitialized = true;
            } else if (isUsed && !isInitialized) {
                usedBeforeInit = true; useLine = i + 1; break;
            }
        }
        if (usedBeforeInit && useLine !== -1) {
            this.uninitializedVariables.set(varName, { declLine: info.line, useLine: useLine, type: info.type });
            this.addBug('UninitializedVariable', 'error', useLine,
                `Variable '${varName}' is used without being initialized`,
                `Initialize '${varName}' to 0 at declaration (line ${info.line})`,
                `Using uninitialized variables causes undefined behavior - contains garbage value.`);
        }
    });

    declared.forEach((info, varName) => {
        let count = 0;
        this.lines.forEach(line => {
            const lineWithoutComment = line.replace(/\/\/.*$/, '').replace(/\/\*.*?\*\//g, '');
            const matches = lineWithoutComment.match(new RegExp(`\\b${varName}\\b`, 'g'));
            if (matches) count += matches.length;
        });
        if (count <= 1) {
            this.unusedVariables.add(varName);
            this.addBug('UnusedVariable', 'warning', info.line,
                `Variable '${varName}' is declared but never used`,
                `Remove the unused variable or use it`,
                `Unused variables waste memory.`);
        }
    });
};

// ============================================================
// CONTROL FLOW ANALYSIS
// ============================================================

CAnalyzer.prototype.detectUnreachableCode = function() {
    let afterReturn = false;
    let braceDepth = 0;
    this.lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (trimmed.includes('{')) braceDepth++;
        if (trimmed.includes('}')) { braceDepth--; afterReturn = false; }
        if (afterReturn && trimmed.length > 0 && trimmed !== '}' &&
            !trimmed.startsWith('//') && !trimmed.startsWith('/*')) {
            this.addBug('UnreachableCode', 'warning', idx + 1,
                `Unreachable code after return statement`,
                `Remove the unreachable code`,
                `Code after return will never execute.`);
            afterReturn = false;
        }
        if (/\breturn\b.*;/.test(trimmed)) afterReturn = true;
    });
};

CAnalyzer.prototype.detectInfiniteLoops = function() {
    this.lines.forEach((line, idx) => {
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

        if (/for\s*\(\s*;\s*;\s*\)/.test(line)) {
            this.addBug('InfiniteLoop', 'warning', idx + 1,
                `Infinite loop detected (for(;;))`,
                `Add loop conditions or remove the loop`,
                `Infinite loops can hang the program.`);
        }

        const forLoopMatch = line.match(/for\s*\(\s*(?:int\s+)?(\w+)\s*=\s*(\d+)\s*;\s*(\w+)\s*(>=|>|<=|<)\s*(-?\d+)\s*;\s*(\w+)(\+\+|--|\s*\+=\s*\d+|\s*-=\s*\d+)/);
        if (forLoopMatch) {
            const [, initVar, initVal, condVar, condOp, condVal, incrVar, incrOp] = forLoopMatch;
            const initNum = parseInt(initVal), condNum = parseInt(condVal);
            if (initVar === condVar && condVar === incrVar) {
                let isInfinite = false, reason = '';
                if ((condOp === '>=' || condOp === '>') && (incrOp === '++' || incrOp.includes('+='))) {
                    if (initNum >= condNum) { isInfinite = true; reason = `'${initVar}' starts at ${initNum}, condition '${initVar} ${condOp} ${condNum}' is always true while incrementing`; }
                }
                if ((condOp === '<=' || condOp === '<') && (incrOp === '--' || incrOp.includes('-='))) {
                    if (initNum <= condNum) { isInfinite = true; reason = `'${initVar}' starts at ${initNum}, condition '${initVar} ${condOp} ${condNum}' while decrementing never terminates`; }
                }
                if (isInfinite) {
                    this.addBug('InfiniteLoop', 'warning', idx + 1,
                        `Infinite loop detected: ${reason}`,
                        `Fix the loop condition or change the increment/decrement`,
                        `The loop condition will never become false.`);
                }
            }
        }

        const whileVarMatch = line.match(/while\s*\(\s*(\w+)\s*\)/);
        if (whileVarMatch) {
            const loopVar = whileVarMatch[1];
            if (/^\d+$/.test(loopVar)) return;
            let hasDecrement = false, hasBreak = false, onlyIncrement = false;
            for (let i = idx + 1; i < Math.min(idx + 30, this.lines.length); i++) {
                const bodyLine = this.lines[i];
                if (/\bbreak\b|\breturn\b/.test(bodyLine)) { hasBreak = true; break; }
                if (new RegExp(`${loopVar}\\s*--`).test(bodyLine) || new RegExp(`--\\s*${loopVar}`).test(bodyLine) ||
                    new RegExp(`${loopVar}\\s*=\\s*0\\s*;`).test(bodyLine) || new RegExp(`${loopVar}\\s*=\\s*false\\s*;`).test(bodyLine) ||
                    new RegExp(`${loopVar}\\s*-=`).test(bodyLine)) { hasDecrement = true; }
                if (new RegExp(`${loopVar}\\s*\\+\\+`).test(bodyLine) || new RegExp(`\\+\\+\\s*${loopVar}`).test(bodyLine) ||
                    new RegExp(`${loopVar}\\s*\\+=`).test(bodyLine) || new RegExp(`${loopVar}\\s*=\\s*${loopVar}\\s*\\+`).test(bodyLine)) { onlyIncrement = true; }
                if (/^\s*}\s*$/.test(bodyLine)) break;
            }
            if (onlyIncrement && !hasDecrement && !hasBreak) {
                this.addBug('InfiniteLoop', 'warning', idx + 1,
                    `Potential infinite loop: '${loopVar}' only increases, never becomes 0/false`,
                    `Add a decrement, break condition, or change the loop logic`,
                    `while(x) loops exit when x becomes 0/false. Incrementing moves away from termination.`);
            }
        }

        const whileCompMatch = line.match(/while\s*\(\s*(\w+)\s*(<=?|>=?|==|!=)\s*\d+\s*\)/);
        if (whileCompMatch) {
            const loopVar = whileCompMatch[1];
            let varModified = false, hasBreak = false;
            for (let i = idx + 1; i < Math.min(idx + 30, this.lines.length); i++) {
                const bodyLine = this.lines[i];
                if (/\bbreak\b|\breturn\b/.test(bodyLine)) { hasBreak = true; break; }
                if (new RegExp(`${loopVar}\\s*\\+\\+`).test(bodyLine) || new RegExp(`\\+\\+\\s*${loopVar}`).test(bodyLine) ||
                    new RegExp(`${loopVar}\\s*--`).test(bodyLine) || new RegExp(`--\\s*${loopVar}`).test(bodyLine) ||
                    new RegExp(`${loopVar}\\s*\\+=`).test(bodyLine) || new RegExp(`${loopVar}\\s*-=`).test(bodyLine) ||
                    new RegExp(`${loopVar}\\s*=`).test(bodyLine)) { varModified = true; }
                if (/^\s*}\s*$/.test(bodyLine)) break;
            }
            if (!varModified && !hasBreak) {
                this.addBug('InfiniteLoop', 'warning', idx + 1,
                    `Infinite loop: '${loopVar}' is never modified inside the loop`,
                    `Add '${loopVar}++' or '${loopVar}--' inside the loop body`,
                    `Loop variable must change for the condition to eventually become false.`);
            }
        }
    });
};

CAnalyzer.prototype.detectEmptyBodies = function() {
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

    for (let idx = 0; idx < this.lines.length; idx++) {
        const rawLine = this.lines[idx].trim();
        const line = rawLine.replace(/\/\/.*$/, '').trim();
        const nextRawLine = idx + 1 < this.lines.length ? this.lines[idx + 1].trim() : '';
        const nextLine = nextRawLine.replace(/\/\/.*$/, '').trim();
        const lineAfterNextRaw = idx + 2 < this.lines.length ? this.lines[idx + 2].trim() : '';
        const lineAfterNext = lineAfterNextRaw.replace(/\/\/.*$/, '').trim();

        if (/^(if\s*\([^)]+\)|else\s*if\s*\([^)]+\)|else|while\s*\([^)]+\)|for\s*\([^)]+\))\s*\{?$/.test(line)) {
            if (line.endsWith('{') && nextLine === '}') {
                const type = line.startsWith('if') ? 'if' : line.startsWith('else if') ? 'else if' :
                    line.startsWith('else') ? 'else' : line.startsWith('while') ? 'while' : 'for';
                this.addBug('EmptyBody', 'warning', idx + 1,
                    `Empty ${type} block detected (body has no statements)`,
                    `Add code to the body or remove the block`,
                    `Empty control structures are usually unintentional.`);
            } else if (!line.endsWith('{') && nextLine === '{' && lineAfterNext === '}') {
                const type = line.startsWith('if') ? 'if' : line.startsWith('else if') ? 'else if' :
                    line.startsWith('else') ? 'else' : line.startsWith('while') ? 'while' : 'for';
                this.addBug('EmptyBody', 'warning', idx + 1,
                    `Empty ${type} block detected (body has no statements)`,
                    `Add code to the body or remove the block`,
                    `Empty control structures are usually unintentional.`);
            }
        }
    }

    this.functions.forEach((info, funcName) => {
        const startLine = info.line - 1;
        let braceCount = 0, foundOpen = false, bodyLines = 0;
        for (let i = startLine; i < this.lines.length; i++) {
            const line = this.lines[i];
            if (line.includes('{')) { foundOpen = true; braceCount++; }
            if (line.includes('}')) {
                braceCount--;
                if (braceCount === 0 && foundOpen) {
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
                if (trimmed !== '' && trimmed !== '{' && trimmed !== '}' && !trimmed.startsWith('//')) bodyLines++;
            }
        }
    });
};

// ============================================================
// PRINTF/SCANF & ARRAY BOUNDS
// ============================================================

CAnalyzer.prototype.detectPrintfScanfErrors = function() {
    this.lines.forEach((line, idx) => {
        const printfPattern = /\bprintf\s*\(\s*([^")][ ^,)]*)\s*\)/g;
        let match;
        printfPattern.lastIndex = 0;
        while ((match = printfPattern.exec(line)) !== null) {
            const arg = match[1].trim();
            if (arg && !arg.startsWith('"') && !arg.startsWith("'") && !/^[A-Z_]+$/.test(arg)) {
                let formatSpec = '%d';
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

        const printfFmtPattern = /\bprintf\s*\(\s*"([^"]*)"\s*(?:,\s*([^)]*))?\s*\)/g;
        printfFmtPattern.lastIndex = 0;
        while ((match = printfFmtPattern.exec(line)) !== null) {
            const formatStr = match[1];
            const argsStr = match[2] || '';
            const fmtSpecs = formatStr.match(/%(?!%)[diouxXeEfFgGaAcspnld]+/g) || [];
            const specCount = fmtSpecs.length;
            const argList = argsStr.trim() === '' ? [] : argsStr.split(',').map(a => a.trim()).filter(a => a.length > 0);
            const argCount = argList.length;

            if (specCount > 0 && argCount === 0) {
                this.addBug('PrintfArgMismatch', 'error', idx + 1,
                    `printf() has ${specCount} format specifier(s) (${fmtSpecs.join(', ')}) but no arguments provided`,
                    `Add the missing argument(s): printf("${formatStr}", ${fmtSpecs.map((s, i) => `var${i + 1}`).join(', ')});`,
                    `Each format specifier like %d or %f must have a matching argument. Missing arguments cause undefined behavior.`);
            } else if (specCount > argCount && argCount > 0) {
                this.addBug('PrintfArgMismatch', 'error', idx + 1,
                    `printf() has ${specCount} format specifier(s) but only ${argCount} argument(s)`,
                    `Add ${specCount - argCount} more argument(s) or remove extra format specifiers`,
                    `Each format specifier must have a matching argument. Missing arguments cause undefined behavior.`);
            } else if (argCount > specCount && specCount > 0) {
                this.addBug('PrintfArgMismatch', 'warning', idx + 1,
                    `printf() has ${specCount} format specifier(s) but ${argCount} argument(s) — ${argCount - specCount} extra argument(s) will be ignored`,
                    `Remove extra arguments or add format specifiers for them`,
                    `Extra arguments beyond the format specifiers are silently ignored.`);
            }
        }

        const scanfFmtPattern = /\bscanf\s*\(\s*"([^"]*)"\s*(?:,\s*([^)]*))?\s*\)/g;
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

            for (let i = 0; i < Math.min(specCount, argCount); i++) {
                const arg = argList[i];
                const spec = fmtSpecs[i];
                if (spec !== '%s' && arg && !arg.startsWith('&') && /^[a-zA-Z_]\w*$/.test(arg)) {
                    this.addBug('InvalidScanf', 'error', idx + 1,
                        `scanf() requires address of variable, missing '&' before '${arg}'`,
                        `Use scanf("${formatStr}", &${arg}); instead of scanf("${formatStr}", ${arg});`,
                        `scanf needs memory address (pointer) to store input value.`);
                }
            }
        }
    });
};

CAnalyzer.prototype.detectArrayOutOfBounds = function() {
    const arrayDeclPattern = /\b(int|float|char|double|long|short)\s+(\w+)\s*\[\s*(\d+)\s*\]/g;
    this.lines.forEach((line, idx) => {
        arrayDeclPattern.lastIndex = 0;
        let match;
        while ((match = arrayDeclPattern.exec(line)) !== null) {
            this.arrays.set(match[2], { type: match[1], size: parseInt(match[3], 10), line: idx + 1 });
        }
    });

    const accessPattern = /(\w+)\s*\[\s*(\d+)\s*\]/g;
    this.lines.forEach((line, idx) => {
        if (/\b(int|float|char|double|long|short)\s+\w+\s*\[/.test(line)) return;
        accessPattern.lastIndex = 0;
        let match;
        while ((match = accessPattern.exec(line)) !== null) {
            const arrayName = match[1], accessIndex = parseInt(match[2], 10);
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

    const forLoopPattern = /for\s*\(\s*(?:int\s+)?(\w+)\s*=\s*(\d+)\s*;\s*\1\s*(<|<=|>|>=)\s*(\d+|\w+)\s*;/g;
    this.lines.forEach((line, idx) => {
        forLoopPattern.lastIndex = 0;
        let match;
        while ((match = forLoopPattern.exec(line)) !== null) {
            const loopVar = match[1], startVal = parseInt(match[2], 10), operator = match[3], limitStr = match[4];
            const limitVal = parseInt(limitStr, 10);
            if (isNaN(limitVal)) continue;
            let maxIndex;
            if (operator === '<') maxIndex = limitVal - 1;
            else if (operator === '<=') maxIndex = limitVal;
            else if (operator === '>') maxIndex = startVal;
            else if (operator === '>=') maxIndex = startVal;

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
};

// ============================================================
// ADVANCED ANALYSIS: Memory Leak Detection
// ============================================================

CAnalyzer.prototype.detectMemoryLeaks = function() {
    const mallocs = [];
    const frees = new Set();
    const fopens = [];
    const fcloses = new Set();

    this.lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('/*')) return;

        // malloc/calloc/realloc detection
        const mallocMatch = trimmed.match(/(\w+)\s*=\s*(?:\([^)]*\)\s*)?(malloc|calloc|realloc)\s*\(/);
        if (mallocMatch) {
            mallocs.push({ varName: mallocMatch[1], line: idx + 1, type: mallocMatch[2] });
        }

        // free detection
        const freeMatch = trimmed.match(/\bfree\s*\(\s*(\w+)\s*\)/);
        if (freeMatch) {
            frees.add(freeMatch[1]);
        }

        // fopen detection
        const fopenMatch = trimmed.match(/(\w+)\s*=\s*fopen\s*\(/);
        if (fopenMatch) {
            fopens.push({ varName: fopenMatch[1], line: idx + 1 });
        }

        // fclose detection
        const fcloseMatch = trimmed.match(/\bfclose\s*\(\s*(\w+)\s*\)/);
        if (fcloseMatch) {
            fcloses.add(fcloseMatch[1]);
        }
    });

    // Check for malloc without free
    mallocs.forEach(m => {
        if (!frees.has(m.varName)) {
            this.addBug('MemoryLeak', 'critical', m.line,
                `Memory allocated with ${m.type}() for '${m.varName}' is never freed`,
                `Add free(${m.varName}); before the function returns`,
                `Not freeing dynamically allocated memory causes memory leaks.`);
        }
    });

    // Check for fopen without fclose
    fopens.forEach(f => {
        if (!fcloses.has(f.varName)) {
            this.addBug('ResourceLeak', 'critical', f.line,
                `File opened with fopen() for '${f.varName}' is never closed`,
                `Add fclose(${f.varName}); when done with the file`,
                `Not closing file handles causes resource leaks and data corruption.`);
        }
    });

    // Check for double free
    const freeLines = [];
    this.lines.forEach((line, idx) => {
        const freeMatch = line.match(/\bfree\s*\(\s*(\w+)\s*\)/);
        if (freeMatch) {
            freeLines.push({ varName: freeMatch[1], line: idx + 1 });
        }
    });
    const freeCounts = {};
    freeLines.forEach(f => {
        freeCounts[f.varName] = (freeCounts[f.varName] || 0) + 1;
        if (freeCounts[f.varName] > 1) {
            this.addBug('DoubleFree', 'critical', f.line,
                `Double free detected: '${f.varName}' is freed more than once`,
                `Remove the duplicate free(${f.varName}); call`,
                `Freeing memory twice causes undefined behavior and crashes.`);
        }
    });
};

// ============================================================
// ADVANCED ANALYSIS: Code Smell Detection
// ============================================================

CAnalyzer.prototype.detectCodeSmells = function() {
    // 1. Deep nesting detection (>3 levels)
    let maxNesting = 0;
    let currentNesting = 0;
    this.lines.forEach((line, idx) => {
        const opens = (line.match(/{/g) || []).length;
        const closes = (line.match(/}/g) || []).length;
        currentNesting += opens - closes;
        if (currentNesting > maxNesting) maxNesting = currentNesting;
        if (currentNesting > 4) {
            this.addBug('DeepNesting', 'warning', idx + 1,
                `Deep nesting detected (${currentNesting} levels) — consider refactoring`,
                `Extract the inner block into a separate function`,
                `Deeply nested code is hard to read and maintain. Keep nesting ≤ 3 levels.`);
        }
    });

    // 2. Long function detection (>50 lines)
    this.functions.forEach((info, funcName) => {
        let braceCount = 0, started = false, lineCount = 0;
        for (let i = info.line - 1; i < this.lines.length; i++) {
            const line = this.lines[i];
            if (line.includes('{')) { started = true; braceCount++; }
            if (line.includes('}')) { braceCount--; if (braceCount === 0 && started) break; }
            if (started) lineCount++;
        }
        if (lineCount > 50) {
            this.addBug('LongFunction', 'warning', info.line,
                `Function '${funcName}' is ${lineCount} lines long (recommended: ≤ 50)`,
                `Break '${funcName}' into smaller helper functions`,
                `Long functions are harder to test, debug, and maintain.`);
        }
    });

    // 3. Magic number detection
    this.lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('#')) return;
        // Skip array declarations, loop inits, return 0/1, and common constants
        if (/\[\s*\d+\s*\]/.test(trimmed)) return;
        const magicMatch = trimmed.match(/[=<>!+\-*/]\s*(\d{2,})/g);
        if (magicMatch) {
            magicMatch.forEach(m => {
                const num = m.match(/(\d{2,})/)[1];
                const n = parseInt(num);
                if (n > 1 && n !== 10 && n !== 100 && n !== 1000 && n !== 255 && n !== 256) {
                    this.addBug('MagicNumber', 'info', idx + 1,
                        `Magic number '${num}' detected — consider using a named constant`,
                        `Use #define or const: const int VALUE = ${num};`,
                        `Named constants make code more readable and easier to change.`);
                }
            });
        }
    });
};

// ============================================================
// ADVANCED ANALYSIS: Basic Pointer Analysis
// ============================================================

CAnalyzer.prototype.detectPointerIssues = function() {
    const pointers = new Map();
    const freedPointers = new Set();

    this.lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('//')) return;

        // Detect pointer declarations
        const ptrDeclMatch = trimmed.match(/\b(int|float|char|double|void)\s*\*\s*(\w+)/);
        if (ptrDeclMatch) {
            const ptrName = ptrDeclMatch[2];
            const isInit = /=\s*.+/.test(trimmed);
            pointers.set(ptrName, { line: idx + 1, initialized: isInit, freed: false });
        }

        // Detect NULL pointer dereference
        const nullAssign = trimmed.match(/(\w+)\s*=\s*NULL\s*;/);
        if (nullAssign) {
            const ptrName = nullAssign[1];
            // Check next few lines for dereference
            for (let j = idx + 1; j < Math.min(idx + 10, this.lines.length); j++) {
                const nextLine = this.lines[j].trim();
                if (new RegExp(`\\*\\s*${ptrName}\\b`).test(nextLine) ||
                    new RegExp(`${ptrName}\\s*->`).test(nextLine) ||
                    new RegExp(`${ptrName}\\s*\\[`).test(nextLine)) {
                    // Check if reassigned before use
                    let reassigned = false;
                    for (let k = idx + 1; k < j; k++) {
                        if (new RegExp(`${ptrName}\\s*=`).test(this.lines[k]) &&
                            !/=\s*NULL/.test(this.lines[k])) {
                            reassigned = true; break;
                        }
                    }
                    if (!reassigned) {
                        this.addBug('NullPointerDeref', 'critical', j + 1,
                            `Potential NULL pointer dereference of '${ptrName}'`,
                            `Check if '${ptrName}' is NULL before using it: if (${ptrName} != NULL)`,
                            `Dereferencing a NULL pointer causes a segmentation fault.`);
                    }
                    break;
                }
            }
        }

        // Detect use after free
        const freeMatch = trimmed.match(/\bfree\s*\(\s*(\w+)\s*\)/);
        if (freeMatch) {
            freedPointers.add(freeMatch[1]);
            const ptrName = freeMatch[1];
            for (let j = idx + 1; j < Math.min(idx + 15, this.lines.length); j++) {
                const nextLine = this.lines[j].trim();
                if (new RegExp(`\\b${ptrName}\\s*=`).test(nextLine) && !/=\s*NULL/.test(nextLine)) break;
                if (new RegExp(`\\b${ptrName}\\s*=\\s*NULL`).test(nextLine)) break;
                if (new RegExp(`\\*\\s*${ptrName}\\b`).test(nextLine) ||
                    new RegExp(`${ptrName}\\s*->`).test(nextLine) ||
                    new RegExp(`${ptrName}\\s*\\[`).test(nextLine) ||
                    new RegExp(`printf.*${ptrName}`).test(nextLine)) {
                    this.addBug('UseAfterFree', 'critical', j + 1,
                        `Use after free: '${ptrName}' is used after being freed`,
                        `Set '${ptrName} = NULL;' after free and check before use`,
                        `Using freed memory causes undefined behavior.`);
                    break;
                }
            }
        }
    });
};

// ============================================================
// ADVANCED ANALYSIS: Basic Type Checking
// ============================================================

CAnalyzer.prototype.detectTypeIssues = function() {
    const varTypes = new Map();

    // Collect variable types
    this.lines.forEach((line) => {
        const declMatch = line.match(/\b(int|float|char|double|long|short)\s+(\w+)/g);
        if (declMatch) {
            declMatch.forEach(d => {
                const parts = d.match(/\b(int|float|char|double|long|short)\s+(\w+)/);
                if (parts) varTypes.set(parts[2], parts[1]);
            });
        }
    });

    this.lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('#')) return;

        // Detect float/double assigned to int (truncation)
        const assignMatch = trimmed.match(/(\w+)\s*=\s*(\w+)\s*;/);
        if (assignMatch) {
            const lhs = assignMatch[1], rhs = assignMatch[2];
            const lhsType = varTypes.get(lhs);
            const rhsType = varTypes.get(rhs);
            if (lhsType === 'int' && (rhsType === 'float' || rhsType === 'double')) {
                this.addBug('TypeTruncation', 'warning', idx + 1,
                    `Implicit conversion: assigning '${rhsType} ${rhs}' to 'int ${lhs}' truncates decimal part`,
                    `Use explicit cast: ${lhs} = (int)${rhs};`,
                    `Assigning float/double to int silently loses the fractional part.`);
            }
            if (lhsType === 'char' && (rhsType === 'int' || rhsType === 'float' || rhsType === 'double')) {
                this.addBug('TypeOverflow', 'warning', idx + 1,
                    `Implicit conversion: assigning '${rhsType} ${rhs}' to 'char ${lhs}' may overflow`,
                    `Ensure '${rhs}' fits in char range (0-127 / -128 to 127)`,
                    `char is only 1 byte — larger values will wrap around.`);
            }
        }

        // Detect integer division that may lose precision
        const divMatch = trimmed.match(/\b(float|double)\s+(\w+)\s*=\s*(\w+)\s*\/\s*(\w+)\s*;/);
        if (divMatch) {
            const rhsVar1 = divMatch[3], rhsVar2 = divMatch[4];
            const type1 = varTypes.get(rhsVar1), type2 = varTypes.get(rhsVar2);
            if (type1 === 'int' && type2 === 'int') {
                this.addBug('IntegerDivision', 'warning', idx + 1,
                    `Integer division: '${rhsVar1} / ${rhsVar2}' will truncate before assigning to ${divMatch[1]}`,
                    `Cast one operand: (${divMatch[1]})${rhsVar1} / ${rhsVar2}`,
                    `Dividing two ints produces an int, losing the decimal part even when stored in float/double.`);
            }
        }
    });
};

// ============================================================
// ADVANCED ANALYSIS: Buffer Overflow Detection
// ============================================================

CAnalyzer.prototype.detectBufferOverflow = function() {
    const unsafeFuncs = {
        'gets': { safe: 'fgets(buffer, sizeof(buffer), stdin)', reason: 'gets() has no bounds checking — can write past buffer end' },
        'strcpy': { safe: 'strncpy(dest, src, sizeof(dest)-1)', reason: 'strcpy() copies until \\0 with no size limit' },
        'strcat': { safe: 'strncat(dest, src, sizeof(dest)-strlen(dest)-1)', reason: 'strcat() appends without checking remaining space' },
        'sprintf': { safe: 'snprintf(buf, sizeof(buf), fmt, ...)', reason: 'sprintf() writes without bounds checking' },
        'scanf': null // handled separately for %s without width
    };

    this.lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('/*')) return;

        for (const [func, info] of Object.entries(unsafeFuncs)) {
            if (!info) continue;
            const regex = new RegExp(`\\b${func}\\s*\\(`);
            if (regex.test(trimmed)) {
                this.addBug('BufferOverflow', 'critical', idx + 1,
                    `Unsafe function '${func}()' — vulnerable to buffer overflow`,
                    `Use safer alternative: ${info.safe}`,
                    `${info.reason}. This is a common source of security vulnerabilities.`);
            }
        }

        // scanf %s without width specifier
        const scanfStrMatch = trimmed.match(/\bscanf\s*\(\s*"([^"]*)"/);
        if (scanfStrMatch) {
            const fmt = scanfStrMatch[1];
            if (/%s/.test(fmt) && !/%\d+s/.test(fmt)) {
                this.addBug('BufferOverflow', 'critical', idx + 1,
                    `scanf() with '%s' has no width limit — vulnerable to buffer overflow`,
                    `Use width specifier: scanf("%99s", buf) for a 100-byte buffer`,
                    `%s reads until whitespace with no size limit, overflowing the buffer.`);
            }
        }
    });
};

// ============================================================
// ADVANCED ANALYSIS: Format String Vulnerability
// ============================================================

CAnalyzer.prototype.detectFormatStringVuln = function() {
    this.lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('//')) return;

        // printf(variable) without format string — security vulnerability
        const printfMatch = trimmed.match(/\bprintf\s*\(\s*(\w+)\s*\)/);
        if (printfMatch) {
            const arg = printfMatch[1];
            if (arg !== 'NULL' && !/^"/.test(arg)) {
                this.addBug('FormatStringVuln', 'critical', idx + 1,
                    `Format string vulnerability: printf(${arg}) — user input could contain %x, %n`,
                    `Use printf("%s", ${arg}) instead of printf(${arg})`,
                    `If '${arg}' contains format specifiers like %x or %n, an attacker can read/write memory. This is a serious security flaw.`);
            }
        }

        // fprintf(file, variable)
        const fprintfMatch = trimmed.match(/\bfprintf\s*\(\s*\w+\s*,\s*(\w+)\s*\)/);
        if (fprintfMatch) {
            const arg = fprintfMatch[1];
            if (arg !== 'NULL') {
                this.addBug('FormatStringVuln', 'critical', idx + 1,
                    `Format string vulnerability: fprintf with variable '${arg}' as format string`,
                    `Use fprintf(file, "%s", ${arg}) instead`,
                    `Passing user-controlled data as a format string enables format string attacks.`);
            }
        }
    });
};

// ============================================================
// ADVANCED ANALYSIS: Stack Allocation Warning
// ============================================================

CAnalyzer.prototype.detectLargeStackAlloc = function() {
    this.lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('//')) return;

        const arrayMatch = trimmed.match(/\b(int|float|char|double|long|short)\s+(\w+)\s*\[\s*(\d+)\s*\]/);
        if (arrayMatch) {
            const type = arrayMatch[1];
            const name = arrayMatch[2];
            const size = parseInt(arrayMatch[3]);
            const typeSize = { int: 4, float: 4, char: 1, double: 8, long: 8, short: 2 };
            const bytes = size * (typeSize[type] || 4);
            if (bytes > 8192) { // > 8KB
                this.addBug('LargeStackAlloc', 'warning', idx + 1,
                    `Large stack allocation: '${name}[${size}]' uses ~${(bytes / 1024).toFixed(1)}KB on the stack`,
                    `Use dynamic allocation: ${type} *${name} = malloc(${size} * sizeof(${type}));`,
                    `Default stack size is typically 1-8MB. Large local arrays risk stack overflow.`);
            }
        }
    });
};

// ============================================================
// ADVANCED ANALYSIS: Per-Function Complexity Threshold
// ============================================================

CAnalyzer.prototype.detectHighComplexity = function() {
    this.functions.forEach((info, funcName) => {
        let braceCount = 0, started = false;
        let complexity = 1; // base complexity

        for (let i = info.line - 1; i < this.lines.length; i++) {
            const line = this.lines[i];
            if (line.includes('{')) { started = true; braceCount++; }
            if (line.includes('}')) { braceCount--; if (braceCount === 0 && started) break; }
            if (!started) continue;

            // Count decision points
            if (/\bif\s*\(/.test(line)) complexity++;
            if (/\belse\s+if\s*\(/.test(line)) complexity++;
            if (/\bwhile\s*\(/.test(line)) complexity++;
            if (/\bfor\s*\(/.test(line)) complexity++;
            if (/\bcase\b/.test(line)) complexity++;
            if (/&&|\|\|/.test(line)) complexity++;
            if (/\?.*:/.test(line)) complexity++; // ternary
        }

        if (complexity > 10) {
            this.addBug('HighComplexity', 'warning', info.line,
                `Function '${funcName}' has cyclomatic complexity of ${complexity} (threshold: 10)`,
                `Break '${funcName}' into smaller functions to reduce complexity`,
                `High cyclomatic complexity makes code harder to test. Each decision path needs its own test case.`);
        }
    });
};

// ============================================================
// ADVANCED ANALYSIS: Naming Convention Checker
// ============================================================

CAnalyzer.prototype.detectNamingIssues = function() {
    const singleLetterExceptions = new Set(['i', 'j', 'k', 'n', 'x', 'y', 'c']);
    const forLoopVars = new Set();

    // Collect for-loop variables
    this.lines.forEach(line => {
        const forMatch = line.match(/for\s*\(\s*(?:int\s+)?(\w)\s*=/);
        if (forMatch) forLoopVars.add(forMatch[1]);
    });

    // Check variable declarations
    const declPattern = /\b(int|float|char|double|long|short)\s+([a-zA-Z])\s*[;=,]/g;
    this.lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('#')) return;
        // Skip for-loop init
        if (/^\s*for\s*\(/.test(trimmed)) return;

        declPattern.lastIndex = 0;
        let match;
        while ((match = declPattern.exec(trimmed)) !== null) {
            const varName = match[2];
            if (!forLoopVars.has(varName) && !singleLetterExceptions.has(varName)) {
                this.addBug('NamingConvention', 'info', idx + 1,
                    `Single-letter variable '${varName}' — use a descriptive name`,
                    `Rename '${varName}' to something meaningful (e.g., count, index, value)`,
                    `Single-letter names reduce readability. Only loop variables (i, j, k) are acceptable.`);
            }
        }
    });
};

// ============================================================
// UI FUNCTIONS (Standalone)
// ============================================================

function analyzeCode() {
    const code = document.getElementById('codeInput').value;
    if (!code.trim()) return;
    const analyzer = new CAnalyzer();
    const result = analyzer.analyzeOnly(code);
    displayBugs(result.bugs);
    updateMetrics(code, result.bugs);
}

function changeCode() {
    const code = document.getElementById('codeInput').value;
    if (!code.trim()) { showToast('⚠️ Please enter some C code first'); return; }
    try {
        const analyzer = new CAnalyzer();
        const result = analyzer.analyzeAndRefactor(code);
        displayBugs(result.bugs);
        updateMetrics(code, result.bugs);
        window._originalCode = code;
        window._refactoredCode = result.refactoredCode;
        window._showDiff = false;
        document.getElementById('diffToggle').classList.remove('active');
        // Populate split view
        document.getElementById('originalOutput').textContent = code;
        if (result.refactoredCode && result.refactoredCode.trim() !== '') {
            document.getElementById('refactoredOutput').textContent = result.refactoredCode;
            showToast('✨ Code refactored successfully!');
        } else {
            document.getElementById('refactoredOutput').innerHTML =
                '<span style="color: var(--accent-red);">No refactored code generated. Check console for errors.</span>';
        }
    } catch (error) {
        console.error('Error during refactoring:', error);
        document.getElementById('refactoredOutput').innerHTML =
            '<span style="color: var(--accent-red);">Error: ' + error.message + '</span>';
    }
}

// ============================================================
// BUG DISPLAY with click-to-highlight
// ============================================================

function displayBugs(bugs) {
    const bugReport = document.getElementById('bugReport');
    const summaryBar = document.getElementById('summaryBar');
    const filterBar = document.getElementById('filterBar');
    if (bugs.length === 0) {
        bugReport.innerHTML = '<div class="no-bugs">✅ No bugs found! Your code looks clean.</div>';
        summaryBar.style.display = 'none';
        filterBar.style.display = 'none';
        return;
    }
    const counts = { critical: 0, error: 0, warning: 0, info: 0 };
    bugs.forEach(bug => counts[bug.severity]++);
    summaryBar.style.display = 'flex';
    filterBar.style.display = 'flex';
    summaryBar.innerHTML = `
        <div class="summary-item"><span class="summary-count" style="color: var(--severity-critical);">${counts.critical}</span> Critical</div>
        <div class="summary-item"><span class="summary-count" style="color: var(--severity-error);">${counts.error}</span> Errors</div>
        <div class="summary-item"><span class="summary-count" style="color: var(--severity-warning);">${counts.warning}</span> Warnings</div>
        <div class="summary-item"><span class="summary-count" style="color: var(--severity-info);">${counts.info}</span> Info</div>
        <div class="summary-item" style="margin-left: auto;">Total: <span class="summary-count">${bugs.length}</span></div>
    `;
    bugReport.innerHTML = bugs.map((bug, i) => `
        <div class="bug-item" data-severity="${bug.severity}" onclick="highlightLine(${bug.line})" style="animation-delay: ${i * 0.04}s" title="Click to highlight line ${bug.line}">
            <span class="severity-badge severity-${bug.severity}">${bug.severity}</span>
            <div class="bug-details">
                <div class="bug-message">${bug.message}</div>
                <div class="bug-location">Line ${bug.line} • ${bug.type}</div>
                ${bug.suggestion ? `<div class="bug-suggestion">💡 ${bug.suggestion}</div>` : ''}
                ${bug.explanation ? `<div class="bug-explanation">📖 ${bug.explanation}</div>` : ''}
            </div>
        </div>
    `).join('');
    // Reset filter to 'all'
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.filter-btn[data-severity="all"]').classList.add('active');
}

// ============================================================
// LINE HIGHLIGHTING (click bug → highlight line)
// ============================================================

function highlightLine(lineNum) {
    const textarea = document.getElementById('codeInput');
    const lines = textarea.value.split('\n');
    if (lineNum < 1 || lineNum > lines.length) return;

    // Scroll textarea to the line
    const lineHeight = 20.8; // ~13px font * 1.6 line-height
    textarea.scrollTop = (lineNum - 1) * lineHeight - textarea.clientHeight / 3;

    // Highlight line number
    const lineNumbers = document.getElementById('lineNumbers');
    const spans = lineNumbers.querySelectorAll('span');
    spans.forEach(s => s.classList.remove('highlighted'));
    if (spans[lineNum - 1]) {
        spans[lineNum - 1].classList.add('highlighted');
        setTimeout(() => spans[lineNum - 1].classList.remove('highlighted'), 3000);
    }

    // Select the line in textarea
    let charStart = 0;
    for (let i = 0; i < lineNum - 1; i++) charStart += lines[i].length + 1;
    const charEnd = charStart + lines[lineNum - 1].length;
    textarea.focus();
    textarea.setSelectionRange(charStart, charEnd);
}

// ============================================================
// SYNTAX HIGHLIGHTING
// ============================================================

function updateSyntaxHighlight() {
    const code = document.getElementById('codeInput').value;
    const overlay = document.getElementById('highlightOverlay');
    if (!code.trim()) { overlay.innerHTML = ''; return; }

    let html = escapeHtml(code);

    // Order matters: comments first, then strings, then others
    // Comments (single-line)
    html = html.replace(/(\/\/[^\n]*)/g, '<span class="hl-comment">$1</span>');
    // Comments (multi-line — simplified)
    html = html.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="hl-comment">$1</span>');
    // Preprocessor
    html = html.replace(/(#\s*(?:include|define|ifdef|ifndef|endif|if|else|elif|pragma|undef)[^\n]*)/g, '<span class="hl-preprocessor">$1</span>');
    // Strings
    html = html.replace(/(&quot;[^&]*?&quot;)/g, '<span class="hl-string">$1</span>');
    // Numbers
    html = html.replace(/\b(\d+\.?\d*)\b/g, '<span class="hl-number">$1</span>');
    // Keywords
    html = html.replace(/\b(if|else|while|for|do|switch|case|break|continue|return|goto|default|sizeof|typedef|struct|enum|union)\b/g, '<span class="hl-keyword">$1</span>');
    // Types
    html = html.replace(/\b(int|float|char|double|void|long|short|unsigned|signed|const|static|extern|volatile|register|auto|FILE)\b/g, '<span class="hl-type">$1</span>');
    // Common functions
    html = html.replace(/\b(printf|scanf|malloc|calloc|realloc|free|fopen|fclose|fread|fwrite|fprintf|fscanf|strlen|strcpy|strcmp|memset|memcpy|puts|gets|getchar|putchar|exit|atoi|atof)\b/g, '<span class="hl-function">$1</span>');
    // NULL, true, false
    html = html.replace(/\b(NULL|true|false|EOF|stdin|stdout|stderr)\b/g, '<span class="hl-keyword">$1</span>');

    overlay.innerHTML = html;
}

function escapeHtml(text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ============================================================
// CODE METRICS
// ============================================================

function updateMetrics(code, bugs) {
    const lines = code.split('\n');
    const loc = lines.filter(l => l.trim() !== '' && !l.trim().startsWith('//')).length;
    const funcCount = (code.match(/\b(int|float|char|double|void|long|short)\s+\w+\s*\([^)]*\)\s*\{?/g) || []).length;
    const varCount = (code.match(/\b(int|float|char|double|long|short)\s+\w+\s*(=|;|,)/g) || []).length;
    const includeCount = (code.match(/#\s*include/g) || []).length;

    // Cyclomatic complexity: count decision points
    // &&/|| are weighted as 0.5 (they add paths but less than full branches)
    const ifCount = (code.match(/\bif\s*\(/g) || []).length;
    const whileCount = (code.match(/\bwhile\s*\(/g) || []).length;
    const forCount = (code.match(/\bfor\s*\(/g) || []).length;
    const caseCount = (code.match(/\bcase\b/g) || []).length;
    const andOr = (code.match(/&&|\|\|/g) || []).length;
    const complexity = 1 + ifCount + whileCount + forCount + caseCount + Math.ceil(andOr * 0.5);

    document.getElementById('metricLOC').textContent = loc;
    document.getElementById('metricFunctions').textContent = funcCount;
    document.getElementById('metricVariables').textContent = varCount;
    document.getElementById('metricIncludes').textContent = includeCount;
    document.getElementById('metricComplexity').textContent = complexity;
    document.getElementById('metricBugs').textContent = bugs ? bugs.length : 0;
}

// ============================================================
// DIFF VIEW
// ============================================================

function toggleDiffView() {
    if (!window._originalCode || !window._refactoredCode) {
        showToast('⚠️ Run "Change Code" first to see diff');
        return;
    }
    window._showDiff = !window._showDiff;
    const btn = document.getElementById('diffToggle');
    btn.classList.toggle('active', window._showDiff);

    const output = document.getElementById('refactoredOutput');
    if (window._showDiff) {
        output.innerHTML = generateDiff(window._originalCode, window._refactoredCode);
    } else {
        output.textContent = window._refactoredCode;
    }
}

function generateDiff(original, refactored) {
    const origLines = original.split('\n');
    const refLines = refactored.split('\n');
    const maxLen = Math.max(origLines.length, refLines.length);
    let html = '';

    for (let i = 0; i < maxLen; i++) {
        const orig = origLines[i] || '';
        const ref = refLines[i] || '';
        if (orig === ref) {
            html += `<span class="diff-line unchanged">${escapeHtml(ref)}</span>\n`;
        } else {
            if (orig.trim()) html += `<span class="diff-line removed">${escapeHtml(orig)}</span>\n`;
            if (ref.trim()) html += `<span class="diff-line added">${escapeHtml(ref)}</span>\n`;
        }
    }
    return html;
}

// ============================================================
// COPY TO CLIPBOARD
// ============================================================

function copyRefactored() {
    const output = document.getElementById('refactoredOutput');
    const text = output.textContent;
    if (!text || text.includes('Click "Change Code"')) {
        showToast('⚠️ Nothing to copy yet'); return;
    }
    navigator.clipboard.writeText(text).then(() => {
        showToast('📋 Copied to clipboard!');
    }).catch(() => {
        // Fallback
        const ta = document.createElement('textarea');
        ta.value = text; document.body.appendChild(ta);
        ta.select(); document.execCommand('copy');
        document.body.removeChild(ta);
        showToast('📋 Copied to clipboard!');
    });
}

// ============================================================
// EXPORT REPORT
// ============================================================

function exportReport() {
    const code = document.getElementById('codeInput').value;
    if (!code.trim()) { showToast('⚠️ No code to analyze'); return; }

    const analyzer = new CAnalyzer();
    const result = analyzer.analyzeOnly(code);
    const bugs = result.bugs;

    const counts = { critical: 0, error: 0, warning: 0, info: 0 };
    bugs.forEach(b => counts[b.severity]++);

    const now = new Date().toLocaleString();
    let html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<title>C Code Analysis Report</title>
<style>
body { font-family: 'Segoe UI', sans-serif; max-width: 900px; margin: 40px auto; padding: 0 20px; background: #0d1117; color: #e6edf3; }
h1 { color: #58a6ff; border-bottom: 1px solid #30363d; padding-bottom: 10px; }
h2 { color: #8b949e; margin-top: 30px; }
.meta { color: #8b949e; font-size: 14px; }
.summary { display: flex; gap: 20px; margin: 20px 0; }
.summary-card { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 12px 20px; text-align: center; }
.summary-card .num { font-size: 24px; font-weight: 700; }
.critical .num { color: #f85149; } .error .num { color: #f778ba; }
.warning .num { color: #d29922; } .info .num { color: #58a6ff; }
pre { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 16px; overflow-x: auto; font-size: 13px; }
.bug { padding: 10px 16px; border-bottom: 1px solid #21262d; }
.badge { padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; text-transform: uppercase; color: white; }
.badge-critical { background: #f85149; } .badge-error { background: #f778ba; }
.badge-warning { background: #d29922; } .badge-info { background: #58a6ff; }
.suggestion { color: #56d4dd; font-size: 12px; margin-top: 4px; }
.location { color: #6e7681; font-size: 12px; }
</style></head><body>
<h1>🔍 C Code Analysis Report</h1>
<p class="meta">Generated: ${now}</p>
<div class="summary">
<div class="summary-card critical"><div class="num">${counts.critical}</div>Critical</div>
<div class="summary-card error"><div class="num">${counts.error}</div>Errors</div>
<div class="summary-card warning"><div class="num">${counts.warning}</div>Warnings</div>
<div class="summary-card info"><div class="num">${counts.info}</div>Info</div>
</div>
<h2>Source Code</h2>
<pre>${escapeHtml(code)}</pre>
<h2>Issues Found (${bugs.length})</h2>
${bugs.length === 0 ? '<p style="color:#3fb950;">✅ No issues found!</p>' :
bugs.map(b => `<div class="bug">
<span class="badge badge-${b.severity}">${b.severity}</span>
<strong> ${b.message}</strong>
<div class="location">Line ${b.line} • ${b.type}</div>
${b.suggestion ? `<div class="suggestion">💡 ${b.suggestion}</div>` : ''}
</div>`).join('')}
</body></html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'c-code-analysis-report.html';
    a.click(); URL.revokeObjectURL(url);
    showToast('📄 Report exported!');
}

// ============================================================
// SEVERITY FILTER
// ============================================================

function filterBugs(severity) {
    const items = document.querySelectorAll('.bug-item');
    items.forEach(item => {
        if (severity === 'all') {
            item.classList.remove('hidden');
        } else {
            item.classList.toggle('hidden', item.dataset.severity !== severity);
        }
    });
    // Update active button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.severity === severity);
    });
}

// ============================================================
// LEARNING MODE
// ============================================================

function toggleLearningMode() {
    document.body.classList.toggle('learning-mode');
    const btn = document.getElementById('learnToggle');
    const isActive = document.body.classList.contains('learning-mode');
    btn.classList.toggle('active', isActive);
    showToast(isActive ? '📚 Learning mode ON — explanations visible' : '📚 Learning mode OFF');
}

// ============================================================
// THEME TOGGLE
// ============================================================

function toggleTheme() {
    const html = document.documentElement;
    const current = html.getAttribute('data-theme');
    html.setAttribute('data-theme', current === 'dark' ? 'light' : 'dark');
    localStorage.setItem('theme', html.getAttribute('data-theme'));
}

// ============================================================
// TOAST NOTIFICATION
// ============================================================

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(window._toastTimer);
    window._toastTimer = setTimeout(() => toast.classList.remove('show'), 2500);
}

// ============================================================
// LINE NUMBERS & SCROLL SYNC
// ============================================================

function updateLineNumbers() {
    const textarea = document.getElementById('codeInput');
    const lineNumbers = document.getElementById('lineNumbers');
    const lines = textarea.value.split('\n');
    let numbersHtml = '';
    for (let i = 1; i <= lines.length; i++) { numbersHtml += `<span>${i}</span>`; }
    lineNumbers.innerHTML = numbersHtml;
}

function syncScroll() {
    const textarea = document.getElementById('codeInput');
    const lineNumbers = document.getElementById('lineNumbers');
    const overlay = document.getElementById('highlightOverlay');
    lineNumbers.scrollTop = textarea.scrollTop;
    overlay.scrollTop = textarea.scrollTop;
}

// ============================================================
// REAL-TIME ANALYSIS (Debounced)
// ============================================================

let _analyzeTimer = null;

function debouncedAnalyze() {
    clearTimeout(_analyzeTimer);
    const code = document.getElementById('codeInput').value;
    if (!code.trim()) {
        document.getElementById('bugReport').innerHTML =
            '<span style="color: var(--text-muted);">Start typing C code to see bug analysis...</span>';
        document.getElementById('summaryBar').style.display = 'none';
        updateMetrics('', []);
        return;
    }
    _analyzeTimer = setTimeout(function() {
        analyzeCode();
    }, 400);
}

// ============================================================
// INIT
// ============================================================

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('codeInput').value = '';
    updateLineNumbers();
    updateSyntaxHighlight();
    updateMetrics('', []);

    // Restore theme preference
    const saved = localStorage.getItem('theme');
    if (saved) document.documentElement.setAttribute('data-theme', saved);

    // Tab key support: insert 4 spaces instead of moving focus
    document.getElementById('codeInput').addEventListener('keydown', function(e) {
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = this.selectionStart;
            const end = this.selectionEnd;
            const TAB = '    '; // 4 spaces
            if (start === end) {
                // No selection — just insert tab at cursor
                this.value = this.value.substring(0, start) + TAB + this.value.substring(end);
                this.selectionStart = this.selectionEnd = start + TAB.length;
            } else {
                // Selection — indent each selected line
                const before = this.value.substring(0, start);
                const selected = this.value.substring(start, end);
                const after = this.value.substring(end);
                const indented = selected.replace(/^/gm, TAB);
                this.value = before + indented + after;
                this.selectionStart = start;
                this.selectionEnd = start + indented.length;
            }
            // Trigger oninput handlers manually
            updateLineNumbers();
            debouncedAnalyze();
            updateSyntaxHighlight();
        }
    });
});


