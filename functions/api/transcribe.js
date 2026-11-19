const MAX_AUDIO_BYTES = 10 * 1024 * 1024;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}

export async function onRequest({ request, env }) {
  if (request.method !== 'POST') return json({ error: 'Use POST to transcribe audio.' }, 405);
  if (!env.GROQ_API_KEY) return json({ error: 'Voice input is not configured yet.' }, 503);
  if (Number(request.headers.get('content-length')) > MAX_AUDIO_BYTES + 65536) {
    return json({ error: 'Recording is too large. Try a shorter recording.' }, 413);
  }
  let form;
  try {
    form = await request.formData();
  } catch {
    return json({ error: 'Send a recording as multipart form data.' }, 400);
  }
  const file = form.get('file');
  if (!file || typeof file.arrayBuffer !== 'function' || !file.size) {
    return json({ error: 'No audio recorded. Please try again.' }, 400);
  }
  if (file.size > MAX_AUDIO_BYTES) return json({ error: 'Recording is too large.' }, 413);
  if (!/^audio\/(webm|mp4|ogg|wav|mpeg|x-m4a)(;|$)/i.test(file.type)) {
    return json({ error: 'Unsupported recording format.' }, 415);
  }
  const upstream = new FormData();
  upstream.append('file', file, file.name || 'recording.webm');
  upstream.append('model', 'whisper-large-v3');
  upstream.append('response_format', 'json');
  upstream.append('temperature', '0');
  // Omit language so Hebrew, English and Spanish are detected automatically.
  try {
    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.GROQ_API_KEY}` },
      body: upstream,
      signal: AbortSignal.timeout(45000)
    });
    if (!response.ok) return json({ error: 'Could not transcribe. Please try again shortly.' }, 502);
    const data = await response.json();
    const text = typeof data.text === 'string' ? data.text.trim() : '';
    if (!text) return json({ error: 'No speech detected. Please try again.' }, 422);
    return json({ text });
  } catch {
    return json({ error: 'Voice service is unavailable. Please try again.' }, 502);
  }
}
