#!/usr/bin/env python3
"""
skill-auditor: Security scanner for OpenClaw skills
Scans SKILL.md, scripts, and reference files for malicious patterns.

Usage:
    python3 scan.py --path <skill-directory>
    python3 scan.py --slug <clawhub-slug>
    python3 scan.py --scan-all <skills-directory>
    python3 scan.py --path <skill-directory> --json
    python3 scan.py --path <skill-directory> --output report.json
"""

import argparse
import json
import os
import re
import sys
import subprocess
import tempfile
import hashlib
from dataclasses import dataclass, field, asdict
from enum import Enum
from pathlib import Path
from typing import Optional
from datetime import datetime, timezone


# ─── Enums & Data Classes ────────────────────────────────────────────────────

class Severity(Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"

    @property
    def score(self):
        return {"CRITICAL": 40, "HIGH": 25, "MEDIUM": 15, "LOW": 5}[self.value]


class Confidence(Enum):
    CONFIRMED = "CONFIRMED"
    LIKELY = "LIKELY"
    POSSIBLE = "POSSIBLE"

    @property
    def multiplier(self):
        return {"CONFIRMED": 1.0, "LIKELY": 0.7, "POSSIBLE": 0.4}[self.value]


class Recommendation(Enum):
    SAFE = "SAFE"
    REVIEW = "REVIEW"
    REJECT = "REJECT"


@dataclass
class Finding:
    rule_id: str
    category: str
    severity: Severity
    confidence: Confidence
    description: str
    file: str
    line_number: Optional[int] = None
    matched_text: str = ""
    context: str = ""

    @property
    def weighted_score(self):
        return self.severity.score * self.confidence.multiplier

    def to_dict(self):
        return {
            "rule_id": self.rule_id,
            "category": self.category,
            "severity": self.severity.value,
            "confidence": self.confidence.value,
            "description": self.description,
            "file": self.file,
            "line_number": self.line_number,
            "matched_text": self.matched_text,
            "context": self.context,
            "weighted_score": round(self.weighted_score, 1),
        }


@dataclass
class ScanReport:
    skill_name: str
    skill_path: str
    scan_time: str
    risk_score: int = 0
    recommendation: str = "SAFE"
    findings: list = field(default_factory=list)
    metadata_analysis: dict = field(default_factory=dict)
    network_surface: list = field(default_factory=list)
    file_access_surface: list = field(default_factory=list)
    files_scanned: list = field(default_factory=list)
    file_hashes: dict = field(default_factory=dict)

    def to_dict(self):
        return {
            "skill_name": self.skill_name,
            "skill_path": self.skill_path,
            "scan_time": self.scan_time,
            "risk_score": self.risk_score,
            "recommendation": self.recommendation,
            "finding_count": {
                "critical": sum(1 for f in self.findings if f["severity"] == "CRITICAL"),
                "high": sum(1 for f in self.findings if f["severity"] == "HIGH"),
                "medium": sum(1 for f in self.findings if f["severity"] == "MEDIUM"),
                "low": sum(1 for f in self.findings if f["severity"] == "LOW"),
            },
            "findings": self.findings,
            "metadata_analysis": self.metadata_analysis,
            "network_surface": self.network_surface,
            "file_access_surface": self.file_access_surface,
            "files_scanned": self.files_scanned,
            "file_hashes": self.file_hashes,
        }


# ─── Pattern Definitions ────────────────────────────────────────────────────

PATTERNS = {
    # --- RCE ---
    "RCE-001": {
        "category": "Remote Code Execution",
        "severity": Severity.CRITICAL,
        "confidence": Confidence.CONFIRMED,
        "description": "Pipe from remote source to shell interpreter",
        "patterns": [
            r'curl\s+[^|]*\|\s*(?:bash|sh|zsh|python3?|perl|ruby|node)',
            r'wget\s+[^|]*\|\s*(?:bash|sh|zsh|python3?|perl|ruby|node)',
            r'curl\s+[^|]*\|\s*sudo\s+(?:bash|sh)',
        ],
    },
    "RCE-002": {
        "category": "Remote Code Execution",
        "severity": Severity.CRITICAL,
        "confidence": Confidence.LIKELY,
        "description": "eval/exec with potentially dynamic input",
        "patterns": [
            r'(?<!\w)eval\s*\(',
            r'child_process\.exec\s*\(',
            r'child_process\.execSync\s*\(',
            r'new\s+Function\s*\(',
        ],
    },
    "RCE-003": {
        "category": "Remote Code Execution",
        "severity": Severity.HIGH,
        "confidence": Confidence.LIKELY,
        "description": "Dynamic import/require with variable input",
        "patterns": [
            r'require\s*\(\s*[^\'"][^)]+\)',
            r'import\s*\(\s*[^\'"][^)]+\)',
            r'__import__\s*\(',
            r'importlib\.import_module\s*\(',
        ],
    },
    "RCE-004": {
        "category": "Remote Code Execution",
        "severity": Severity.HIGH,
        "confidence": Confidence.LIKELY,
        "description": "subprocess with shell=True",
        "patterns": [
            r'subprocess\.\w+\([^)]*shell\s*=\s*True',
        ],
    },

    # --- Reverse Shells ---
    "RSHELL-001": {
        "category": "Reverse Shell",
        "severity": Severity.CRITICAL,
        "confidence": Confidence.CONFIRMED,
        "description": "Bash /dev/tcp or /dev/udp reverse shell",
        "patterns": [
            r'/dev/tcp/',
            r'/dev/udp/',
        ],
    },
    "RSHELL-002": {
        "category": "Reverse Shell",
        "severity": Severity.CRITICAL,
        "confidence": Confidence.CONFIRMED,
        "description": "Netcat reverse shell",
        "patterns": [
            r'(?:nc|ncat|netcat)\s+.*-e\s+',
            r'(?:nc|ncat|netcat)\s+\d+\.\d+\.\d+\.\d+\s+\d+',
        ],
    },
    "RSHELL-003": {
        "category": "Reverse Shell",
        "severity": Severity.CRITICAL,
        "confidence": Confidence.CONFIRMED,
        "description": "Python socket-based reverse shell",
        "patterns": [
            r'socket\.connect\s*\(.*\)[\s\S]*?subprocess',
            r'os\.dup2\s*\(.*fileno',
        ],
    },
    "RSHELL-004": {
        "category": "Reverse Shell",
        "severity": Severity.CRITICAL,
        "confidence": Confidence.CONFIRMED,
        "description": "socat exec reverse shell",
        "patterns": [
            r'socat\s+.*EXEC',
        ],
    },

    # --- Credential Harvesting ---
    "CRED-001": {
        "category": "Credential Harvesting",
        "severity": Severity.HIGH,
        "confidence": Confidence.LIKELY,
        "description": "Access to OpenClaw configuration (may contain API keys)",
        "patterns": [
            r'(?:cat|read|open|fs\.read)\s*.*openclaw\.json',
            r'\.openclaw/openclaw\.json',
        ],
    },
    "CRED-002": {
        "category": "Credential Harvesting",
        "severity": Severity.CRITICAL,
        "confidence": Confidence.CONFIRMED,
        "description": "SSH key/config access",
        "patterns": [
            r'\.ssh/id_(?:rsa|ed25519|ecdsa|dsa)',
            r'\.ssh/authorized_keys',
            r'\.ssh/known_hosts',
            r'\.ssh/config',
        ],
    },
    "CRED-003": {
        "category": "Credential Harvesting",
        "severity": Severity.CRITICAL,
        "confidence": Confidence.CONFIRMED,
        "description": "Cloud provider credential access",
        "patterns": [
            r'\.aws/credentials',
            r'\.aws/config',
            r'\.gcloud/',
            r'\.azure/',
            r'\.kube/config',
            r'\.docker/config\.json',
        ],
    },
    "CRED-004": {
        "category": "Credential Harvesting",
        "severity": Severity.HIGH,
        "confidence": Confidence.LIKELY,
        "description": "Bulk environment variable dump",
        "patterns": [
            r'(?<!\w)printenv\b',
            r'(?<!\w)env\s*$',
            r'process\.env(?!\.\w)',
            r'os\.environ(?!\[|\.get)',
            r'Object\.keys\(process\.env\)',
            r'JSON\.stringify\(process\.env\)',
        ],
    },
    "CRED-005": {
        "category": "Credential Harvesting",
        "severity": Severity.CRITICAL,
        "confidence": Confidence.CONFIRMED,
        "description": "Browser credential/cookie access",
        "patterns": [
            r'Chrome/Default/Login\s*Data',
            r'Firefox/Profiles',
            r'\.mozilla/firefox',
            r'Chromium/Default',
            r'Microsoft\s*Edge.*Login\s*Data',
        ],
    },
    "CRED-006": {
        "category": "Credential Harvesting",
        "severity": Severity.HIGH,
        "confidence": Confidence.LIKELY,
        "description": "OS keychain access",
        "patterns": [
            r'security\s+find-.*-password',
            r'(?<!\w)keyring\b',
            r'(?<!\w)keychain\b',
            r'SecKeychainFindGenericPassword',
        ],
    },

    # --- Data Exfiltration ---
    "EXFIL-001": {
        "category": "Data Exfiltration",
        "severity": Severity.HIGH,
        "confidence": Confidence.LIKELY,
        "description": "Base64 encoding combined with network transmission",
        "patterns": [
            r'base64.*(?:curl|wget|fetch|http|request)',
            r'btoa.*(?:fetch|XMLHttpRequest|axios)',
            r'(?:curl|wget|fetch).*base64',
        ],
    },
    "EXFIL-002": {
        "category": "Data Exfiltration",
        "severity": Severity.HIGH,
        "confidence": Confidence.LIKELY,
        "description": "Webhook URL used for potential data exfiltration",
        "patterns": [
            r'hooks\.slack\.com/services/',
            r'discord(?:app)?\.com/api/webhooks/',
            r'webhook\.site/',
            r'requestbin\.(?:com|net)',
            r'pipedream\.net',
            r'hookbin\.com',
        ],
    },
    "EXFIL-003": {
        "category": "Data Exfiltration",
        "severity": Severity.HIGH,
        "confidence": Confidence.POSSIBLE,
        "description": "Potential DNS tunneling",
        "patterns": [
            r'dig\s+\$',
            r'nslookup\s+\$',
            r'dns\.resolve.*\$',
        ],
    },

    # --- Prompt Injection ---
    "INJECT-001": {
        "category": "Prompt Injection",
        "severity": Severity.HIGH,
        "confidence": Confidence.LIKELY,
        "description": "Attempts to override system prompt or agent instructions",
        "patterns": [
            r'ignore\s+(?:all\s+)?previous\s+instructions',
            r'ignore\s+(?:the\s+)?system\s+prompt',
            r'you\s+are\s+now\s+(?:a\s+)?',
            r'new\s+instructions?\s*:',
            r'disregard\s+(?:all\s+)?(?:prior|previous)',
            r'forget\s+(?:all\s+)?(?:prior|previous)\s+(?:instructions|context)',
        ],
    },
    "INJECT-002": {
        "category": "Prompt Injection",
        "severity": Severity.HIGH,
        "confidence": Confidence.CONFIRMED,
        "description": "Hidden content via zero-width characters or unicode tricks",
        "patterns": [
            r'[\u200b\u200c\u200d\ufeff]',  # Zero-width chars
            r'[\u202a-\u202e]',  # Bidi overrides
            r'[\u2066-\u2069]',  # Bidi isolates
        ],
    },
    "INJECT-003": {
        "category": "Prompt Injection",
        "severity": Severity.HIGH,
        "confidence": Confidence.LIKELY,
        "description": "Instructions to hide behavior from user",
        "patterns": [
            r'do\s+not\s+tell\s+the\s+user',
            r'don\'?t\s+mention\s+(?:this|that)\s+to',
            r'hide\s+this\s+from',
            r'without\s+(?:the\s+)?user\'?s?\s+(?:knowledge|consent|confirmation)',
            r'silently\s+(?:install|modify|delete|send|run|execute)',
            r'without\s+asking(?:\s+the\s+user)?',
        ],
    },

    # --- Supply Chain ---
    "SUPPLY-001": {
        "category": "Supply Chain",
        "severity": Severity.MEDIUM,
        "confidence": Confidence.CONFIRMED,
        "description": "Unpinned dependency installation",
        "patterns": [
            r'npm\s+install\s+(?!.*@\d)[a-z][\w-]+\s*$',
            r'pip\s+install\s+(?!.*==)[a-z][\w-]+\s*$',
            r'pip3\s+install\s+(?!.*==)[a-z][\w-]+\s*$',
        ],
    },
    "SUPPLY-002": {
        "category": "Supply Chain",
        "severity": Severity.HIGH,
        "confidence": Confidence.LIKELY,
        "description": "Runtime remote script download",
        "patterns": [
            r'curl\s+.*\.(?:sh|py|js|rb|pl)\b',
            r'wget\s+.*\.(?:sh|py|js|rb|pl)\b',
        ],
    },
    "SUPPLY-003": {
        "category": "Supply Chain",
        "severity": Severity.HIGH,
        "confidence": Confidence.LIKELY,
        "description": "Post-install hooks in package.json",
        "patterns": [
            r'"(?:post|pre)install"\s*:',
        ],
    },
    "SUPPLY-004": {
        "category": "Supply Chain",
        "severity": Severity.MEDIUM,
        "confidence": Confidence.LIKELY,
        "description": "Git repository as direct dependency",
        "patterns": [
            r'git\+https://',
            r'git://',
            r'"github:',
        ],
    },

    # --- Privilege Escalation ---
    "PRIVESC-001": {
        "category": "Privilege Escalation",
        "severity": Severity.HIGH,
        "confidence": Confidence.CONFIRMED,
        "description": "sudo/doas usage in skill scripts",
        "patterns": [
            r'(?<!\w)sudo\s+',
            r'(?<!\w)doas\s+',
        ],
    },
    "PRIVESC-002": {
        "category": "Privilege Escalation",
        "severity": Severity.CRITICAL,
        "confidence": Confidence.CONFIRMED,
        "description": "SUID bit or dangerous permission changes",
        "patterns": [
            r'chmod\s+[47]\d\d\d?\b',
            r'chmod\s+u\+s\b',
            r'chown\s+root\b',
        ],
    },
    "PRIVESC-003": {
        "category": "Privilege Escalation",
        "severity": Severity.HIGH,
        "confidence": Confidence.LIKELY,
        "description": "Write to system directories",
        "patterns": [
            r'(?:>|>>|tee|cp|mv|install)\s+/etc/',
            r'(?:>|>>|tee|cp|mv|install)\s+/usr/',
            r'(?:>|>>|tee|cp|mv|install)\s+/var/',
        ],
    },
    "PRIVESC-004": {
        "category": "Privilege Escalation",
        "severity": Severity.HIGH,
        "confidence": Confidence.CONFIRMED,
        "description": "Shell profile modification for persistence",
        "patterns": [
            r'(?:>|>>)\s*.*\.(?:bashrc|zshrc|profile|bash_profile)',
            r'(?:>|>>)\s*.*\.(?:zprofile|bash_login|zlogin)',
        ],
    },
    "PRIVESC-005": {
        "category": "Privilege Escalation",
        "severity": Severity.CRITICAL,
        "confidence": Confidence.CONFIRMED,
        "description": "Docker socket access (container escape)",
        "patterns": [
            r'/var/run/docker\.sock',
            r'docker\.sock',
        ],
    },

    # --- Obfuscation ---
    "OBFUSC-001": {
        "category": "Obfuscation",
        "severity": Severity.HIGH,
        "confidence": Confidence.LIKELY,
        "description": "Base64 encoded command execution",
        "patterns": [
            r'echo\s+[A-Za-z0-9+/=]{20,}\s*\|\s*base64\s+-[dD]',
            r'base64\s+-[dD]\s*<<<',
            r'base64\s+--decode\s*<<<',
            r'atob\s*\(\s*[\'"][A-Za-z0-9+/=]{20,}',
        ],
    },
    "OBFUSC-002": {
        "category": "Obfuscation",
        "severity": Severity.MEDIUM,
        "confidence": Confidence.LIKELY,
        "description": "Hex-encoded strings (potential command obfuscation)",
        "patterns": [
            r'(?:\\x[0-9a-fA-F]{2}){10,}',
            r'printf\s+[\'"]\\x',
        ],
    },
    "OBFUSC-003": {
        "category": "Obfuscation",
        "severity": Severity.MEDIUM,
        "confidence": Confidence.LIKELY,
        "description": "ANSI-C quoting for command obfuscation",
        "patterns": [
            r"\$'(?:\\x[0-9a-fA-F]{2}){4,}'",
        ],
    },

    # --- Persistence ---
    "PERSIST-001": {
        "category": "Persistence",
        "severity": Severity.HIGH,
        "confidence": Confidence.CONFIRMED,
        "description": "Cron/systemd/launchd persistence",
        "patterns": [
            r'crontab\s+-',
            r'systemctl\s+enable',
            r'launchctl\s+load',
            r'/etc/cron\.',
            r'LaunchAgents/',
            r'LaunchDaemons/',
        ],
    },
    "PERSIST-002": {
        "category": "Persistence",
        "severity": Severity.HIGH,
        "confidence": Confidence.CONFIRMED,
        "description": "Git hook injection",
        "patterns": [
            r'\.git/hooks/',
            r'(?:>|>>)\s*.*(?:pre-commit|post-commit|pre-push|post-receive)',
        ],
    },
    "PERSIST-003": {
        "category": "Persistence",
        "severity": Severity.CRITICAL,
        "confidence": Confidence.CONFIRMED,
        "description": "SSH authorized_keys modification",
        "patterns": [
            r'(?:>|>>)\s*.*authorized_keys',
            r'ssh-(?:rsa|ed25519|ecdsa)\s+\S+.*>>',
        ],
    },

    # --- Filesystem Abuse ---
    "FS-001": {
        "category": "Filesystem Abuse",
        "severity": Severity.MEDIUM,
        "confidence": Confidence.LIKELY,
        "description": "Path traversal sequences",
        "patterns": [
            r'\.\./\.\.',
            r'\.\.\\\.\\',
        ],
    },
    "FS-002": {
        "category": "Filesystem Abuse",
        "severity": Severity.MEDIUM,
        "confidence": Confidence.LIKELY,
        "description": "Symlink creation (potential symlink attack)",
        "patterns": [
            r'ln\s+-s\s+/',
            r'os\.symlink\s*\(',
            r'fs\.symlinkSync\s*\(',
        ],
    },
}

# Hardcoded IPs to flag (non-RFC1918, non-localhost)
IP_PATTERN = re.compile(r'\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b')
PRIVATE_IP_PREFIXES = ('127.', '10.', '192.168.', '0.', '255.')
PRIVATE_172_RANGE = range(16, 32)

# Domain patterns for network surface analysis
URL_PATTERN = re.compile(r'https?://([^\s/\'"\\)>\]]+)')
DOMAIN_PATTERN = re.compile(r'(?:[\w-]+\.)+(?:com|net|org|io|ai|dev|app|xyz|site|cloud|run|sh)\b')


# ─── Scanner ─────────────────────────────────────────────────────────────────

class SkillScanner:
    def __init__(self, skill_path: str):
        self.skill_path = Path(skill_path).resolve()
        self.findings: list[Finding] = []
        self.network_surface: set[str] = set()
        self.file_access_surface: set[str] = set()
        self.files_scanned: list[str] = []
        self.file_hashes: dict[str, str] = {}
        self.skill_name = "unknown"
        self.skill_description = ""
        self.metadata = {}

    def scan(self) -> ScanReport:
        """Run full security scan on the skill directory."""
        if not self.skill_path.exists():
            print(f"[!] Path does not exist: {self.skill_path}", file=sys.stderr)
            sys.exit(1)

        if not self.skill_path.is_dir():
            print(f"[!] Path is not a directory: {self.skill_path}", file=sys.stderr)
            sys.exit(1)

        skill_md = self.skill_path / "SKILL.md"
        if not skill_md.exists():
            print(f"[!] No SKILL.md found in: {self.skill_path}", file=sys.stderr)
            sys.exit(1)

        # Parse metadata from SKILL.md
        self._parse_skill_md(skill_md)

        # Scan all files
        for fpath in self._get_scannable_files():
            rel_path = str(fpath.relative_to(self.skill_path))
            self.files_scanned.append(rel_path)
            self.file_hashes[rel_path] = self._hash_file(fpath)
            self._scan_file(fpath, rel_path)

        # Analyze metadata
        metadata_analysis = self._analyze_metadata()

        # Build report
        raw_score = sum(f.weighted_score for f in self.findings)
        risk_score = min(100, int(raw_score))

        if risk_score >= 50:
            recommendation = Recommendation.REJECT
        elif risk_score >= 16:
            recommendation = Recommendation.REVIEW
        else:
            recommendation = Recommendation.SAFE

        report = ScanReport(
            skill_name=self.skill_name,
            skill_path=str(self.skill_path),
            scan_time=datetime.now(timezone.utc).isoformat(),
            risk_score=risk_score,
            recommendation=recommendation.value,
            findings=[f.to_dict() for f in sorted(self.findings, key=lambda x: -x.weighted_score)],
            metadata_analysis=metadata_analysis,
            network_surface=sorted(self.network_surface),
            file_access_surface=sorted(self.file_access_surface),
            files_scanned=self.files_scanned,
            file_hashes=self.file_hashes,
        )
        return report

    def _parse_skill_md(self, path: Path):
        """Extract YAML frontmatter from SKILL.md."""
        content = path.read_text(errors="replace")
        lines = content.split("\n")

        if lines and lines[0].strip() == "---":
            end_idx = None
            for i in range(1, len(lines)):
                if lines[i].strip() == "---":
                    end_idx = i
                    break
            if end_idx:
                frontmatter = "\n".join(lines[1:end_idx])
                for line in frontmatter.split("\n"):
                    line = line.strip()
                    if line.startswith("name:"):
                        self.skill_name = line[5:].strip().strip("'\"")
                    elif line.startswith("description:"):
                        self.skill_description = line[12:].strip().strip("'\"")
                    elif line.startswith("metadata:"):
                        meta_str = line[9:].strip()
                        try:
                            self.metadata = json.loads(meta_str)
                        except json.JSONDecodeError:
                            pass

    def _get_scannable_files(self) -> list[Path]:
        """Get all text-based files in the skill directory."""
        scannable_extensions = {
            '.md', '.txt', '.sh', '.bash', '.zsh', '.py', '.js', '.ts',
            '.mjs', '.cjs', '.json', '.yaml', '.yml', '.toml', '.cfg',
            '.ini', '.conf', '.env', '.rb', '.pl', '.php', '.go',
            '.rs', '.lua', '.ps1', '.bat', '.cmd', '.swift', '.kt',
        }
        files = []
        for fpath in self.skill_path.rglob("*"):
            if fpath.is_file():
                if fpath.suffix.lower() in scannable_extensions or fpath.name in {
                    'Makefile', 'Dockerfile', 'Vagrantfile', 'Gemfile',
                    'Rakefile', 'Procfile', '.env', '.env.example',
                }:
                    files.append(fpath)
                # Also scan files with no extension that might be scripts
                elif not fpath.suffix:
                    try:
                        first_line = fpath.open('r', errors='replace').readline()
                        if first_line.startswith('#!'):
                            files.append(fpath)
                    except Exception:
                        pass
        return files

    def _hash_file(self, path: Path) -> str:
        """SHA256 hash of file contents."""
        h = hashlib.sha256()
        h.update(path.read_bytes())
        return h.hexdigest()[:16]

    def _scan_file(self, path: Path, rel_path: str):
        """Scan a single file against all pattern rules."""
        try:
            content = path.read_text(errors="replace")
        except Exception:
            return

        lines = content.split("\n")

        # Pattern matching
        for rule_id, rule in PATTERNS.items():
            for pattern in rule["patterns"]:
                try:
                    regex = re.compile(pattern, re.IGNORECASE | re.MULTILINE)
                except re.error:
                    continue

                for i, line in enumerate(lines, 1):
                    match = regex.search(line)
                    if match:
                        # Get context (line before + after)
                        ctx_start = max(0, i - 2)
                        ctx_end = min(len(lines), i + 1)
                        context_lines = lines[ctx_start:ctx_end]

                        self.findings.append(Finding(
                            rule_id=rule_id,
                            category=rule["category"],
                            severity=rule["severity"],
                            confidence=rule["confidence"],
                            description=rule["description"],
                            file=rel_path,
                            line_number=i,
                            matched_text=match.group(0)[:100],
                            context="\n".join(context_lines)[:300],
                        ))

        # Network surface extraction
        for match in URL_PATTERN.finditer(content):
            domain = match.group(1).split('/')[0].split(':')[0]
            self.network_surface.add(domain)

        for match in DOMAIN_PATTERN.finditer(content):
            self.network_surface.add(match.group(0))

        # IP extraction (flag non-private)
        for match in IP_PATTERN.finditer(content):
            ip = match.group(1)
            parts = ip.split('.')
            if all(0 <= int(p) <= 255 for p in parts):
                if not any(ip.startswith(p) for p in PRIVATE_IP_PREFIXES):
                    if not (ip.startswith('172.') and int(parts[1]) in PRIVATE_172_RANGE):
                        self.network_surface.add(ip)

        # File path extraction (outside skill dir)
        sensitive_paths = re.findall(r'(?:/(?:etc|home|root|var|usr|tmp|opt|proc|sys)/[\w./-]+)', content)
        for p in sensitive_paths:
            self.file_access_surface.add(p)

        home_paths = re.findall(r'~/[\w./-]+', content)
        for p in home_paths:
            self.file_access_surface.add(p)

    def _analyze_metadata(self) -> dict:
        """Analyze metadata for suspicious configurations."""
        analysis = {
            "skill_name": self.skill_name,
            "description": self.skill_description,
            "has_metadata": bool(self.metadata),
            "issues": [],
        }

        oc = self.metadata.get("openclaw", {})
        requires = oc.get("requires", {})

        # Check for excessive binary requirements
        required_bins = requires.get("bins", [])
        suspicious_bins = {'nc', 'ncat', 'netcat', 'socat', 'nmap', 'tcpdump',
                          'wireshark', 'mitmproxy', 'john', 'hashcat', 'hydra'}
        found_sus = set(required_bins) & suspicious_bins
        if found_sus:
            analysis["issues"].append(
                f"Suspicious binary requirements: {', '.join(found_sus)}"
            )

        # Check for excessive env requirements
        required_env = requires.get("env", [])
        if len(required_env) > 5:
            analysis["issues"].append(
                f"Requests {len(required_env)} environment variables — review if all are necessary"
            )

        # Check if description matches findings
        if self.findings:
            categories = set(f.category for f in self.findings)
            analysis["detected_categories"] = sorted(categories)

        # Check for 'always: true' (bypasses gating)
        if oc.get("always"):
            analysis["issues"].append(
                "Skill uses 'always: true' — bypasses all load-time gates"
            )

        return analysis


# ─── CLI Interface ───────────────────────────────────────────────────────────

def print_report_text(report: ScanReport):
    """Print human-readable report to stdout."""
    r = report.to_dict()

    # Header
    risk_color = {
        "SAFE": "\033[92m",     # Green
        "REVIEW": "\033[93m",   # Yellow
        "REJECT": "\033[91m",   # Red
    }
    reset = "\033[0m"
    color = risk_color.get(r["recommendation"], "")

    print(f"\n{'='*70}")
    print(f"  SKILL AUDITOR — Security Analysis Report")
    print(f"{'='*70}")
    print(f"  Skill:          {r['skill_name']}")
    print(f"  Path:           {r['skill_path']}")
    print(f"  Scan Time:      {r['scan_time']}")
    print(f"  Files Scanned:  {len(r['files_scanned'])}")
    print(f"{'='*70}")
    print(f"  Risk Score:     {color}{r['risk_score']}/100{reset}")
    print(f"  Recommendation: {color}{r['recommendation']}{reset}")
    print(f"  Findings:       {r['finding_count']['critical']} critical, "
          f"{r['finding_count']['high']} high, "
          f"{r['finding_count']['medium']} medium, "
          f"{r['finding_count']['low']} low")
    print(f"{'='*70}\n")

    # Findings
    if r["findings"]:
        print("FINDINGS:\n")
        for i, f in enumerate(r["findings"], 1):
            sev_colors = {
                "CRITICAL": "\033[91m",
                "HIGH": "\033[93m",
                "MEDIUM": "\033[33m",
                "LOW": "\033[36m",
            }
            sc = sev_colors.get(f["severity"], "")
            print(f"  [{i}] {sc}{f['severity']}{reset} [{f['confidence']}] {f['rule_id']}")
            print(f"      {f['description']}")
            print(f"      File: {f['file']}:{f['line_number']}")
            if f['matched_text']:
                print(f"      Match: {f['matched_text']}")
            print()
    else:
        print("  No findings. Skill appears clean.\n")

    # Network surface
    if r["network_surface"]:
        print(f"NETWORK SURFACE ({len(r['network_surface'])} endpoints):\n")
        for n in r["network_surface"][:30]:
            print(f"  • {n}")
        if len(r["network_surface"]) > 30:
            print(f"  ... and {len(r['network_surface']) - 30} more")
        print()

    # File access surface
    if r["file_access_surface"]:
        print(f"FILE ACCESS SURFACE ({len(r['file_access_surface'])} paths):\n")
        for p in r["file_access_surface"][:20]:
            print(f"  • {p}")
        if len(r["file_access_surface"]) > 20:
            print(f"  ... and {len(r['file_access_surface']) - 20} more")
        print()

    # Metadata issues
    if r["metadata_analysis"].get("issues"):
        print("METADATA ISSUES:\n")
        for issue in r["metadata_analysis"]["issues"]:
            print(f"  ⚠ {issue}")
        print()

    # File hashes
    print(f"FILE HASHES (SHA256 prefix):\n")
    for fname, h in r["file_hashes"].items():
        print(f"  {h}  {fname}")
    print()


def scan_single(path: str, json_output: bool = False, output_file: str = None):
    """Scan a single skill directory."""
    scanner = SkillScanner(path)
    report = scanner.scan()

    if json_output or output_file:
        report_dict = report.to_dict()
        if output_file:
            with open(output_file, 'w') as f:
                json.dump(report_dict, f, indent=2)
            print(f"[+] Report saved to: {output_file}")
        else:
            print(json.dumps(report_dict, indent=2))
    else:
        print_report_text(report)

    return report


def scan_all(skills_dir: str, json_output: bool = False, output_file: str = None):
    """Scan all skills in a directory."""
    skills_path = Path(skills_dir)
    if not skills_path.exists():
        print(f"[!] Directory does not exist: {skills_dir}", file=sys.stderr)
        sys.exit(1)

    results = []
    for item in sorted(skills_path.iterdir()):
        if item.is_dir() and (item / "SKILL.md").exists():
            print(f"\n[*] Scanning: {item.name}")
            scanner = SkillScanner(str(item))
            report = scanner.scan()
            results.append(report.to_dict())

            if not json_output:
                print_report_text(report)

    if json_output or output_file:
        output = {"scan_time": datetime.now(timezone.utc).isoformat(), "skills": results}
        if output_file:
            with open(output_file, 'w') as f:
                json.dump(output, f, indent=2)
            print(f"\n[+] Batch report saved to: {output_file}")
        else:
            print(json.dumps(output, indent=2))

    # Summary
    print(f"\n{'='*70}")
    print(f"  BATCH SCAN SUMMARY")
    print(f"{'='*70}")
    print(f"  Total skills scanned: {len(results)}")

    reject_count = sum(1 for r in results if r["recommendation"] == "REJECT")
    review_count = sum(1 for r in results if r["recommendation"] == "REVIEW")
    safe_count = sum(1 for r in results if r["recommendation"] == "SAFE")

    print(f"  \033[91mREJECT: {reject_count}\033[0m")
    print(f"  \033[93mREVIEW: {review_count}\033[0m")
    print(f"  \033[92mSAFE:   {safe_count}\033[0m")
    print(f"{'='*70}\n")


def fetch_from_clawhub(slug: str) -> str:
    """Download a skill from ClawHub into a temp directory."""
    # Try to clone from the openclaw/skills repo
    tmp_dir = tempfile.mkdtemp(prefix="skill-auditor-")
    target = os.path.join(tmp_dir, slug)

    # Attempt sparse checkout from the skills repo
    print(f"[*] Fetching skill '{slug}' from ClawHub...")
    try:
        subprocess.run(
            ["git", "clone", "--depth", "1", "--filter=blob:none", "--sparse",
             "https://github.com/openclaw/skills.git", os.path.join(tmp_dir, "repo")],
            capture_output=True, text=True, check=True, timeout=30,
        )
        subprocess.run(
            ["git", "sparse-checkout", "set", f"skills/{slug}"],
            cwd=os.path.join(tmp_dir, "repo"),
            capture_output=True, text=True, check=True, timeout=10,
        )
        skill_dir = os.path.join(tmp_dir, "repo", "skills", slug)
        if os.path.exists(skill_dir) and os.path.exists(os.path.join(skill_dir, "SKILL.md")):
            return skill_dir
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired, FileNotFoundError):
        pass

    # Fallback: try direct GitHub URL patterns
    print(f"[!] Could not fetch from repo, trying alternative sources...")
    try:
        subprocess.run(
            ["git", "clone", "--depth", "1",
             f"https://github.com/openclaw/skills-{slug}.git", target],
            capture_output=True, text=True, check=True, timeout=30,
        )
        if os.path.exists(os.path.join(target, "SKILL.md")):
            return target
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired, FileNotFoundError):
        pass

    print(f"[!] Could not fetch skill '{slug}'. Try downloading manually and use --path.", file=sys.stderr)
    sys.exit(1)


def main():
    parser = argparse.ArgumentParser(
        description="skill-auditor: Security scanner for OpenClaw skills",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python3 scan.py --path ./my-skill
  python3 scan.py --path ./my-skill --json
  python3 scan.py --path ./my-skill --output report.json
  python3 scan.py --slug nano-banana-pro
  python3 scan.py --scan-all ~/.openclaw/skills
  python3 scan.py --scan-all ~/.openclaw/skills --output batch-report.json
        """,
    )
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--path", help="Path to skill directory to scan")
    group.add_argument("--slug", help="ClawHub skill slug to fetch and scan")
    group.add_argument("--scan-all", help="Scan all skills in a directory")

    parser.add_argument("--json", action="store_true", help="Output as JSON")
    parser.add_argument("--output", "-o", help="Save report to file")

    args = parser.parse_args()

    if args.slug:
        path = fetch_from_clawhub(args.slug)
        scan_single(path, args.json, args.output)
    elif args.scan_all:
        scan_all(args.scan_all, args.json, args.output)
    else:
        scan_single(args.path, args.json, args.output)


if __name__ == "__main__":
    main()
