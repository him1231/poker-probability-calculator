Frontend README

This frontend is a minimal React + TypeScript app intended for GitHub Pages.

Setup:
1. cd frontend
2. copy .env.example -> .env and fill FIREBASE_CONFIG (as JSON string) and REACT_APP_GOOGLE_MAPS_API_KEY
3. npm install
4. npm run dev

Build & Deploy:
- npm run build
- deploy / publish build/ to GitHub Pages (gh-pages branch)

Notes:
- This sample uses Firebase client SDK to read trips and subcollection days.
- The Map component loads Google Maps and reads markers from a sample trip JSON when running locally.
