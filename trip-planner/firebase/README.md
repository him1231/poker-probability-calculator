Firebase folder: contains functions sample. Configure Firebase project before deploying.

Commands:
- Install functions deps: cd firebase/functions && npm install
- Emulate locally: firebase emulators:start
- Deploy functions: firebase deploy --only functions

Remember to set env vars for LLM API keys, e.g. using `firebase functions:config:set llm.key="YOUR_KEY"` and access via functions.config().llm.key
