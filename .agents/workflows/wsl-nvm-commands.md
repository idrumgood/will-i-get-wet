---
description: How to run Node, NPM, and Yarn commands via NVM in this WSL environment
---

To run `node`, `yarn`, or `npm` commands in this project, they must be executed via WSL with the `bash -lic` flag. This ensures the NVM environment is properly loaded before the command runs.

When you need to run any of these commands, use the `run_command` tool with the following structure:

```bash
wsl -d Ubuntu-24.04 -e bash -lic "cd ~/Projects/will-i-get-wet && <YOUR_COMMAND>"
```

### Examples
To install a dependency:
```bash
wsl -d Ubuntu-24.04 -e bash -lic "cd ~/Projects/will-i-get-wet && yarn add date-fns"
```

To run a dev server:
```bash
wsl -d Ubuntu-24.04 -e bash -lic "cd ~/Projects/will-i-get-wet && yarn dev"
```

To run a Git command that requires the environment (though often Git works without NVM, it's safe to group them if combining commands):
```bash
wsl -d Ubuntu-24.04 -e bash -lic "cd ~/Projects/will-i-get-wet && git status"
```
