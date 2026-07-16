/**
 * Sanitizes a command string by redacting secret values in place, keeping
 * the rest of the command intact and readable.
 *
 * @param {string} commandString - The raw terminal command to check.
 * @returns {string|null} - The command with secrets redacted, or null if
 *   redaction would leave nothing meaningful behind (the whole command
 *   *was* the secret).
 */
function sanitizeCommand(commandString) {
  // Nothing to sanitize — pass through, don't treat as "sensitive".
  if (!commandString || typeof commandString !== 'string') {
    return commandString;
  }

  // Each pattern has a capture group for the "prefix" (key name, flag, etc.)
  // and a capture group for the actual secret value. Only the value gets
  // replaced with [REDACTED]; the prefix stays so the command is still
  // readable in history.
  const secretPatterns = [
    // export AWS_ACCESS_KEY_ID=xxxx / AWS_SECRET_ACCESS_KEY=xxxx
    /\b(export\s+AWS_\w*\s*=\s*)("[^"]*"|'[^']*'|.+?(?=\s+--?\w+|\s+[a-z0-9_-]+[=:]|\s*(?:&&|\|\||[;&|><])|\s*$))/gi,

    // TOKEN=, API_KEY=, ACCESS_TOKEN=, etc.
    /\b([A-Z0-9_]*(?:API_?KEY|ACCESS_?TOKEN|AUTH_?TOKEN|TOKEN)\s*=\s*)("[^"]*"|'[^']*'|.+?(?=\s+--?\w+|\s+[a-z0-9_-]+[=:]|\s*(?:&&|\|\||[;&|><])|\s*$))/gi,

    // password= / passwd= / pwd=
    /\b([a-z0-9_-]*(?:pass(?:word)?|passwd|pwd))(\s*[:=]\s*)("[^"]*"|'[^']*'|.+?(?=\s+--?\w+|\s+[a-z0-9_-]+[=:]|\s*(?:&&|\|\||[;&|><])|\s*$))/gi,

    // secret= / client_secret= / private_key=
    /\b([a-z0-9_-]*(?:secret|private_key|client_secret))(\s*[:=]\s*)("[^"]*"|'[^']*'|.+?(?=\s+--?\w+|\s+[a-z0-9_-]+[=:]|\s*(?:&&|\|\||[;&|><])|\s*$))/gi,

    // bearer <token>
    /\b(bearer\s+)((?=\S*[-_0-9]|\S{10,})\S+)/gi,

    // Authorization: Basic <base64>
    /\b(authorization:\s*basic\s+)(\S+)/gi,

    // curl -u user:pass / --user user:pass
    /(?<=^|\s)(-u|--user)(\s+)("[^"]*"|'[^']*'|.+?(?=\s+--?\w+|\s+[a-z0-9_-]+[=:]|\s*(?:&&|\|\||[;&|><])|\s*$))/gi,

    // GitHub / GitLab tokens (no separate prefix — whole token is the secret)
    /\b((?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}|glpat-[A-Za-z0-9\-_]{20,})\b/gi,

    // Slack tokens (whole token is the secret)
    /\b(xox[baprs]-[A-Za-z0-9-]{10,})\b/gi,

    // SSH/PEM private key blocks (whole block is the secret)
    /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/gi,
  ];

  let sanitized = commandString;

  for (const regex of secretPatterns) {
    sanitized = sanitized.replace(regex, (fullMatch, ...groups) => {
      // Drop the trailing offset/string args that String.replace appends.
      const captures = groups.slice(0, -2);

      if (captures.length >= 3) {
        // prefix + separator + value  →  keep prefix+separator, mask value
        return `${captures[0]}${captures[1]}[REDACTED]`;
      }
      if (captures.length === 2) {
        // prefix + value  →  keep prefix, mask value
        return `${captures[0]}[REDACTED]`;
      }
      // No prefix at all — the whole match is the secret (vendor tokens, PEM blocks)
      return '[REDACTED]';
    });
  }

  // If redaction has left nothing meaningful behind — the command WAS the
  // secret (e.g. the command was just a bare token or a PEM block) — don't
  // save a bare "[REDACTED]" as if it were real command content.
  const strippedOfRedactions = sanitized.replace(/\[REDACTED\]/g, '').trim();
  if (strippedOfRedactions.length === 0) {
    return null;
  }

  return sanitized;
}

module.exports = { sanitizeCommand };
