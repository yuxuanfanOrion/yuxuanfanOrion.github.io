---
name: push-to-main
description: Commit and push current changes to main/master branch
user_invocable: true
---

# Push to Main

Commit all current changes and push to the main (master) branch.

## Steps

1. Check current git status to see uncommitted changes
2. If there are changes:
   - Stage all relevant files (exclude .DS_Store, .bundle/, .ruby-version)
   - Create a commit with a descriptive message based on the changes
   - If not on master branch, switch to master first
   - Push to origin master
3. If no changes, inform the user

## Important

- Always check for uncommitted changes before committing
- Use descriptive commit messages
- Do not commit sensitive files (.env, credentials, etc.)
- **You MUST always push to origin master at the end** — do not stop after committing, the push step is mandatory
- If `git push` fails due to network issues (timeout, connection refused, etc.), use `/vpn` to enable proxy first, then retry the push
