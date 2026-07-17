/**
 * Redacts credentials embedded in URL userinfo (e.g. https://user:pass@host),
 * which the prefix-based rules below don't cover since there's no
 * recognizable "key=" style prefix — just a scheme and an @ symbol.
 * Keeps the scheme and host visible, drops the credential pair entirely.
 */
function redactUrlCredentials(str) {
  return str.replace(
    /\b(https?:\/\/)([^\s/:@]+):([^\s/@]+)@/gi,
    '$1[REDACTED]@'
  );
}

/**
 * Extracts a value starting at a given index in a string, handling both
 * quoted ("...", '...') and unquoted (space/operator-delimited) forms.
 * Backslash-escaped characters (\" \  etc.) are skipped over rather than
 * treated as terminators, so escaped quotes/spaces inside a value don't
 * prematurely end the match.
 * Uses plain string scanning instead of regex to avoid backtracking risk
 * and keep cyclomatic complexity low.
 */
function extractValueRange(str, startIndex) {
  let i = startIndex;
  while (str[i] === ' ' || str[i] === '\t') i++;

  const quoteChar = str[i];
  if (quoteChar === '"' || quoteChar === '\'') {
    let j = i + 1;
    while (j < str.length) {
      if (str[j] === '\\' && j + 1 < str.length) {
        j += 2;
        continue;
      }
      if (str[j] === quoteChar) break;
      j++;
    }
    const end = j < str.length ? j + 1 : str.length;
    return { start: i, end };
  }

  const stopChars = new Set([' ', '\t', ';', '&', '|', '>', '<']);
  let end = i;
  while (end < str.length) {
    if (str[end] === '\\' && end + 1 < str.length) {
      end += 2;
      continue;
    }
    if (stopChars.has(str[end])) break;
    end++;
  }
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

  // URL-embedded credentials (curl https://user:pass@host) — handled first
  // since they don't fit the "prefix + value" shape the rules below expect.
  let sanitized = redactUrlCredentials(commandString);

  // Each entry: a simple PREFIX-only regex, plus optional matching rules.
  const prefixRules = [
    { regex: /\bexport\s+AWS_\w*\s*=\s*/gi },
    { regex: /\b[A-Z0-9_]*(?:API_?KEY|ACCESS_?TOKEN|AUTH_?TOKEN|TOKEN)\s*=\s*/gi },
    { regex: /\b[a-z0-9_-]*(?:pass(?:word)?|passwd|pwd)\s*[:=]\s*/gi },
    { regex: /\b[a-z0-9_-]*(?:secret|private_key|client_secret)\s*[:=]\s*/gi },
    // No requireTokenLike here — "bearer" followed by anything is already
    // strong enough evidence of a token; a length/shape heuristic on top
    // of it only creates false negatives (e.g. "Bearer secret" slipping
    // through unredacted).
    { regex: /\bbearer\s+/gi },
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

  // If redaction has left nothing meaningful behind — the command WAS the
  // secret — don't save it. This strips not just the "[REDACTED]" marker
  // but the trailing key/prefix immediately before it too (e.g. "TOKEN="),
  // since a bare "TOKEN=" left after redaction isn't real command content,
  // just the skeleton of a secret assignment.
  const strippedOfRedactions = sanitized
    .replace(/\S*=?\[REDACTED\]/g, '')
    .trim();

  if (strippedOfRedactions.length === 0) {
    return null;
  }

  return sanitized;
}

module.exports = { sanitizeCommand };
