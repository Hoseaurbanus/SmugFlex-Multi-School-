---
name: finishing-a-development-branch
description: Use when implementation is complete, all tests pass, and you need to decide how to integrate the work
---

# Finishing a Development Branch

## Overview

Guide completion of development work by presenting clear options and handling chosen workflow.

**Core principle:** Verify tests → Detect environment → Present options → Execute choice → Clean up.

## The Process

### Step 1: Verify Tests
Run project's test suite. If tests fail, stop. Must fix before completing.

### Step 2: Detect Environment
Determine workspace state (normal repo vs worktree).

### Step 3: Determine Base Branch

### Step 4: Present Options

1. Merge back to base branch locally
2. Push and create a Pull Request
3. Keep the branch as-is
4. Discard this work

### Step 5: Execute Choice

#### Option 1: Merge Locally
Merge, verify tests, cleanup worktree, delete branch.

#### Option 2: Push and Create PR
Push branch. Don't clean up worktree.

#### Option 3: Keep As-Is
Report state. Don't cleanup worktree.

#### Option 4: Discard
Confirm first. Then cleanup worktree and force-delete branch.

### Step 6: Cleanup Workspace
Only for Options 1 and 4.
