import { useEffect, useRef, useState } from 'react';
import apiClient from '../api/client';

export default function VideoInterviewPage({ token }) {
  const [interview, setInterview] = useState(null);
  const [mode, setMode] = useState('record');
  const [file, setFile] = useState(null);
  const [recording, setRecording] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const recorderRef = useRef(null); const streamRef = useRef(null); const chunksRef = useRef([]); const liveVideoRef = useRef(null);

  useEffect(() => {
    apiClient.get(`/video-interview/public/${token}`).then((response) => setInterview(response.data.data)).catch((requestError) => setError(requestError.response?.data?.message || 'Unable to load this interview.'));
    return () => { stopCamera(); };
  }, [token]);

  useEffect(() => {
    if (!interview || !['processing', 'pending'].includes(interview.status)) return undefined;
    const interval = setInterval(async () => {
      try { const response = await apiClient.get(`/video-interview/public/${token}`); setInterview(response.data.data); } catch { /* retain current state */ }
    }, 3000);
    return () => clearInterval(interval);
  }, [interview?.status, token]);

  useEffect(() => {
    if (mode === 'record' && !previewUrl && !streamRef.current) startCamera();
    if (mode === 'upload') stopCamera();
  }, [mode, previewUrl]);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (liveVideoRef.current) liveVideoRef.current.srcObject = null;
  };

  async function startCamera() {
    try {
      const stream = streamRef.current || await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (liveVideoRef.current) liveVideoRef.current.srcObject = stream;
      setError('');
      return stream;
    } catch {
      setError('Camera and microphone access are required to record a video.');
      return null;
    }
  }

  const setSelectedFile = (nextFile) => {
    if (!nextFile) return;
    if (nextFile.size > 100 * 1024 * 1024) return setError('Video must be 100MB or smaller.');
    setError(''); setFile(nextFile);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(nextFile));
  };
  const startRecording = async () => {
    try {
      const stream = await startCamera();
      if (!stream) return;
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream, MediaRecorder.isTypeSupported('video/webm') ? { mimeType: 'video/webm' } : undefined);
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onstop = () => { const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'video/webm' }); setSelectedFile(new File([blob], `interview-${Date.now()}.webm`, { type: blob.type })); stopCamera(); };
      recorder.start(); recorderRef.current = recorder; setRecording(true);
    } catch { setError('Camera and microphone access are required to record a video.'); }
  };
  const stopRecording = () => { recorderRef.current?.stop(); setRecording(false); };
  const selectRecordMode = () => {
    if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(''); setFile(null); }
    setMode('record');
  };
  const submit = async () => {
    if (!file) return setError('Record or select a video before submitting.');
    setSubmitting(true); setError('');
    const formData = new FormData(); formData.append('video', file);
    try { const response = await apiClient.post(`/video-interview/public/${token}/upload`, formData); setInterview(response.data.data); } catch (requestError) { setError(requestError.response?.data?.message || 'Unable to submit your video.'); } finally { setSubmitting(false); }
  };

  if (error && !interview) return <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '1.5rem' }}><div className="card" style={{ color: '#f87171' }}>{error}</div></main>;
  if (!interview) return <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>Loading interview…</main>;
  if (interview.status === 'processing') return <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '1.5rem' }}><section className="card" style={{ maxWidth: 520, textAlign: 'center' }}><h1>Processing your interview…</h1><p style={{ color: 'var(--text-muted)' }}>Your video is being transcribed and reviewed. You may close this page.</p></section></main>;
  if (interview.status === 'completed') return <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '1.5rem' }}><section className="card" style={{ maxWidth: 520, textAlign: 'center' }}><h1>Interview submitted</h1><p style={{ color: 'var(--text-muted)' }}>Thank you. The recruiter has received your response.</p></section></main>;

  return <main style={{ minHeight: '100vh', padding: '2rem 1.5rem', background: 'var(--bg-primary)' }}><section className="card" style={{ maxWidth: 720, margin: '0 auto' }}>
    <h1 style={{ marginTop: 0 }}>Video Interview</h1><p style={{ color: 'var(--text-muted)' }}>Please answer the following question in your own words.</p>
    <blockquote style={{ borderLeft: '3px solid #818cf8', paddingLeft: '1rem', margin: '1.25rem 0', fontSize: '1.1rem' }}>{interview.question}</blockquote>
    {interview.status === 'failed' && <p role="alert" style={{ color: '#f87171' }}>{interview.errorMessage || 'The earlier submission could not be processed. You can submit a new recording.'}</p>}
    <div style={{ display: 'flex', gap: '.5rem', marginBottom: '1rem' }}><button onClick={selectRecordMode} className={mode === 'record' ? 'btn-primary' : ''} style={mode === 'record' ? {} : { padding: '.75rem 1rem', borderRadius: '8px' }}>Record Video</button><button onClick={() => setMode('upload')} className={mode === 'upload' ? 'btn-primary' : ''} style={mode === 'upload' ? {} : { padding: '.75rem 1rem', borderRadius: '8px' }}>Upload Video</button></div>
    {mode === 'record' ? <div>{!previewUrl && <video ref={liveVideoRef} autoPlay muted playsInline style={{ width: '100%', maxHeight: 360, aspectRatio: '16 / 9', objectFit: 'cover', marginBottom: '1rem', borderRadius: '8px', background: '#000', transform: 'scaleX(-1)' }} />}{!recording ? <button className="btn-primary" onClick={startRecording}>{streamRef.current ? 'Start Recording' : 'Enable Camera & Start Recording'}</button> : <button onClick={stopRecording} style={{ padding: '.75rem 1rem', borderRadius: '8px', background: '#dc2626', color: '#fff' }}>Stop Recording</button>}</div> : <input type="file" accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov" onChange={(event) => setSelectedFile(event.target.files?.[0])} />}
    {previewUrl && <video src={previewUrl} controls playsInline style={{ width: '100%', maxHeight: 360, aspectRatio: '16 / 9', objectFit: 'contain', marginTop: '1rem', borderRadius: '8px', background: '#000' }} />}
    {error && <p role="alert" style={{ color: '#f87171', marginTop: '1rem' }}>{error}</p>}
    <button className="btn-primary" onClick={submit} disabled={submitting || !file} style={{ marginTop: '1rem' }}>{submitting ? 'Submitting…' : 'Submit Video'}</button>
  </section></main>;
}
