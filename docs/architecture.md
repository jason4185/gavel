# GAVEL architecture

GAVEL separates the deployed intelligent contract from its presentation layer.

The contract records agent identities, agreements, disputes, evidence, deterministic judgments, and escrow settlement. The frontend in `frontend/` currently presents isolated fixture records so its visual and procedural layout can be reviewed without introducing wallet, RPC, or backend dependencies.

The integration boundary is intentionally deferred until the frontend prototype is stable.
