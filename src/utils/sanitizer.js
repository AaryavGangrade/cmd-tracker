/**
 * Extracts a value starting at a given index in a string, handling both
 * quoted ("...", '...') and unquoted (space/operator-delimited) forms.
 * Uses plain string scanning instead of regex to avoid backtracking risk
 * and keep cyclomatic complexity low.
 */
function extractValueRange(str, startIndex) {
  let i = startIndex;
  while (str[i] === ' ' || str[i] === '\t') i++;

  const quoteChar = str[i];
  if (quoteChar === '"' || quoteChar === '\'') {
    const closeIndex = str.indexOf(quoteChar, i + 1);
    const end = closeIndex === -1 ? str.length : closeIndex + 1;
    return { start: i, end };
  }

  const stopChars = new Set([' ', '\t', ';', '&', '|', '>', '<']);
  let end = i;
  while (end < str.length && !stopChars.has(str[end])) end++;
  return { start: i, end };
}

/**
 * Runs a single "prefix" regex against the string and redacts whatever
 * value immediately follows each match. The regex only needs to find the
 * key name / flag — it never has to also parse the value — which keeps
 * each pattern simple and avoids the backtracking/complexity Sonar flags.
 */
function redactAfterPrefix(str, prefixRegex, options = {}) {
  const { requireTokenLike = false } = options;
  let result = '';
  let cursor = 0;
  prefixRegex.lastIndex = 0;

  let match;
  while ((match = prefixRegex.exec(str)) !== null) {
    const prefixEnd = match.index + match[0].length;
    const { start, end } = extractValueRange(str, prefixEnd);

    if (start >= end) {
      prefixRegex.lastIndex = prefixEnd;
      continue;
    }

    const value = str.slice(start, end);
    const looksLikeToken = /[-_0-9]/.test(value) || value.length >= 10;

    if (requireTokenLike && !looksLikeToken) {
      prefixRegex.lastIndex = end;
      continue;
    }

    result += str.slice(cursor, prefixEnd) + '[REDACTED]';
    cursor = end;
    prefixRegex.lastIndex = end;
  }

  result += str.slice(cursor);
  return result;
}

/**
 * Sanitizes a command string by redacting secret values in place, keeping
 * the rest of the command intact and readable.
 *
 * @param {string} commandString - The raw terminal command to check.
 * @returns {string|null} - The command with secrets redacted, or null if
 *   redaction would leave nothing meaningful behind.
 */
function sanitizeCommand(commandString) {
  if (!commandString || typeof commandString !== 'string') {
    return commandString;
  }

  let sanitized = commandString;

  // Each entry: a simple PREFIX-only regex, plus optional matching rules.
  const prefixRules = [
    { regex: /\bexport\s+AWS_\w*\s*=\s*/gi },
    { regex: /\b[A-Z0-9_]*(?:API_?KEY|ACCESS_?TOKEN|AUTH_?TOKEN|TOKEN)\s*=\s*/gi },
    { regex: /\b[a-z0-9_-]*(?:pass(?:word)?|passwd|pwd)\s*[:=]\s*/gi },
    { regex: /\b[a-z0-9_-]*(?:secret|private_key|client_secret)\s*[:=]\s*/gi },
    { regex: /\bbearer\s+/gi, requireTokenLike: true },
    { regex: /\bauthorization:\s*basic\s+/gi },
    { regex: /(?:^|\s)(?:-u|--user)\s+/gi },
  ];

  for (const rule of prefixRules) {
    sanitized = redactAfterPrefix(sanitized, rule.regex, {
      requireTokenLike: rule.requireTokenLike || false,
    });
  }

  // Whole-match secrets (no prefix to preserve): vendor tokens and PEM blocks.
  const wholeMatchPatterns = [
    /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Z0-9]{20,}\b/gi,
    /\bglpat-[A-Z0-9_-]{20,}\b/gi,
    /\bxox[baprs]-[A-Z0-9-]{10,}\b/gi,
    /-----BEGIN (?:RSA|EC|OPENSSH|DSA)? ?PRIVATE KEY-----[\s\S]*?-----END (?:RSA|EC|OPENSSH|DSA)? ?PRIVATE KEY-----/gi,
  ];

  for (const regex of wholeMatchPatterns) {
    sanitized = sanitized.replace(regex, '[REDACTED]');
  }

  const strippedOfRedactions = sanitized.replace(/\[REDACTED\]/g, '').trim();
  if (strippedOfRedactions.length === 0) {
    return null;
  }

  return sanitized;
}

module.exports = { sanitizeCommand };
