---
name: subagent-driven-development
description: Use when executing implementation plans with independent tasks in the current session
---

# Subagent-Driven Development

Execute plan by dispatching a fresh implementer subagent per task, a task review (spec compliance + code quality) after each, and a broad whole-branch review at the end.

**Core principle:** Fresh subagent per task + task review (spec + quality) + broad final review = high quality, fast iteration

## When to Use

- Have implementation plan
- Tasks mostly independent
- Stay in this session

## The Process

1. Read plan, note context and global constraints, create todos
2. Per task: Dispatch implementer → Review → Mark complete
3. After all tasks: Dispatch final code reviewer
4. Use finishing-a-development-branch

## Model Selection

Use the least powerful model that can handle each role:
- **Mechanical tasks**: cheap model
- **Integration tasks**: standard model
- **Architecture tasks**: most capable model

## Handling Implementer Status

- **DONE:** Generate review package, dispatch task reviewer
- **DONE_WITH_CONCERNS:** Read concerns before proceeding
- **NEEDS_CONTEXT:** Provide missing context and re-dispatch
- **BLOCKED:** Assess blocker, escalate if needed

## Red Flags

- Start implementation on main/master without consent
- Skip task review
- Proceed with unfixed issues
- Make subagent read the whole plan file
- Skip scene-setting context
