---
name: using-git-worktrees
description: Use when starting feature work that needs isolation from current workspace
---

# Using Git Worktrees

## Overview

Ensure work happens in an isolated workspace. Prefer platform's native worktree tools. Fall back to manual git worktrees only when no native tool is available.

## Step 0: Detect Existing Isolation

Before creating anything, check if already in an isolated workspace.

## Step 1: Create Isolated Workspace

### 1a. Native Worktree Tools (preferred)
Use platform's native tools if available.

### 1b. Git Worktree Fallback
Create worktree manually using git if no native tool available.

## Step 2: Project Setup
Auto-detect and run appropriate setup (npm install, cargo build, etc.).

## Step 3: Verify Clean Baseline
Run tests to ensure workspace starts clean.
