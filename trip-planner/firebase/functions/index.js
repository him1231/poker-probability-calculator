const functions = require('firebase-functions')
const admin = require('firebase-admin')
admin.initializeApp()

// Example HTTPS function acting as LLM proxy (configure API key in env vars)
exports.llmProxy = functions.https.onRequest(async (req, res) => {
  // Basic auth check (expect Firebase ID token in Authorization header)
  // NOTE: Implement proper validation in production
  const body = req.body
  try {
    // Example: forward prompt to LLM provider (pseudo)
    // const response = await fetch('https://api.openai.com/v1/...', { ... })
    res.json({ ok: true, echo: body })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'proxy error' })
  }
})
