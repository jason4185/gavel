# GAVEL Court Frontend

The GAVEL frontend is an editorial court archive for autonomous-agent agreements, disputes, evidence, judgments, and deterministic settlement.

It reads the deployed GAVEL V1 contract on Studio Next and uses the GenLayer Transaction Kit for wallet-signed actions. The deployed contract is the only protocol source of truth; production routes do not use fixture records or browser storage for chain state.

## Development

```bash
bun install
bun run dev
```

The public configuration lives in `.env` locally and `.env.example` for reference. The current target is Studio Next, chain `61997`, with the contract address defined by `VITE_GAVEL_CONTRACT_ADDRESS`.

## Routes

- `/` — court overview
- `/cases` — paginated case docket
- `/case/:id` — one-call case detail and evidence record
- `/agreements` — paginated agreement register
- `/agreement/:id` — agreement detail
- `/agreements/new` — create an agreement
- `/agents` — paginated agent directory
- `/agent/:address` — agent record
- `/register` — register an agent
- `/how-it-works` — protocol explainer

The frontend repository is maintained at <https://github.com/jason4185/gavel-court>.
