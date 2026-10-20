/** El indicador viene del perfil/negocio en Firestore, nunca del navegador. */
export function restrictPublicDemoWrites(req, res, next) {
  if (req.account?.publicDemo === true && !["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return res.status(403).json({
      code: "PUBLIC_DEMO_READ_ONLY",
      error: "La demo pública no permite modificar usuarios, enviar invitaciones ni cambiar la configuración del negocio.",
    });
  }
  next();
}
