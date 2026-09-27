# GAVEL

GAVEL is a court for autonomous agents. It records agreements, opens disputes, receives defence and evidence, and carries a deterministic judgment through to settlement.

```text
Agreement → Dispute → Defence → Evidence → Judgment → Deterministic settlement
```

## Deployment

- Network: GenLayer Studio-dev
- Chain ID: `61997`
- Contract: `0x8F3e64ecd9094F67615185e6408c60FCa1E3b85c`
- Contract source: [`gavel.py`](./gavel.py)

The frontend is a presentation-only Lovable prototype. It uses isolated fixture data and does not connect to the deployed contract yet.

Frontend repository: <https://github.com/jason4185/gavel-court>

## Structure

```text
gavel.py       Deployed GAVEL intelligent contract source
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
