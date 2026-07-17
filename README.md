<div align="center">

# 📟 cmd-tracker

### A developer tool that auto-captures, categorizes and saves terminal commands per project for easy revision

[![npm version](https://img.shields.io/npm/v/@adithya-naik/cmd-tracker.svg)](https://www.npmjs.com/package/@adithya-naik/cmd-tracker)
[![npm downloads](https://img.shields.io/npm/dm/@adithya-naik/cmd-tracker.svg)](https://www.npmjs.com/package/@adithya-naik/cmd-tracker)
[![npm total downloads](https://img.shields.io/npm/dt/@adithya-naik/cmd-tracker.svg)](https://www.npmjs.com/package/@adithya-naik/cmd-tracker)
[![GitHub stars](https://img.shields.io/github/stars/adithya-naik/cmd-tracker.svg)](https://github.com/adithya-naik/cmd-tracker/stargazers)
[![GitHub issues](https://img.shields.io/github/issues/adithya-naik/cmd-tracker.svg)](https://github.com/adithya-naik/cmd-tracker/issues)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-v14%2B-green.svg)](https://nodejs.org)

</div>

---

## 🎯 What is cmd-tracker?

**cmd-tracker** is an npm package that automatically captures, categorizes and saves every terminal command you type in a project.

Perfect for:
- 🎓 **Students** learning Linux, Git, Docker, Angular etc.
- 👨‍💻 **Developers** who want to track commands used in a project
- 📝 **Anyone** who wants to revise terminal commands they've used

### How it works

```
You work normally in terminal
         ↓
Commands auto-captured in background
         ↓
Saved to .tracker/commands.json in your project
         ↓
Run tracker list → see entire command history
```

---

## 📦 Installation

Install in your learning/project repo:

```bash
npm install @adithya-naik/cmd-tracker
```

---

## 🚀 Quick Start

**Step 1 — Initialize in your repo:**
```bash
npx tracker init
```

**Step 2 — Enable automatic capture:**
```bash
npx tracker hook
source ~/.bashrc                # bash
source ~/.zshrc                 # zsh (Mac)
source ~/.config/fish/config.fish  # fish
```

**Step 3 — Work normally! Then revise:**
```bash
npx tracker list
```

That's it! Every command you type is now saved automatically 🪄

---

## 📋 All Commands

| Command | Description |
|---|---|
| `tracker init` | Initialize tracker in your project |
| `tracker hook` | Enable automatic command capture |
| `tracker unhook` | Disable automatic command capture |
| `tracker list` | Show all saved commands |
| `tracker list <category>` | Filter by category |
| `tracker search <query>` | Search through commands |
| `tracker stats` | Show statistics by category |
| `tracker favorite <cmd>` | Toggle command as favorite |
| `tracker favorites` | Show all favorites |
| `tracker export` | Export as JSON |
| `tracker export --csv` | Export as CSV (opens in Excel) |
| `tracker clear` | Clear all commands |
| `tracker clear <category>` | Clear specific category |

---

## 🗂️ Categories

Commands are automatically categorized into:

| Category | Commands |
|---|---|
| 🔀 `git` | git status, git push, git commit... |
| 📦 `npm` | npm install, npx, npm run... |
| 🐳 `docker` | docker ps, docker build... |
| 🐧 `linux` | ls, cd, mkdir, chmod... |
| 🟢 `node` | node, nodemon... |
| 🔴 `angular` | ng new, ng serve, ng generate... |
| 🐍 `python` | python, pip install... |
| 🔷 `go` | go build, go run, go get... |
| ☕ `java` | java, javac, mvn, gradle... |
| 🦀 `rust` | cargo build, cargo run, rustc... |
| 🔷 `dotnet` | dotnet run, dotnet build... |
| ☸️ `kubernetes` | kubectl get pods, helm install... |
| 🗄️ `database` | mysql, psql, mongosh, redis-cli... |
| ☁️ `cloud` | aws s3 ls, gcloud, az login... |
| 📥 `packageManagers` | yarn, pnpm, brew, snap... |
| 🧪 `testing` | jest, vitest, playwright, cypress... |
| 🤖 `ai` | claude, gemini, opencode, aider... |
| 📌 `others` | everything else |

---

## 💡 Usage Examples

**Filter by category:**
```bash
tracker list git      # see all git commands
tracker list linux    # see all linux commands
tracker list npm      # see all npm commands
```

**Search commands:**
```bash
tracker search "install"   # find all install commands
tracker search "git"       # find all git related commands
```

**Save favorites for quick revision:**
```bash
tracker favorite "git rebase -i HEAD~3"
tracker favorites   # see all starred commands
```

**Export for sharing/backup:**
```bash
tracker export          # creates tracker-export.json
tracker export --csv    # creates tracker-export.csv (opens in Excel!)
```

---

## 📁 Project Structure

After running `tracker init`, a `.tracker` folder is created:

```
your-project/
├── .tracker/
│   └── commands.json   ← your personal command history
├── your-files...
└── package.json
```

> ✅ `.tracker/` is automatically added to `.gitignore`
> Your command history stays local — never pushed to GitHub
## 🔒 Automatic Secret Redaction
![alt text](project-flow.png)

Security is a core priority of **cmd-tracker**. Before any command is written to `.tracker/commands.json`, it is automatically scanned for sensitive information.

If a command contains credentials such as API keys, access tokens passwords, or private keys, **the sensitive value or credential segment is replaced with `[REDACTED]`**, while the rest of the command is preserved. This keeps your command history useful without exposing secrets.

### Example

#### AWS example — Before

```bash
export AWS_SECRET_ACCESS_KEY=mySecretKey
```

#### AWS example — Saved as

```bash
export AWS_SECRET_ACCESS_KEY=[REDACTED]
```

Another example:

#### curl example — Before

```bash
curl -u sampleuser:examplePass https://api.example.com
```

#### curl example — Saved as

```bash
curl -u [REDACTED] https://api.example.com
```

---

### 🛡️ Supported Secret Types

The sanitizer automatically detects and redacts:

- AWS credentials (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, etc.)
- API keys
- Access tokens
- Authentication tokens
- Passwords
- Bearer tokens
- HTTP Basic Authentication credentials
- `curl -u` / `curl --user` credentials
- GitHub Personal Access Tokens
- GitLab Personal Access Tokens
- Slack tokens
- SSH private keys
- PEM private keys

---

### ⚠️ Commands That Are Not Saved

If a command consists **entirely of sensitive information** (for example, only a GitHub token or a private key), **cmd-tracker will not save it**.

Example:

**Input**

```text
ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Result**

```text
Command not saved (contains only sensitive data)
```

---

### ✅ Why This Matters

This feature helps prevent accidental exposure of secrets while keeping your command history clean and useful.

- 🔒 Prevents credentials from being stored in `.tracker/commands.json`
- 📖 Preserves the readable parts of commands for future reference
- 🚫 Avoids saving commands that contain nothing except sensitive information
- 💻 Works automatically—no configuration required

## 🖥️ Platform Support

| Platform | Support |
|---|---|
| Mac (zsh) | ✅ Full support |
| Linux (bash) | ✅ Full support |
| Windows (Git Bash) | ✅ Supported |
| Windows (PowerShell) | ⚠️ Manual save only |
| Fish | ✅ Full support |

> Windows CMD/PowerShell users: use `tracker save "command"` manually
> or use Git Bash / WSL for automatic capture

---

## 🐟 Fish Shell Support

### Install Fish Shell

**Mac:**
```bash
brew install fish
```

**Ubuntu/Debian:**
```bash
sudo apt install fish
```

**Fedora:**
```bash
sudo dnf install fish
```

**Windows (WSL):**
```bash
sudo apt install fish
```

### Setup tracker in Fish

```bash
npx tracker init
npx tracker hook
source ~/.config/fish/config.fish
```

That's it! Every command you type in fish will now be saved automatically! 🎉

---

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Open an issue for bugs or feature requests
- Submit a pull request

---

## 📄 License

MIT © [Jatoth Adithya Naik](https://github.com/adithya-naik)

---

<div align="center">

⭐ **Star this repo if you find it useful!**

[GitHub](https://github.com/adithya-naik/cmd-tracker) • [npm](https://www.npmjs.com/package/@adithya-naik/cmd-tracker) • [Issues](https://github.com/adithya-naik/cmd-tracker/issues)

</div
