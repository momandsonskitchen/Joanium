# Memory System

Long-term personal memory stored as markdown files in `Data/Memories/`.

---

## Architecture

```text
Memory Package
├── Index.js              (88 lines — IPC handlers)
├── Core/
│   ├── MemoryState.js    (CRUD operations)
│   └── MemoryCleanup.js  (automatic deduplication)
└── I18n/
    └── en.js             (memory strings)
```

---

## Memory Storage

Memory files are stored as markdown in `Data/Memories/`. Each file represents a memory topic or category.

### Memory File Format

```markdown
# Memory Topic

## Key Facts
- Fact 1
- Fact 2

## Preferences
- Preference 1
- Preference 2

## Context
- Contextual information
```

---

## IPC Handlers

| Channel | Purpose |
|---|---|
| `memory:list` | List all memory files |
| `memory:read` | Read a memory file |
| `memory:save` | Save/update a memory file |
| `memory:search` | Search memories by query |
| `memory:get-context` | Get memory context for AI (max chars) |
| `memory:get-catalog` | Memory catalog |
| `memory:get-export-prompt` | Prompt for exporting memory |
| `memory:get-triage-prompt` | Prompt for triaging memory |
| `memory:get-import-prompt` | Prompt for importing memory |
| `memory:apply-updates` | Apply AI-generated memory updates |
| `memory:delete` | Delete a memory file |
| `memory:cleanup-ai-reply` | Handle AI cleanup response |
| `memory:cleanup-renderer-ready` | Renderer ready for cleanup |
| `memory:run-cleanup` | Trigger memory cleanup |
| `memory:list-dreams` | List dream journal entries |
| `memory:read-dream` | Read a dream journal entry |

---

## Memory Context for AI

`memory:get-context` returns a compact representation of memories for the AI's system context. This is limited to a maximum number of characters to avoid overwhelming the AI.

The memory context is included in the system prompt by `ChatState.js`.

---

## Auto Memory Updates

After saved non-private chat sessions, `Chat` schedules private background memory syncs:

1. Session is saved to history
2. `History` marks session as pending memory sync
3. Background sync uses `Prompts/Memory.md` to extract durable user facts
4. `memory:apply-updates` writes facts back to `Data/Memories`
5. Session is marked as memory-synced

This ensures the AI remembers important information across conversations.

---

## Memory Triage

The triage system (`memory:get-triage-prompt`) helps organize and consolidate memories:

- Identifies duplicate information
- Merges related memories
- Removes outdated information
- Maintains a clean, useful memory store

---

## Memory Cleanup

`MemoryCleanup.js` handles automatic deduplication:

- Triggered via `memory:run-cleanup`
- Uses AI to identify redundant memories
- Merges or removes duplicates
- Maintains memory quality over time

---

## Dream Journal

The dream system (`memory:list-dreams`, `memory:read-dream`) provides periodic AI consolidation of memories:

- AI reviews memories and creates "dream" summaries
- Stored in `Data/Dreams/`
- Periodic background process

---

## Memory Export/Import

- `memory:get-export-prompt` — Generates a prompt for exporting memories
- `memory:get-import-prompt` — Generates a prompt for importing memories

This allows users to move memories between installations.

---

## Memory Search

`memory:search` provides full-text search across all memory files. Used by the AI to recall specific information when needed.

---

## Memory in System Prompt

`ChatState.js` includes memory context in the system prompt:

```text
## Memory
<compact memory context from memory:get-context>
```

This gives the AI access to long-term memory during conversations.

---

## Memory Privacy

- Memory sync only happens for non-private sessions
- Users can disable auto memory updates in settings
- Memory files are stored locally, never sent to cloud
- Users can manually edit memory files in `Data/Memories/`
