"""
Hyperion IDE - Secret Leak Testing Engine (Gitleaks)
Detects hardcoded secrets, API tokens, private keys, and credentials across the codebase.
Attempts CLI gitleaks first, with a comprehensive native Gitleaks-rule engine fallback.
"""
import os
import re
import json
import shutil
import subprocess
from pathlib import Path
from typing import Dict, Any, List, Set, Optional

from backend.config import PROJECT_ROOT

GITLEAKS_RULES = [
    {
        "id": "aws-access-token",
        "description": "AWS Access Key ID",
        "regex": re.compile(r"\b(AKIA[0-9A-Z]{16})\b"),
        "severity": "CRITICAL",
        "secret_type": "AWS Access Key"
    },
    {
        "id": "github-pat",
        "description": "GitHub Personal Access Token",
        "regex": re.compile(r"\b(ghp_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9_]{82})\b"),
        "severity": "CRITICAL",
        "secret_type": "GitHub Token"
    },
    {
        "id": "github-oauth",
        "description": "GitHub OAuth / App Token",
        "regex": re.compile(r"\b((?:gho|ghu|ghs|ghr)_[a-zA-Z0-9]{36})\b"),
        "severity": "HIGH",
        "secret_type": "GitHub OAuth Key"
    },
    {
        "id": "private-key",
        "description": "Asymmetric Private Key Block",
        "regex": re.compile(r"(-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----)"),
        "severity": "CRITICAL",
        "secret_type": "Private Key"
    },
    {
        "id": "huggingface-token",
        "description": "Hugging Face Access Token",
        "regex": re.compile(r"\b(hf_[a-zA-Z0-9]{34,})\b"),
        "severity": "HIGH",
        "secret_type": "Hugging Face Key"
    },
    {
        "id": "openai-api-key",
        "description": "OpenAI / LLM API Key",
        "regex": re.compile(r"\b(sk-[a-zA-Z0-9]{32,}|sk-proj-[a-zA-Z0-9_-]{40,})\b"),
        "severity": "CRITICAL",
        "secret_type": "OpenAI API Key"
    },
    {
        "id": "slack-token",
        "description": "Slack Bot / User Token or Webhook",
        "regex": re.compile(r"(https:\/\/hooks\.slack\.com\/services\/[A-Za-z0-9_\-\/]+|\bxox[baprs]-[0-9a-zA-Z]{10,48}\b)"),
        "severity": "HIGH",
        "secret_type": "Slack Token"
    },
    {
        "id": "database-connection-uri",
        "description": "Database Connection String with Embedded Credentials",
        "regex": re.compile(r"((?:mongodb(?:\+srv)?|postgres|postgresql|mysql):\/\/[a-zA-Z0-9_\-]+:[^@\s\"']+@[a-zA-Z0-9._\-]+)"),
        "severity": "CRITICAL",
        "secret_type": "Database URI"
    },
    {
        "id": "stripe-secret-key",
        "description": "Stripe Live Secret Key",
        "regex": re.compile(r"\b(sk_live_[0-9a-zA-Z]{24,})\b"),
        "severity": "CRITICAL",
        "secret_type": "Stripe Key"
    },
    {
        "id": "generic-api-key",
        "description": "Hardcoded API Key / JWT Secret Assignment",
        "regex": re.compile(r"(?:api_?key|access_?token|auth_?token|jwt_secret|client_secret)\s*[:=]\s*[\"']([a-zA-Z0-9_\-\.]{16,})[\"']", re.IGNORECASE),
        "severity": "HIGH",
        "secret_type": "Generic Secret"
    }
]

IGNORED_DIRS: Set[str] = {
    'node_modules', '.git', '.svn', 'dist', 'build', '.next', '.nuxt',
    'coverage', '.vscode', '.idea', 'logs', 'tmp', 'temp', 'scratch',
    '__pycache__', 'venv', '.venv', '.hyperion_sandbox'
}

SCANNABLE_EXTS: Set[str] = {
    '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs',
    '.py', '.c', '.cpp', '.h', '.hpp',
    '.html', '.css', '.json', '.yaml', '.yml', '.md', '.sql', '.sh', '.bash',
    '.env', '.env.local', '.env.development'
}

def mask_secret(secret: str) -> str:
    """Mask a secret showing only the first 4 and last 2 characters."""
    if len(secret) <= 8:
        return "********"
    return secret[:4] + "*" * (len(secret) - 6) + secret[-2:]

def run_gitleaks_scan(
    workspace_path: Optional[str] = None,
    scan_git_history: bool = False
) -> Dict[str, Any]:
    """Execute secret detection using gitleaks CLI or native Gitleaks-compatible scanner."""
    if not workspace_path:
        workspace_path = str(PROJECT_ROOT)
    root = Path(workspace_path).resolve()

    # 1. Try native gitleaks CLI if installed
    gitleaks_bin = shutil.which("gitleaks")
    if gitleaks_bin:
        cmd = [gitleaks_bin, "detect", f"--source={str(root)}", "--report-format=json", "--no-banner"]
        if not scan_git_history:
            cmd.append("--no-git")
        try:
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            if res.stdout.strip():
                start_idx = res.stdout.find("[")
                end_idx = res.stdout.rfind("]")
                if start_idx >= 0 and end_idx > start_idx:
                    parsed = json.loads(res.stdout[start_idx:end_idx + 1])
                    return {
                        "engine": "cli-gitleaks",
                        "total_leaks": len(parsed),
                        "findings": parsed,
                        "workspace": str(root)
                    }
        except Exception:
            pass

    # 2. Native Gitleaks-Compliant Rule Scanner Fallback
    findings = []
    scanned_files = 0

    for path in sorted(root.rglob('*')):
        if path.is_dir() or any(p in IGNORED_DIRS for p in path.parts):
            continue
        ext = path.suffix.lower()
        if ext not in SCANNABLE_EXTS and not path.name.startswith(".env"):
            continue

        try:
            rel_path = str(path.relative_to(root)).replace('\\', '/')
            # Don't scan test report artifacts themselves to avoid self-reporting
            if "FINAL_STATIC_ANALYSIS_REPORT" in rel_path or "reports/" in rel_path:
                continue

            content = path.read_text(encoding='utf-8', errors='ignore')
            lines = content.splitlines()
            scanned_files += 1

            for line_idx, line in enumerate(lines, 1):
                # Skip comments that look like generic documentation or examples
                if "example" in line.lower() and ("dummy" in line.lower() or "your_" in line.lower() or "secret_name" in line.lower()):
                    continue

                for rule in GITLEAKS_RULES:
                    match = rule["regex"].search(line)
                    if match:
                        raw_secret = match.group(1) if match.groups() else match.group(0)
                        masked = mask_secret(raw_secret)
                        snippet = line.replace(raw_secret, masked).strip()[:140]

                        findings.append({
                            "rule_id": rule["id"],
                            "secret_type": rule["secret_type"],
                            "description": rule["description"],
                            "severity": rule["severity"],
                            "file": rel_path,
                            "line": line_idx,
                            "masked_secret": masked,
                            "snippet": snippet,
                            "remediation": "Revoke secret immediately, rotate credentials, and store in environment variables or a vault."
                        })
        except Exception:
            pass

    severity_counts = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0}
    for f in findings:
        severity_counts[f["severity"]] = severity_counts.get(f["severity"], 0) + 1

    return {
        "engine": "hyperion-native-gitleaks",
        "workspace": str(root),
        "files_scanned": scanned_files,
        "total_leaks": len(findings),
        "severity_summary": severity_counts,
        "findings": findings
    }
