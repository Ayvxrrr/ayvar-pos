# Seguridad — Ayvar POS

## Modelo

- Firebase Authentication **identifica** al usuario; Express revisa `users/{uid}` en cada solicitud.
- Express obtiene el `businessId` del perfil verificado, nunca de un parámetro manipulable.
- Firestore Rules: `allow read, write: if false` para acceso directo del cliente.
- Los servicios administrados con Firebase Admin **omiten** reglas Firestore: controles de seguridad, permisos y pertenencia al negocio deben aplicarse en cada ruta Express.
- Solo roles autorizados pueden iniciar operaciones de ventas, actualizar inventario, gestionar usuarios, etc.
- Las ventas usan transacciones atómicas e idempotencia. Pueden requerirse pruebas bajo concurrencia elevada.

## Secretos

No publicar: `backend/.env`, credenciales JSON administrativas, `SMTP_PASS`, tokens de sesión, URLs privadas de invitaciones, archivos de respaldo de clientes o ventas. Nunca guardarlos como variables `VITE_*`.

En Cloud Run: usar ADC (identidad del servicio) para Firebase Admin. Para credenciales SMTP utilizar Secret Manager. El servicio necesita `roles/datastore.user` y permisos apropiados de Firebase Authentication para administrar trabajadores.

## Datos personales

DNI, RUC, dirección, correo y teléfono pueden ser datos personales. Evitar registros innecesarios, definir acceso mínimo y borrado/retención apropiados; usar un proyecto de demostración con datos ficticios para GitHub.

## Puntos por verificar antes de producción comercial

1. Rotación de credenciales expuestas accidentalmente y revisión de `git log` (eliminar el archivo actual no borra el historial).
2. Verificación manual de 401/403, suspensión de cuentas y aislamiento entre negocios.
3. Prueba simultánea con varios cajeros y venta de la última unidad.
4. Confirmación de que una venta no puede duplicarse con el mismo `requestId`.
5. Protección de API contra abuso: cuotas, observabilidad, controles globales si se requiere, y políticas para IP (el rate-limit en memoria no se comparte entre instancias).
6. Respaldo y plan de recuperación de Firestore, y política de retención de auditoría.
7. Requisitos tributarios, laborales y de protección de datos correspondientes a Perú.
8. Revisar dependencias con `npm audit`, resolver vulnerabilidades sin cambios incompatibles ciegos.

## Reporte responsable de problemas

Si identificas un problema de seguridad, no publiques tokens ni información personal en un issue público. Contacta al mantenedor por un canal privado acordado.
