---
name: exhaustive-audit
description: Use when investigating a codebase exhaustively, exploring an unfamiliar project, or when the user says "investigate this", "explore this project", "what's in here", "run an audit", or "leave nothing out". Triggers on any request to understand or analyze a project's full architecture, components, and health.
---

# Skill: exhaustive-audit

<SUBAGENT-STOP>
If you were dispatched as a subagent to execute a specific task, skip this skill.
</SUBAGENT-STOP>

<EXTREMELY-IMPORTANT>
If you think there is even a 1% chance a skill might apply to what you are doing, you ABSOLUTELY MUST invoke the skill.

IF A SKILL APPLIES TO YOUR TASK, YOU DO NOT HAVE A CHOICE. YOU MUST USE IT.

This is not negotiable. This is not optional. You cannot rationalize your way out of this.
</EXTREMELY-IMPORTANT>

## When to Use

**Auto-detect triggers:**
- User opens an unfamiliar codebase
- User says "what is this", "explore this project", "what's in here"
- User asks "how is this structured?", "what does this codebase do?"

**Explicit triggers:**
- "Run an exhaustive audit", "Leave nothing out"
- "Investigate every component", "Complete codebase analysis"

## Iron Law

**NO INVESTIGATION SUMMARY WITHOUT CHECKING EVERY CATEGORY FIRST**

You MUST complete all 15 categories before presenting any summary. Skipping a category because it "seems obvious" or "not important" is a violation.

## Investigation Checklist

Execute ALL 15 categories. For each, gather evidence and record findings.

### 1. Project Identity
- What is this project?
- What problem does it solve?
- Who is the target audience?
- What is the current state (early dev, production, abandoned)?

### 2. Tech Stack
- Languages used (with versions)
- Frameworks and libraries
- Runtime versions (Node, Python, etc.)
- Build tools (Vite, Webpack, etc.)
- Package managers

### 3. Directory Structure
- Every top-level directory and its purpose
- Key nested directories
- File naming conventions
- Pattern of organization (feature-based, layer-based, etc.)

### 4. Entry Points
- Main application entry files
- CLI commands and scripts
- API route definitions
- Public exports (index files)
- Build output locations

### 5. Configuration
- TypeScript/JavaScript config
- Linting/formatting config
- Build tool config
- Environment variables (.env files)
- CI/CD pipelines
- Docker/deployment config
- Editor configs (.vscode, etc.)

### 6. Core Modules
- What each major module/component does
- Module responsibilities and boundaries
- Inter-module dependencies
- Shared utilities vs domain-specific code

### 7. Data Flow
- How data enters the system
- State management approach
- Data transformation pipeline
- How data exits (API responses, file writes, etc.)
- Event/message flow if applicable

### 8. External Integrations
- Third-party APIs called
- Database connections
- Authentication/authorization providers
- File storage services
- External service dependencies

### 9. Dependencies
- List all production dependencies and their purpose
- List all dev dependencies and their purpose
- Identify unused or underused packages
- Check for version conflicts or outdated packages
- Verify license compatibility

### 10. Testing
- Test framework used
- Test file locations and naming conventions
- Types of tests (unit, integration, e2e)
- Coverage metrics if available
- Missing test coverage areas
- Test utilities and fixtures

### 11. Security
- Exposed secrets or API keys
- Authentication mechanisms
- Input validation patterns
- Potential injection vulnerabilities
- Dependency vulnerabilities (npm audit)
- Sensitive data handling
- CORS/CSP configuration

### 12. Performance
- Bundle size analysis
- Lazy loading implementation
- Image/asset optimization
- Caching strategies
- Database query patterns (if applicable)
- Memory usage patterns

### 13. Deployment
- Hosting platform
- Deployment scripts/commands
- Environment configuration
- CI/CD setup
- Rollback procedures
- Monitoring/logging setup

### 14. Documentation
- README quality and completeness
- Inline code comments
- API documentation
- Architecture diagrams
- Contributing guidelines
- Changelog maintenance

### 15. Pain Points
- Brittle or fragile code areas
- Tech debt indicators
- Missing patterns or abstractions
- Tight coupling areas
- Error handling gaps
- Scalability concerns
- Maintainability risks

## Output Format

### Conversation Output

Present findings section by section using this format:

```
## 1. Project Identity
**Finding:** [Brief summary]
**Details:** [Detailed explanation]
**Evidence:** [File paths with line numbers]
**Issues:** [🔴 Critical or 🟡 Warning if any]
```

For critical issues, prefix with `🔴` and provide:
- What the issue is
- Why it matters
- Where exactly it is (file:line)
- Recommended fix

For warnings, prefix with `🟡` and provide similar detail.

After all 15 categories, present:

```
## Summary
**Project:** [Name]
**Health:** [Healthy / Needs Attention / Critical]
**Key Findings:** [Top 3-5 takeaways]

## Critical Issues
[List all 🔴 items]

## Recommendations
[Prioritized list of improvements]
```

### File Output

Save report to: `docs/audits/YYYY-MM-DD-<project-name>-audit.md`

Use the template in `report-template.md` for the file format.

## Anti-Rationalization Guards

These thoughts mean STOP — you're rationalizing:

| Thought | Reality |
|---------|---------|
| "This dir is obviously not important" | Check it anyway. Assumptions skip bugs. |
| "I can skip node_modules" | Yes, but check package.json for unused deps. |
| "Config files are self-explanatory" | Document them anyway. Users need context. |
| "This file is too small to matter" | Small files hide secrets and misconfigs. |
| "I've seen enough to summarize" | No. Complete the checklist first. |
| "The user only asked about X" | Complete the full audit. They said "leave nothing out". |
| "This category doesn't apply" | Verify first. Every project has testing, security, etc. |
| "I'll cover this later" | No. Do it now while context is fresh. |
| "This is taking too long" | Thoroughness is the point. Rushing skips findings. |
| "The README explains it" | Verify. READMEs lie or go stale. |
| "I already know this codebase" | Fresh eyes catch what familiarity misses. |

## Scope Rules

- Scan ALL directories, not just src/
- Check ALL config files, not just the main ones
- Read ALL package.json files (root + nested if any)
- Verify ALL environment variables are documented
- Test ALL entry points
- Check ALL scripts in package.json
