let voiceSession = null;

function setVoiceUI(recording, busy, message) {
  const button = document.getElementById('voiceBtn');
  button.classList.toggle('recording', recording);
  button.setAttribute('aria-pressed', String(recording));
  button.setAttribute('aria-label', recording ? 'Stop recording and add items' : 'Speak items');
  button.title = recording ? 'Stop recording and add items' : 'Speak items in Hebrew, English or Spanish';
  button.disabled = busy;
  document.getElementById('addBtn').disabled = recording || busy;
  document.getElementById('clearBtn').disabled = recording || busy;
  document.getElementById('itemInput').disabled = recording || busy;
  document.getElementById('voiceStatus').textContent = message;
}

function inputError(message) {
  const error = document.getElementById('errorMsg');
  error.textContent = message;
  error.style.display = 'block';
}

function cancelVoice() {
  const session = voiceSession;
  if (!session) return;
  voiceSession = null;
  clearTimeout(session.timer);
  session.controller.abort();
  if (session.recorder && session.recorder.state !== 'inactive') session.recorder.stop();
  if (session.stream) session.stream.getTracks().forEach(track => track.stop());
  setVoiceUI(false, false, 'Speak in Hebrew, English or Spanish.');
}

async function toggleVoice() {
  if (voiceSession) {
    const recorder = voiceSession.recorder;
    if (recorder && recorder.state === 'recording') {
      setVoiceUI(false, true, 'Transcribing your items...');
      recorder.stop();
    }
    return;
  }
  if (document.getElementById('addBtn').disabled || !curBoard()) return;
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    inputError('Voice recording is unavailable in this browser. Use a recent Chrome, Edge or Safari browser over HTTPS.');
    return;
  }
  const session = { controller: new AbortController(), listId, boardId: currentBoardId };
  voiceSession = session;
  document.getElementById('errorMsg').style.display = 'none';
  setVoiceUI(false, true, 'Allow microphone access to speak.');
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    if (voiceSession !== session) {
      stream.getTracks().forEach(track => track.stop());
      return;
    }
    session.stream = stream;
    const mimeType = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus']
      .find(type => MediaRecorder.isTypeSupported(type));
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    session.recorder = recorder;
    const chunks = [];
    recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
    recorder.onerror = () => {
      if (voiceSession !== session) return;
      cancelVoice();
      inputError('Recording failed. Please try again.');
    };
    recorder.onstop = async () => {
      clearTimeout(session.timer);
      stream.getTracks().forEach(track => track.stop());
      if (voiceSession !== session) return;
      setVoiceUI(false, true, 'Transcribing your items...');
      try {
        const type = recorder.mimeType || chunks[0]?.type || 'audio/webm';
        const audio = new Blob(chunks, { type });
        if (!audio.size) throw new Error('No audio recorded. Please try again.');
        const extension = type.includes('mp4') ? 'mp4' : type.includes('ogg') ? 'ogg' : 'webm';
        const form = new FormData();
        form.append('file', audio, `recording.${extension}`);
        const response = await fetch('/api/transcribe', {
          method: 'POST', body: form, signal: session.controller.signal
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not transcribe your items.');
        if (voiceSession !== session || listId !== session.listId || currentBoardId !== session.boardId) return;
        if (typeof data.text !== 'string' || !data.text.trim()) throw new Error('No speech detected. Please try again.');
        const input = document.getElementById('itemInput');
        input.value = [input.value.trim(), data.text.trim()].filter(Boolean).join(', ');
        voiceSession = null;
        setVoiceUI(false, false, 'Adding your spoken items...');
        await addItems();
      } catch (error) {
        if (voiceSession === session) inputError(error.message || 'Voice input failed. Please try again.');
      } finally {
        if (voiceSession === session) {
          voiceSession = null;
          setVoiceUI(false, false, 'Speak in Hebrew, English or Spanish.');
        }
      }
    };
    recorder.start();
    setVoiceUI(true, false, 'Listening in Hebrew, English or Spanish. Tap the microphone again to add items.');
    session.timer = setTimeout(() => {
      if (voiceSession === session && recorder.state === 'recording') {
        setVoiceUI(false, true, 'Transcribing your items...');
        recorder.stop();
      }
    }, 60000);
  } catch (error) {
    if (voiceSession !== session) return;
    cancelVoice();
    inputError(error.name === 'NotAllowedError'
      ? 'Microphone access was denied. Allow it in your browser settings and try again.'
      : 'Could not access your microphone. Check that it is connected and try again.');
  }
}

window.addEventListener('pagehide', cancelVoice);
