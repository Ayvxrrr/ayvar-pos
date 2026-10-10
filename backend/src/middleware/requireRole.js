
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.account) {
      return res.status(401).json({
        error: "Usuario no autenticado.",
      });
    }

    if (!allowedRoles.includes(req.account.role)) {
      return res.status(403).json({
        error: "No tienes permisos para esta operación.",
      });
    }

    next();
  };
}
