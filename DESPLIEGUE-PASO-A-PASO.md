# Ayvar POS · Despliegue en Firebase Hosting + Cloud Run (Windows CMD)

> **No ejecutes los pasos de Cloud Run sin querer activar facturación.** Esta solución requiere Firebase **Blaze** con una cuenta de facturación vinculada, aunque pueda haber cuotas gratuitas. Los presupuestos y alertas no son un límite automático de gasto. Primero puedes completar las pruebas, README y CI sin desplegar nada.

## Diagrama

```text
https://ayvar-pos.web.app/
  ├── HTML, CSS, JS (Firebase Hosting)
  └── /api/** (rewrite de Hosting) → Cloud Run ayvar-pos-api
                                        └── Firestore y Firebase Auth con Firebase Admin
```

Todas las URL utilizadas en esta guía asumen que el ID de tu proyecto es **`ayvar-pos`** y que despliegas Cloud Run en **`us-central1`**. Si cambias de región, cambia el valor tanto en el comando como en `firebase.json`.

## Paso 0. Guardar cambios y revisar secretos

Desde `C:\Users\USAUARIO\Desktop\ayvar-pos`:

```cmd
git status
git diff --cached --name-only
```

Comprueba que `.env`, `.env.local`, `backend/secrets/`, PDF de ventas y contraseñas SMTP **no** se rastrean. Ejecuta `git ls-files` si tienes dudas. **No publiques datos reales de clientes ni ventas en GitHub**.

## Paso 1. Preparar archivos locales

Copia los archivos nuevos del ZIP según `INTEGRACION.md`. En el frontend, en modo producción las peticiones se envían a `/api` del **mismo dominio**. En desarrollo, siguen yendo a `http://localhost:4000`.

La nueva versión de `backend/src/config/firebaseAdmin.js` utiliza el archivo local `backend/secrets/firebase-service-account.json` en desarrollo; en producción utiliza ADC (credenciales de la identidad asignada a Cloud Run). No copies el JSON al servidor.

En `backend/.env`:

```dotenv
PORT=4000
NODE_ENV=development
FIREBASE_PROJECT_ID=ayvar-pos
FRONTEND_URL=http://localhost:5173
```

Y conserva tus variables SMTP **solo localmente**. El frontend sigue necesitando la configuración web `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID` en `frontend/.env.local`.

## Paso 2. Verificar en local

En dos CMD distintos:

```cmd
cd /d "C:\Users\USAUARIO\Desktop\ayvar-pos\backend"
npm ci
node --test
npm run dev
```

```cmd
cd /d "C:\Users\USAUARIO\Desktop\ayvar-pos\frontend"
npm ci
npm run build
npm run dev
```

Prueba login, caja, cliente, inventario y reportes. No hagas pruebas de ventas falsas en una base de datos comercial con información real.

## Paso 3. Habilitar la facturación (acción deliberada del propietario)

En Firebase Console, revisa el proyecto **ayvar-pos** y pasa a Blaze si deseas publicar el backend en Cloud Run. Confirma antes los precios y las cuotas. Configura alertas de presupuesto en Google Cloud Billing. Para minimizar exposición durante la demo, configura un máximo de 1 instancia; esto **no** garantiza costo cero ni constituye límite de gasto.

Instala Google Cloud CLI desde la documentación oficial e inicia sesión:

```cmd
gcloud init
gcloud config set project ayvar-pos
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
```

En algunos proyectos Cloud Build puede solicitar permisos adicionales para la cuenta de servicio de compilación (`roles/run.builder`) o para tu identidad. Consulta la guía oficial según el error concreto, sin asignar Owner o Editor como solución rápida.

## Paso 4. Crear una identidad exclusiva para Express

Ejecuta en CMD (cada línea es un comando completo):

```cmd
gcloud iam service-accounts create ayvar-pos-api --display-name="Ayvar POS Backend"
```

```cmd
gcloud projects add-iam-policy-binding ayvar-pos --member="serviceAccount:ayvar-pos-api@ayvar-pos.iam.gserviceaccount.com" --role="roles/datastore.user"
```

```cmd
gcloud projects add-iam-policy-binding ayvar-pos --member="serviceAccount:ayvar-pos-api@ayvar-pos.iam.gserviceaccount.com" --role="roles/firebaseauth.admin"
```

Estos roles dan al backend lectura/escritura de Firestore y administración de usuarios Firebase. El rol Firebase Authentication Admin es amplio; reduce los permisos mediante IAM personalizado si tu organización dispone de esa configuración y valida antes todas las operaciones requeridas.

## Paso 5. Publicar el backend Node.js

**Antes de desplegar**, confirma que `backend/.gcloudignore` excluya `secrets/`, `.env`, `.env.*` y `node_modules/`. Verifica que `backend/package.json` tenga el script `"start":"node src/server.js"` y una versión Node LTS compatible. Si es necesario, `npm pkg set scripts.start="node src/server.js"`.

Desde `backend`:

```cmd
cd /d "C:\Users\USAUARIO\Desktop\ayvar-pos\backend"
```

Ejecuta **una sola línea** en CMD:

```cmd
gcloud run deploy ayvar-pos-api --source . --region us-central1 --service-account ayvar-pos-api@ayvar-pos.iam.gserviceaccount.com --allow-unauthenticated --max-instances=1 --set-env-vars NODE_ENV=production,FIREBASE_PROJECT_ID=ayvar-pos,FRONTEND_URL=https://ayvar-pos.web.app
```

**¿Por qué `--allow-unauthenticated`?** Firebase Hosting reenvía peticiones públicas al servicio. Cloud Run no realizará el control de Firebase ID Token del usuario: **Express** seguirá exigiéndolo en cada API privada mediante `requireAuth`, `requireBusinessActive` y `requireRole`. No publiques rutas administrativas sin estos middlewares. `/api/health` es el único endpoint público del ejemplo.

La terminal mostrará una URL `https://...run.app`. Comprueba `.../api/health` y que `.../api/me` sin token devuelva 401. El servicio no debe depender de `secrets/firebase-service-account.json`; usa credenciales ADC.

### Nota sobre invitaciones SMTP

Puedes publicar primero sin SMTP; `/api/team/invite` responderá 503 hasta configurar el proveedor. **No uses `--set-env-vars SMTP_PASS=...` ni subas secretos a Git.**

Para habilitarlo en Cloud Run: crea un secreto `ayvar-pos-smtp-pass` en **Google Cloud Secret Manager**, concede `roles/secretmanager.secretAccessor` a `ayvar-pos-api@ayvar-pos.iam.gserviceaccount.com`, y configúralo en el servicio con:

```cmd
gcloud run services update ayvar-pos-api --region us-central1 --update-secrets SMTP_PASS=ayvar-pos-smtp-pass:1
```

Añade `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER` y `SMTP_FROM` como variables de configuración **no secretas** del servicio, desde Cloud Run Console → Editar y desplegar nueva revisión. Evita publicar contraseñas o credenciales en comandos o capturas. SMTP puede requerir puertos y configuración del proveedor compatibles con Cloud Run.

## Paso 6. Habilitar Firebase Hosting para React

Instala CLI (puede pedir iniciar sesión):

```cmd
npm install -g firebase-tools
firebase login
```

Comprueba el archivo `firebase.json` en la raíz de Ayvar POS. La primera rewrite debe enviar `/api/**` a Cloud Run y la segunda debe enviar cualquier otra ruta de React a `/index.html`.

Como tenemos Vite, el directorio público es `frontend/dist`; **no** `public` ni `frontend/public`.

```cmd
cd /d "C:\Users\USAUARIO\Desktop\ayvar-pos\frontend"
npm run build
```

Vuelve a la raíz y publica **solo** Hosting:

```cmd
cd ..
firebase deploy --only hosting --project ayvar-pos
```

No ejecutes `firebase init hosting` sobre el archivo proporcionado sin revisarlo, porque puede sobrescribir las rewrites personalizadas.

Cuando termine, abre `https://ayvar-pos.web.app`. Si no es esa la URL asignada en tu proyecto, utiliza la URL real y actualiza `FRONTEND_URL` en Cloud Run.

## Paso 7. Ajustar Firebase Authentication

En Firebase Console → Authentication → Configuración → Dominios autorizados, comprueba que el dominio publicado (`ayvar-pos.web.app` o tu dominio real) esté autorizado. Verifica tu login con la URL final HTTPS.

## Paso 8. Pruebas de humo en la URL pública

En `backend` ejecuta:

```cmd
set BASE_URL=https://ayvar-pos.web.app
node --test tests/smoke.test.js
```

Debe devolver 200 en `/api/health` y 401 sin token en rutas privadas. Después prueba con cuenta autorizada, **en una base de datos de demo**: creación de producto, venta, stock, historial y PDF.

## Paso 9. Observación y límites

- Google Cloud → Cloud Run → Metrics/Logs: errores 401/403 esperados para visitantes no autenticados, y 5xx no esperados.
- Firebase Console → Firestore → Usage: lecturas y escrituras.
- Google Cloud Billing: alertas de presupuesto **no detienen** el gasto automáticamente.
- Cloud Run `--max-instances=1` evita demasiadas instancias, pero puede limitar rendimiento y no excluye otros costos.
- Rutas HTTP, roles, Firestore y Firebase Authentication deben probarse de nuevo después de cada despliegue.

## Si prefieres evitar activar Blaze

No necesitas desplegar todavía Cloud Run. Completa pruebas, captura pantallas locales con datos ficticios, crea un video de demostración y publica el repositorio en GitHub **sin credenciales**. Firebase Hosting para un frontend estático puede usarse dentro de la cuota Spark, pero la API Express no funcionará por sí sola hasta que la publiques en un backend compatible; no presentes la aplicación como una demo online funcional si todavía no tiene API desplegada.
