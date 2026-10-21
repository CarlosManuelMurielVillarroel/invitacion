import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Content-Type': 'application/json' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });
const allowed = new Set(['pending','accepted','declined']);
const randomToken = () => Array.from(crypto.getRandomValues(new Uint8Array(24)), b => b.toString(16).padStart(2, '0')).join('');
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Método no permitido.' }, 405);
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return json({ error: 'La función no está configurada en el servidor.' }, 500);
  const db = createClient(url, serviceKey, { auth: { persistSession: false } });
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: 'Solicitud inválida.' }, 400); }
  const { data: eventRow } = await db.from('event_settings').select('settings').eq('id', 1).maybeSingle();
  const event = eventRow?.settings ?? {};
  if (body.action === 'public_load') return json({ event });

  const fullName = typeof body.full_name === 'string' ? body.full_name.trim().replace(/\s+/g, ' ') : '';
  const ceremonyStatus = String(body.ceremony_status ?? 'pending');
  const partyStatus = String(body.party_status ?? 'pending');
  const ceremonyCompanions = Number(body.ceremony_companions ?? 0);
  const partyCompanions = Number(body.party_companions ?? 0);
  if (!allowed.has(ceremonyStatus) || !allowed.has(partyStatus)) return json({ error: 'Selecciona una respuesta válida para cada evento.' }, 400);
  if (!Number.isInteger(ceremonyCompanions) || ceremonyCompanions < 0 || ceremonyCompanions > 5 || !Number.isInteger(partyCompanions) || partyCompanions < 0 || partyCompanions > 5) return json({ error: 'Puedes indicar entre 0 y 5 acompañantes para cada evento.' }, 400);

  if (body.action === 'register') {
    if (fullName.length < 2 || fullName.length > 120) return json({ error: 'Escribe tu nombre completo (entre 2 y 120 caracteres).' }, 400);
    const token = randomToken();
    const { data: created, error: createError } = await db.from('guests').insert({
      full_name: fullName, invite_token: token,
      max_ceremony_companions: 5, max_party_companions: 5,
      ceremony_status: ceremonyStatus,
      ceremony_companions: ceremonyStatus === 'accepted' ? ceremonyCompanions : 0,
      party_status: partyStatus,
      party_companions: partyStatus === 'accepted' ? partyCompanions : 0,
      updated_at: new Date().toISOString()
    }).select('id,full_name,invite_token,max_ceremony_companions,max_party_companions,ceremony_status,ceremony_companions,party_status,party_companions').single();
    if (createError || !created) return json({ error: 'No pudimos registrar tus datos. Intenta otra vez.' }, 500);
    return json({ token, guest: created, event, message: '¡Tu nombre y tus respuestas quedaron registrados correctamente!' });
  }

  const token = typeof body.token === 'string' ? body.token : '';
  if (!/^[a-f0-9]{48}$/.test(token)) return json({ error: 'El enlace personal no es válido. Verifica que abriste el enlace completo.' }, 400);
  const { data: guest, error } = await db.from('guests').select('id,full_name,invite_token,max_ceremony_companions,max_party_companions,ceremony_status,ceremony_companions,party_status,party_companions').eq('invite_token', token).maybeSingle();
  if (error) return json({ error: 'No se pudo consultar la invitación.' }, 500);
  if (!guest) return json({ error: 'No encontramos este registro. Abre la invitación general y vuelve a registrarte.' }, 404);
  if (body.action === 'load') return json({ guest, event });
  if (body.action !== 'rsvp') return json({ error: 'Acción no válida.' }, 400);
  if (fullName.length < 2 || fullName.length > 120) return json({ error: 'Escribe tu nombre completo (entre 2 y 120 caracteres).' }, 400);
  if (ceremonyCompanions > guest.max_ceremony_companions || partyCompanions > guest.max_party_companions) return json({ error: 'La cantidad de acompañantes supera el límite de tu registro.' }, 400);
  const { error: updateError } = await db.from('guests').update({
    full_name: fullName, ceremony_status: ceremonyStatus,
    ceremony_companions: ceremonyStatus === 'accepted' ? ceremonyCompanions : 0,
    party_status: partyStatus,
    party_companions: partyStatus === 'accepted' ? partyCompanions : 0,
    updated_at: new Date().toISOString()
  }).eq('id', guest.id);
  if (updateError) return json({ error: 'No pudimos guardar tus respuestas. Intenta otra vez.' }, 500);
  return json({ message: '¡Tus datos y respuestas se actualizaron correctamente!' });
});
