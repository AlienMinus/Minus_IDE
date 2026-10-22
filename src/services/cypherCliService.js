/**
 * Cypher AI Security CLI Service
 * Terminal command router and analyzer for the Cypher Security Terminal
 */

import { runSecurityScan, scanCodebaseFile, sendChatMessage, getAiStatus } from './aiService.js';
import { getSandboxStatus } from './sandboxService.js';

const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[90m',
  purple: '\x1b[35m',
  brightPurple: '\x1b[95m',
  cyan: '\x1b[36m',
  brightCyan: '\x1b[96m',
  green: '\x1b[32m',
  brightGreen: '\x1b[92m',
  yellow: '\x1b[33m',
  brightYellow: '\x1b[93m',
  red: '\x1b[31m',
  brightRed: '\x1b[91m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
  white: '\x1b[37m'
};

export const CYPHER_BANNER = [
  `${ANSI.purple}╔═══════════════════════════════════════════════════════════════════╗${ANSI.reset}`,
  `${ANSI.purple}║        🔐 CYPHER AI SECURITY & THREAT INTELLIGENCE CLI            ║${ANSI.reset}`,
  `${ANSI.purple}╚═══════════════════════════════════════════════════════════════════╝${ANSI.reset}`,
  `${ANSI.dim}Security Engine: Active | Vulnerability Sentinel: ONLINE${ANSI.reset}`,
  `${ANSI.cyan}Type 'help' for command manual or 'scan' to inspect active file.${ANSI.reset}`,
  ""
];

/**
 * Handle Cypher CLI command execution
 */
export async function executeCypherCommand({
  command,
  activeFile,
  files = [],
  workspacePath = null
}) {
  const trimmed = command.trim();
  const cleanCmd = trimmed.replace(/^cypher\s+/i, '');
  const parts = cleanCmd.split(/\s+/);
  const action = parts[0]?.toLowerCase() || '';
  const args = parts.slice(1);
  const argTarget = args[0] || '';

  // 1. CLEAR / CLS
  if (action === 'clear' || action === 'cls') {
    return {
      type: 'clear',
      lines: [...CYPHER_BANNER]
    };
  }

  // 2. HELP / MANUAL
  if (action === 'help' || action === '--help' || action === '-h') {
    return {
      type: 'output',
      lines: [
        `${ANSI.bold}${ANSI.brightPurple}CYPHER AI SECURITY & THREAT INTELLIGENCE CLI MANUAL${ANSI.reset}`,
        `${ANSI.dim}───────────────────────────────────────────────────────────────────${ANSI.reset}`,
        `${ANSI.bold}USAGE:${ANSI.reset}`,
        `  cypher <command> [arguments]`,
        ``,
        `${ANSI.bold}COMMANDS:${ANSI.reset}`,
        `  ${ANSI.cyan}scan [file]${ANSI.reset}         Perform comprehensive SAST security audit on a file`,
        `  ${ANSI.cyan}audit [file]${ANSI.reset}        Generate OWASP Top 10 security compliance report`,
        `  ${ANSI.cyan}secrets [file]${ANSI.reset}      Scan code for hardcoded API keys, tokens & credentials`,
        `  ${ANSI.cyan}runtimes${ANSI.reset}            Display discovered sandbox compilers & execution toolchains`,
        `  ${ANSI.cyan}explain <vuln|cwe>${ANSI.reset}  Explain security threat (e.g., 'explain sqli', 'explain CWE-89')`,
        `  ${ANSI.cyan}chat <query>${ANSI.reset}        Ask Cypher AI an intelligent code or security question`,
        `  ${ANSI.cyan}status${ANSI.reset}              Show Cypher AI backend engine connectivity and models`,
        `  ${ANSI.cyan}clear${ANSI.reset}               Clear the terminal screen`,
        `  ${ANSI.cyan}exit${ANSI.reset}                Exit Cypher Security session`,
        ``,
        `${ANSI.dim}Tip: You can omit 'cypher' when already inside the Cypher Security terminal.${ANSI.reset}`
      ]
    };
  }

  // 3. RUNTIMES / COMPILER STATUS
  if (action === 'runtimes' || action === 'tools') {
    try {
      const status = await getSandboxStatus();
      const runtimes = status.runtimes || {};
      return {
        type: 'output',
        lines: [
          `${ANSI.bold}${ANSI.brightPurple}[Cypher Sandbox Security Toolchains]${ANSI.reset}`,
          `${ANSI.dim}───────────────────────────────────────────────────────────────────${ANSI.reset}`,
          `  Python 3:    ${runtimes.python?.available ? `${ANSI.green}✔ ${runtimes.python.version}${ANSI.reset}` : `${ANSI.red}✘ Not installed${ANSI.reset}`}`,
          `  Node.js:     ${runtimes.node?.available ? `${ANSI.green}✔ ${runtimes.node.version}${ANSI.reset}` : `${ANSI.red}✘ Not installed${ANSI.reset}`}`,
          `  GCC (C):     ${runtimes.gcc?.available ? `${ANSI.green}✔ ${runtimes.gcc.version}${ANSI.reset}` : `${ANSI.red}✘ Not installed${ANSI.reset}`}`,
          `  G++ (C++):   ${runtimes.gpp?.available ? `${ANSI.green}✔ ${runtimes.gpp.version}${ANSI.reset}` : `${ANSI.red}✘ Not installed${ANSI.reset}`}`,
          `  Git Bash:    ${runtimes.bash?.available ? `${ANSI.green}✔ ${runtimes.bash.version}${ANSI.reset}` : `${ANSI.yellow}⚠ MinGW fallback${ANSI.reset}`}`,
          `  Platform:    ${status.platform || 'win32'} (${status.isWindows ? 'Windows Native' : 'POSIX'})`,
          `${ANSI.dim}───────────────────────────────────────────────────────────────────${ANSI.reset}`
        ]
      };
    } catch (err) {
      return {
        type: 'output',
        lines: [`${ANSI.red}[Error] Failed to query sandbox runtimes: ${err.message}${ANSI.reset}`]
      };
    }
  }

  // 4. STATUS
  if (action === 'status') {
    try {
      const status = await getAiStatus();
      return {
        type: 'output',
        lines: [
          `${ANSI.bold}${ANSI.brightPurple}[Cypher AI Sentinel Status]${ANSI.reset}`,
          `  Engine:      ${ANSI.green}ONLINE${ANSI.reset}`,
          `  HF Cloud:    ${status.hfConfigured ? `${ANSI.green}Connected (API Key Active)${ANSI.reset}` : `${ANSI.yellow}Local Deterministic SAST Engine Active${ANSI.reset}`}`,
          `  Model:       ${status.defaultModel || 'meta-llama/Llama-3.1-8B-Instruct'}`,
          `  Features:    ${(status.features || []).join(', ')}`
        ]
      };
    } catch (err) {
      return {
        type: 'output',
        lines: [`${ANSI.red}[Error] Failed to connect to Cypher AI status: ${err.message}${ANSI.reset}`]
      };
    }
  }

  // 5. EXPLAIN VULNERABILITY
  if (action === 'explain') {
    const topic = args.join(' ');
    if (!topic) {
      return {
        type: 'output',
        lines: [
          `${ANSI.yellow}Usage: explain <vuln_type|cwe>${ANSI.reset}`,
          `Examples: 'explain sqli', 'explain CWE-89', 'explain xss', 'explain rce', 'explain secrets'`
        ]
      };
    }

    try {
      const response = await sendChatMessage(
        [{ role: 'user', content: `Explain security vulnerability: ${topic}. Give CWE, impact, code example, and remediation.` }],
        'meta-llama/Llama-3.1-8B-Instruct',
        'security'
      );
      const text = response.message || response.content || 'No explanation available.';
      const cleanLines = text.replace(/\r\n/g, '\n').split('\n');
      return {
        type: 'output',
        lines: [
          `${ANSI.bold}${ANSI.brightPurple}[Cypher Security Knowledge Base: ${topic.toUpperCase()}]${ANSI.reset}`,
          `${ANSI.dim}───────────────────────────────────────────────────────────────────${ANSI.reset}`,
          ...cleanLines.map(l => l.startsWith('#') ? `${ANSI.cyan}${l}${ANSI.reset}` : l),
          `${ANSI.dim}───────────────────────────────────────────────────────────────────${ANSI.reset}`
        ]
      };
    } catch (err) {
      return {
        type: 'output',
        lines: [`${ANSI.red}[Error] Failed to fetch explanation: ${err.message}${ANSI.reset}`]
      };
    }
  }

  // Helper to resolve target file and code
  const resolveTarget = () => {
    if (argTarget) {
      const match = files.find(f => f.name === argTarget || f.path === argTarget || f.name.toLowerCase() === argTarget.toLowerCase());
      if (match) return { file: match, code: match.content || '', filename: match.name };
      return { file: null, code: '', filename: argTarget };
    }
    if (activeFile) {
      return { file: activeFile, code: activeFile.content || '', filename: activeFile.name };
    }
    return { file: null, code: '', filename: '' };
  };

  // 6. SECRETS SCAN
  if (action === 'secrets' || action === 'secret') {
    const target = resolveTarget();
    if (!target.filename && !target.code) {
      return {
        type: 'output',
        lines: [
          `${ANSI.yellow}Usage: secrets [filename]${ANSI.reset}`,
          `No target file specified and no active file open in editor.`
        ]
      };
    }

    const lines = [
      `${ANSI.bold}${ANSI.brightPurple}[Cypher Secret Sentinel]${ANSI.reset} Scanning for credentials in: ${ANSI.bold}${target.filename}${ANSI.reset}...`
    ];

    try {
      let analysis;
      if (target.code) {
        analysis = await runSecurityScan(target.code, target.filename);
      } else {
        const res = await scanCodebaseFile(target.filename, workspacePath);
        analysis = res;
      }

      const allFindings = analysis.findings || [];
      const secretFindings = allFindings.filter(f =>
        f.ruleId === 'SEC-SECRETS' ||
        /secret|key|token|credential|password/i.test(f.title || f.name || '')
      );

      if (secretFindings.length === 0) {
        lines.push(
          `${ANSI.green}✔ CLEAN:${ANSI.reset} No exposed credentials, API keys, or private tokens detected in ${target.filename}.`
        );
      } else {
        lines.push(
          `${ANSI.brightRed}✘ LEAK DETECTED: Found ${secretFindings.length} hardcoded secret signature(s)!${ANSI.reset}`,
          `${ANSI.dim}───────────────────────────────────────────────────────────────────${ANSI.reset}`
        );
        secretFindings.forEach((f, idx) => {
          lines.push(
            `  ${idx + 1}. ${ANSI.bold}${ANSI.brightRed}[${f.severity || 'CRITICAL'}]${ANSI.reset} ${f.title || f.name} (Line ${f.line || '?'})`,
            `     ${ANSI.dim}CWE:${ANSI.reset} ${f.cwe || 'CWE-798'}`,
            `     ${ANSI.yellow}Snippet:${ANSI.reset} ${f.snippet ? f.snippet.trim() : (f.codeSnippet || '').trim()}`,
            `     ${ANSI.cyan}Fix:${ANSI.reset} ${f.remediation || 'Store secret in .env and add to .gitignore'}`
          );
        });
      }
      return { type: 'output', lines, analysis };
    } catch (err) {
      return {
        type: 'output',
        lines: [`${ANSI.red}[Error] Secret scan failed: ${err.message}${ANSI.reset}`]
      };
    }
  }

  // 7. AUDIT (OWASP Compliance Score)
  if (action === 'audit') {
    const target = resolveTarget();
    if (!target.filename && !target.code) {
      return {
        type: 'output',
        lines: [
          `${ANSI.yellow}Usage: audit [filename]${ANSI.reset}`,
          `No target file specified and no active file open in editor.`
        ]
      };
    }

    const lines = [
      `${ANSI.bold}${ANSI.brightPurple}[Cypher OWASP Security Audit]${ANSI.reset} Auditing: ${ANSI.bold}${target.filename}${ANSI.reset}...`
    ];

    try {
      let analysis;
      if (target.code) {
        analysis = await runSecurityScan(target.code, target.filename);
      } else {
        const res = await scanCodebaseFile(target.filename, workspacePath);
        analysis = res;
      }

      const findings = analysis.findings || [];
      const criticalCount = findings.filter(f => f.severity === 'CRITICAL').length;
      const highCount = findings.filter(f => f.severity === 'HIGH').length;
      const mediumCount = findings.filter(f => f.severity === 'MEDIUM').length;
      const lowCount = findings.filter(f => f.severity === 'LOW').length;

      // Calculate compliance score (0-100)
      let score = 100 - (criticalCount * 30 + highCount * 15 + mediumCount * 5 + lowCount * 2);
      if (score < 0) score = 0;

      let scoreColor = ANSI.green;
      if (score < 60) scoreColor = ANSI.red;
      else if (score < 80) scoreColor = ANSI.yellow;

      lines.push(
        `${ANSI.dim}───────────────────────────────────────────────────────────────────${ANSI.reset}`,
        `  ${ANSI.bold}OWASP Compliance Score:${ANSI.reset} ${scoreColor}${score}/100${ANSI.reset}`,
        `  ${ANSI.bold}Posture Assessment:${ANSI.reset}     ${score >= 80 ? `${ANSI.green}PASS - Low Risk${ANSI.reset}` : score >= 60 ? `${ANSI.yellow}WARNING - Moderate Risk${ANSI.reset}` : `${ANSI.red}FAIL - High Risk Action Required${ANSI.reset}`}`,
        `  ${ANSI.bold}Findings Breakdown:${ANSI.reset}     Critical: ${criticalCount} | High: ${highCount} | Medium: ${mediumCount} | Low: ${lowCount}`,
        `${ANSI.dim}───────────────────────────────────────────────────────────────────${ANSI.reset}`
      );

      if (findings.length > 0) {
        lines.push(`${ANSI.bold}Key Vulnerabilities Identified:${ANSI.reset}`);
        findings.slice(0, 5).forEach((f, i) => {
          lines.push(`  ${i + 1}. [${f.severity}] ${f.title || f.name} (Line ${f.line || '?'}) - ${f.cwe || 'OWASP'}`);
        });
        if (findings.length > 5) {
          lines.push(`  ${ANSI.dim}...and ${findings.length - 5} more issues. Run 'scan' for full details.${ANSI.reset}`);
        }
      } else {
        lines.push(`${ANSI.green}✔ No OWASP Top 10 violations detected in source.${ANSI.reset}`);
      }

      return { type: 'output', lines, analysis };
    } catch (err) {
      return {
        type: 'output',
        lines: [`${ANSI.red}[Error] Audit failed: ${err.message}${ANSI.reset}`]
      };
    }
  }

  // 8. SCAN (Full SAST Security Analysis)
  if (action === 'scan') {
    const target = resolveTarget();
    if (!target.filename && !target.code) {
      return {
        type: 'output',
        lines: [
          `${ANSI.yellow}Usage: scan [filename]${ANSI.reset}`,
          `Please provide a filename or open a source file in the editor.`
        ]
      };
    }

    const lines = [
      `${ANSI.bold}${ANSI.brightPurple}[Cypher SAST Scan]${ANSI.reset} Performing deep security analysis on: ${ANSI.bold}${target.filename}${ANSI.reset}...`
    ];

    try {
      let analysis;
      if (target.code) {
        analysis = await runSecurityScan(target.code, target.filename);
      } else {
        const res = await scanCodebaseFile(target.filename, workspacePath);
        analysis = res;
      }

      const findings = analysis.findings || [];
      const riskLevel = analysis.riskLevel || (findings.length > 0 ? (findings.some(f => f.severity === 'CRITICAL') ? 'CRITICAL' : 'HIGH') : 'SAFE');

      let riskBadge = `${ANSI.green}SAFE / CLEAN${ANSI.reset}`;
      if (riskLevel === 'CRITICAL') riskBadge = `${ANSI.brightRed}CRITICAL RISK${ANSI.reset}`;
      else if (riskLevel === 'HIGH') riskBadge = `${ANSI.red}HIGH RISK${ANSI.reset}`;
      else if (riskLevel === 'MEDIUM') riskBadge = `${ANSI.yellow}MEDIUM RISK${ANSI.reset}`;

      lines.push(
        `${ANSI.bold}Risk Assessment:${ANSI.reset} ${riskBadge}`,
        `${ANSI.bold}Total Findings:${ANSI.reset}  ${findings.length}`,
        `${ANSI.dim}───────────────────────────────────────────────────────────────────${ANSI.reset}`
      );

      if (findings.length === 0) {
        lines.push(
          `${ANSI.green}✔ Clean bill of health! No security vulnerabilities identified in ${target.filename}.${ANSI.reset}`
        );
      } else {
        findings.forEach((f, idx) => {
          const sevColor = f.severity === 'CRITICAL' ? ANSI.brightRed : f.severity === 'HIGH' ? ANSI.red : ANSI.yellow;
          lines.push(
            `  ${idx + 1}. ${sevColor}[${f.severity || 'SECURITY'}]${ANSI.reset} ${ANSI.bold}${f.title || f.name}${ANSI.reset} ${ANSI.dim}(Line ${f.line || '?'})${ANSI.reset}`,
            `     ${ANSI.dim}CWE:${ANSI.reset} ${f.cwe || 'CWE-Unknown'}`,
            f.snippet ? `     ${ANSI.yellow}Code:${ANSI.reset} ${f.snippet.trim()}` : '',
            `     ${ANSI.cyan}Remediation:${ANSI.reset} ${f.remediation || f.description || 'Apply secure coding pattern'}`
          );
        });
      }

      return { type: 'output', lines, analysis };
    } catch (err) {
      return {
        type: 'output',
        lines: [`${ANSI.red}[Error] Security scan failed: ${err.message}${ANSI.reset}`]
      };
    }
  }

  // 9. CHAT / AI INQUIRY
  if (action === 'chat' || action === 'ask' || !['scan', 'audit', 'secrets', 'runtimes', 'help', 'status', 'explain'].includes(action)) {
    const userPrompt = action === 'chat' || action === 'ask' ? args.join(' ') : trimmed;
    if (!userPrompt) {
      return {
        type: 'output',
        lines: [`${ANSI.yellow}Usage: chat <your security or code question>${ANSI.reset}`]
      };
    }

    try {
      const response = await sendChatMessage(
        [{ role: 'user', content: userPrompt }],
        'meta-llama/Llama-3.1-8B-Instruct',
        'security',
        activeFile ? { name: activeFile.name, content: activeFile.content } : null
      );
      const text = response.message || response.content || 'No response received from Cypher AI.';
      const cleanLines = text.replace(/\r\n/g, '\n').split('\n');
      return {
        type: 'output',
        lines: [
          `${ANSI.bold}${ANSI.brightPurple}[Cypher AI Response]${ANSI.reset}`,
          `${ANSI.dim}───────────────────────────────────────────────────────────────────${ANSI.reset}`,
          ...cleanLines,
          `${ANSI.dim}───────────────────────────────────────────────────────────────────${ANSI.reset}`
        ]
      };
    } catch (err) {
      return {
        type: 'output',
        lines: [`${ANSI.red}[Cypher AI Error] ${err.message}${ANSI.reset}`]
      };
    }
  }

  return {
    type: 'output',
    lines: [
      `${ANSI.red}Unknown Cypher command: '${action}'${ANSI.reset}`,
      `Type ${ANSI.cyan}'help'${ANSI.reset} for a list of available security commands.`
    ]
  };
}
