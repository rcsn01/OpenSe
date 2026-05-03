# Plane Ticket Standards

> Standardised format and rules for all tickets across Open-SE, Open-ETL, and Open-StoQR.

---

## 1. Ticket Naming Convention

| Type | Format | Example |
|------|--------|---------|
| **Epic** | `[Area] - Brief Feature` | `[Core] - Organisation Management` |
| **Feature / Story** | `Verb + Noun + Context` | `Implement user invitation flow` |
| **Bug** | `[BUG] - Broken thing + where` | `[BUG] - Dashboard crashes on mobile Safari` |
| **Task / Dev** | `Action + what + why` | `Setup CI pipeline for ETL workers` |
| **Docs** | `[DOC] - Topic` | `[DOC] - API authentication guide` |

### Naming Rules
- **No single-word names.** Bad: `Ivan`, `T1 Goal`, `Landing Page`.
- **No duplicate names across projects.** Bad: `Team Product Proposal` in all 3 projects.
- **Always include context.** If a ticket name could apply to more than one project, add the project or area.

---

## 2. Description Template

Use this for every new ticket. For existing tickets, add it during refinement.

```markdown
## Context
What problem are we solving? Why now?

## Acceptance Criteria
- [ ] Criteria 1
- [ ] Criteria 2
- [ ] Criteria 3

## Technical Notes
Architecture decisions, APIs, dependencies.

## Out of Scope
What's explicitly NOT included.

## Links
Related tickets, Figma, PRs, etc.
```

---

## 3. Priority Rules

| Priority | When to Use |
|----------|-------------|
| **Urgent** | Production is down, security breach, blocking a release. |
| **High** | Required for the next milestone, customer-facing blocker. |
| **Medium** | Standard backlog work, should be completed this cycle. |
| **Low** | Nice-to-have, refactor, tech debt. |
| **None** | Icebox / no timeline yet. |

### Priority Rules
- **Every ticket must have a priority.**
- **"None" is only for the true backlog.**
- If a ticket has been "None" for 30+ days, move it to **Backlog** or close it.

---

## 4. Labeling Strategy

Use a **flat, consistent label set** across all 3 projects.

| Category | Labels |
|----------|--------|
| **Type** | `epic`, `feature`, `bug`, `task`, `docs`, `spike` |
| **Area** | `ui`, `api`, `database`, `auth`, `infra`, `design` |
| **Effort** | `quick-win`, `small`, `medium`, `large` |
| **Focus** | `security`, `performance`, `accessibility`, `mobile` |

### Label Rules
- Every ticket should have at least one label.
- Do not create project-specific label variants.

---

## 5. Parent / Child Hierarchy

Limit nesting to **2 levels maximum**.

```
Epic (e.g., "Core Application")
  └── Feature / Story (e.g., "Inventory CRUD")
        └── Task (e.g., "Setup database migrations")
```

### Hierarchy Rules
- Epics must only contain features or stories, never raw tasks.
- Do not nest epics inside other epics.
- Avoid the pattern where epics sit at the same level as tasks.
  - *Bad:* `Learning Goals` → `Ivan` → `T1 Goal`.
  - *Good:* `Learning Goals` → `Complete T1 training module`.

---

## 6. Target Date Rules

| Ticket Type | Target Date |
|-------------|-------------|
| **Epic** | Milestone / release date |
| **Story** | End of current or next cycle |
| **Task** | Within 1–2 weeks |

### Date Rules
- If a ticket is in **In Progress** or **Todo**, it must have a target date.
- If a ticket has no target date for 30+ days, move it to **Backlog** with priority **None**.

---

## 7. State Definitions

| State | Meaning | Who Moves It |
|-------|---------|--------------|
| **Backlog** | Not scheduled. | Anyone |
| **Todo** | Committed, ready to start. | PM / Lead |
| **In Progress** | Someone is actively working. | Dev |
| **Need Testing** | Code complete, waiting QA. | Dev |
| **Need Refinement** | Requirements unclear, blocked. | PM / Lead |
| **Done** | Tested, merged, deployed. | QA / Lead |

### State Rules
- A ticket should not sit in **Need Testing** for more than 1 cycle.
- A ticket should not sit in **Need Refinement** for more than 1 week without a comment explaining why.
- **Done** epics should be closed if all children are also done.

---

## 8. Quick Wins for the Current Backlog

1. **Rename ambiguous tickets.**
   - "Ivan" → `Learning Goals - Ivan - T1`
   - "T1 Goal" → `Learning Goals - Ivan - T1`
   - "Landing Page" → `Landing Page - StoQR Marketing Site`

2. **Add target dates** to anything in **In Progress** or **Todo**.

3. **Consolidate duplicate cross-project tickets.**
   - `Team Product Proposal` appears in all 3 projects. Consider one shared workspace-level initiative or page instead.

4. **Close done epics** if their children are also done.
   - e.g., `Organisation & Collaboration` (OETL-24) is done; close it.

5. **Add labels** to all unlabelled tickets.

---

*Last updated: May 2026*
