# AI Coding Assistant Guidelines — SalesSense

This defines what AI tools (Claude Code, Copilot, ChatGPT, etc.) are allowed to touch in this repo unsupervised, what needs human review before merging, and what's off-limits. The goal isn't distrust of AI — it's making sure the team can actually explain and defend every part of this project, since it's being evaluated academically.

## ✅ Safe for AI to write/modify freely

- **Frontend UI components** — styling, layout, non-logic-critical pieces (`frontend/src/components/`)
- **Documentation** — README updates, code comments, docstrings
- **Boilerplate/scaffolding** — new file structure, initial folder setup, config templates
- **Tests** — writing unit/integration tests for existing logic
- **Data preprocessing utility functions** — cleaning helpers, formatting — as long as a human reviews the output before it touches the real dataset

## ⚠️ AI can draft, but a human must review before merge

- **API endpoint signatures** — changing a request/response shape affects every other member's work; someone needs to actually check it matches `docs/SalesSense_Architecture_Plan.md`
- **Database schema / MongoDB models** — same reasoning, breaking changes ripple outward
- **Model training code** (`backend/app/models/`) — AI can help write the SARIMA/Prophet/LSTM implementations, but whoever owns Modeling needs to actually understand every parameter choice — this is exactly what a professor or viva will ask about
- **Evaluation/metrics code** (`backend/app/evaluation/`) — this decides what "best model" even means; if AI quietly changes how wMAPE is calculated, your results stop being comparable to the reference paper
- **Authentication/security-related code**

## 🚫 Off-limits for AI to touch unsupervised

- **`.env` / secrets / credentials / API keys** — never let an AI tool read, write, or "helpfully clean up" this file
- **Already-trained model checkpoints/weights** — don't let AI silently retrain and overwrite a saved model; that erases reproducibility
- **The finalized dataset subset** — once Member 1 locks in the 5–10 store-product series, don't let AI "improve" the selection without the team agreeing — it invalidates every result computed so far
- **`docs/SalesSense_SRS.md`** — this is a formal submitted deliverable; changes go through the team, not a one-off AI edit
- **Grading-relevant write-ups** (conclusions, result interpretations) — AI can help you word things, but the analysis and conclusions need to be genuinely yours, since you'll be asked to defend them

## The underlying rule of thumb

If a teammate can't explain *why* a piece of code does what it does — not just *what* it does — that's a sign it needs more human review, not less, regardless of who or what wrote it. AI assistance is fine everywhere; not understanding your own project isn't.
