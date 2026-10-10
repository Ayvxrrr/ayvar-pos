# Ayvar POS

> Sistema web de punto de venta e inventario construido con React, Node.js y Firebase.

![Estado](https://img.shields.io/badge/Estado-demo%20de%20portafolio-blue)
![Stack](https://img.shields.io/badge/React-Node.js-Firebase-informational)

**Ayvar POS** es una aplicación full-stack para administrar negocios comerciales con operaciones protegidas en el backend. Este repositorio muestra diseño de interfaces, validaciones, Firebase Authentication, Firestore, transacciones atómicas, auditoría y reportes.

## Funcionalidades

- Acceso con roles: administrador, cajero y almacén
- Gestión de productos y categorías; trazabilidad de inventario
- Caja con carrito, cálculo de efectivo, validación de stock y `requestId` contra duplicados
- Clientes e historial de compras
- Tickets PDF **internos** (no válidos ante SUNAT)
- Reportes de ventas, ingresos, productos más vendidos y exportación CSV/PDF
- Administración de trabajadores, invitaciones por correo y auditoría

## Tecnologías

| Frontend | Backend | Datos y publicación |
| --- | --- | --- |
| React, Vite, Tailwind CSS, React Router, Recharts | Node.js, Express, Firebase Admin, Zod, Nodemailer, PDFKit | Firebase Authentication, Firestore, Firebase Hosting, Cloud Run |

## Arquitectura

```text
Usuario ── HTTPS ──> Firebase Hosting (React)
                         │
                         └── /api/** ──> Cloud Run (Express)
                                          ├── Firebase Admin (verifica identidad)
                                          └── Firestore (negocio, stock, ventas)
```

El servidor determina los precios y las existencias de cada venta desde Firestore y actualiza stock y movimientos mediante una transacción. **No** se confía en el total ni en el rol enviados por el navegador.

## Instalación local

Requiere Node.js 22 y un proyecto Firebase propio.

```bash
# Terminal 1
cd backend
npm ci
npm run dev

# Terminal 2
cd frontend
npm ci
npm run dev
```

1. Copia `backend/.env.example` a `backend/.env` y configura las variables correspondientes.
2. Coloca la clave de Firebase Admin de desarrollo en `backend/secrets/firebase-service-account.json` (nunca en Git).
3. Copia `frontend/.env.example` a `frontend/.env.local` y completa la configuración pública web de Firebase.
4. Abre `http://localhost:5173` e inicia sesión con un usuario creado por un administrador.

**Importante:** los datos de producción no deben usarse para crear cuentas o ventas falsas de demostración; prepara un proyecto Firebase de pruebas con información ficticia.

## Pruebas

```bash
cd backend
node --test
# Con Express ejecutándose: comprobar salud y rutas protegidas
# CMD Windows: set BASE_URL=http://localhost:4000
node --test tests/smoke.test.js

cd ../frontend
npm run build
# Opcional: npm install -D @playwright/test && npx playwright install chromium
npx playwright test
```

## Seguridad

- Datos empresariales se consultan y modifican únicamente desde rutas verificadas de Express.
- Firestore Security Rules deniegan el acceso directo del navegador.
- El backend utiliza Firebase Admin; en Cloud Run usa identidad administrada y no distribuye claves JSON.
- Roles comprobados en el servidor, no solo con componentes de React.
- `.env`, credenciales administrativas y configuración SMTP privada excluidas del repositorio.

Lee [SEGURIDAD.md](SEGURIDAD.md) antes de habilitar cuentas o invitar trabajadores reales.

## Despliegue

Consulta [DESPLIEGUE-PASO-A-PASO.md](DESPLIEGUE-PASO-A-PASO.md). El despliegue de Cloud Run requiere facturación habilitada, incluso si tu uso se mantiene dentro de cuotas gratuitas.

## Capturas

Agrega capturas **sin datos reales** en `docs/images/`:
- `dashboard.png`
- `punto-de-venta.png`
- `productos.png`
- `reportes.png`

## Limitaciones y próximos pasos

Esta versión es un proyecto demostrativo profesional, no un ERP fiscal certificado: no emite comprobantes electrónicos SUNAT, no procesa pagos bancarios de forma directa, no tiene flujo de devoluciones y la generación de informes trabaja por rangos acotados. Para un despliegue comercial se necesitan pruebas de concurrencia y carga, respaldo/restauración verificable, observabilidad y requisitos legales.

## Licencia

Licencia aún no elegida. No agregues una licencia sin decidir primero cómo quieres permitir la reutilización de tu código.
