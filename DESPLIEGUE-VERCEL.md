# Ayvar POS completo en Vercel

Se conserva el proyecto y dominio `https://ayvar-pos.vercel.app`.
El `vercel.json` de la raíz define dos **Services**: React/Vite en `/` y Express en `/api/**`.
No hace falta otro dominio, cambiar `VITE_API_URL` ni activar Cloud Run o Firebase Blaze para esta configuración.
Vercel Services está en beta y sujeto a las cuotas y condiciones del plan; no es una promesa de uso ilimitado o costo cero.

## 1. Preparar las variables privadas en Vercel

Abre tu proyecto de Vercel → **Settings → Environment Variables**. Para **Production**, agrega:

| Variable | Valor |
| --- | --- |
| `NODE_ENV` | `production` |
| `FIREBASE_PROJECT_ID` | El ID de tu proyecto Firebase, el mismo que `VITE_FIREBASE_PROJECT_ID` |
| `FRONTEND_URL` | `https://ayvar-pos.vercel.app` |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | El contenido JSON completo de tu cuenta de servicio Firebase Admin |

Marca `FIREBASE_SERVICE_ACCOUNT_JSON` como **Secret** (o **Sensitive**, según la interfaz). Si ya tienes el archivo
`backend/secrets/firebase-service-account.json` para desarrollo, ábrelo localmente y copia su contenido
directamente al campo de Vercel, sin comillas adicionales ni bloques Markdown.
No lo pegues en chats, capturas, comandos, GitHub ni variables `VITE_*`.
El archivo debe pertenecer al mismo proyecto que `FIREBASE_PROJECT_ID`.

Si necesitas una credencial exclusiva para el despliegue, usa una cuenta de servicio con los permisos
necesarios de Firestore y Firebase Authentication; no concedas Owner o Editor como atajo.
Una clave de cuenta de servicio otorga acceso administrativo: protege su uso y rótala si se expone.
Cloud Run continúa admitiendo ADC sin clave JSON y el desarrollo local mantiene su archivo ignorado por Git.

Conserva las cuatro variables públicas `VITE_FIREBASE_*` que ya usa el frontend.
Si publicas previews funcionales, configura también las variables del backend para **Preview**,
preferiblemente con un proyecto Firebase de demostración separado. No compartas datos comerciales reales en previews.

## 2. Cambiar el proyecto de solo frontend a Services

En **Settings → Build and Deployment**:

1. Borra el contenido de **Root Directory** y déjalo vacío para usar la raíz del repositorio; Vercel puede mostrar `./` como indicación.
2. Selecciona **Application/Framework Preset: Services** si aparece el selector.
3. Desactiva los overrides generales de Build Command, Install Command y Output Directory.
   Esos valores ya están definidos dentro de cada servicio en el `vercel.json` de la raíz.
4. Guarda los cambios. No crees un segundo proyecto y no cambies el dominio existente.

Esto es necesario: si Root Directory sigue siendo `frontend`, Vercel no encontrará el backend ni la configuración de Services.

El frontend usa `npm ci --include=dev` para instalar Vite y `@vitejs/plugin-react`, incluso con
`NODE_ENV=production`. Son herramientas necesarias durante la compilación; no se sirve `node_modules`
al navegador, solo los archivos generados en `dist`.

## 3. Subir el código y desplegar

Desde la raíz del repositorio, revisa `git status` y sube únicamente los archivos de esta configuración.
No incluyas `.env`, `backend/secrets/` ni JSON administrativos.
El push a la rama de producción inicia un despliegue nuevo. Si necesitas hacerlo manualmente,
usa **Deployments → último despliegue → Redeploy**, después de guardar las variables y la configuración.

## 4. Verificar

Cuando el despliegue muestre **Ready**, prueba:

- `https://ayvar-pos.vercel.app/login`: abre directamente y también al actualizar la página.
- `https://ayvar-pos.vercel.app/api/health`: devuelve JSON con `success: true`.
- `https://ayvar-pos.vercel.app/api/me` sin iniciar sesión: devuelve HTTP **401**, no HTML de React.
- Inicia sesión con una cuenta existente y autorizada; comprueba consultas y permisos.
  La prueba de salud solo confirma que Express arranca, no verifica por sí sola el acceso a Firestore.

En Firebase Authentication → Configuración → Dominios autorizados, conserva `ayvar-pos.vercel.app`.
Las cuentas de negocio, roles y usuarios existentes siguen siendo obligatorios: no se habilita acceso anónimo.

Los correos de invitación requieren las variables SMTP de `backend/.env.example`; `SMTP_PASS` debe ser sensible.
Sin SMTP el resto del sistema puede funcionar, pero las invitaciones no se enviarán.

## Errores comunes

- **404 en `/api/health`:** revisa Root Directory y que el nuevo despliegue incluya ambos servicios.
- **`Cannot find package '@vitejs/plugin-react'` durante la compilación:** verifica que el servicio
  frontend use `npm ci --include=dev`. Con `NODE_ENV=production`, `npm ci` sin esa opción omite las
  dependencias de desarrollo necesarias para compilar. Sube la corrección y espera al nuevo despliegue.
- **500 al arrancar:** revisa los Runtime Logs del backend. La cuenta JSON debe estar completa,
  ser válida y corresponder a `FIREBASE_PROJECT_ID`.
- **401 en `/api/me` sin sesión:** es correcto; la API exige un token Firebase válido.
- **403 con sesión:** verifica el perfil, rol y negocio activo en Firestore, sin desactivar los controles de acceso.
- **Solo cambiaste variables:** haz un nuevo despliegue para que las use.

Documentación oficial: [Services](https://vercel.com/docs/services),
[rutas de Services](https://vercel.com/docs/services/routing) y
[Express en Vercel](https://vercel.com/docs/frameworks/backend/express).
