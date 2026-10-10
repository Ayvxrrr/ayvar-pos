import { db } from "../config/firebaseAdmin.js";

export async function requireBusinessActive(req, res, next) {
  try {
    const snapshot = await db.collection("businesses").doc(req.account.businessId).get();
    if (!snapshot.exists || snapshot.data().active !== true) {
      return res.status(403).json({ error: "Negocio inactivo o inexistente." });
    }
    next();
  } catch (error) { next(error); }
}
