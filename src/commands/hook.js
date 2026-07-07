/*
 * hook.js (command)
 *
 * Handles "tracker hook" and "tracker unhook" commands
 *
 * tracker hook   → installs shell hook for auto capture
 * tracker unhook → removes shell hook
 */
const {
  installHook,
  removeHook,
  isHookInstalled,
  detectShell
} = require('../utils/hook');

const { isInitialized, showInitError } = require('../utils/validator');
const colors = require('../utils/colors');

/*
 * hookCommand() — runs when user types: tracker hook
 * Installs the shell hook for automatic command capture
 */
function hookCommand() {

  /*
   * Must run tracker init before tracker hook
   */
  if (!isInitialized()) {
    showInitError();
    return;
  }

  console.log(colors.heading('\n🪄 Setting up automatic command capture...\n'));
  /*
   * Show which shell was detected
   */
  const shell = detectShell();
  console.log(colors.info(`🔍 Detected shell: ${shell}`));

  /*
   * Check if already installed
   */
  if (isHookInstalled()) {
    console.log(colors.warning('\n⚠️  Shell hook is already installed!'));
    console.log(colors.info('💡 Your commands are already being captured automatically'));
    console.log(colors.info('💡 Run: tracker unhook to disable\n'));
    return;
  }

  /*
   * Install the hook
   */
  const result = installHook();

  if (result.success) {
    console.log(colors.success('\n' + result.message));
    console.log(colors.info('\n🎯 Almost done! Run this command to activate:'));
    const sourceCmd = {
      zsh: '~/.zshrc',
      bash: '~/.bashrc',
      fish: '~/.config/fish/config.fish',
    }[result.shell];

    console.log(colors.bold(`\n   source ${sourceCmd}\n`));
    console.log(colors.success('After that — every command you type will be saved automatically! 🚀\n'));
  } else {
    console.log(colors.error('\n' + result.message));
  }
}


/*
 * unhookCommand() — runs when user types: tracker unhook
 * Removes the shell hook
 */
function unhookCommand() {

  console.log(colors.info('\n🔌 Removing automatic command capture...\n'));

  const result = removeHook();

  if (result.success) {
    console.log(colors.success(result.message));
    console.log(colors.info('\n🎯 Almost done! Run this to apply changes:'));

    const shell = result.shell || detectShell();

    const sourceCmd = {
      zsh: '~/.zshrc',
      bash: '~/.bashrc',
      fish: '~/.config/fish/config.fish',
    }[shell];

    console.log(colors.bold(`\n   source ${sourceCmd}\n`));
    console.log(colors.success('After that — automatic capture will be disabled\n'));
  } else {
    console.log(colors.error(result.message));
  }
}

module.exports = { hookCommand, unhookCommand };
