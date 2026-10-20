# Invitación virtual — Paola García Olguin

Proyecto inicial completo: invitación pública, panel privado, respuestas por invitado, QR individual y exportación a Excel. Está preparado para Supabase + Vercel. El código se entrega sin credenciales; primero hay que configurar y publicar los servicios.

## Contenido
- `index.html`, `styles.css`, `app.js`: invitación pública adaptable a móvil/PC.
- `admin.html`, `admin.css`, `admin.js`: panel privado de gestión.
- `config.js`: URL/clave pública de Supabase y URL pública del sitio.
- `assets/paola-placeholder.svg`: retrato ilustrativo temporal; sustitúyelo por tu foto.
- `supabase/schema.sql`: tablas y políticas de seguridad.
- `supabase/functions/public-invitation/index.ts`: función servidor para consultar la invitación por token y guardar confirmaciones sin exponer tablas al público.

## 1. Crear Supabase
1. Entra en https://supabase.com y crea un proyecto.
2. Abre **SQL Editor**, crea una consulta, pega el contenido de `supabase/schema.sql` y ejecútalo.
3. En **Project Settings → API** (o Connect), copia Project URL y la clave pública `anon`/publishable. Nunca uses la clave `service_role` en `config.js`.
4. En **Authentication → Users**, crea un usuario con correo y contraseña que usarás para entrar al panel.
5. Copia el UUID del usuario creado. En SQL Editor ejecuta, reemplazando el UUID por el real:
   ```sql
   insert into public.admins (user_id) values ('PEGA-AQUI-EL-UUID-DEL-USUARIO');
   ```
   Solo ese usuario (y cualquier otro añadido expresamente a `admins`) podrá administrar los datos.

## 2. Configurar el frontend
Edita `config.js`:
```js
window.APP_CONFIG = {
  SUPABASE_URL: 'https://TU-PROYECTO.supabase.co',
  SUPABASE_ANON_KEY: 'TU_CLAVE_PUBLICA_ANON',
  SITE_URL: 'https://TU-SITIO.vercel.app'
};
```
Antes de publicar, reemplaza los tres valores de ejemplo por los reales. La clave `anon`/publishable está diseñada para el frontend y las tablas tienen RLS; no pongas claves secretas aquí.

## 3. Publicar la función segura de invitaciones
La página pública no consulta directamente las tablas: usa una Supabase Edge Function.
1. Instala Node.js y Supabase CLI siguiendo las guías oficiales: https://supabase.com/docs/guides/functions y https://supabase.com/docs/guides/cli.
2. En una terminal, desde la carpeta del proyecto, inicia sesión y vincula el proyecto:
   ```bash
   supabase login
   supabase link --project-ref TU_PROJECT_REF
   supabase functions deploy public-invitation
   ```
3. La función necesita `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`. Supabase suele proveerlas en el entorno de Edge Functions; si no aparecen configuradas, establece los secretos desde CLI con los valores de tu proyecto:
   ```bash
   supabase secrets set SUPABASE_URL=https://TU-PROYECTO.supabase.co SUPABASE_SERVICE_ROLE_KEY=TU_SERVICE_ROLE_SECRET
   ```
   La clave service role es privada: úsala solo como secreto del servidor, nunca en archivos web, repositorios públicos o capturas.

## 4. Publicar en Vercel
1. Sube esta carpeta a un repositorio privado de GitHub, o importa la carpeta en Vercel según el método que uses.
2. En https://vercel.com importa el proyecto como sitio estático. No necesita build command; directorio de salida `.` (raíz).
3. Actualiza `SITE_URL` en `config.js` con la URL real de Vercel y vuelve a publicar.
4. Abre la URL pública. En `/admin.html` inicia sesión con el usuario administrador.

También puedes probar localmente con un servidor estático, por ejemplo `python -m http.server 8000`, y abrir `http://localhost:8000`. Las respuestas públicas requieren que la Edge Function ya esté desplegada.

## 5. Cambiar la foto y la música
- Foto: sustituye `assets/paola-placeholder.svg` por una imagen tuya llamada `paola.jpg`, cambia el `src` de la etiqueta `graduate-photo` en `index.html` a `assets/paola.jpg`, o carga una imagen en un alojamiento público y pega su URL en el panel.
- Música: coloca un archivo con permiso para usar llamado `musica.mp3` dentro de `assets/`. El navegador solo inicia el audio cuando el visitante pulsa **Activar música**, porque muchos móviles bloquean la reproducción automática.

## 6. Cómo usarlo
1. Entra en `admin.html` y accede.
2. Crea un registro por invitado, definiendo los máximos de acompañantes para cada evento.
3. Copia el enlace individual y envíalo por WhatsApp. Descarga el QR si quieres imprimirlo.
4. El invitado puede confirmar acto y celebración por separado. El panel refleja las respuestas.
5. Pulsa **Exportar Excel** para descargar la lista.
6. Edita los datos del evento desde el panel cuando se confirme la celebración posterior.

## Notas
- La invitación se puede abrir en cualquier momento mientras el sitio esté publicado y la plataforma disponible; no hay horario de acceso.
- La fecha del acto está preconfigurada para el sábado 24 de octubre de 2026 a las 14:30.
- El panel es privado por autenticación y RLS. No compartas la contraseña de administrador ni la clave service role.
- Los servicios de terceros/CDN requieren conexión a Internet. Revisa las condiciones y límites gratuitos vigentes de Supabase, Vercel y los proveedores de recursos.
