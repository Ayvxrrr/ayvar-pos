# Plan de pruebas — Fase 9

## 1. Unitarias (automatizadas)

Ejecutar desde `backend`:

```cmd
node --test
```

Incluye pruebas existentes de cálculos de reportes y esquemas de administración; incorpora pruebas de autorización por rol y configuración HTTPS. No se conecta a Firebase real.

## 2. Pruebas de humo (automatizadas, sin operaciones de escritura)

Inicia backend local y luego:

```cmd
set BASE_URL=http://localhost:4000
node --test tests/smoke.test.js
```

Después de desplegar, usa `set BASE_URL=https://ayvar-pos.web.app` para verificar que la redirección `/api` funcione por Hosting y que la API rechace solicitudes sin token. La prueba solo hace lecturas.

## 3. Navegador con Playwright (opcional)

```cmd
cd frontend
npm install -D @playwright/test
npx playwright install chromium
npx playwright test
```

El frontend de pruebas debe tener su `frontend/.env.local` configurado. Estas pruebas comprueban login visible y rutas protegidas. No comprueban ventas reales.

## 4. Manuales críticas, sobre un Firebase de pruebas

| Prueba | Esperado |
| --- | --- |
| Administrador crea usuario cajero | Invitación y permisos correctos |
| Cajero intenta `/api/team` | 403 |
| Almacén intenta crear una venta | 403 |
| Sin token entra a `/api/me` | 401 |
| Dos cajeros venden más del stock disponible | Solo transacciones válidas se confirman |
| Reenviar venta con el mismo `requestId` | No duplica la venta |
| Vender con precio desactualizado | 409, no descuenta stock |
| PDF e informe | Descargan con contenido y fechas correctas |
| Cliente de negocio B accede al de negocio A | No accede |
| Empleado desactivado usa su token anterior | No accede |

**Esta suite NO sustituye las pruebas con el emulador Firestore/Auth ni las pruebas de carga/seguridad requeridas antes de operar con información real.**
