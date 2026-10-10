import { FieldValue } from "firebase-admin/firestore";
import { db } from "../config/firebaseAdmin.js";

// Nunca registrar contraseñas, tokens, enlaces de invitación ni secretos.
export function auditRef(req) {
  return db.collection("businesses").doc(req.account.businessId)
    .collection("auditLogs").doc();
}

export function auditEntry(req, action, targetType, targetId, details = {}) {
  return {
    actorId: req.account.uid,
    actorRole: req.account.role,
    action,
    targetType,
    targetId,
    details,
    createdAt: FieldValue.serverTimestamp(),
  };
}
