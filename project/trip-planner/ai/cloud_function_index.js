// Minimal Cloud Function example (Node.js)
// Deploy with Firebase Functions. This function expects a POST JSON body matching the AI patch schema.

const admin = require('firebase-admin');
const functions = require('firebase-functions');
admin.initializeApp();
const db = admin.firestore();

exports.applyPatch = functions.https.onRequest(async (req, res) => {
  try {
    const patch = req.body;
    if (!patch || patch.action !== 'patch') return res.status(400).send({error: 'Invalid patch'});
    const tripRef = db.collection('trips').doc(patch.tripId);
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(tripRef);
      if (!snap.exists) throw new Error('trip not found');
      const trip = snap.data();
      if (trip.version !== patch.baseVersion) throw new Error('version_conflict');
      // apply meta updates
      const updates = {};
      if (patch.changes && patch.changes.metaUpdates) {
        Object.assign(updates, patch.changes.metaUpdates);
      }
      // apply daysToUpsert
      if (patch.changes && Array.isArray(patch.changes.daysToUpsert)) {
        for (const day of patch.changes.daysToUpsert) {
          const dayRef = tripRef.collection('days').doc(day.date);
          tx.set(dayRef, { date: day.date, items: day.items }, { merge: true });
        }
      }
      // delete days
      if (patch.changes && Array.isArray(patch.changes.daysToDelete)) {
        for (const d of patch.changes.daysToDelete) {
          const dayRef = tripRef.collection('days').doc(d);
          tx.delete(dayRef);
        }
      }
      // bump version and aiHistory
      const aiEntry = { who: 'AI', when: admin.firestore.FieldValue.serverTimestamp(), changeSummary: patch.summary, patch: patch };
      updates.version = (trip.version || 0) + 1;
      updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
      updates.aiHistory = admin.firestore.FieldValue.arrayUnion(aiEntry);
      tx.update(tripRef, updates);
    });
    res.send({ok: true});
  } catch (err) {
    if (err.message === 'version_conflict') return res.status(409).send({error: 'version_conflict'});
    console.error(err);
    res.status(500).send({error: err.message});
  }
});