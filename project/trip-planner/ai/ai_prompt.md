AI Prompt & Patch Contract

Purpose
The AI agent that updates trips must follow this contract so the frontend and Cloud Function can safely apply changes to Firestore.

Input to agent:
- A snapshot of the trip document (see sample-data/trip-sample.json)
- baseVersion (integer) read from trip.version

Agent output (strict JSON):
{
  "action": "patch" | "comment" | "noop",
  "tripId": "string",
  "baseVersion": integer,
  "changes": {
    "metaUpdates": { /* optional: title, startDate, endDate, timezone */ },
    "daysToUpsert": [
      { "date": "YYYY-MM-DD",
        "items": [ /* array of activity objects */ ]
      }
    ],
    "daysToDelete": [ "YYYY-MM-DD" ]
  },
  "summary": "short human-friendly summary",
  "confidence": 0.0-1.0,
  "reason": "optional detailed rationale"
}

Rules:
- Agent must include baseVersion it read. Cloud Function checks current trip.version; if mismatch, reject and return conflict.
- Activity object schema must match sample-data/activity-schema.json.
- If agent lacks permission to write directly, it should return action:"patch" and an explanation for human review.
- For autopilot small edits obey trip.autopilotPolicy if present.

Example: see sample-data/patch-example.json
