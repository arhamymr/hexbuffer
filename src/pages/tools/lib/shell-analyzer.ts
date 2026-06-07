import type {
  ShellAnalysisResult,
  ShellCommandUsage,
  ShellInsight,
  ShellInsightCategory,
  ShellInsightSeverity,
  ShellScriptMeta,
  ShellVariableUsage,
} from '../types';

let insightCounter = 0;

function nextId(): string {
  return `shell-insight-${++insightCounter}`;
}

function resetCounter(): void {
  insightCounter = 0;
}

function createInsight(
  severity: ShellInsightSeverity,
  category: ShellInsightCategory,
  title: string,
  description: string,
  evidence: string[],
  lineNumbers: number[],
): ShellInsight {
  return {
    id: nextId(),
    severity,
    category,
    title,
    description,
    evidence: evidence.slice(0, 10),
    lineNumbers,
  };
}

function stripComments(line: string): string {
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === "'" && !inDouble) inSingle = !inSingle;
    else if (ch === '"' && !inSingle) inDouble = !inDouble;
    else if (ch === '#' && !inSingle && !inDouble) return line.slice(0, i);
  }
  return line;
}

function extractUrls(text: string): { url: string; line: number }[] {
  const results: { url: string; line: number }[] = [];
  const lines = text.split('\n');
  const urlPattern = /https?:\/\/[^\s"'`;$)}\]>]+/g;
  lines.forEach((line, idx) => {
    const stripped = stripComments(line);
    let match: RegExpExecArray | null;
    while ((match = urlPattern.exec(stripped)) !== null) {
      results.push({ url: match[0], line: idx + 1 });
    }
  });
  return results;
}

const NETWORK_COMMANDS = new Set([
  'curl', 'wget', 'nc', 'ncat', 'netcat', 'ssh', 'scp', 'rsync',
  'ftp', 'sftp', 'telnet', 'dig', 'nslookup', 'host', 'ping',
  'traceroute', 'nmap', 'socat', 'openssl',
]);

const FILESYSTEM_DANGEROUS = new Set([
  'rm', 'chmod', 'chown', 'chgrp', 'mkfs', 'dd', 'mount', 'umount',
]);

const FILESYSTEM_WRITE = new Set([
  'cp', 'mv', 'mkdir', 'touch', 'ln', 'install', 'ditto',
]);

const PRIVILEGE_COMMANDS = new Set(['sudo', 'su', 'doas', 'pkexec']);

const CODE_EXEC_COMMANDS = new Set(['eval', 'exec', 'source']);

const ARCHIVE_COMMANDS = new Set([
  'tar', 'unzip', 'gunzip', 'bunzip2', 'xz', '7z', 'ar', 'jar',
]);

const PACKAGE_MANAGERS = new Set([
  'apt', 'apt-get', 'yum', 'dnf', 'pacman', 'brew', 'pip', 'pip3',
  'npm', 'yarn', 'pnpm', 'cargo', 'gem', 'go', 'snap', 'flatpak',
  'pkg', 'zypper', 'emerge',
]);

const CHECKSUM_COMMANDS = new Set([
  'shasum', 'sha256sum', 'sha512sum', 'md5sum', 'sha1sum',
  'sha224sum', 'sha384sum', 'cksum', 'b2sum',
]);

const UNSAFE_PATTERNS = [
  { pattern: /\brm\s+(-[a-zA-Z]*[rf][a-zA-Z]*\s+)*\/(?!\b)/, desc: 'rm targeting root path' },
  { pattern: /\brm\s+(-[a-zA-Z]*[rf][a-zA-Z]*\s+)*~\//, desc: 'rm targeting home directory' },
  { pattern: /chmod\s+777\b/, desc: 'world-writable permissions (777)' },
  { pattern: />\s*\/dev\/sd[a-z]\b/, desc: 'write to block device' },
  { pattern: /\bdd\s+.*\bof=\/dev\//, desc: 'dd writing to device' },
];

interface ParsedLine {
  lineNumber: number;
  raw: string;
  stripped: string;
  trimmed: string;
  isComment: boolean;
  isEmpty: boolean;
}

function parseLines(text: string): ParsedLine[] {
  return text.split('\n').map((raw, idx) => {
    const trimmed = raw.trim();
    const isComment = trimmed.startsWith('#') && idx > 0;
    const isEmpty = trimmed.length === 0;
    const stripped = isComment ? '' : stripComments(raw).trim();
    return { lineNumber: idx + 1, raw, stripped, trimmed, isComment, isEmpty };
  });
}

function extractShebang(lines: ParsedLine[]): string | null {
  const first = lines[0];
  if (first && first.raw.startsWith('#!')) return first.raw.trim();
  return null;
}

function extractShellOptions(lines: ParsedLine[]): ShellInsight[] {
  const insights: ShellInsight[] = [];
  const optionMap: Record<string, { label: string; severity: ShellInsightSeverity }> = {
    '-e': { label: 'errexit (exit on error)', severity: 'info' },
    '-u': { label: 'nounset (error on undefined variables)', severity: 'info' },
    '-o pipefail': { label: 'pipefail (fail on pipe errors)', severity: 'info' },
    '-x': { label: 'xtrace (debug tracing)', severity: 'low' },
    '-f': { label: 'noglob (disable globbing)', severity: 'info' },
    '-n': { label: 'noexec (dry-run mode)', severity: 'info' },
  };

  for (const line of lines) {
    if (line.isEmpty || line.isComment) continue;
    const setMatch = line.stripped.match(/^set\s+(.+)$/);
    if (!setMatch) continue;
    const args = setMatch[1];
    for (const [flag, meta] of Object.entries(optionMap)) {
      if (args.includes(flag)) {
        insights.push(createInsight(
          meta.severity, 'shell-options',
          `Shell option: ${meta.label}`,
          `The script enables \`${flag}\` — ${meta.label}.`,
          [line.trimmed], [line.lineNumber],
        ));
      }
    }
  }
  return insights;
}

function extractCommands(lines: ParsedLine[]): { commands: ShellCommandUsage[]; insights: ShellInsight[] } {
  const commandMap = new Map<string, { count: number; lines: number[] }>();
  const insights: ShellInsight[] = [];

  const networkLines: { cmd: string; line: number; text: string }[] = [];
  const privLines: { cmd: string; line: number; text: string }[] = [];
  const execLines: { cmd: string; line: number; text: string }[] = [];
  const dangerousFsLines: { cmd: string; line: number; text: string }[] = [];
  const writeFsLines: { cmd: string; line: number; text: string }[] = [];
  const archiveLines: { cmd: string; line: number; text: string }[] = [];
  const pkgLines: { cmd: string; line: number; text: string }[] = [];
  const checksumLines: { cmd: string; line: number; text: string }[] = [];

  for (const line of lines) {
    if (line.isEmpty || line.isComment) continue;
    const tokens = line.stripped
      .replace(/\$\([^)]*\)/g, ' __SUB__ ')
      .replace(/`[^`]*`/g, ' __SUB__ ')
      .replace(/\|\|/g, ' __OR__ ')
      .replace(/&&/g, ' __AND__ ')
      .replace(/\|/g, ' __PIPE__ ')
      .replace(/;/g, ' __SEMI__ ')
      .split(/\s+/)
      .filter(Boolean);

    const commandPositions = [0];
    tokens.forEach((tok, idx) => {
      if (['__PIPE__', '__AND__', '__OR__', '__SEMI__'].includes(tok)) {
        if (idx + 1 < tokens.length) commandPositions.push(idx + 1);
      }
    });

    for (const pos of commandPositions) {
      let cmd = tokens[pos];
      if (!cmd) continue;
      cmd = cmd.replace(/^(.*\/)/, '').replace(/[^a-zA-Z0-9._-]/g, '');
      if (!cmd || cmd.startsWith('__')) continue;

      const existing = commandMap.get(cmd);
      if (existing) {
        existing.count++;
        if (!existing.lines.includes(line.lineNumber)) existing.lines.push(line.lineNumber);
      } else {
        commandMap.set(cmd, { count: 1, lines: [line.lineNumber] });
      }

      const entry = { cmd, line: line.lineNumber, text: line.trimmed };
      if (NETWORK_COMMANDS.has(cmd)) networkLines.push(entry);
      if (PRIVILEGE_COMMANDS.has(cmd)) privLines.push(entry);
      if (CODE_EXEC_COMMANDS.has(cmd)) execLines.push(entry);
      if (FILESYSTEM_DANGEROUS.has(cmd)) dangerousFsLines.push(entry);
      if (FILESYSTEM_WRITE.has(cmd)) writeFsLines.push(entry);
      if (ARCHIVE_COMMANDS.has(cmd)) archiveLines.push(entry);
      if (PACKAGE_MANAGERS.has(cmd)) pkgLines.push(entry);
      if (CHECKSUM_COMMANDS.has(cmd)) checksumLines.push(entry);
    }
  }

  if (networkLines.length > 0) {
    const uniqueCmds = [...new Set(networkLines.map(n => n.cmd))].join(', ');
    insights.push(createInsight(
      'medium', 'network',
      'Network commands detected',
      `Found ${networkLines.length} network operation(s) using ${uniqueCmds}.`,
      networkLines.map(n => n.text), networkLines.map(n => n.line),
    ));
  }

  if (privLines.length > 0) {
    const uniqueCmds = [...new Set(privLines.map(p => p.cmd))].join(', ');
    insights.push(createInsight(
      'high', 'privilege-escalation',
      'Privilege escalation detected',
      `Found ${privLines.length} privilege escalation(s) using ${uniqueCmds}.`,
      privLines.map(p => p.text), privLines.map(p => p.line),
    ));
  }

  if (execLines.length > 0) {
    const hasEval = execLines.some(e => e.cmd === 'eval');
    const uniqueCmds = [...new Set(execLines.map(e => e.cmd))].join(', ');
    insights.push(createInsight(
      hasEval ? 'critical' : 'medium', 'code-execution',
      hasEval ? 'eval/exec code execution detected' : 'Dynamic code execution detected',
      hasEval
        ? '`eval` executes arbitrary strings as shell code — if input is user-controlled, this is a command injection vector.'
        : `Found ${execLines.length} dynamic execution(s) using ${uniqueCmds}.`,
      execLines.map(e => e.text), execLines.map(e => e.line),
    ));
  }

  if (dangerousFsLines.length > 0) {
    const hasRmRf = dangerousFsLines.some(d =>
      /\brm\s+(-[a-zA-Z]*r[a-zA-Z]*f|-[a-zA-Z]*f[a-zA-Z]*r)\b/.test(d.text),
    );
    insights.push(createInsight(
      hasRmRf ? 'high' : 'medium', 'filesystem',
      hasRmRf ? 'Recursive force delete (rm -rf) detected' : 'Dangerous filesystem commands detected',
      hasRmRf
        ? 'The script uses `rm -rf` which can irreversibly delete files and directories.'
        : `Found ${dangerousFsLines.length} dangerous filesystem operation(s).`,
      dangerousFsLines.map(d => d.text), dangerousFsLines.map(d => d.line),
    ));
  }

  if (writeFsLines.length > 0) {
    insights.push(createInsight(
      'low', 'filesystem',
      'File write operations detected',
      `Found ${writeFsLines.length} file write operation(s).`,
      writeFsLines.map(w => w.text), writeFsLines.map(w => w.line),
    ));
  }

  if (archiveLines.length > 0) {
    const uniqueCmds = [...new Set(archiveLines.map(a => a.cmd))].join(', ');
    insights.push(createInsight(
      'low', 'archive',
      'Archive extraction detected',
      `Found ${archiveLines.length} archive operation(s) using ${uniqueCmds}.`,
      archiveLines.map(a => a.text), archiveLines.map(a => a.line),
    ));
  }

  if (pkgLines.length > 0) {
    const uniqueCmds = [...new Set(pkgLines.map(p => p.cmd))].join(', ');
    insights.push(createInsight(
      'medium', 'package-manager',
      'Package manager usage detected',
      `Found ${pkgLines.length} package manager invocation(s) using ${uniqueCmds}.`,
      pkgLines.map(p => p.text), pkgLines.map(p => p.line),
    ));
  }

  if (checksumLines.length > 0) {
    insights.push(createInsight(
      'info', 'checksum',
      'Checksum verification detected',
      `Found ${checksumLines.length} checksum operation(s) — the script performs integrity verification.`,
      checksumLines.map(c => c.text), checksumLines.map(c => c.line),
    ));
  }

  const commands: ShellCommandUsage[] = [...commandMap.entries()]
    .map(([command, data]) => ({ command, count: data.count, lines: data.lines }))
    .sort((a, b) => b.count - a.count);

  return { commands, insights };
}

function extractVariables(lines: ParsedLine[]): { variables: ShellVariableUsage[]; insights: ShellInsight[] } {
  const varMap = new Map<string, { assigned: boolean; lines: number[] }>();
  const insights: ShellInsight[] = [];
  const envVarLines: { name: string; line: number; text: string }[] = [];

  const assignPattern = /^\s*(?:export\s+)?([A-Z_][A-Z0-9_]*)=(.*)$/i;
  const refPattern = /\$\{?([A-Z_][A-Z0-9_]*)\}?/gi;

  for (const line of lines) {
    if (line.isEmpty || line.isComment) continue;

    const assignMatch = assignPattern.exec(line.stripped);
    if (assignMatch) {
      const name = assignMatch[1];
      const value = assignMatch[2].trim();
      const existing = varMap.get(name);
      if (existing) {
        if (!existing.lines.includes(line.lineNumber)) existing.lines.push(line.lineNumber);
      } else {
        varMap.set(name, { assigned: true, lines: [line.lineNumber] });
      }

      if (/^(export\s+)?[A-Z_]*[Kk]ey|[A-Z_]*[Ss]ecret|[A-Z_]*[Pp]ass|[A-Z_]*[Tt]oken|[A-Z_]*[Cc]red/i.test(name)) {
        if (value && !value.startsWith('$') && !value.startsWith('"$') && value !== '""' && value !== "''") {
          envVarLines.push({ name, line: line.lineNumber, text: line.trimmed });
        }
      }
    }

    let refMatch: RegExpExecArray | null;
    while ((refMatch = refPattern.exec(line.stripped)) !== null) {
      const name = refMatch[1];
      const existing = varMap.get(name);
      if (existing) {
        if (!existing.lines.includes(line.lineNumber)) existing.lines.push(line.lineNumber);
      } else {
        varMap.set(name, { assigned: false, lines: [line.lineNumber] });
      }
    }
  }

  if (envVarLines.length > 0) {
    insights.push(createInsight(
      'high', 'hardcoded-secret',
      'Potential hardcoded secret detected',
      `Found ${envVarLines.length} variable assignment(s) with secret-like names containing literal values.`,
      envVarLines.map(e => `${e.name}=***`), envVarLines.map(e => e.line),
    ));
  }

  const variables: ShellVariableUsage[] = [...varMap.entries()]
    .map(([name, data]) => ({ name, assigned: data.assigned, lines: data.lines }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return { variables, insights };
}

function extractUnsafePatterns(lines: ParsedLine[]): ShellInsight[] {
  const insights: ShellInsight[] = [];

  for (const line of lines) {
    if (line.isEmpty || line.isComment) continue;
    for (const { pattern, desc } of UNSAFE_PATTERNS) {
      if (pattern.test(line.stripped)) {
        insights.push(createInsight(
          'critical', 'unsafe-pattern',
          `Unsafe pattern: ${desc}`,
          `The script contains a potentially destructive pattern: ${desc}.`,
          [line.trimmed], [line.lineNumber],
        ));
      }
    }
  }

  const mktempLines = lines.filter(l => !l.isComment && !l.isEmpty && /\bmktemp\b/.test(l.stripped));
  if (mktempLines.length > 0) {
    insights.push(createInsight(
      'info', 'temp-files',
      'Temporary file creation detected',
      'The script creates temporary files or directories using mktemp.',
      mktempLines.map(l => l.trimmed), mktempLines.map(l => l.lineNumber),
    ));
  }

  const trapLines = lines.filter(l => !l.isComment && !l.isEmpty && /^trap\s/.test(l.stripped));
  if (trapLines.length > 0) {
    insights.push(createInsight(
      'info', 'cleanup',
      'Cleanup handler (trap) detected',
      'The script registers signal/exit handlers for cleanup via trap.',
      trapLines.map(l => l.trimmed), trapLines.map(l => l.lineNumber),
    ));
  }

  return insights;
}

function extractHeredocs(lines: ParsedLine[]): ShellInsight[] {
  const insights: ShellInsight[] = [];
  const heredocLines: number[] = [];

  for (const line of lines) {
    if (line.isEmpty || line.isComment) continue;
    if (/<<-?\s*['"]?[A-Z_]+['"]?/i.test(line.stripped)) {
      heredocLines.push(line.lineNumber);
    }
  }

  if (heredocLines.length > 0) {
    insights.push(createInsight(
      'info', 'heredoc',
      'Heredoc usage detected',
      `Found ${heredocLines.length} heredoc(s) in the script.`,
      [], heredocLines,
    ));
  }

  return insights;
}

function extractFunctions(lines: ParsedLine[]): ShellInsight[] {
  const insights: ShellInsight[] = [];
  const funcLines: { name: string; line: number }[] = [];

  for (const line of lines) {
    if (line.isEmpty || line.isComment) continue;
    const funcMatch = line.stripped.match(/^(\w[\w-]*)\s*\(\)\s*\{?/)
      || line.stripped.match(/^function\s+(\w[\w-]*)/);
    if (funcMatch) {
      funcLines.push({ name: funcMatch[1], line: line.lineNumber });
    }
  }

  if (funcLines.length > 0) {
    insights.push(createInsight(
      'info', 'function',
      `${funcLines.length} function(s) defined`,
      `The script defines ${funcLines.length} function(s): ${funcLines.map(f => f.name).join(', ')}.`,
      funcLines.map(f => f.name), funcLines.map(f => f.line),
    ));
  }

  return insights;
}

function extractHardcodedUrls(lines: ParsedLine[]): ShellInsight[] {
  const insights: ShellInsight[] = [];
  const urls = extractUrls(lines.map(l => l.raw).join('\n'));

  if (urls.length > 0) {
    const uniqueUrls = [...new Set(urls.map(u => u.url))];
    insights.push(createInsight(
      'low', 'hardcoded-url',
      `${uniqueUrls.length} hardcoded URL(s) found`,
      `The script contains ${uniqueUrls.length} unique hardcoded URL(s).`,
      uniqueUrls, urls.map(u => u.line),
    ));
  }

  return insights;
}

function extractPipeChains(lines: ParsedLine[]): ShellInsight[] {
  const insights: ShellInsight[] = [];
  const chainLines: { line: number; count: number; text: string }[] = [];

  for (const line of lines) {
    if (line.isEmpty || line.isComment) continue;
    const pipes = (line.stripped.match(/(?<!\|)\|(?!\|)/g) || []).length;
    if (pipes >= 2) {
      chainLines.push({ line: line.lineNumber, count: pipes, text: line.trimmed });
    }
  }

  if (chainLines.length > 0) {
    const maxPipes = Math.max(...chainLines.map(c => c.count));
    insights.push(createInsight(
      maxPipes >= 4 ? 'low' : 'info', 'pipe-chain',
      'Multi-stage pipe chain detected',
      `Found ${chainLines.length} pipe chain(s) with up to ${maxPipes + 1} stages.`,
      chainLines.map(c => c.text), chainLines.map(c => c.line),
    ));
  }

  return insights;
}

function computeMeta(lines: ParsedLine[], shebang: string | null): ShellScriptMeta {
  const nonEmpty = lines.filter(l => !l.isEmpty).length;
  const comments = lines.filter(l => l.isComment).length;
  const funcs = lines.filter(l =>
    !l.isComment && (
      /^\w[\w-]*\s*\(\)\s*\{?/.test(l.stripped) ||
      /^function\s+\w/.test(l.stripped)
    )
  ).length;

  const vars = new Set<string>();
  const assignPattern = /^\s*(?:export\s+)?([A-Z_][A-Z0-9_]*)=/i;
  for (const line of lines) {
    if (line.isEmpty || line.isComment) continue;
    const m = assignPattern.exec(line.stripped);
    if (m) vars.add(m[1]);
  }

  const pipes = lines.filter(l => !l.isComment && !l.isEmpty && /\|/.test(l.stripped)).length;
  const heredocs = lines.filter(l =>
    !l.isComment && /<<-?\s*['"]?[A-Z_]+['"]?/i.test(l.stripped)
  ).length;

  return {
    shebang,
    totalLines: lines.length,
    nonEmptyLines: nonEmpty,
    commentLines: comments,
    functionCount: funcs,
    variableCount: vars.size,
    pipeChainCount: pipes,
    heredocCount: heredocs,
  };
}

export function analyzeShellScript(source: string): ShellAnalysisResult {
  resetCounter();

  const lines = parseLines(source);
  const shebang = extractShebang(lines);
  const meta = computeMeta(lines, shebang);

  const shellOptionInsights = extractShellOptions(lines);
  const { commands, insights: commandInsights } = extractCommands(lines);
  const { variables, insights: variableInsights } = extractVariables(lines);
  const unsafeInsights = extractUnsafePatterns(lines);
  const heredocInsights = extractHeredocs(lines);
  const functionInsights = extractFunctions(lines);
  const urlInsights = extractHardcodedUrls(lines);
  const pipeInsights = extractPipeChains(lines);

  const urls = [...new Set(extractUrls(source).map(u => u.url))];

  const insights = [
    ...shellOptionInsights,
    ...commandInsights,
    ...variableInsights,
    ...unsafeInsights,
    ...heredocInsights,
    ...functionInsights,
    ...urlInsights,
    ...pipeInsights,
  ].sort((a, b) => {
    const order: Record<ShellInsightSeverity, number> = {
      critical: 0, high: 1, medium: 2, low: 3, info: 4,
    };
    return order[a.severity] - order[b.severity];
  });

  return { meta, insights, commands, variables, urls };
}
