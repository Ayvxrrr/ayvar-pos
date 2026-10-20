# Cuentas de la demo pública

Se utiliza el **mismo proyecto Firebase** y el **mismo dominio Vercel**. Se crea un negocio
"Demo pública" independiente dentro de `businesses`, sin copiar datos ni modificar al administrador existente.
Cada cuenta conserva su rol: administrador, cajero o almacén.

## Límites de seguridad

- Las cuentas públicas solo deben contener información ficticia. No equivalen a cuentas seguras para uso comercial.
- Cualquier visitante con las credenciales puede modificar productos, existencias o ventas de la demo según su rol.
- Usuarios e identidad/configuración del negocio son de solo lectura para estas cuentas. No pueden enviar invitaciones.
  El backend impone estas restricciones, no solo los botones de React.
- Como se utiliza Firebase Authentication con correo y contraseña, alguien que conozca una cuenta compartida podría
  cambiar su contraseña/correo o eliminarla directamente a través de Firebase Auth. La demo puede sufrir vandalismo.
- El aislamiento es por negocio dentro del mismo proyecto, **no** por infraestructura: sigue compartiendo cuotas y recursos.
  Supervisa uso de Firebase/Vercel y desactiva la demo si hay abuso. El rate limit en memoria no garantiza un límite global.
- Nunca reutilices estas contraseñas en el administrador real, Firebase Console, GitHub u otros servicios.

## Preparar y activar

Las credenciales se guardan únicamente en `backend/secrets/public-demo-access.json`, ignorado por Git y Vercel.
No hay contraseñas codificadas en el frontend ni en el repositorio.

Desde `backend`, con las credenciales Firebase Admin locales ya configuradas:

```bash
npm run demo:users -- --project ayvar-pos --prepare
```

Se generan contraseñas si no se define `PUBLIC_DEMO_PASSWORD`. Esa variable permite elegir una contraseña de prueba,
pero no debe guardarse en Git ni reutilizarse fuera de la demo. La preparación se niega a modificar correos que ya existan.
Las cuentas nuevas, sus perfiles y el negocio nacen **deshabilitados**.

Después de publicar el código y ver en `/api/health` la capacidad `publicDemo: 1`:

```bash
npm run demo:users -- --project ayvar-pos --activate
```

La activación exige que la protección esté publicada y comprueba que cada UID y documento pertenezcan a esta demo.
Luego verifica el login de cada rol y las restricciones antes de distribuir las credenciales.
Los datos iniciales son dos categorías, tres productos y un cliente, todos ficticios; no se generan ventas falsas fuera de la demo.

Para bloquear la demo pública sin tocar al administrador original:

```bash
npm run demo:users -- --project ayvar-pos --disable
```

Conserva el archivo local de acceso para poder identificar y deshabilitar exclusivamente estas cuentas.
