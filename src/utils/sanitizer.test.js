/*
 * sanitizer.test.js
 *
 * Unit test suite to verify the approved sanitization patterns, including
 * false positives, multiple secrets, empty inputs, and lookbehind checks.
 */

const { sanitizeCommand } = require('./sanitizer');

function assertEqual(actual, expected, testName) {
  if (actual === expected) {
    console.log(`✅ PASS: ${testName}`);
  } else {
    console.error(`❌ FAIL: ${testName}`);
    console.error(`   Expected: ${JSON.stringify(expected)}`);
    console.error(`   Actual:   ${JSON.stringify(actual)}`);
    throw new Error(`Test failed: ${testName}`);
  }
}

function runTests() {
  console.log('Running approved Command Sanitizer Tests...\n');

  // 1. Safe commands (should remain completely untouched)
  assertEqual(sanitizeCommand('git status'), 'git status', 'Safe command: git status');
  assertEqual(sanitizeCommand('npm run dev'), 'npm run dev', 'Safe command: npm run dev');

  // 2. AWS Credentials
  assertEqual(
    sanitizeCommand('export AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE'),
    'export AWS_ACCESS_KEY_ID=[REDACTED]',
    'AWS Access Key Assignment'
  );
  assertEqual(
    sanitizeCommand('export AWS_SECRET_ACCESS_KEY="secret-key"'),
    'export AWS_SECRET_ACCESS_KEY=[REDACTED]',
    'AWS Secret Key in quotes (quotes consumed by match)'
  );

  // 3. Tokens & Keys
  assertEqual(
    sanitizeCommand('GITHUB_TOKEN=ghp_abc123xyz789'),
    'GITHUB_TOKEN=[REDACTED]',
    'Generic TOKEN assignment'
  );
  assertEqual(
    sanitizeCommand('export API_KEY=key_val'),
    'export API_KEY=[REDACTED]',
    'API_KEY assignment'
  );

  // 4. Passwords
  assertEqual(
    sanitizeCommand('export DB_PASSWORD=my_password'),
    'export DB_PASSWORD=[REDACTED]',
    'DB_PASSWORD env var (prefixed, underscore-joined)'
  );
  assertEqual(
    sanitizeCommand('password = mypass'),
    'password = [REDACTED]',
    'password assignment with spaces'
  );
  assertEqual(
    sanitizeCommand('MYSQL_PWD=hunter2'),
    'MYSQL_PWD=[REDACTED]',
    'MYSQL_PWD env var'
  );
  assertEqual(
    sanitizeCommand('export DB_PASSWORD="my secret pass phrase"'),
    'export DB_PASSWORD=[REDACTED]',
    'Quoted multi-word password fully redacted (fixed)'
  );

  assertEqual(
    sanitizeCommand('password:34553 73 @ 3'),
    'password:[REDACTED]',
    'Unquoted password with spaces fully redacted'
  );

  // 5. Secrets
  assertEqual(
    sanitizeCommand('secret: mysecret'),
    'secret: [REDACTED]',
    'secret assignment with colon'
  );
  assertEqual(
    sanitizeCommand('client_secret=123'),
    'client_secret=[REDACTED]',
    'client_secret assignment'
  );
  assertEqual(
    sanitizeCommand('MY_APP_SECRET=xyz'),
    'MY_APP_SECRET=[REDACTED]',
    'Prefixed *_SECRET env var'
  );

  // 6. Bearer Header
  assertEqual(
    sanitizeCommand('bearer my-token-value'),
    'bearer [REDACTED]',
    'bearer token value'
  );

  // 7. Authorization Basic Header
  assertEqual(
    sanitizeCommand('Authorization: Basic dXNlcjpwYXNz'),
    'Authorization: Basic [REDACTED]',
    'Basic authorization header value'
  );

  // 8. curl credentials (-u or --user)
  assertEqual(
    sanitizeCommand('curl -u user:password https://api.example.com'),
    'curl -u [REDACTED] https://api.example.com',
    'curl -u flag'
  );
  assertEqual(
    sanitizeCommand('curl --user foo:bar https://api.example.com'),
    'curl --user [REDACTED] https://api.example.com',
    'curl --user flag'
  );

  // 9. Raw vendor tokens or blocks that should be blocked entirely (returns null)
  assertEqual(
    sanitizeCommand('ghp_abcdefghijklmnopqrstuvwx'),
    null,
    'Bare GitHub Token'
  );
  assertEqual(
    sanitizeCommand('xoxb-1234567890-1234567890'),
    null,
    'Bare Slack Token'
  );
  assertEqual(
    sanitizeCommand(
      '-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA...\n-----END RSA PRIVATE KEY-----'
    ),
    null,
    'Bare PEM Private Key Block'
  );

  // 10. False positives — plain English should NOT be touched
  assertEqual(
    sanitizeCommand('echo "please reset your password"'),
    'echo "please reset your password"',
    'False positive: password mentioned without assignment'
  );
  assertEqual(
    sanitizeCommand('git commit -m "refactor bearer service class"'),
    'git commit -m "refactor bearer service class"',
    'False positive: bearer used as a normal word'
  );
  assertEqual(
    sanitizeCommand('echo "that is our secret sauce"'),
    'echo "that is our secret sauce"',
    'False positive: secret used as a normal word'
  );

  // 11. Empty / non-string input — should pass through, not be treated as sensitive
  assertEqual(sanitizeCommand(''), '', 'Empty string passthrough');
  assertEqual(sanitizeCommand(null), null, 'Null passthrough');
  assertEqual(sanitizeCommand(undefined), undefined, 'Undefined passthrough');

  // 12. Multiple secrets in a single command
  assertEqual(
    sanitizeCommand('export AWS_ACCESS_KEY_ID=AKIA123 API_KEY=abc456'),
    'export AWS_ACCESS_KEY_ID=[REDACTED] API_KEY=[REDACTED]',
    'Multiple secrets in one command both get redacted'
  );

  // 13. Secrets containing quotes
  assertEqual(
    sanitizeCommand('export API_KEY="my-key-with-single-\'-quote"'),
    'export API_KEY=[REDACTED]',
    'Secret with double quotes containing single quote'
  );
  assertEqual(
    sanitizeCommand('export API_KEY=\'my-key-with-double-"-quote\''),
    'export API_KEY=[REDACTED]',
    'Secret with single quotes containing double quote'
  );
  assertEqual(
    sanitizeCommand('export API_KEY=key"with"quotes'),
    'export API_KEY=[REDACTED]',
    'Unquoted secret containing quotes in the middle'
  );

  // 14. Command chaining/operators
  assertEqual(
    sanitizeCommand('export TOKEN=abc123 && npm run build'),
    'export TOKEN=[REDACTED] && npm run build',
    'Token in command chain with &&'
  );
  assertEqual(
    sanitizeCommand('export DB_PASSWORD=my_password; npm start'),
    'export DB_PASSWORD=[REDACTED]; npm start',
    'Password in command chain with semicolon'
  );
  assertEqual(
    sanitizeCommand('curl -u myuser:mypass | grep status'),
    'curl -u [REDACTED] | grep status',
    'Curl credentials in pipe command'
  );
  assertEqual(
    sanitizeCommand('TOKEN=abc123; ls -la'),
    'TOKEN=[REDACTED]; ls -la',
    'Token in command chain with semicolon'
  );
  assertEqual(
    sanitizeCommand('API_KEY=xyz123 | tee log.txt'),
    'API_KEY=[REDACTED] | tee log.txt',
    'API key in command chain with pipe'
  );
  assertEqual(
    sanitizeCommand('PASSWORD=hunter2 > output.txt'),
    'PASSWORD=[REDACTED] > output.txt',
    'Password in command chain with redirection'
  );

  console.log('\n🎉 All approved sanitizer tests passed successfully!');
}

try {
  runTests();
} catch (error) {
  process.exit(1);
}
