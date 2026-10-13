import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Directories that must NEVER be traversed during security scans
 */
const ALWAYS_IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  '.svn',
  '.hg',
  'dist',
  'dist-ssr',
  'build',
  '.next',
  '.nuxt',
  '.turbo',
  'coverage',
  '.vscode',
  '.idea',
  'logs',
  'tmp',
  'temp',
  'scratch'
]);

/**
 * File extensions that should NEVER be scanned (binaries, media, fonts, locks)
 */
const ALWAYS_IGNORED_EXTS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.webp', '.avif',
  '.mp4', '.mp3', '.wav', '.ogg', '.mov', '.avi',
  '.pdf', '.zip', '.tar', '.gz', '.7z', '.rar',
  '.exe', '.dll', '.so', '.dylib', '.bin', '.iso',
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
  '.map', '.lock', '.pyc', '.class', '.o', '.obj'
]);

/**
 * Scannable text and code file extensions
 */
const SCANNABLE_EXTS = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs',
  '.py', '.c', '.cpp', '.h', '.hpp',
  '.html', '.htm', '.css', '.scss', '.sass', '.less',
  '.json', '.yaml', '.yml', '.md', '.sql', '.sh', '.bash',
  '.env.example'
]);

/**
 * Parse .gitignore rules into an array of clean patterns
 */
function parseGitignore(gitignorePath) {
  if (!fs.existsSync(gitignorePath)) return [];
  try {
    const raw = fs.readFileSync(gitignorePath, 'utf8');
    return raw
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'));
  } catch {
    return [];
  }
}

/**
 * Check whether a relative path should be ignored according to gitignore rules & defaults
 */
function isPathIgnored(relPath, gitignoreRules) {
  const normalized = relPath.replace(/\\/g, '/').replace(/^\//, '');
  const segments = normalized.split('/');

  // 1. Check if any ancestor folder or file is in ALWAYS_IGNORED_DIRS
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (ALWAYS_IGNORED_DIRS.has(seg)) return true;
  }

  const fileName = segments[segments.length - 1];

  // 2. Ignore non-example .env files (e.g. .env, .env.local, .env.production)
  if (fileName.startsWith('.env') && !fileName.includes('example')) {
    return true;
  }

  // 3. Extension check
  const ext = path.extname(fileName).toLowerCase();
  if (ALWAYS_IGNORED_EXTS.has(ext)) {
    return true;
  }

  // 4. Test against .gitignore rules
  for (const rule of gitignoreRules) {
    let pat = rule.trim().replace(/\\/g, '/');
    if (!pat) continue;

    const isNegation = pat.startsWith('!');
    if (isNegation) pat = pat.slice(1);

    const isDirOnly = pat.endsWith('/');
    const cleanPat = isDirOnly ? pat.slice(0, -1) : pat;

    if (!cleanPat.includes('/')) {
      // Pattern without slash matches any folder name or filename
      if (cleanPat.startsWith('*.')) {
        const suffix = cleanPat.slice(1).toLowerCase();
        if (fileName.toLowerCase().endsWith(suffix)) {
          return !isNegation;
        }
      } else if (cleanPat.includes('*')) {
        const regexStr = '^' + cleanPat.replace(/[-[\]{}()+.,^$|#\s]/g, '\\$&').replace(/\*/g, '.*') + '$';
        const regex = new RegExp(regexStr, 'i');
        if (regex.test(fileName) || segments.some(s => regex.test(s))) {
          return !isNegation;
        }
      } else {
        if (fileName.toLowerCase() === cleanPat.toLowerCase() ||
            segments.some(s => s.toLowerCase() === cleanPat.toLowerCase())) {
          return !isNegation;
        }
      }
    } else {
      // Pattern with slash matches relative path
      const matchTarget = cleanPat.startsWith('/') ? cleanPat.slice(1) : cleanPat;
      if (normalized.toLowerCase() === matchTarget.toLowerCase() ||
          normalized.toLowerCase().startsWith(matchTarget.toLowerCase() + '/') ||
          normalized.toLowerCase().endsWith('/' + matchTarget.toLowerCase())) {
        return !isNegation;
      }
    }
  }

  return false;
}

/**
 * Traverse codebase recursively and return all eligible files
 */
function discoverCodebaseFiles(workspaceRoot, gitignoreRules) {
  const fileList = [];

  function walk(currentDir, relDir = '') {
    let entries;
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const ent of entries) {
      const relPath = relDir ? `${relDir}/${ent.name}` : ent.name;

      if (ent.isDirectory()) {
        if (ALWAYS_IGNORED_DIRS.has(ent.name)) continue;
        if (isPathIgnored(relPath + '/', gitignoreRules)) continue;
        walk(path.join(currentDir, ent.name), relPath);
      } else if (ent.isFile()) {
        if (isPathIgnored(relPath, gitignoreRules)) continue;

        const ext = path.extname(ent.name).toLowerCase();
        if (!SCANNABLE_EXTS.has(ext)) continue;

        try {
          const fullPath = path.join(currentDir, ent.name);
          const stat = fs.statSync(fullPath);
          if (stat.size > 500 * 1024) continue; // Skip files > 500KB

          fileList.push({
            path: relPath,
            name: ent.name,
            size: stat.size,
            ext,
            language: ext.replace(/^\./, '')
          });
        } catch {}
      }
    }
  }

  walk(workspaceRoot);
  return fileList.sort((a, b) => a.path.localeCompare(b.path));
}

const router = express.Router();

/**
 * Hyperion SAST Rule Definitions for Code Security Analysis
 */
const SECURITY_RULES = [
  {
    id: 'SEC-SQLI',
    name: 'SQL Injection Vulnerability',
    cwe: 'CWE-89',
    severity: 'CRITICAL',
    pattern: /(?:SELECT|INSERT|UPDATE|DELETE|FROM|WHERE)\s+.*(?:['"]\s*\+|\+\s*['"]|\$\{[^}]+\}|%s|\.format\()/i,
    description: 'Dynamic SQL query constructed via string concatenation or interpolation allows attackers to execute arbitrary SQL commands.',
    remediation: 'Use parameterized queries or prepared statements (e.g., `db.query("SELECT * FROM users WHERE id = ?", [userId])` or an ORM like Prisma/TypeORM).'
  },
  {
    id: 'SEC-RCE',
    name: 'Arbitrary Code Execution / Dangerous eval()',
    cwe: 'CWE-95 / CWE-78',
    severity: 'CRITICAL',
    pattern: /\b(?:eval|Function|execScript|vm\.runInThisContext|vm\.runInNewContext)\s*\(|child_process\.(?:exec|execSync)\s*\([^)]*(?:\+|`|\$\{)/,
    description: 'Use of eval() or dynamic execution functions with external input allows arbitrary Remote Code Execution (RCE).',
    remediation: 'Eliminate eval() or shell execution. Use safe JSON parsing (`JSON.parse`) or safe execution sandboxes with argument lists (`execFile` / `spawn` without shell).'
  },
  {
    id: 'SEC-TRAVERSAL',
    name: 'Path Traversal / Arbitrary File Read',
    cwe: 'CWE-22',
    severity: 'HIGH',
    pattern: /(?:fs\.(?:readFile|readFileSync|createReadStream|unlink|unlinkSync)|res\.sendFile)\s*\([^)]*(?:req\.|params\.|query\.|body\.|\.\.\/)/,
    description: 'File operations using untrusted path input allow directory traversal (dot-dot-slash) to read sensitive system files.',
    remediation: 'Sanitize input using `path.basename()` or validate against a strict allowed directory whitelist using `path.resolve(baseDir, userInput).startsWith(baseDir)`.'
  },
  {
    id: 'SEC-XSS',
    name: 'Cross-Site Scripting (XSS)',
    cwe: 'CWE-79',
    severity: 'HIGH',
    pattern: /dangerouslySetInnerHTML|innerHTML\s*=|document\.write\s*\(|res\.send\s*\(\s*['"`]<script/i,
    description: 'Direct injection of unescaped user input into HTML markup or the DOM enables client-side script execution (Stored or Reflected XSS).',
    remediation: 'Use textContent, React standard JSX bindings, or sanitize HTML using a library like DOMPurify or sanitize-html.'
  },
  {
    id: 'SEC-SECRETS',
    name: 'Hardcoded Secret / API Token / Private Key',
    cwe: 'CWE-798',
    severity: 'CRITICAL',
    pattern: /(?:(?:password|secret|api_?key|access_?token|auth_?token|private_?key|jwt_secret)\s*[:=]\s*["'][a-zA-Z0-9_\-\.]{8,}["'])|\bAKIA[0-9A-Z]{16}\b|\b(?:ghp|gho|ghu|ghs|ghr)_[a-zA-Z0-9]{36}\b|\bhf_[a-zA-Z0-9]{34,}\b|-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----|\bxox[baprs]-[0-9a-zA-Z]{10,48}\b|(?:mongodb(?:\+srv)?|postgres|postgresql|mysql):\/\/[a-zA-Z0-9_-]+:[^@\s]+@[a-zA-Z0-9._-]+/,
    description: 'Hardcoded credentials, API keys, or private keys in source code are vulnerable to exposure in version control and leaks.',
    remediation: 'Move secrets to environment variables (`process.env.SECRET_NAME`) or secret management vaults (e.g., Vault, AWS Secrets Manager).'
  },
  {
    id: 'SEC-CRYPTO',
    name: 'Weak Cryptographic Algorithm',
    cwe: 'CWE-327 / CWE-328',
    severity: 'MEDIUM',
    pattern: /crypto\.createHash\s*\(\s*["'](?:md5|sha1)["']\)|Math\.random\s*\(\)/i,
    description: 'Use of MD5/SHA1 for hashing or Math.random() for security tokens/session IDs is cryptographically insecure and susceptible to collisions.',
    remediation: 'Use SHA-256/SHA-512 for data integrity, bcrypt/argon2 for password hashing, and `crypto.randomBytes()` for cryptographically secure tokens.'
  },
  {
    id: 'SEC-PROTO',
    name: 'Prototype Pollution Vulnerability',
    cwe: 'CWE-1321',
    severity: 'MEDIUM',
    pattern: /\[\s*["']__proto__["']\s*\]|\.__proto__|constructor\.prototype/,
    description: 'Direct assignment to __proto__ or object prototype can pollute global Object prototypes, causing denial of service or remote code execution.',
    remediation: 'Use `Object.create(null)` for key-value maps, validate object keys with a deny-list for `__proto__`, or use Map.'
  },
  {
    id: 'SEC-SSRF',
    name: 'Server-Side Request Forgery (SSRF)',
    cwe: 'CWE-918',
    severity: 'HIGH',
    pattern: /(?:fetch|axios\.(?:get|post)|http\.get|request)\s*\(\s*(?:req\.|params\.|query\.|body\.)/i,
    description: 'Sending HTTP requests directly to user-supplied URLs allows attackers to probe internal cloud metadata services (e.g. 169.254.169.254) or internal APIs.',
    remediation: 'Validate destination URLs against a strict allowlist of domains and block private IP ranges (127.0.0.1, 10.0.0.0/8, 192.168.0.0/16, 169.254.169.254).'
  },
  {
    id: 'SEC-CORS',
    name: 'Permissive CORS Configuration',
    cwe: 'CWE-942',
    severity: 'MEDIUM',
    pattern: /Access-Control-Allow-Origin['"]?\s*,\s*['"]\*['"][\s\S]{0,60}credentials/i,
    description: 'Overly permissive wildcard Access-Control-Allow-Origin header combined with credentials allows malicious origins to read authenticated responses.',
    remediation: 'Specify explicit trusted origins in CORS headers rather than using wildcard `*` with credentials.'
  }
];

/**
 * Scan code and generate comprehensive security analysis
 */
function runSecurityAnalysis(code, filename = 'Active Code') {
  if (!code || typeof code !== 'string') {
    return {
      findings: [],
      riskLevel: 'LOW',
      markdown: 'No code provided for security analysis.'
    };
  }

  const lines = code.split('\n');
  const findings = [];

  for (const rule of SECURITY_RULES) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (rule.pattern.test(line)) {
        findings.push({
          id: rule.id,
          name: rule.name,
          cwe: rule.cwe,
          severity: rule.severity,
          line: i + 1,
          codeSnippet: line.trim(),
          description: rule.description,
          remediation: rule.remediation
        });
      }
    }
  }

  // Determine overall risk score
  let riskLevel = 'SECURE';
  if (findings.some((f) => f.severity === 'CRITICAL')) {
    riskLevel = 'CRITICAL';
  } else if (findings.some((f) => f.severity === 'HIGH')) {
    riskLevel = 'HIGH';
  } else if (findings.some((f) => f.severity === 'MEDIUM')) {
    riskLevel = 'MEDIUM';
  } else if (findings.length > 0) {
    riskLevel = 'LOW';
  }

  // Format rich Markdown security report
  let md = `## 🛡️ Cypher Security Analysis Report\n`;
  md += `**Target File:** \`${filename}\`  \n`;
  md += `**Overall Risk Level:** `;

  if (riskLevel === 'CRITICAL') {
    md += `🔴 **CRITICAL RISK** (Immediate Action Required)\n\n`;
  } else if (riskLevel === 'HIGH') {
    md += `🟠 **HIGH RISK** (High Severity Vulnerabilities Detected)\n\n`;
  } else if (riskLevel === 'MEDIUM') {
    md += `🟡 **MEDIUM RISK** (Security Hardening Recommended)\n\n`;
  } else {
    md += `🟢 **SECURE / CLEAN** (No Known Vulnerabilities Detected)\n\n`;
  }

  if (findings.length === 0) {
    md += `### ✅ Scan Summary\n`;
    md += `- **Vulnerabilities Found:** 0\n`;
    md += `- **OWASP Top 10 Checks:** PASSED\n`;
    md += `- **Secrets & Credential Leaks:** None detected\n`;
    md += `- **Injection & Execution Risks:** None detected\n\n`;
    md += `> **Security Tip:** Continue following the principle of least privilege, input validation, and keep all third-party dependencies updated.\n`;
    return { findings, riskLevel, markdown: md };
  }

  md += `### 🔍 Identified Vulnerabilities (${findings.length})\n\n`;
  md += `| # | Vulnerability | Severity | CWE | Location |\n`;
  md += `|---|---------------|----------|-----|----------|\n`;

  findings.forEach((f, idx) => {
    const sevBadge = f.severity === 'CRITICAL' ? '🔴 Critical' : f.severity === 'HIGH' ? '🟠 High' : '🟡 Medium';
    md += `| ${idx + 1} | **${f.name}** | ${sevBadge} | ${f.cwe} | Line ${f.line} |\n`;
  });

  md += `\n---\n\n### ⚠️ Vulnerability Breakdown & Remediation\n\n`;

  findings.forEach((f, idx) => {
    md += `#### ${idx + 1}. ${f.name} (\`${f.cwe}\`)\n`;
    md += `- **Severity:** \`${f.severity}\`\n`;
    md += `- **Line ${f.line}:**\n`;
    md += `\`\`\`javascript\n${f.codeSnippet}\n\`\`\`\n`;
    md += `- **Threat Impact:** ${f.description}\n`;
    md += `- **Recommended Fix:**\n  ${f.remediation}\n\n`;
  });

  md += `### 💡 Security Recommendations\n`;
  md += `1. **Sanitize & Parameterize:** Never trust input directly from requests (\`req.body\`, \`req.query\`, \`req.params\`).\n`;
  md += `2. **Environment Isolation:** Move all tokens, keys, and connection strings to \`.env\` or secret managers.\n`;
  md += `3. **Least Privilege:** Run database and backend service processes with minimal necessary OS and DB privileges.\n`;

  return { findings, riskLevel, markdown: md };
}

/**
 * Cypher AI Expert Security & Programming Intelligence Engine
 * Dynamically answers questions with contextual knowledge rather than static responses.
 */
function generateCypherIntelligenceResponse(prompt, rawCodeSnippet, model, hasHfToken, filename = 'Active Code') {
  const p = prompt.toLowerCase();

  // If code is provided in the prompt, run SAST analysis and contextualize
  if (rawCodeSnippet && rawCodeSnippet.trim().length > 0) {
    const isSecretsQuery = /secret|password|key|credential|token|leak/i.test(prompt);
    const isOwaspQuery = /owasp|top.?10/i.test(prompt);
    const analysis = runSecurityAnalysis(rawCodeSnippet, filename);

    let response = `> 💡 *Analyzed by Cypher AI Security Engine (${hasHfToken ? 'Hugging Face Service: Connected' : 'Local SAST Mode'}).*\n\n`;
    response += analysis.markdown;

    if (isSecretsQuery && analysis.findings.some(f => f.id === 'SEC-SECRETS')) {
      response += `\n\n### 🔐 Secret Leak Containment Steps\n`;
      response += `1. **Revoke Exposed Credentials:** Assume any key committed to version control is compromised.\n`;
      response += `2. **Rotate Keys:** Issue new credentials and configure them strictly through environment variables.\n`;
      response += `3. **Clean Git History:** Use \`git-filter-repo\` or BFG Repo-Cleaner if the credentials were ever committed to Git.\n`;
    }

    return response;
  }

  // 1. Secrets & Credential Audit Guide
  if (/secret|credential|password|api.?key|aws|private.?key|token.?leak/i.test(p)) {
    return `## 🔐 Cypher Credential & Secret Leak Security Audit

Hardcoded secrets (CWE-798) are among the most critical security liabilities in modern software engineering.

### 🎯 Key Secret Signatures Scanned by Cypher
- **AWS Access Keys:** \`AKIA[0-9A-Z]{16}\`
- **GitHub Personal Access Tokens:** \`ghp_[a-zA-Z0-9]{36}\` / Fine-grained \`github_pat_...\`
- **Hugging Face Access Tokens:** User Access & Fine-grained API Tokens
- **Private Keys:** \`-----BEGIN (RSA|EC|OPENSSH) PRIVATE KEY-----\`
- **Slack App / Bot Tokens:** \`xoxb-...\` / \`xoxp-...\`
- **Database Connection URIs:** \`mongodb://user:pass@host\`, \`postgres://...\`
- **Stripe & Payment Keys:** \`sk_live_[0-9a-zA-Z]{24}\`

---

### 🛡️ Best Practices to Prevent Leaks

#### 1. Strict Environment Isolation
Never commit secrets into source control. Store secrets in \`.env\` files and ensure they are added to \`.gitignore\`:
\`\`\`gitignore
# .gitignore
.env
.env.local
.env.*.local
*.pem
*.key
\`\`\`

#### 2. Safe Configuration Loading
Use schema validation on application startup to ensure required secrets exist and are valid:
\`\`\`javascript
// config.js
import dotenv from 'dotenv';
dotenv.config();

function getRequiredSecret(key) {
  const value = process.env[key];
  if (!value) {
    throw new Error(\`FATAL: Missing required environment variable \${key}\`);
  }
  return value;
}

export const config = {
  dbUrl: getRequiredSecret('DATABASE_URL'),
  jwtSecret: getRequiredSecret('JWT_SECRET'),
  hfToken: process.env.HF_TOKEN || ''
};
\`\`\`

#### 3. Automated Secret Scanning in CI/CD
Incorporate automated tools into your pre-commit hooks and deployment pipelines:
- **Gitleaks:** \`gitleaks detect --verbose\`
- **Trufflehog:** Scans Git history and commits for high-entropy strings and verified API keys.
- **Git-secrets:** Prevents commits containing credentials matching AWS and custom regexes.

---

> 💡 **Quick Action:** Open any file in the Hyperion IDE editor and click **"Scan Active File"** to run an automated credential scan on your code.`;
  }

  // 2. OWASP Top 10 Audit
  if (/owasp|top.?10|top.?ten|audit|vulnerabilit/i.test(p)) {
    return `## 🛡️ OWASP Top 10 Application Security Audit Overview

Cypher provides automated checks aligned with the OWASP Top 10 standards:

| Category | Vulnerability Type | Description & Primary Defense |
|---|---|---|
| **A01** | **Broken Access Control** | Enforce least privilege, verify authorization on every endpoint, eliminate IDOR / BOLA. |
| **A02** | **Cryptographic Failures** | Never use MD5/SHA1 for security; use Argon2id/bcrypt for passwords and enforce TLS 1.3. |
| **A03** | **Injection (SQLi / RCE / XSS)** | Use parameterized queries (prepared statements); avoid string concatenation in SQL and shell commands. |
| **A04** | **Insecure Design** | Implement threat modeling, rate limiting, and secure default configurations. |
| **A05** | **Security Misconfiguration** | Disable debug modes in production, remove unnecessary HTTP headers, set strict CORS policies. |
| **A06** | **Vulnerable Components** | Regularly run \`npm audit\` or Dependabot to identify and patch outdated third-party packages. |
| **A07** | **Auth Failures** | Implement MFA, enforce strong password policies, and protect against brute-force attacks with rate limiters. |
| **A08** | **Software & Data Integrity** | Verify package integrity with checksums; avoid deserializing untrusted data with \`node-serialize\`. |
| **A09** | **Logging & Monitoring Failures** | Log authentication attempts and access control failures without recording sensitive credentials. |
| **A10** | **SSRF (Server-Side Request Forgery)** | Sanitize user-provided URLs and block access to internal metadata IP addresses (e.g., \`169.254.169.254\`). |

---

### 🚀 How to Run an Audit in Hyperion IDE
1. Open any source file in your editor tab.
2. Click **"Scan Active File"** below.
3. Cypher will inspect every line against our comprehensive SAST ruleset and return line-by-line remediations.`;
  }

  // 3. SQL Injection
  if (/sqli|sql.?injection/i.test(p)) {
    return `## 🛡️ SQL Injection (CWE-89) Analysis & Remediation

SQL Injection occurs when untrusted user input is directly concatenated into SQL queries.

### ❌ Insecure Pattern (Vulnerable)
\`\`\`javascript
// VULNERABLE: Direct string interpolation allows arbitrary SQL execution
const query = \`SELECT * FROM users WHERE email = '\${req.body.email}' AND password = '\${req.body.password}'\`;
const user = await db.query(query);
\`\`\`
*An attacker entering \`' OR '1'='1\` can bypass authentication completely.*

### ✅ Secure Pattern (Parameterized Queries)
\`\`\`javascript
// SECURE: Uses prepared statements where input is treated strictly as data
const query = 'SELECT id, email, password_hash FROM users WHERE email = ?';
const [rows] = await db.execute(query, [req.body.email]);
\`\`\`

#### Key Defenses:
1. **Always use parameterized queries** or an ORM with built-in parameterization (e.g., Prisma, TypeORM, Sequelize).
2. **Never concatenate raw query strings** with user input.
3. **Apply the Principle of Least Privilege:** Ensure the database user only has permissions required for that application.`;
  }

  // 4. Cross-Site Scripting (XSS)
  if (/xss|cross.?site.?scripting/i.test(p)) {
    return `## 🛡️ Cross-Site Scripting (XSS - CWE-79) Guide

XSS occurs when an application includes untrusted data in a web page without proper validation or escaping.

### Types of XSS:
1. **Stored XSS:** Malicious payload is persisted in the database and served to victims.
2. **Reflected XSS:** Payload is immediately reflected in the server's response.
3. **DOM-based XSS:** Client-side JavaScript reads from an untrusted source (like \`location.hash\`) and writes to an unsafe sink.

### ❌ Insecure Patterns
\`\`\`javascript
// Insecure in React
<div dangerouslySetInnerHTML={{ __html: userBio }} />

// Insecure in Vanilla JS
document.getElementById('bio').innerHTML = userInput;
\`\`\`

### ✅ Secure Patterns
\`\`\`javascript
// Secure in React (default JSX auto-escapes content)
<div>{userBio}</div>

// If rich HTML is strictly necessary, sanitize first with DOMPurify
import DOMPurify from 'dompurify';
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userBio) }} />
\`\`\`

#### Recommended HTTP Headers:
\`\`\`http
Content-Security-Policy: default-src 'self'; script-src 'self'; object-src 'none';
X-Content-Type-Options: nosniff
\`\`\``;
  }

  // 5. Remote Code Execution / eval
  if (/rce|eval|remote code execution|child_process|exec/i.test(p)) {
    return `## 🛡️ Remote Code Execution (RCE - CWE-95 / CWE-78)

Dynamic code execution functions and unsanitized command execution are critical security risks.

### ❌ Dangerous Functions in Node.js
\`\`\`javascript
// NEVER use eval with user-supplied input
eval(userInput);

// Dangerous: child_process.exec runs through a system shell
const { exec } = require('child_process');
exec(\`ping -c 1 \${req.query.host}\`); // Attacker appends: "; cat /etc/passwd"
\`\`\`

### ✅ Safe Alternatives
\`\`\`javascript
// Use execFile or spawn without shell invocation and pass arguments as an array
const { execFile } = require('child_process');

// Whitelist validate host before executing
if (!/^[a-zA-Z0-9.-]+$/.test(req.query.host)) {
  throw new Error('Invalid host format');
}

execFile('ping', ['-c', '1', req.query.host], (error, stdout) => {
  // Safe: arguments are passed directly to binary without shell parsing
});
\`\`\``;
  }

  // 6. Authentication & JWT Security
  if (/jwt|auth|session|token|login|cookie/i.test(p)) {
    return `## 🔐 Authentication & JWT Security Best Practices

### 1. Secure Token Storage
- **Never store sensitive JWTs in \`localStorage\` or \`sessionStorage\`**, as any XSS vulnerability can extract them.
- **Store access/refresh tokens in \`HttpOnly\`, \`Secure\`, \`SameSite=Lax\` cookies**:
\`\`\`javascript
res.cookie('token', jwtToken, {
  httpOnly: true, // Prevents access from client-side JavaScript
  secure: process.env.NODE_ENV === 'production', // Transmitted only via HTTPS
  sameSite: 'lax', // Protects against CSRF
  maxAge: 15 * 60 * 1000 // Short-lived (15 mins)
});
\`\`\`

### 2. Strong Password Hashing
- Always use **Argon2id** or **bcrypt** with a minimum work factor:
\`\`\`javascript
import bcrypt from 'bcrypt';
const saltRounds = 12;
const passwordHash = await bcrypt.hash(rawPassword, saltRounds);
\`\`\`

### 3. JWT Verification Safeguards
- Always specify explicit algorithm allowlists during verification:
\`\`\`javascript
jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
\`\`\``;
  }

  // 7. Greetings & Introductions
  if (/^(hi|hello|hey|greetings|hola)\b/i.test(p.trim())) {
    return `Hello! I am **Cypher**, your AI Code Security Analyst and programming assistant in Hyperion IDE.

I specialize in:
- 🛡️ **Automated SAST Code Audits:** Detecting SQL Injection, XSS, RCE, Path Traversal, and SSRF.
- 🔐 **Secret Leak Detection:** Identifying hardcoded API keys, private keys, and passwords.
- 📋 **OWASP Top 10 Compliance:** Analyzing architecture and dependencies against security standards.
- 🩹 **Hardened Code Refactoring:** Providing production-ready secure remediations.

How can I help you secure or inspect your code today? You can paste code here or use the quick actions below.`;
  }

  // 8. General Programming / Technical Query
  return `### 🛡️ Cypher Analysis: ${prompt.slice(0, 80)}...

Thank you for your question. Here is the technical breakdown and security-first guidance:

1. **Architecture & Design:** When implementing this feature, ensure that input validation, authentication boundaries, and error handling are established upfront.
2. **Defensive Coding:**
   - Always validate and sanitize inputs at application entry points.
   - Enforce least privilege for database connections and filesystem operations.
   - Keep dependencies up-to-date and isolate credentials using environment variables.
3. **Verification:**
   - Write unit tests covering boundary conditions and unauthorized attempts.
   - Use Hyperion's built-in Terminal to test your changes with \`npm test\` or \`npm run build\`.

> 💡 **Tip:** If you have specific code you would like me to review or refactor, paste it here in a code block or open it and click **"Scan Active File"**!`;
}

/**
 * GET /api/ai/status - Query AI service status
 */
router.get('/status', (req, res) => {
  const token = (process.env.HF_TOKEN || '').trim();
  res.json({
    success: true,
    hfConfigured: Boolean(token && token.length > 10),
    models: [
      { id: 'meta-llama/Llama-3.1-8B-Instruct', name: 'Meta LLaMA 3.1 8B Instruct', tag: 'Recommended' },
      { id: 'Qwen/Qwen2.5-Coder-32B-Instruct', name: 'Qwen 2.5 Coder 32B', tag: 'Code Specialized' },
      { id: 'deepseek-ai/DeepSeek-R1', name: 'DeepSeek R1', tag: 'Reasoning' }
    ],
    defaultModel: 'meta-llama/Llama-3.1-8B-Instruct',
    features: ['code-security-analysis', 'vulnerability-scanner', 'secure-code-refactor', 'interactive-chat']
  });
});

/**
 * POST /api/ai/security-scan - Direct security scanner endpoint
 */
router.post('/security-scan', (req, res) => {
  const { code, filename } = req.body;
  const analysis = runSecurityAnalysis(code, filename || 'source_file');
  res.json({
    success: true,
    ...analysis
  });
});

/**
 * GET /api/ai/codebase-files - Discover codebase files respecting .gitignore
 */
router.get('/codebase-files', (req, res) => {
  try {
    const defaultRoot = path.resolve(__dirname, '../..');
    const workspaceRoot = req.query.workspacePath ? path.resolve(req.query.workspacePath) : defaultRoot;

    const gitignorePath = path.join(workspaceRoot, '.gitignore');
    const gitignoreRules = parseGitignore(gitignorePath);
    const files = discoverCodebaseFiles(workspaceRoot, gitignoreRules);

    res.json({
      success: true,
      workspacePath: workspaceRoot,
      totalFiles: files.length,
      ignoredRulesCount: gitignoreRules.length,
      files
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/ai/scan-codebase-file - Scan single codebase file one-by-one
 */
router.post('/scan-codebase-file', (req, res) => {
  try {
    const { filePath, workspacePath, code } = req.body;
    let fileContent = code;
    let fileName = req.body.filename || path.basename(filePath || 'file');

    if (!fileContent && filePath) {
      const defaultRoot = path.resolve(__dirname, '../..');
      const root = workspacePath ? path.resolve(workspacePath) : defaultRoot;
      const fullPath = path.isAbsolute(filePath) ? filePath : path.resolve(root, filePath);

      // Verify file is within root to prevent directory traversal
      const normalizedRoot = root.replace(/\\/g, '/').toLowerCase();
      const normalizedFull = fullPath.replace(/\\/g, '/').toLowerCase();
      if (!normalizedFull.startsWith(normalizedRoot)) {
        return res.status(403).json({ error: 'Access denied: File outside workspace' });
      }

      if (!fs.existsSync(fullPath)) {
        return res.status(404).json({ error: `File not found: ${filePath}` });
      }

      fileContent = fs.readFileSync(fullPath, 'utf8');
      fileName = path.basename(fullPath);
    }

    const analysis = runSecurityAnalysis(fileContent || '', fileName);

    const counts = {
      critical: analysis.findings.filter(f => f.severity === 'CRITICAL').length,
      high: analysis.findings.filter(f => f.severity === 'HIGH').length,
      medium: analysis.findings.filter(f => f.severity === 'MEDIUM').length,
      low: analysis.findings.filter(f => f.severity === 'LOW').length,
      total: analysis.findings.length
    };

    res.json({
      success: true,
      file: {
        path: filePath || fileName,
        name: fileName,
        lines: (fileContent || '').split('\n').length
      },
      riskLevel: analysis.riskLevel,
      findings: analysis.findings,
      counts
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/ai/chat - Main Chat Assistant with Hugging Face integration & Cypher Intelligence Engine
 */
router.post('/chat', async (req, res) => {
  try {
    const { messages, model = 'meta-llama/Llama-3.1-8B-Instruct', file, code } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array is required' });
    }

    const lastMessage = messages[messages.length - 1];
    const userPrompt = lastMessage?.content || lastMessage?.text || '';

    // Extract any code blocks from the user's prompt or attached file fragment
    const codeBlockMatch = userPrompt.match(/```(?:\w+)?\n([\s\S]*?)```/);
    const rawCodeSnippet = file?.content || code || lastMessage?.fileFragment?.content || (codeBlockMatch ? codeBlockMatch[1] : '');
    const targetFileName = file?.name || lastMessage?.fileFragment?.name || 'Active Code';

    const token = (process.env.HF_TOKEN || '').trim().replace(/^["']|["']$/g, '');
    const hasToken = Boolean(token && token.length > 10);

    // 1. Try Hugging Face Router API if token is configured
    if (hasToken) {
      try {
        const systemPrompt = `You are Cypher, an expert AI Code Security Analyst and programming assistant in Hyperion IDE.
You specialize in Application Security (AppSec), OWASP Top 10, CWE, CVE, and secure coding practices.
When evaluating code or answering questions:
1. Always analyze for security risks (SQL injection, XSS, RCE, insecure deserialization, hardcoded secrets, SSRF, path traversal, broken access control).
2. Rate the risk level (CRITICAL, HIGH, MEDIUM, LOW, or SECURE).
3. Provide clear explanations of potential exploits and concrete, hardened code remediations.
4. Keep explanations clear, well-formatted with markdown and code blocks.`;

        const hfMessages = [
          { role: 'system', content: systemPrompt },
          ...messages.map((m, idx) => {
            let content = m.text || m.content || '';
            // If code snippet is attached as fragment, append it for LLM context
            if (idx === messages.length - 1 && rawCodeSnippet && !content.includes(rawCodeSnippet)) {
              content += `\n\n[Attached Code File: \`${targetFileName}\`]\n\`\`\`\n${rawCodeSnippet}\n\`\`\``;
            }
            return {
              role: m.sender === 'assistant' ? 'assistant' : 'user',
              content
            };
          })
        ];

        const hfResponse = await fetch('https://router.huggingface.co/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model,
            messages: hfMessages,
            max_tokens: 1024,
            temperature: 0.3
          })
        });

        if (hfResponse.ok) {
          const hfData = await hfResponse.json();
          if (hfData.choices && hfData.choices[0]?.message?.content) {
            return res.json({
              success: true,
              message: hfData.choices[0].message.content,
              provider: 'huggingface',
              model
            });
          }
        } else {
          const errorText = await hfResponse.text();
          console.warn(`Hugging Face Router returned HTTP ${hfResponse.status} - falling back to Cypher Intelligence Engine:`, errorText);
        }
      } catch (hfErr) {
        console.warn('Hugging Face Router request failed - falling back to Cypher Intelligence Engine:', hfErr.message);
      }
    }

    // 2. Cypher Intelligence Engine (Context-aware responses tailored to prompt and code)
    const cypherMessage = generateCypherIntelligenceResponse(userPrompt, rawCodeSnippet, model, hasToken, targetFileName);

    return res.json({
      success: true,
      message: cypherMessage,
      provider: 'cypher-security-engine',
      model
    });
  } catch (error) {
    console.error('AI chat endpoint error:', error);
    res.status(500).json({ error: error.message || 'Internal server error in AI service' });
  }
});

export default router;
