import { Router } from "express";
import { randomBytes } from "node:crypto";
import { rateLimit } from "express-rate-limit";
import { FieldValue } from "firebase-admin/firestore";
import { db, adminAuth } from "../config/firebaseAdmin.js";
import { requireRole } from "../middleware/requireRole.js";
import { asyncRoute, HttpError, validate } from "../utils/api.js";
import { inviteSchema, roleSchema, statusSchema } from "../validators/adminSchemas.js";
import { emailInvitation, smtpReady } from "../services/invitationMailer.js";
import { auditEntry, auditRef } from "../services/audit.js";

const router = Router();
router.use(requireRole("admin"));
router.param("uid", (req, res, next, value) => {
  if (!/^[A-Za-z0-9_-]{6,128}$/.test(value)) {
    return res.status(400).json({ error: "UID inválido." });
  }
  next();
});
router.use(rateLimit({ windowMs: 15 * 60_000, limit: 45, standardHeaders: "draft-7", legacyHeaders: false,
  message: { error: "Demasiadas solicitudes administrativas. Intenta más tarde." } }));

const profiles = db.collection("users");
const business = req => db.collection("businesses").doc(req.account.businessId);

function assertEmployee(req, snap) {
  if (!snap.exists || snap.data().businessId !== req.account.businessId) {
    throw new HttpError(404, "Trabajador no encontrado en este negocio.");
  }
  if (snap.id === req.account.uid || snap.data().role === "admin") {
    throw new HttpError(403, "No puedes modificar un administrador desde este módulo.");
  }
}

router.get("/", asyncRoute(async (req, res) => {
  const snap = await profiles.where("businessId", "==", req.account.businessId).limit(100).get();
  const ids = snap.docs.map(d => ({ uid: d.id }));
  const authUsers = ids.length ? await adminAuth.getUsers(ids) : { users: [] };
  const authMap = new Map(authUsers.users.map(u => [u.uid, u]));
  const users = snap.docs.map(d => {
    const p = d.data();
    const au = authMap.get(d.id);
    return {
      uid: d.id, name: p.name || au?.displayName || "Sin nombre",
      email: au?.email || p.email || "", role: p.role,
      active: p.active === true, inviteStatus: p.inviteStatus || null,
      hasSignedIn: Boolean(au?.metadata?.lastSignInTime),
      authDisabled: au?.disabled ?? null,
    };
  });
  users.sort((a, b) => a.name.localeCompare(b.name, "es"));
  res.set("Cache-Control", "no-store");
  res.json({ users });
}));

router.post("/invite", asyncRoute(async (req, res) => {
  const data = validate(inviteSchema, req.body);
  if (!smtpReady()) throw new HttpError(503, "Configura SMTP en backend/.env para enviar invitaciones.");
  const b = await business(req).get();
  if (!b.exists || !b.data().active) throw new HttpError(403, "Negocio no disponible.");

  let user;
  try {
    user = await adminAuth.createUser({
      email: data.email, displayName: data.name,
      password: randomBytes(32).toString("base64url"),
      emailVerified: false, disabled: false,
    });
  } catch (err) {
    if (err.code === "auth/email-already-exists") {
      throw new HttpError(409, "Ese correo ya tiene una cuenta Firebase. Consulta al administrador.");
    }
    throw err;
  }

  const profileRef = profiles.doc(user.uid);
  const batch = db.batch();
  batch.create(profileRef, {
    name: data.name, email: data.email, role: data.role,
    businessId: req.account.businessId, active: true,
    inviteStatus: "pending", invitedBy: req.account.uid,
    invitedAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  batch.create(auditRef(req), auditEntry(req, "team.invited", "user", user.uid, { role: data.role }));
  try {
    await batch.commit();
  } catch (err) {
    try { await adminAuth.deleteUser(user.uid); } catch (cleanupError) {
      console.error("Fallo de limpieza de Auth; revisar UID:", user.uid, cleanupError.code);
    }
    throw err;
  }

  try {
    const resetLink = await adminAuth.generatePasswordResetLink(data.email);
    await emailInvitation({ to: data.email, name: data.name,
      businessName: b.data().name, resetLink });
    await profileRef.update({ inviteStatus: "sent", inviteSentAt: FieldValue.serverTimestamp() });
  } catch (err) {
    // Cuenta creada, pero no asumimos entrega. No devolver nunca el enlace al navegador.
    await profileRef.update({ inviteStatus: "delivery_failed", updatedAt: FieldValue.serverTimestamp() });
    console.error("No se pudo enviar invitación al UID:", user.uid, err.code || err.message);
    throw new HttpError(502, "Usuario creado, pero la invitación no pudo enviarse. Usa Reenviar desde Usuarios.");
  }
  res.status(201).json({ message: "Invitación enviada.", uid: user.uid });
}));

router.post("/:uid/resend", asyncRoute(async (req, res) => {
  const profileRef = profiles.doc(req.params.uid);
  const snap = await profileRef.get();
  assertEmployee(req, snap);
  const profile = snap.data();
  if (!profile.active) throw new HttpError(409, "Primero reactiva al trabajador.");
  if (!["pending", "sent", "delivery_failed"].includes(profile.inviteStatus)) {
    throw new HttpError(409, "La invitación no se puede reenviar en este estado.");
  }
  if (!smtpReady()) throw new HttpError(503, "Debes configurar SMTP.");
  const account = await adminAuth.getUser(req.params.uid);
  if (account.metadata?.lastSignInTime) {
    throw new HttpError(409, "El trabajador ya ha iniciado sesión.");
  }
  const last = profile.inviteSentAt?.toMillis?.() || 0;
  if (Date.now() - last < 60_000) throw new HttpError(429, "Espera al menos un minuto para reenviar.");
  const b = await business(req).get();
  try {
    const resetLink = await adminAuth.generatePasswordResetLink(account.email);
    await emailInvitation({ to: account.email, name: profile.name,
      businessName: b.data().name, resetLink });
    const batch = db.batch();
    batch.update(profileRef, { inviteStatus: "sent", inviteSentAt: FieldValue.serverTimestamp() });
    batch.create(auditRef(req), auditEntry(req, "team.invite_resent", "user", req.params.uid));
    await batch.commit();
  } catch (err) {
    console.error("Error al reenviar invitación al UID:", req.params.uid, err.code || err.message);
    throw new HttpError(502, "No se pudo reenviar la invitación.");
  }
  res.json({ message: "Invitación reenviada." });
}));

router.patch("/:uid/role", asyncRoute(async (req, res) => {
  const { role } = validate(roleSchema, req.body);
  const ref = profiles.doc(req.params.uid);
  await db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    assertEmployee(req, snap);
    if (!snap.data().active) throw new HttpError(409, "Trabajador inactivo.");
    const previousRole = snap.data().role;
    if (previousRole === role) return;
    tx.update(ref, { role, updatedBy: req.account.uid, updatedAt: FieldValue.serverTimestamp() });
    tx.create(auditRef(req), auditEntry(req, "team.role_changed", "user", ref.id,
      { from: previousRole, to: role }));
  });
  res.json({ message: "Rol actualizado." });
}));

router.patch("/:uid/status", asyncRoute(async (req, res) => {
  const { active } = validate(statusSchema, req.body);
  const ref = profiles.doc(req.params.uid);
  const previous = await ref.get();
  assertEmployee(req, previous);
  if (previous.data().active === active) return res.json({ message: "Sin cambios." });

  if (!active) {
    // Primero se deniega acceso en Firestore. Si falla Auth, la API sigue bloqueándolo.
    await db.runTransaction(async tx => {
      const snap = await tx.get(ref);
      assertEmployee(req, snap);
      tx.update(ref, { active: false, updatedBy: req.account.uid,
        updatedAt: FieldValue.serverTimestamp() });
      tx.create(auditRef(req), auditEntry(req, "team.disabled", "user", ref.id));
    });
    try {
      await adminAuth.updateUser(ref.id, { disabled: true });
    } catch (err) {
      console.error("Cuenta bloqueada en Firestore, pendiente Firebase Auth UID:", ref.id, err.code);
      throw new HttpError(502, "Acceso bloqueado en Ayvar POS. Revisa la sincronización con Firebase Authentication.");
    }
  } else {
    // Primero Auth y luego Firestore. Si falla la BD, requireAuth aún deniega acceso.
    try {
      await adminAuth.updateUser(ref.id, { disabled: false });
    } catch (err) {
      throw new HttpError(502, "No se pudo reactivar la cuenta en Firebase Authentication.");
    }
    await db.runTransaction(async tx => {
      const snap = await tx.get(ref);
      assertEmployee(req, snap);
      tx.update(ref, { active: true, updatedBy: req.account.uid,
        updatedAt: FieldValue.serverTimestamp() });
      tx.create(auditRef(req), auditEntry(req, "team.enabled", "user", ref.id));
    });
  }
  res.json({ message: active ? "Cuenta reactivada." : "Cuenta desactivada." });
}));

export default router;
