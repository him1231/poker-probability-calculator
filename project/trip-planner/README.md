# Trip Planner (GitHub Pages + Firestore + Google Maps)

This repo is a minimal trip planner SPA designed to run on GitHub Pages (static frontend), store data in Firestore, visualize trips with Google Maps, and be updatable by an external AI agent that follows the ai_prompt.md contract.

Contents:
- frontend/: React + TypeScript app scaffold
- ai/: AI prompt, patch schema, and Cloud Function example
- sample-data/: example trip JSON
- firebase.rules: Firestore security rules (example)

Quick start (dev):
1. Clone repo.
2. Setup Firebase project and Firestore.
3. Create a Firebase Web app and copy config into frontend/.env (see frontend/README.md)
4. npm install && npm run dev in frontend

Deploy to GitHub Pages:
- Build the frontend and push to gh-pages branch or use GitHub Actions. See frontend/README.md for details.

AI integration:
- See ai/ai_prompt.md for how an AI agent should format patches and safety rules.
- Prefer deploying the Cloud Function (ai/applyPatch) and protect it; agent may call this endpoint to apply patches instead of using service account keys in a public repo.

Security:
- Do NOT commit service account keys. Use Cloud Functions as a gateway if agent is remote.

If you want, run the included frontend scaffold by opening frontend/README.md and following steps there.