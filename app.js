(() => {
  const $ = (id) => document.getElementById(id);
  const cfg = window.APP_CONFIG || {};
  const hasConfig = cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && !cfg.SUPABASE_URL.includes('PEGA_AQUI') && !cfg.SUPABASE_ANON_KEY.includes('PEGA_AQUI');
  let client = null, guest = null;
  if (hasConfig && window.supabase) client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  const params = new URLSearchParams(location.search);
  let token = params.get('t');
  const form = $('rsvp-form');
  const loading = $('loading-message');
  const generic = $('generic-message');
  const feedback = $('rsvp-feedback');
  const fnUrl = () => `${cfg.SUPABASE_URL}/functions/v1/public-invitation`;

  async function callFunction(body) {
    if (!hasConfig) throw new Error('El sistema aún necesita configurarse con Supabase. Consulta el archivo README.md.');
    const response = await fetch(fnUrl(), { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: cfg.SUPABASE_ANON_KEY, Authorization: `Bearer ${cfg.SUPABASE_ANON_KEY}` }, body: JSON.stringify(body) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'No se pudo conectar con el sistema. Intenta de nuevo.');
    return data;
  }
  function applyEventConfig(event) {
    if (!event) return;
    if (event.graduate_name) document.querySelector('h1').innerHTML = escapeHtml(event.graduate_name).replace(' ', ' <br><span>') + '</span>';
    if (event.university) document.querySelector('.topline span').textContent = event.university;
    if (event.ceremony_date_text) document.querySelector('.detail strong').textContent = event.ceremony_date_text;
    if (event.ceremony_time) document.querySelector('.detail div span').textContent = event.ceremony_time;
    if (event.venue) document.querySelectorAll('.detail strong')[1].textContent = event.venue;
    if (event.address) document.querySelectorAll('.detail div span')[1].textContent = event.address;
    if (event.map_url) $('map-link').href = event.map_url;
    if (event.celebration_text) $('celebration-copy').textContent = event.celebration_text;
    if (event.celebration_details) $('party-details').textContent = event.celebration_details;
    if (event.photo_url) $('graduate-photo').src = event.photo_url;
    if (event.music_url) $('background-music').src = event.music_url;
  }
  function escapeHtml(str) { return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function setupCount(id, max) {
    const el = $(id); el.max = String(max);
    if (Number(el.value) > max) el.value = max;
    el.addEventListener('change', () => { const n = Math.max(0, Math.min(max, Number(el.value || 0))); el.value = n; });
  }
  function configureCompanions(guestData, isNew) {
    const ceremonyMax = isNew ? 5 : Number(guestData.max_ceremony_companions || 0);
    const partyMax = isNew ? 5 : Number(guestData.max_party_companions || 0);
    $('ceremony-limit').textContent = `(máx. ${ceremonyMax} acompañantes)`;
    $('party-limit').textContent = `(máx. ${partyMax} acompañantes)`;
    setupCount('ceremony-companions', ceremonyMax); setupCount('party-companions', partyMax);
  }
  async function init() {
    if (!token) {
      try {
        const data = await callFunction({ action: 'public_load' });
        applyEventConfig(data.event);
        $('guest-greeting').textContent = 'Tu presencia hará este día aún más especial. Escribe tu nombre completo y responde para registrar tu asistencia.';
        $('guest-name').readOnly = false;
        $('guest-name').value = '';
        $('ceremony-status').value = 'pending'; $('party-status').value = 'pending';
        $('ceremony-companions').value = 0; $('party-companions').value = 0;
        configureCompanions({}, true);
        loading.hidden = true; generic.hidden = true; form.hidden = false;
      } catch (err) { loading.textContent = err.message; loading.classList.add('shake'); }
      return;
    }
    try {
      const data = await callFunction({ action: 'load', token });
      guest = data.guest; applyEventConfig(data.event);
      $('guest-name').value = guest.full_name;
      $('guest-name').readOnly = false;
      $('guest-greeting').textContent = `¡Hola, ${guest.full_name}! Puedes revisar o actualizar tus respuestas.`;
      $('ceremony-status').value = guest.ceremony_status || 'pending'; $('party-status').value = guest.party_status || 'pending';
      $('ceremony-companions').value = guest.ceremony_companions || 0; $('party-companions').value = guest.party_companions || 0;
      configureCompanions(guest, false);
      loading.hidden = true; form.hidden = false;
    } catch (err) { loading.textContent = err.message; loading.classList.add('shake'); }
  }
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fullName = $('guest-name').value.trim();
    if (fullName.length < 2) { feedback.textContent = 'Escribe tu nombre completo para continuar.'; $('guest-name').focus(); return; }
    const button = $('save-rsvp'); button.disabled = true; button.textContent = 'Guardando…'; feedback.textContent = '';
    const common = { ceremony_status: $('ceremony-status').value, ceremony_companions: Number($('ceremony-companions').value || 0), party_status: $('party-status').value, party_companions: Number($('party-companions').value || 0) };
    try {
      let result;
      if (!token) {
        result = await callFunction({ action: 'register', full_name: fullName, ...common });
        token = result.token; guest = result.guest;
        const nextUrl = new URL(location.href); nextUrl.searchParams.set('t', token); history.replaceState({}, '', nextUrl.toString());
        $('guest-name').value = guest.full_name;
        $('guest-greeting').textContent = `¡Gracias, ${guest.full_name}! Tu registro quedó guardado. Puedes volver a este enlace para actualizar tus respuestas.`;
        configureCompanions(guest, false);
      } else {
        result = await callFunction({ action: 'rsvp', token, full_name: fullName, ...common });
        $('guest-greeting').textContent = `¡Gracias, ${fullName}! Tus respuestas se actualizaron.`;
      }
      feedback.textContent = result.message || '¡Tu respuesta fue guardada! Gracias.';
    } catch (err) { feedback.textContent = err.message; }
    finally { button.disabled = false; button.textContent = 'Confirmar respuesta'; }
  });
  $('music-toggle').addEventListener('click', async () => {
    const audio = $('background-music'), button = $('music-toggle');
    try { if (audio.paused) { await audio.play(); button.setAttribute('aria-pressed','true'); $('music-label').textContent = 'Pausar música'; $('music-symbol').textContent = '♫'; } else { audio.pause(); button.setAttribute('aria-pressed','false'); $('music-label').textContent = 'Activar música'; } }
    catch (_) { $('music-label').textContent = 'Añade musica.mp3 a assets'; }
  });
  init();
})();
