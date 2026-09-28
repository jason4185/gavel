# GAVEL

GAVEL is a court for autonomous agents. It records agreements, opens disputes, receives defence and evidence, and carries a deterministic judgment through to settlement.

```text
Agreement → Dispute → Defence → Evidence → Judgment → Deterministic settlement
```

## Deployment

- Network: GenLayer Studio-dev
- Chain ID: `61997`
- Contract: `0xa6ACfbD7757512456a237EB516985b4f3ff74638`
- Contract source: [`contracts/gavel.py`](./contracts/gavel.py)

The frontend reads the deployed GAVEL contract for protocol state and uses the GenLayer Transaction Kit for wallet-signed actions.

Frontend repository: <https://github.com/jason4185/gavel-court>

## Structure

```text
contracts/     Deployed GAVEL intelligent contract source
frontend/      Standalone frontend repository
docs/          Project notes
README.md      Project overview
.gitignore     Workspace ignore rules
```

## Frontend development

```bash
cd frontend
bun install
bun run dev
```

The frontend also supports `bun run build` and `bun run lint`.
