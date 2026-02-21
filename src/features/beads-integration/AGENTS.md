# Beads Integration Knowledge Base

## Overview

Optional task management integration with [Beads CLI](https://github.com/steveyegge/beads) for granular issue tracking and session continuity.

## Architecture

```
beads-integration/
├── types.ts           # BdIssue, BdStatus, BdDependency types

Related files:
├── src/config/schema.ts       # BeadsConfigSchema
├── src/tools/beads-cli/       # CLI wrapper tool
│   ├── wrapper.ts             # BeadsWrapper class
│   ├── tools.ts               # createBeadsTool()
│   └── wrapper.test.ts        # Unit tests
├── src/hooks/beads-sync/      # Auto-init and sync hooks
│   └── index.ts               # createBeadsSyncHook()
└── src/cli/doctor/checks/     # Installation validation
    └── beads.ts               # Doctor check
```

## Configuration

Configured via `~/.config/opencode/oh-my-opencode.json`:

```jsonc
{
  "beads": {
    "enabled": true,           // Master toggle
    "auto_init": true,         // Run `bd init` when .beads/ missing
    "backend": "cli",          // "cli" | "mcp" | "auto"
    "sync_on_idle": true,      // Sync on session.idle event
    "beads_command": "bd"      // Binary path (default: "bd")
  }
}
```

## Types

### BdIssue
```typescript
interface BdIssue {
  id: string                   // e.g., "bd-abc123"
  title: string
  description?: string
  status: BdStatus
  priority: number             // 0-4
  issue_type: BdIssueType
  assignee?: string
  created_at: string
  updated_at: string
  dependencies?: BdDependency[]
}
```

### BdStatus
```typescript
type BdStatus =
  | "open" | "in_progress" | "blocked"
  | "deferred" | "closed" | "pinned" | "hooked"
```

### BdIssueType
```typescript
type BdIssueType =
  | "bug" | "feature" | "task" | "epic"
  | "chore" | "decision" | "message"
```

## Hook Events

### session.created
- Checks if `.beads/` directory exists
- If missing and `auto_init: true`, runs `bd init --quiet`

### session.idle
- If `sync_on_idle: true`, runs `bd sync`
- Commits beads state to git

## Tool Commands

The `beads-cli` tool exposes these commands:

| Command | Description | Beads CLI |
|---------|-------------|-----------|
| `ready` | List ready issues | `bd ready --json` |
| `create` | Create new issue | `bd create "title" --priority=X` |
| `update` | Update issue | `bd update <id> --status=X` |
| `close` | Close issue | `bd close <id> --reason="..."` |
| `sync` | Sync to git | `bd sync` |
| `claim` | Claim issue | `bd update <id> --claim` |

## Doctor Check

Run `oh-my-opencode doctor` to validate:
1. `bd` CLI is available on PATH
2. `.beads/` directory is valid (if exists)
3. Configuration is valid

## Future Enhancements (Phase 8)

1. **TodoWrite Sync**: Bidirectional sync between todo list and Beads issues
2. **Agent Claiming**: Map delegate_task sessions to bd assignee
3. **Plan Sync**: Sync `.sisyphus/plans/*.md` to bd epics

## Anti-Patterns

- **Direct spawn**: Use BeadsWrapper class, not raw process spawning
- **Hardcoded paths**: Use `beads_command` config for custom binary locations
- **Skipping validation**: Always check if `.beads/` exists before init
