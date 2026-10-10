
import { adminAuth, db } from "../config/firebaseAdmin.js";

const validRoles = ["admin", "cashier", "warehouse"];

export async function requireAuth(req, res, next) {
  const authorization = req.headers.authorization || "";
  const match = authorization.match(/^Bearer (.+)$/);

  if (!match) {
    return res.status(401).json({
      error: "Debes iniciar sesión.",
    });
  }

  let decodedToken;

  try {
    decodedToken = await adminAuth.verifyIdToken(
      match[1],
      true
    );
  } catch {
    return res.status(401).json({
      error: "Tu sesión no es válida o ha expirado.",
    });
  }

  try {
    const userDoc = await db
      .collection("users")
      .doc(decodedToken.uid)
      .get();

    if (!userDoc.exists) {
      return res.status(403).json({
        error: "Usuario sin acceso a Ayvar POS.",
      });
    }

    const profile = userDoc.data();

    if (
      profile.active !== true ||
      !validRoles.includes(profile.role) ||
      typeof profile.businessId !== "string" ||
      !profile.businessId
    ) {
      return res.status(403).json({
        error: "Usuario sin permisos válidos.",
      });
    }

    req.account = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: profile.name,
      role: profile.role,
      businessId: profile.businessId,
    };

    next();
  } catch (error) {
    console.error("Error de autorización:", error);

    return res.status(500).json({
      error: "No se pudo comprobar el acceso.",
    });
  }
}
