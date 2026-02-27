Schema and AI prompt for Activity Autopilot

Confirmed Activity object schema (exact fields):
- id: string (UUID or stable id)
- type: string (one of: 'place_visit' | 'photo' | 'task' | 'note' | 'transport' | 'meal' | 'other')
- startTime: string (ISO 8601 timestamp)
- endTime: string (ISO 8601 timestamp) | null
- suggested: boolean (true if AI suggested this item; false if user-confirmed)
- confirmed: boolean (true if user confirmed/edited the suggestion)
- confidence: number (0.0-1.0) — AI confidence score for suggestions; optional for user-created items
- placeId: string | null (external place identifier, e.g., Google Place ID) — prefer null when absent
- placeName: string | null
- photos: array of objects (may be empty). Photo object fields:
    - id: string
    - url: string
    - width: number | null
    - height: number | null
    - timestamp: string (ISO 8601) | null
- metadata: object (freeform key/value map for detectors, e.g., {detector: 'wifi', source: 'sensorA'})
- createdAt: string (ISO 8601)
- updatedAt: string (ISO 8601) | null

Index recommendations (database / search):
- Primary key on id
- Composite index on (startTime) for range queries by date
- Composite index on (placeId, startTime) to fetch all visits to a place in time order
- Index on (suggested, confirmed) to quickly filter suggestions vs confirmed items
- Full-text index on metadata keys you expect to query (e.g., placeName, metadata.tags)
- If using geo queries, store place lat/lng in indexed columns and create spatial index
- If using search across photos, index photos.id and foreign key to activity.id

Autopilot policy example (for AI prompt use):
- autopilotPolicy: {
    suggestionThreshold: 0.65, // minimum confidence to present suggestion
    maxSuggestionsPerDay: 10,
    preferPlaceMatching: true, // prefer merging suggestions with existing placeId when detected
    autoConfirmLowRisk: false, // do NOT auto-confirm items without explicit user action
    photoTieThresholdSeconds: 120 // group photos within this window to same activity
  }

AI prompt template (short):
- System: You are an assistant that converts raw sensor and calendar signals into clean "activity" objects matching the schema. Only emit JSON compliant with the schema. Do not invent extra top-level fields. Use autopilotPolicy to decide what to suggest.
- User: Given input signals (gps traces, wifi logs, user photos, calendar events), produce an array of activity objects for the day. Mark suggested=true for items produced by AI. Set confirmed=false unless the user data shows explicit confirmation. Include confidence (0.0-1.0) for suggested items.

Notes for implementers:
- Treat suggested vs confirmed as separate booleans (suggested=true && confirmed=false for typical AI suggestion). A user-confirmed AI suggestion should be suggested=true && confirmed=true.
- Keep photos array small; store large media in object storage and reference by URL.
- Timestamps must be ISO 8601 with timezone (UTC recommended in storage).
- For incremental updates, use updatedAt to track changes.

Example autopilotPolicy usage in prompt:
"autopilotPolicy: {suggestionThreshold:0.65, maxSuggestionsPerDay:10, preferPlaceMatching:true, autoConfirmLowRisk:false, photoTieThresholdSeconds:120 }"
