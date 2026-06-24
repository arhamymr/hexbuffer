use regex::Regex;
use std::fs;
use std::path::{Path, PathBuf};

use super::types::Finding;

/// Directories to skip (same as secrets module).
const SKIP_DIRS: &[&str] = &[
    "node_modules", ".git", "target", "dist", "build", "__pycache__",
    ".next", ".nuxt", "vendor", ".cache", ".pnpm-store",
];

/// File extensions we scan for static analysis.
const SCAN_EXTENSIONS: &[&str] = &[
    "js", "jsx", "ts", "tsx", "mjs", "cjs",
    "py", "pyi", "pyx",
    "rs",
    "go",
    "java", "kt", "kts",
    "rb",
    "php", "phtml",
    "cs",
    "swift",
    "c", "cpp", "cc", "cxx", "h", "hpp",
    "sh", "bash", "zsh",
    "yaml", "yml", "toml", "json",
    "html", "htm", "vue", "svelte",
];

/// A static analysis rule definition.
struct StaticRule {
    id: &'static str,
    title: &'static str,
    severity: &'static str,
    category: &'static str,
    /// If true, scan the entire file content (multi-line).
    /// If false, scan line by line.
    multiline: bool,
    /// The regex pattern to match.
    pattern: Regex,
    /// Optional context regex — if present, finding only triggers
    /// when BOTH the main pattern AND the context pattern match
    /// within the same file.
    context_pattern: Option<Regex>,
    /// Human-readable description of why this is dangerous.
    #[allow(dead_code)]
    description: &'static str,
}

fn static_rules() -> Vec<StaticRule> {
    vec![
        // ── Dangerous function calls ──
        StaticRule {
            id: "unsafe-eval",
            title: "Use of eval() with dynamic input",
            severity: "high",
            category: "code_execution",
            multiline: false,
            pattern: Regex::new(r"\beval\s*\(.*(?:req\.|request\.|input|param|query|body|user|get|post|cookie|header)").unwrap(),
            context_pattern: None,
            description: "eval() with user-controlled input allows arbitrary code execution. Replace with JSON.parse() for data or a safe expression evaluator.",
        },
        StaticRule {
            id: "unsafe-function-constructor",
            title: "Dynamic function constructor (potential code injection)",
            severity: "high",
            category: "code_execution",
            multiline: false,
            pattern: Regex::new(r"new\s+Function\s*\(.*(?:req\.|request\.|input|param|query|body|user)").unwrap(),
            context_pattern: None,
            description: "The Function constructor evaluates strings as code. With user input, this is equivalent to eval(). Avoid entirely.",
        },
        StaticRule {
            id: "unsafe-inner-html",
            title: "innerHTML assignment with untrusted data (XSS)",
            severity: "high",
            category: "xss",
            multiline: false,
            pattern: Regex::new(r"\.innerHTML\s*=\s*[^\x27\x22;]").unwrap(),
            context_pattern: None,
            description: "Assigning untrusted data to innerHTML enables DOM-based XSS. Use textContent or createElement with safe property assignment.",
        },
        StaticRule {
            id: "unsafe-document-write",
            title: "document.write() with dynamic content",
            severity: "medium",
            category: "xss",
            multiline: false,
            pattern: Regex::new(r"document\.write\s*\(.*(?:req\.|request\.|input|param|query|body|user|location\.search|location\.hash|\.value)").unwrap(),
            context_pattern: None,
            description: "document.write() with untrusted input can inject scripts. Avoid document.write() entirely; use DOM manipulation APIs.",
        },
        StaticRule {
            id: "unsafe-set-timeout-string",
            title: "setTimeout/setInterval with string argument",
            severity: "medium",
            category: "code_execution",
            multiline: false,
            pattern: Regex::new(r"(?:setTimeout|setInterval)\s*\(\s*[\x22\x27]").unwrap(),
            context_pattern: None,
            description: "Passing a string to setTimeout/setInterval is equivalent to eval(). Always pass a function reference instead.",
        },

        // ── SQL Injection patterns ──
        StaticRule {
            id: "sql-string-concatenation",
            title: "SQL query built via string concatenation (SQL injection)",
            severity: "high",
            category: "sql_injection",
            multiline: true,
            pattern: Regex::new(r#"(?i)(?:SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\s+.*\+(?:\s*\w+\s*\+|\s*req\.|request\.|input|param|query|body|user|\.value|\.get\()"#).unwrap(),
            context_pattern: None,
            description: "Building SQL queries by concatenating user input enables SQL injection. Use parameterized queries or an ORM with safe query builders.",
        },
        StaticRule {
            id: "sql-fstring-interpolation",
            title: "SQL query built via f-string/template literal (SQL injection)",
            severity: "high",
            category: "sql_injection",
            multiline: true,
            pattern: Regex::new(r#"(?i)(?:execute|cursor\.execute|\.query|\.raw)\s*\(\s*(?:f['\"]|`).*(?:\{|%s|%\(|:param).*(?:SELECT|INSERT|UPDATE|DELETE)"#).unwrap(),
            context_pattern: None,
            description: "Using f-strings or template literals with SQL queries and user variables enables SQL injection. Use parameterized queries: cursor.execute('SELECT * FROM users WHERE id = ?', (user_id,)).",
        },
        StaticRule {
            id: "sql-raw-query",
            title: "Raw SQL query without parameterization",
            severity: "medium",
            category: "sql_injection",
            multiline: false,
            pattern: Regex::new(r#"(?i)(?:\.raw\s*\(|\.execute\s*\(\s*['\"]\s*(?:SELECT|INSERT|UPDATE|DELETE)|query\s*\(\s*['\"]\s*(?:SELECT|INSERT|UPDATE|DELETE))"#).unwrap(),
            context_pattern: None,
            description: "Raw SQL queries should use parameterization. Review whether user input reaches this query.",
        },

        // ── Command injection ──
        StaticRule {
            id: "command-injection-exec",
            title: "Shell command execution with user input",
            severity: "critical",
            category: "command_injection",
            multiline: false,
            pattern: Regex::new(r"(?i)(?:exec\s*\(|system\s*\(|popen\s*\(|subprocess\.(?:call|run|Popen)\s*\(|os\.system\s*\(|child_process\.exec\s*\(|shell_exec\s*\()").unwrap(),
            context_pattern: Some(Regex::new(r"(?i)(?:req\.|request\.|input|param|query|body|user|argv\[|get|post|cookie)").unwrap()),
            description: "Executing shell commands with untrusted input allows command injection. Use library APIs instead of shell, or use execFile with static argument arrays. Never pass user input to a shell.",
        },
        StaticRule {
            id: "command-injection-backtick",
            title: "Backtick command execution with interpolation",
            severity: "high",
            category: "command_injection",
            multiline: false,
            pattern: Regex::new(r"`[^`]*\$").unwrap(),
            context_pattern: Some(Regex::new(r"(?i)(req\.|request\.|input|param|query|body|user)").unwrap()),
            description: "Backtick command execution with variable interpolation can lead to command injection. Use process.execFile() or avoid shell execution.",
        },

        // ── Path Traversal ──
        StaticRule {
            id: "path-traversal-concatenation",
            title: "File path built with user input (path traversal)",
            severity: "high",
            category: "path_traversal",
            multiline: true,
            pattern: Regex::new(r"(?i)(?:readFile|readFileSync|open|createReadStream|createWriteStream|writeFile|fs\.\w+)\s*\(.*(?:req\.|request\.|input|param|query|body|user|\.value|\.get\(|\.file)").unwrap(),
            context_pattern: None,
            description: "Building file paths with user input enables path traversal attacks. Validate and sanitize paths, use path.resolve() and verify the result is within the allowed directory.",
        },

        // ── CORS / Security headers ──
        StaticRule {
            id: "cors-wildcard-origin",
            title: "CORS configured with wildcard origin",
            severity: "medium",
            category: "misconfiguration",
            multiline: false,
            pattern: Regex::new(r#"(?i)Access-Control-Allow-Origin\s*:\s*\*"#).unwrap(),
            context_pattern: None,
            description: "CORS wildcard origin (*) allows any website to make authenticated requests. Restrict to specific trusted origins.",
        },
        StaticRule {
            id: "cors-credentials-wildcard",
            title: "CORS credentials enabled with wildcard origin",
            severity: "high",
            category: "misconfiguration",
            multiline: true,
            pattern: Regex::new(r#"(?i)Access-Control-Allow-Credentials\s*:\s*true"#).unwrap(),
            context_pattern: Some(Regex::new(r#"(?i)Access-Control-Allow-Origin\s*:\s*\*"#).unwrap()),
            description: "Setting Access-Control-Allow-Credentials: true with a wildcard origin is a security violation. Browsers will reject this, but if somehow bypassed, it enables credential theft.",
        },

        // ── Cookie security ──
        StaticRule {
            id: "cookie-missing-httponly",
            title: "Cookie set without HttpOnly flag",
            severity: "low",
            category: "cookie_security",
            multiline: false,
            pattern: Regex::new(r"(?i)(?:Set-Cookie|res\.cookie|cookies\.set|response\.set_cookie)\s*\(").unwrap(),
            context_pattern: None,
            description: "Cookie set detected — verify HttpOnly flag is present for session/auth cookies. Cookies without HttpOnly are accessible to JavaScript, enabling theft via XSS.",
        },
        StaticRule {
            id: "cookie-missing-secure",
            title: "Cookie set without Secure flag",
            severity: "medium",
            category: "cookie_security",
            multiline: false,
            pattern: Regex::new(r"(?i)(?:Set-Cookie|res\.cookie|cookies\.set|response\.set_cookie)\s*\(").unwrap(),
            context_pattern: None,
            description: "Cookie set detected — verify Secure flag is present. Cookies without Secure can be transmitted over HTTP. Only disable for localhost development.",
        },
        StaticRule {
            id: "cookie-missing-samesite",
            title: "Cookie set without SameSite attribute",
            severity: "low",
            category: "cookie_security",
            multiline: false,
            pattern: Regex::new(r"(?i)(?:Set-Cookie|res\.cookie|cookies\.set|response\.set_cookie)\s*\(").unwrap(),
            context_pattern: None,
            description: "Cookie set detected — verify SameSite attribute is set (Lax or Strict). Cookies without SameSite are vulnerable to CSRF attacks.",
        },

        // ── Hardcoded secrets in configs ──
        StaticRule {
            id: "hardcoded-jwt-secret",
            title: "Hardcoded JWT secret",
            severity: "critical",
            category: "hardcoded_secret",
            multiline: false,
            pattern: Regex::new(r#"(?i)(?:jwt[_-]?secret|jwt[_-]?key|token[_-]?secret|signing[_-]?key)\s*[:=]\s*["'][A-Za-z0-9_-]{16,}["']"#).unwrap(),
            context_pattern: None,
            description: "A hardcoded JWT signing secret allows anyone who can read the source code to forge valid tokens. Generate secrets at runtime from environment variables.",
        },
        StaticRule {
            id: "hardcoded-encryption-key",
            title: "Hardcoded encryption key or IV",
            severity: "critical",
            category: "cryptographic_failure",
            multiline: false,
            pattern: Regex::new(r#"(?i)(?:encrypt(?:ion)?[_-]?key|aes[_-]?key|iv|initialization[_-]?vector|cipher[_-]?key)\s*[:=]\s*["'][A-Za-z0-9+/=]{16,}["']"#).unwrap(),
            context_pattern: None,
            description: "Hardcoded encryption keys undermine all cryptography. Keys must be generated securely and stored in environment variables or a key management service.",
        },

        // ── Insecure randomness ──
        StaticRule {
            id: "insecure-random",
            title: "Use of Math.random() for security purposes",
            severity: "medium",
            category: "cryptographic_failure",
            multiline: false,
            pattern: Regex::new(r"Math\.random\s*\(\s*\)").unwrap(),
            context_pattern: Some(Regex::new(r"(?i)(token|password|secret|key|hash|auth|session|csrf|crypto)").unwrap()),
            description: "Math.random() is not cryptographically secure. Use crypto.randomBytes() or crypto.getRandomValues() for security-sensitive values.",
        },

        // ── SSRF ──
        StaticRule {
            id: "ssrf-request-user-url",
            title: "HTTP request to user-controlled URL (SSRF)",
            severity: "high",
            category: "ssrf",
            multiline: false,
            pattern: Regex::new(r"(?i)(?:fetch|axios|request|http\.get|http\.request|urllib|requests\.get|reqwest::get)\s*\([^)]*(?:req\.|request\.|input|param|query|body|user|\.value|\.url)").unwrap(),
            context_pattern: None,
            description: "Making HTTP requests to user-controlled URLs enables Server-Side Request Forgery (SSRF). Validate URLs against a whitelist, block internal IPs, and restrict protocols to http/https.",
        },

        // ── Open Redirect ──
        StaticRule {
            id: "open-redirect",
            title: "Redirect to user-controlled URL (Open Redirect)",
            severity: "medium",
            category: "open_redirect",
            multiline: false,
            pattern: Regex::new(r"(?i)(?:res\.redirect|redirect|Location|window\.location)\s*\(?\s*(?:req\.|request\.|input|param|query|\.get\()").unwrap(),
            context_pattern: None,
            description: "Redirecting to a user-controlled URL enables phishing attacks. Validate redirect targets against a whitelist of allowed domains, or use relative paths only.",
        },

        // ── XXE ──
        StaticRule {
            id: "xxe-parse-xml",
            title: "XML parsing without disabling external entities (XXE)",
            severity: "high",
            category: "xxe",
            multiline: false,
            pattern: Regex::new(r"(?i)(?:xml\.dom\.minidom\.parse|etree\.parse|xmltodict\.parse|libxml|xml2js\.parseString|lxml\.etree\.parse)").unwrap(),
            context_pattern: None,
            description: "Default XML parsers may process external entities, enabling XXE attacks. Disable external entity processing: use defusedxml in Python, configure SAXParser securely in Java, or avoid XML.",
        },

        // ── Regex DoS ──
        StaticRule {
            id: "redos-nested-quantifiers",
            title: "Regular expression with nested quantifiers (ReDoS risk)",
            severity: "low",
            category: "redos",
            multiline: false,
            pattern: Regex::new(r"(?:\(.*\+.*\)[\*\+]|\(.*\*.*\)[\*\+]|\(.*\{.*\}.*\)[\*\+])").unwrap(),
            context_pattern: Some(Regex::new(r"(?i)(input|param|query|body|user|req\.|request\.)").unwrap()),
            description: "Nested quantifiers in regex used on user input can cause catastrophic backtracking (ReDoS). Use atomic groups, possessive quantifiers, or set regex timeouts.",
        },

        // ── Prototype pollution (JS-specific) ──
        StaticRule {
            id: "prototype-pollution-merge",
            title: "Recursive object merge vulnerable to prototype pollution",
            severity: "high",
            category: "prototype_pollution",
            multiline: false,
            pattern: Regex::new(r"(?i)(?:Object\.assign|\.\.\.|\.extend|\.merge|\.defaultsDeep)\s*\([^)]*(?:req\.|request\.|input|param|query|body|user)").unwrap(),
            context_pattern: None,
            description: "Recursively merging user-controlled objects can pollute Object.prototype. Sanitize keys, block __proto__ and constructor, or use safe merge libraries (lodash.merge with isMergeableObject check).",
        },

        // ── Missing input validation ──
        StaticRule {
            id: "missing-input-validation-type",
            title: "User input used without type validation",
            severity: "low",
            category: "input_validation",
            multiline: true,
            pattern: Regex::new(r"(?i)(?:req\.(?:body|query|params)\[|request\.(?:form|args|json|data)\[|input\(|\.get\(\s*[\x22\x27]\w+[\x22\x27]\s*\))").unwrap(),
            context_pattern: None,
            description: "User input detected — ensure type coercion and validation are applied before use. Unvalidated input can lead to type confusion, NoSQL injection, or unexpected behavior.",
        },

        // ── Debug/development exposure ──
        StaticRule {
            id: "debug-mode-enabled",
            title: "Debug/development mode enabled in production",
            severity: "medium",
            category: "misconfiguration",
            multiline: false,
            pattern: Regex::new(r"(?i)(?:DEBUG\s*=\s*True|NODE_ENV\s*=\s*[\x22\x27]?development[\x22\x27]?|debug\s*=\s*true|DJANGO_DEBUG\s*=\s*True|FLASK_ENV\s*=\s*[\x22\x27]?development[\x22\x27]?)").unwrap(),
            context_pattern: None,
            description: "Debug mode enabled in production exposes stack traces, environment variables, and internal paths. Always disable debug mode in production environments.",
        },
        StaticRule {
            id: "exposed-stack-trace",
            title: "Error details/serialization sent to client (information disclosure)",
            severity: "medium",
            category: "information_disclosure",
            multiline: false,
            pattern: Regex::new(r"(?i)(?:res\.(?:send|json)\s*\(\s*(?:err|error|e)(?:\.message|\.stack)?|\.serialize\s*\(\s*(?:err|error|e)\))").unwrap(),
            context_pattern: None,
            description: "Sending raw error objects to clients leaks internal implementation details. Log errors server-side, return generic error messages to clients.",
        },

        // ── Race condition / TOCTOU ──
        StaticRule {
            id: "toctou-file-check",
            title: "File existence check before operation (TOCTOU risk)",
            severity: "low",
            category: "race_condition",
            multiline: true,
            pattern: Regex::new(r"(?i)(?:fs\.existsSync|fs\.accessSync|os\.path\.exists|Path\.exists|\.is_file\s*\(\s*\)|\.exists\s*\(\s*\))\s*\n\s*(?:fs\.(?:read|write|unlink|rm|rename|open|create)|open\s*\()").unwrap(),
            context_pattern: None,
            description: "Checking file existence before operating opens a time-of-check-time-of-use (TOCTOU) race condition. Perform the operation directly and handle errors, or use atomic file operations.",
        },
    ]
}

fn should_skip_file(path: &Path) -> bool {
    // Check extension
    if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
        if !SCAN_EXTENSIONS.contains(&ext.to_lowercase().as_str()) {
            return true;
        }
    } else {
        // Skip files without extensions (Makefile, Dockerfile, etc. are OK)
        if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
            let allowed = ["Makefile", "Dockerfile", "Gemfile", "Rakefile", "Procfile"];
            if !allowed.contains(&name) {
                return true;
            }
        } else {
            return true;
        }
    }
    // Skip directories
    if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
        if SKIP_DIRS.contains(&name) {
            return true;
        }
    }
    for ancestor in path.ancestors().skip(1) {
        if let Some(name) = ancestor.file_name().and_then(|n| n.to_str()) {
            if SKIP_DIRS.contains(&name) {
                return true;
            }
        }
    }
    false
}

fn collect_files(root: &Path) -> Vec<PathBuf> {
    let mut files = Vec::new();
    let mut dirs_to_visit = vec![root.to_path_buf()];

    while let Some(dir) = dirs_to_visit.pop() {
        if let Ok(entries) = fs::read_dir(&dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() {
                    if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                        if !SKIP_DIRS.contains(&name) {
                            dirs_to_visit.push(path);
                        }
                    }
                } else if path.is_file() && !should_skip_file(&path) {
                    files.push(path);
                }
            }
        }
    }
    files
}

/// Extract context lines around a match position.
fn extract_snippet(lines: &[&str], line_idx: usize, _match_text: &str) -> String {
    let context_start = line_idx.saturating_sub(1);
    let context_end = (line_idx + 1).min(lines.len().saturating_sub(1));
    lines[context_start..=context_end.min(lines.len().saturating_sub(1))]
        .iter()
        .copied()
        .collect::<Vec<_>>()
        .join("\n")
}

/// Scan a single file with static analysis rules.
fn scan_file(file_path: &Path, root: &Path, rules: &[StaticRule]) -> Vec<Finding> {
    let content = match fs::read_to_string(file_path) {
        Ok(c) => c,
        Err(_) => return Vec::new(),
    };

    let relative_path = file_path
        .strip_prefix(root)
        .unwrap_or(file_path)
        .to_string_lossy()
        .to_string();

    let mut findings = Vec::new();

    for rule in rules {
        if rule.multiline {
            // Full file scan
            for mat in rule.pattern.find_iter(&content) {
                let match_text = mat.as_str().to_string();

                // Check context pattern if present
                if let Some(ref ctx_pat) = rule.context_pattern {
                    if !ctx_pat.is_match(&content) {
                        continue;
                    }
                }

                // Find line number
                let prefix = &content[..mat.start()];
                let line = prefix.lines().count() as u32;

                let lines: Vec<&str> = content.lines().collect();
                let snippet = extract_snippet(&lines, (line as usize).saturating_sub(1), &match_text);

                let id = format!("SA-{:04}", findings.len() + 1);
                findings.push(Finding {
                    id,
                    category: rule.category.to_string(),
                    severity: rule.severity.to_string(),
                    title: rule.title.to_string(),
                    file_path: relative_path.clone(),
                    line: Some(line),
                    column: Some((mat.start() - prefix.rfind('\n').map(|p| p + 1).unwrap_or(0) + 1) as u32),
                    snippet,
                    match_text,
                    rule_id: rule.id.to_string(),
                });
            }
        } else {
            // Line-by-line scan
            for (line_idx, line) in content.lines().enumerate() {
                let line_number = (line_idx + 1) as u32;

                for mat in rule.pattern.find_iter(line) {
                    let match_text = mat.as_str().to_string();

                    // Check context pattern if present
                    if let Some(ref ctx_pat) = rule.context_pattern {
                        if !ctx_pat.is_match(&content) {
                            continue;
                        }
                    }

                    let lines: Vec<&str> = content.lines().collect();
                    let snippet = extract_snippet(&lines, line_idx, &match_text);

                    let id = format!("SA-{:04}", findings.len() + 1);
                    findings.push(Finding {
                        id,
                        category: rule.category.to_string(),
                        severity: rule.severity.to_string(),
                        title: rule.title.to_string(),
                        file_path: relative_path.clone(),
                        line: Some(line_number),
                        column: Some((mat.start() + 1) as u32),
                        snippet,
                        match_text,
                        rule_id: rule.id.to_string(),
                    });
                }
            }
        }
    }

    findings
}

/// Scan a directory with static analysis rules.
pub fn scan_static_analysis(root: &Path) -> Vec<Finding> {
    let rules = static_rules();
    let files = collect_files(root);
    let mut findings = Vec::new();

    for file in &files {
        let file_findings = scan_file(file, root, &rules);
        findings.extend(file_findings);
    }

    // Re-assign sequential IDs
    for (i, finding) in findings.iter_mut().enumerate() {
        finding.id = format!("SA-{:04}", i + 1);
    }

    findings
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    #[test]
    fn test_detect_eval_with_input() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("test.js");
        let mut f = fs::File::create(&path).unwrap();
        f.write_all(b"const result = eval(req.body.code);\n").unwrap();

        let findings = scan_static_analysis(dir.path());
        let eval = findings.iter().find(|f| f.rule_id == "unsafe-eval");
        assert!(eval.is_some(), "Should detect eval() with user input");
    }

    #[test]
    fn test_detect_sql_concatenation() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("query.py");
        let mut f = fs::File::create(&path).unwrap();
        f.write_all(b"cursor.execute('SELECT * FROM users WHERE id = ' + user_id)\n").unwrap();

        let findings = scan_static_analysis(dir.path());
        let sql = findings.iter().find(|f| f.rule_id == "sql-string-concatenation");
        assert!(sql.is_some(), "Should detect SQL concatenation");
    }

    #[test]
    fn test_detect_inner_html_xss() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("component.js");
        let mut f = fs::File::create(&path).unwrap();
        f.write_all(b"document.getElementById('content').innerHTML = userInput;\n").unwrap();

        let findings = scan_static_analysis(dir.path());
        let xss = findings.iter().find(|f| f.rule_id == "unsafe-inner-html");
        assert!(xss.is_some(), "Should detect innerHTML XSS");
    }

    #[test]
    fn test_detect_hardcoded_jwt_secret() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("config.js");
        let mut f = fs::File::create(&path).unwrap();
        f.write_all(b"const JWT_SECRET = 'my-super-secret-key-12345';\n").unwrap();

        let findings = scan_static_analysis(dir.path());
        let jwt = findings.iter().find(|f| f.rule_id == "hardcoded-jwt-secret");
        assert!(jwt.is_some(), "Should detect hardcoded JWT secret");
    }

    #[test]
    fn test_detect_cors_wildcard() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("server.js");
        let mut f = fs::File::create(&path).unwrap();
        f.write_all(b"res.setHeader('Access-Control-Allow-Origin', '*');\n").unwrap();

        let findings = scan_static_analysis(dir.path());
        let cors = findings.iter().find(|f| f.rule_id == "cors-wildcard-origin");
        assert!(cors.is_some(), "Should detect CORS wildcard");
    }
}
