import nodemailer from "nodemailer";

export function smtpReady() {
  return ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SMTP_FROM"]
    .every(name => Boolean(process.env[name]));
}

let transporter;
function getTransporter() {
  if (!smtpReady()) throw new Error("SMTP_NOT_CONFIGURED");
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error("SMTP_PORT_INVALID");
    }
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      requireTLS: port !== 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      connectionTimeout: 12000,
      greetingTimeout: 12000,
      socketTimeout: 16000,
    });
  }
  return transporter;
}

export async function emailInvitation({ to, name, businessName, resetLink }) {
  const frontend = process.env.FRONTEND_URL || "http://localhost:5173";
  const subject = `Invitación a Ayvar POS — ${businessName}`;
  const text = [
    `Hola ${name}:`, "",
    `Te invitaron a trabajar en ${businessName} utilizando Ayvar POS.`,
    "Para establecer tu contraseña, abre este enlace personal:",
    resetLink, "",
    "Luego inicia sesión en:", frontend + "/login", "",
    "Si no esperabas esta invitación, ignora este mensaje.",
    "No compartas el enlace de configuración de contraseña.",
  ].join("\n");
  await getTransporter().sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject,
    text,
  });
}
