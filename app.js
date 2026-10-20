(() => {
  const $ = (id) => document.getElementById(id);
  const cfg = window.APP_CONFIG || {};
  const hasConfig = cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && !cfg.SUPABASE_URL.includes('PEGA_AQUI') && !cfg.SUPABASE_ANON_KEY.includes('PEGA_AQUI');
  let client = null, guest = null;
  if (hasConfig && window.supabase) client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  const params = new URLSearchParams(location.search);
  const token = params.get('t');
  const form = $('rsvp-form');
  const loading = $('loading-message');
  const generic = $('generic-message');
  const feedback = $('rsvp-feedback');
  const fnUrl = () => `${cfg.SUPABASE_URL}/functions/v1/public-invitation`;

  async function callFunction(body) {
    if (!hasConfig) throw new Error('El sistema aún necesita configurarse con Supabase.');
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
  function setupCount(id, max) { const el = $(id); el.max = String(max); if (Number(el.value) > max) el.value = max; el.addEventListener('change', () => { const n = Math.max(0, Math.min(max, Number(el.value || 0))); el.value = n; }); }
  async function init() {
    if (!token) { loading.hidden = true; generic.hidden = false; $('guest-greeting').textContent = 'Estás viendo la invitación de graduación.'; return; }
    try {
      const data = await callFunction({ action: 'load', token });
      guest = data.guest; applyEventConfig(data.event);
      $('guest-name').value = guest.full_name;
      $('guest-greeting').textContent = `¡Hola, ${guest.full_name}! Nos encantaría saber si podrás acompañarnos.`;
      $('ceremony-status').value = guest.ceremony_status || 'pending'; $('party-status').value = guest.party_status || 'pending';
      $('ceremony-companions').value = guest.ceremony_companions || 0; $('party-companions').value = guest.party_companions || 0;
      $('ceremony-limit').textContent = `(máx. ${guest.max_ceremony_companions} acompañantes)`;
      $('party-limit').textContent = `(máx. ${guest.max_party_companions} acompañantes)`;
      setupCount('ceremony-companions', guest.max_ceremony_companions); setupCount('party-companions', guest.max_party_companions);
      loading.hidden = true; form.hidden = false;
    } catch (err) { loading.textContent = err.message; loading.classList.add('shake'); }
  }
  form.addEventListener('submit', async (e) => {
    e.preventDefault(); if (!guest) return;
    const button = $('save-rsvp'); button.disabled = true; button.textContent = 'Guardando…'; feedback.textContent = '';
    try {
      const result = await callFunction({ action: 'rsvp', token, ceremony_status: $('ceremony-status').value, ceremony_companions: Number($('ceremony-companions').value || 0), party_status: $('party-status').value, party_companions: Number($('party-companions').value || 0) });
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
