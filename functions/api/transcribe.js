const MAX_AUDIO_BYTES = 8 * 1024 * 1024;
const TYPES = { 'audio/webm': 'webm', 'audio/mp4': 'mp4', 'audio/ogg': 'ogg', 'audio/wav': 'wav' };
function json(body, status = 200) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}
export async function onRequest({ request, env }) {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  if (request.headers.get('Origin') !== new URL(request.url).origin)
    return json({ error: 'Origin not allowed' }, 403);
  const type = (request.headers.get('Content-Type') || '').split(';')[0].trim().toLowerCase();
  if (!TYPES[type]) return json({ error: 'Unsupported audio format' }, 415);
  if (!env.GROQ_API_KEY) return json({ error: 'Voice input is temporarily unavailable' }, 503);
  if (Number(request.headers.get('Content-Length')) > MAX_AUDIO_BYTES)
    return json({ error: 'Recording too large. Try a shorter recording.' }, 413);
  try {
    // Bound memory even when Content-Length is absent or inaccurate.
    const reader = request.body?.getReader();
    if (!reader) return json({ error: 'No recording received' }, 400);
    let size = 0;
    const chunks = [];
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_AUDIO_BYTES) {
        await reader.cancel();
        return json({ error: 'Recording too large. Try a shorter recording.' }, 413);
      }
      chunks.push(value);
    }
    if (!size) return json({ error: 'No recording received' }, 400);
    const form = new FormData();
    form.append('file', new Blob(chunks, { type }), 'items.' + TYPES[type]);
    form.append('model', 'whisper-large-v3');
    form.append('response_format', 'json');
    form.append('temperature', '0');
    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST', headers: { Authorization: 'Bearer ' + env.GROQ_API_KEY },
      body: form, signal: AbortSignal.timeout(35000)
    });
    if (!response.ok) return json({ error: 'Could not transcribe audio. Please try again.' }, 502);
    const data = await response.json();
    if (typeof data.text !== 'string' || !data.text.trim())
      return json({ error: 'No clear speech detected. Please try again.' }, 422);
    if (data.text.length > 1000)
      return json({ error: 'Too many spoken items. Please use a shorter recording.' }, 413);
    return json({ text: data.text.trim() });
  } catch {
    return json({ error: 'Voice input failed. Please try again.' }, 502);
  }
}
