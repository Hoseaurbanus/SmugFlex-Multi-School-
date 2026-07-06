---
name: dispatching-parallel-agents
description: Use when facing 2+ independent tasks that can be worked on without shared state or sequential dependencies
---

# Dispatching Parallel Agents

## Overview

When you have multiple unrelated failures, investigating them sequentially wastes time. Each investigation is independent and can happen in parallel.

**Core principle:** Dispatch one agent per independent problem domain. Let them work concurrently.

## When to Use

- 3+ test files failing with different root causes
- Multiple subsystems broken independently
- Each problem can be understood without context from others
- No shared state between investigations

## The Pattern

### 1. Identify Independent Domains
Group failures by what's broken.

### 2. Create Focused Agent Tasks
Each agent gets: specific scope, clear goal, constraints, expected output.

### 3. Dispatch in Parallel
Issue all dispatches in the same response — they run in parallel.

### 4. Review and Integrate
Read each summary, verify no conflicts, run full test suite.

## Common Mistakes

- **Too broad:** "Fix all the tests" — agent gets lost
- **No context:** "Fix the race condition" — agent doesn't know where
- **No constraints:** Agent might refactor everything
- **Vague output:** "Fix it" — you don't know what changed
