# Open-SE

Open-SE is a web-based B2B suite aimed to tackle niche issues that business might have.

## Setup

Run the interactive setup helper from the repository root:

```bash
./setup.sh
```

Options:

- `Full reset`: resets the selected Supabase database, deploys/configures the alert Edge Functions, and restores the low-stock alert dispatch config used by Mattermost/email/chat notifications. Supabase CLI auto-seeding is disabled, so linked resets do not upload seed data.
- `Insert DB seed data`: runs the configured seed files without a full database reset.

For remote Supabase setup, the script uses `SUPABASE_PROJECT_REF` or derives it from `VITE_SUPABASE_URL`/`SUPABASE_URL` when available. It also sets `STOQR_ALERT_DISPATCH_TOKEN` and the legacy `ALERT_EMAIL_DISPATCH_TOKEN` Edge Function secret to the same value so low-stock dispatch survives Edge Function redeploys.

## Publishing a release

Pushing to `main` does not publish images or create a release. To publish from the local Mac, first install and authenticate GitHub CLI:

```bash
brew install gh
gh auth login
```

Set the next semantic version in `src/package.json`, commit it to `main`, push it, then run:

```bash
pnpm --dir src release:images
```

The command requires a clean `main` branch that exactly matches `origin/main`. It first builds all production Docker images locally. If that succeeds, it creates and pushes an `opense-v<version>` tag, starts the GitHub Actions workflow, waits for all OpenSe images to publish to GHCR with `<version>`, `latest`, and commit SHA tags, then creates the matching GitHub Release. Use `pnpm --dir src release:images --dry-run` to inspect the release without changing anything.

If dispatch fails after the tag is pushed, retry it with the command printed by the release script.

**PROPRIETARY SOURCE CODE - SOURCE AVAILABLE**

This repository is hosted publicly for **educational and portfolio demonstration purposes only**. This project is **source-available, not open source**.

### Licensing & Usage Restrictions
The source code in this repository is **Proprietary** property of Rcsn01.
**Copyright (c) 2026 Rcsn01. All rights reserved.**

* **You MAY**: View, read, and inspect the code for educational or review purposes.
* **You MAY**: Run an unmodified local copy only for personal, noncommercial education, security review, audit, testing, or evaluation.
* **You MAY NOT**: Use this code for any commercial, workplace, client, hosted, SaaS, production, or organizational purpose.
* **You MAY NOT**: Copy, modify, fork, patch, distribute, sublicense, sell, package, mirror, host, or publish this code, including as binaries, packages, Docker/OCI images, or hosted demos.
* **You MAY NOT**: Use this code to train, fine-tune, evaluate, benchmark, validate, improve, or create AI/ML models, datasets, embeddings, retrieval systems, or derivative products.

For full legal terms, please refer to the [LICENSE](./LICENSE) file in this repository.
