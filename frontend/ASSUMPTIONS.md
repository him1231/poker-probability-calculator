Assumptions and questions for backend (Timeline front-end)

Assumptions made while implementing the Timeline demo:

1) Data shape
- trips is a top-level object in sample-data.json keyed by tripId.
- Each trip contains days: an array of documents with shape: { id, date?, items: Item[] }.
- Each Item has at minimum: { id, title, status? }.

2) Status values
- Frontend treats 'suggested' and 'confirmed' specially.
- Any other status is shown as a neutral badge.

3) Photos
- photos is an optional array of image URLs (strings). If present, show up to 3 thumbnails.

4) Time format
- startTime may be an ISO timestamp or a short time string ("09:30"). The demo displays it raw.

5) placeId
- placeId is a string identifier; the frontend shows it as text. No place details fetched in demo.

6) estimatedTravelMinutes
- Not used by the demo. Back-end should provide if timeline or travel-summary will be shown.

7) Timezone handling
- The demo does not perform timezone conversions. Backend should provide times already localized or include timezone info.

8) Max items per day
- UI assumes reasonably-sized days. If a day can contain many items (50+), we should add virtualization or pagination.

Questions for backend / product:

- Confirm the exact schema for trips/{tripId}/days documents (field names and required fields).
- What are the canonical status values we should support? (e.g., suggested, confirmed, tentative, cancelled)
- Is placeId guaranteed to be present when an item represents a POI? Do you prefer the front-end to fetch place details/photos separately?
- What is the format for photos (URL strings, signed urls, or photo IDs requiring fetch)? Any size/authorization concerns?
- Do you provide estimatedTravelMinutes between items? If so, what field name and units?
- How should times be formatted and which timezone should they represent? Do you want the front-end to convert from UTC to user's locale?
- Is there a maximum expected number of items per day (for performance planning)?
- Will items include start/end timestamps or only display-order indices?

If you want I can update the Timeline to:
- Accept callbacks (onAccept/onReject) that call a mock API
- Parse and render ISO timestamps in user's locale
- Fetch place info for placeId and show richer cards
- Add visual travel-time separators between items

