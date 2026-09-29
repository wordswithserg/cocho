import React, { useState, useRef, useEffect, useCallback } from 'react';

const toolbar: React.CSSProperties = {
  height: 48,
  background: '#1a1a1a',
  display: 'flex',
  alignItems: 'center',
  padding: '0 16px',
  color: '#fff',
  fontSize: 18,
  fontWeight: 600,
  letterSpacing: 1,
  flexShrink: 0,
};

const panelHeader: React.CSSProperties = {
  padding: '8px 12px',
  background: '#2a2a2a',
  color: '#ccc',
  fontSize: 13,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: 1,
  borderBottom: '1px solid #3a3a3a',
};

const panelBody: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#555',
  fontSize: 14,
};

// ─── OpenAI key ──────────────────────────────────────────────────────────────
// Locally, REACT_APP_OPENAI_API_KEY from .env is used. On the hosted site each
// user supplies their own key, which is kept only in their browser.

const OPENAI_KEY_STORAGE = 'cocho.openaiKey';

function getOpenAIKey(): string | null {
  if (process.env.REACT_APP_OPENAI_API_KEY) return process.env.REACT_APP_OPENAI_API_KEY;
  let key: string | null = null;
  try { key = localStorage.getItem(OPENAI_KEY_STORAGE); } catch {}
  if (key) return key;
  key = window.prompt('Paste your OpenAI API key to use auto-transcribe.\nIt is stored only in this browser.')?.trim() || null;
  if (key) { try { localStorage.setItem(OPENAI_KEY_STORAGE, key); } catch {} }
  return key;
}

function clearOpenAIKey() {
  try { localStorage.removeItem(OPENAI_KEY_STORAGE); } catch {}
}

// ─── Shared types ────────────────────────────────────────────────────────────

interface AudioTag {
  id: number;
  time: number;
  label: string;
}

interface ScriptTag {
  lineNumber: number;
  label: string;
}

interface VideoPin {
  id: number;
  videoTime: number;
  audioTime: number;
  label: string;
}

// ─── ScriptPanel ─────────────────────────────────────────────────────────────

interface ScriptPanelProps {
  scriptTags: ScriptTag[];
  setScriptTags: React.Dispatch<React.SetStateAction<ScriptTag[]>>;
  activeSyncLine: number | null;
  lines: string[] | null;
  setLines: React.Dispatch<React.SetStateAction<string[] | null>>;
}

function ScriptPanel({ scriptTags, setScriptTags, activeSyncLine, lines, setLines }: ScriptPanelProps) {
  const [mode, setMode] = useState<'upload' | 'paste'>('upload');
  const [pasteText, setPasteText] = useState('');
  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const lineRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  useEffect(() => {
    if (activeSyncLine == null) return;
    const el = lineRefs.current.get(activeSyncLine);
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [activeSyncLine]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setLines((ev.target?.result as string).split('\n'));
      setSelectedLine(null);
      setScriptTags([]);
    };
    reader.readAsText(file);
  }

  function handlePasteSubmit() {
    setLines(pasteText.split('\n'));
    setSelectedLine(null);
    setScriptTags([]);
  }

  function handleTagLine(lineNumber: number) {
    const label = window.prompt(`Enter a label for line ${lineNumber}:`, `cue-${lineNumber}`);
    if (!label) return;
    setScriptTags(prev => [...prev.filter(t => t.lineNumber !== lineNumber), { lineNumber, label }]);
    setSelectedLine(null);
  }

  function getTag(lineNumber: number) {
    return scriptTags.find(t => t.lineNumber === lineNumber) ?? null;
  }

  const btnBase: React.CSSProperties = {
    padding: '5px 14px', fontSize: 12, border: '1px solid #555',
    borderRadius: 4, cursor: 'pointer', background: '#3a3a3a', color: '#ccc',
  };
  const btnActive: React.CSSProperties = { ...btnBase, background: '#4a90e2', color: '#fff', borderColor: '#4a90e2' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={panelHeader}>Script</div>

      <div style={{ padding: '12px 16px', borderBottom: '1px solid #3a3a3a', display: 'flex', gap: 8 }}>
        <button style={mode === 'upload' ? btnActive : btnBase} onClick={() => setMode('upload')}>Upload</button>
        <button style={mode === 'paste' ? btnActive : btnBase} onClick={() => setMode('paste')}>Paste</button>
      </div>

      <div style={{ padding: 16, borderBottom: '1px solid #3a3a3a' }}>
        {mode === 'upload' ? (
          <label style={{ cursor: 'pointer' }}>
            <input type="file" accept=".txt" style={{ display: 'none' }} onChange={handleFileChange} />
            <span style={{ ...btnBase, display: 'inline-block' }}>Upload .txt file</span>
          </label>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <textarea
              value={pasteText}
              onChange={e => setPasteText(e.target.value)}
              placeholder="Paste or type your script here..."
              style={{
                width: '100%', height: 120, background: '#2a2a2a', color: '#ccc',
                border: '1px solid #3a3a3a', borderRadius: 4, padding: 8,
                fontSize: 13, resize: 'vertical', boxSizing: 'border-box',
              }}
            />
            <button onClick={handlePasteSubmit} style={{ ...btnActive, alignSelf: 'flex-start' }}>Load</button>
          </div>
        )}
      </div>

      {lines !== null && (
        <div style={{ flex: 1, overflowY: 'auto', fontFamily: 'monospace', fontSize: 13 }}>
          {lines.map((line, i) => {
            const lineNum = i + 1;
            const isSelected = selectedLine === lineNum;
            const isSynced = activeSyncLine === lineNum;
            const tag = getTag(lineNum);
            return (
              <div
                key={i}
                ref={el => {
                  if (el) lineRefs.current.set(lineNum, el);
                  else lineRefs.current.delete(lineNum);
                }}
                onClick={() => setSelectedLine(isSelected ? null : lineNum)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  borderBottom: '1px solid #2a2a2a',
                  background: isSynced ? '#1a3a1a' : isSelected ? '#1e2d3d' : 'transparent',
                  cursor: 'pointer',
                  outline: isSynced ? '1px solid #2a6a2a' : 'none',
                }}
              >
                <span style={{
                  minWidth: 40, padding: '4px 8px', textAlign: 'right',
                  color: isSynced ? '#6abf6a' : '#555',
                  background: isSynced ? '#152a15' : isSelected ? '#1a2840' : '#222',
                  userSelect: 'none', flexShrink: 0, alignSelf: 'stretch',
                  display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                }}>
                  {lineNum}
                </span>
                <span style={{ padding: '4px 10px', color: isSynced ? '#b0e8b0' : '#ccc', whiteSpace: 'pre-wrap', wordBreak: 'break-word', flex: 1 }}>
                  {line}
                </span>
                {tag && (
                  <span style={{
                    flexShrink: 0, margin: '0 6px', padding: '1px 7px',
                    background: '#2a4a6a', color: '#7ab8e8',
                    borderRadius: 10, fontSize: 11, border: '1px solid #3a6a9a',
                  }}>
                    {tag.label}
                  </span>
                )}
                {isSelected && (
                  <button
                    onClick={e => { e.stopPropagation(); handleTagLine(lineNum); }}
                    style={{
                      flexShrink: 0, margin: '0 8px', padding: '2px 10px',
                      fontSize: 11, background: '#4a90e2', color: '#fff',
                      border: 'none', borderRadius: 4, cursor: 'pointer',
                    }}
                  >
                    Tag
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {lines === null && (
        <div style={{ ...panelBody, flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: 22 }}>📄</span>
          <span>Upload or paste a script to get started</span>
        </div>
      )}
    </div>
  );
}

// ─── AudioPanel ───────────────────────────────────────────────────────────────

interface AudioPanelProps {
  audioTags: AudioTag[];
  setAudioTags: React.Dispatch<React.SetStateAction<AudioTag[]>>;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  scriptTags: ScriptTag[];
  onTranscriptComplete: (lines: string[], audioTags: AudioTag[], scriptTags: ScriptTag[]) => void;
  onDurationChange: (duration: number) => void;
  audioPin: number;
  onMasterSeek: (t: number) => void;
  onPinHere: () => void;
  onUnpinAudio: () => void;
}

interface TranscriptWord {
  word: string;
  start: number;
  end: number;
}

function AudioPanel({ audioTags, setAudioTags, audioRef, scriptTags, onTranscriptComplete, onDurationChange, audioPin, onMasterSeek, onPinHere, onUnpinAudio }: AudioPanelProps) {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [transcribing, setTranscribing] = useState(false);
  const [transcriptWords, setTranscriptWords] = useState<TranscriptWord[] | null>(null);
  const [transcriptError, setTranscriptError] = useState<string | null>(null);
  const nextId = useRef(1);

  useEffect(() => {
    return () => { if (audioUrl) URL.revokeObjectURL(audioUrl); };
  }, [audioUrl]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioFile(file);
    setAudioUrl(URL.createObjectURL(file));
    setCurrentTime(0);
    setDuration(0);
    setAudioTags([]);
    setTranscriptWords(null);
    setTranscriptError(null);
  }

  async function autoTranscribe() {
    if (!audioFile) return;
    const apiKey = getOpenAIKey();
    if (!apiKey) { setTranscriptError('An OpenAI API key is required for auto-transcribe.'); return; }
    setTranscribing(true);
    setTranscriptError(null);
    setTranscriptWords(null);
    try {
      const body = new FormData();
      body.append('file', audioFile);
      body.append('model', 'whisper-1');
      body.append('response_format', 'verbose_json');
      body.append('timestamp_granularities[]', 'word');
      const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body,
      });
      if (!res.ok) {
        if (res.status === 401) clearOpenAIKey();
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message ?? `HTTP ${res.status}`);
      }
      const data = await res.json();
      console.log('[Whisper response]', data);
      const words: TranscriptWord[] = (data.words ?? []).map((w: { word: string; start: number; end: number }) => ({
        word: w.word,
        start: w.start,
        end: w.end,
      }));
      setTranscriptWords(words);
      const rawWords: Array<{ word: string; start: number }> = (data.words ?? [])
        .filter((w: { word: string }) => w.word.replace(/[🎵♪♫\s]/g, '').length > 0);
      if (rawWords.length > 0) {
        const finalLines: string[] = [];
        const newAudioTags: AudioTag[] = [];
        const newScriptTags: ScriptTag[] = [];

        for (let i = 0; i < rawWords.length; i += 8) {
          const group = rawWords.slice(i, i + 8);
          const lineIndex = finalLines.length;
          finalLines.push(group.map(w => w.word.replace(/[🎵♪♫]/g, '').trim()).filter(Boolean).join(' '));
          newAudioTags.push({ id: lineIndex + 1, time: group[0].start, label: `seg-${lineIndex + 1}` });
          newScriptTags.push({ lineNumber: lineIndex + 1, label: `seg-${lineIndex + 1}` });
        }

        nextId.current = finalLines.length + 1;
        console.log('[auto-sync] first 5 pairs:', newAudioTags.slice(0, 5).map((t, i) => ({
          tag: t.label, timestamp: t.time, scriptLine: finalLines[i] ?? '(no line)',
        })));

        onTranscriptComplete(finalLines, newAudioTags, newScriptTags);
      }
    } catch (err: unknown) {
      setTranscriptError(err instanceof Error ? err.message : 'Transcription failed.');
    } finally {
      setTranscribing(false);
    }
  }

  function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
    onMasterSeek(Number(e.target.value) + audioPin);
  }

  function formatTime(s: number) {
    const m = Math.floor(s / 60);
    return `${m}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
  }

  function addTag() {
    const t = audioRef.current?.currentTime ?? 0;
    setAudioTags(prev => [...prev, { id: nextId.current++, time: t, label: '' }]);
  }

  function updateLabel(id: number, label: string) {
    setAudioTags(prev => prev.map(tag => tag.id === id ? { ...tag, label } : tag));
  }

  function deleteTag(id: number) {
    setAudioTags(prev => prev.filter(tag => tag.id !== id));
  }

  function startEdit(tag: AudioTag) {
    setEditingId(tag.id);
    setEditDraft(tag.label);
  }

  function commitEdit(id: number) {
    updateLabel(id, editDraft);
    setEditingId(null);
  }

  const btnBase: React.CSSProperties = {
    padding: '5px 12px', fontSize: 12, border: '1px solid #555',
    borderRadius: 4, cursor: 'pointer', background: '#3a3a3a', color: '#ccc',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={panelHeader}>Audio</div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: 24, borderBottom: '1px solid #3a3a3a' }}>
        <label style={{ cursor: 'pointer' }}>
          <input type="file" accept=".mp3,.wav" style={{ display: 'none' }} onChange={handleFileChange} />
          <span style={{ display: 'inline-block', padding: '8px 16px', background: '#3a3a3a', color: '#ccc', borderRadius: 4, fontSize: 13, border: '1px solid #555' }}>
            Upload Audio
          </span>
        </label>

        {audioFile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: '#aaa', fontSize: 13 }}>{audioFile.name}</span>
            <button
              onClick={autoTranscribe}
              disabled={transcribing}
              style={{
                padding: '4px 10px', fontSize: 12, borderRadius: 4, cursor: transcribing ? 'default' : 'pointer',
                background: transcribing ? '#2a2a2a' : '#3a3a3a', color: transcribing ? '#666' : '#ccc',
                border: '1px solid #555',
              }}
            >
              {transcribing ? '⏳ Transcribing…' : 'Auto-transcribe'}
            </button>
          </div>
        )}

        {audioUrl && (
          <div style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <audio
              ref={audioRef}
              src={audioUrl}
              onLoadedMetadata={() => { const d = audioRef.current?.duration ?? 0; setDuration(d); onDurationChange(d); }}
              onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#888', fontSize: 12, flexShrink: 0 }}>
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
              <button onClick={addTag} style={{ ...btnBase, marginLeft: 'auto', flexShrink: 0 }}>Tag</button>
            </div>
            <input
              type="range" min={0} max={duration || 0} step={0.01} value={currentTime}
              onChange={handleSeek} style={{ width: '100%', accentColor: '#4a90e2' }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {audioPin > 0 ? (
                <>
                  <span style={{ fontSize: 11, color: '#5abf8a', background: '#0e2a1a', border: '1px solid #2a6a4a', borderRadius: 4, padding: '2px 8px' }}>
                    Pinned @ {formatTime(audioPin)}
                  </span>
                  <button onClick={onUnpinAudio} style={{ ...btnBase, padding: '3px 8px', color: '#e25c5c', borderColor: '#4a2a2a' }}>
                    Unpin
                  </button>
                </>
              ) : (
                <button
                  onClick={onPinHere}
                  style={{ ...btnBase, background: '#0e2a1a', borderColor: '#2a6a4a', color: '#5abf8a' }}
                >
                  Pin audio here
                </button>
              )}
            </div>
          </div>
        )}

        {!audioFile && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: '#555', fontSize: 13 }}>
            <span style={{ fontSize: 22 }}>🎵</span>
            <span>Upload an audio file to get started</span>
          </div>
        )}
      </div>

      {audioTags.length > 0 && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {audioTags.map(tag => {
            const isEditing = editingId === tag.id;
            const hasMatch = tag.label !== '' && scriptTags.some(s => s.label === tag.label);
            const isUnmatched = tag.label !== '' && !hasMatch;
            return (
              <div key={tag.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#4a90e2', background: '#1a2a3a', border: '1px solid #2a4a6a', borderRadius: 3, padding: '2px 6px', flexShrink: 0 }}>
                  {`${Math.floor(tag.time / 60)}:${Math.floor(tag.time % 60).toString().padStart(2, '0')}`}
                </span>

                {isEditing ? (
                  <>
                    <input
                      autoFocus
                      type="text"
                      value={editDraft}
                      onChange={e => setEditDraft(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') commitEdit(tag.id); if (e.key === 'Escape') setEditingId(null); }}
                      style={{ flex: 1, background: '#2a2a2a', color: '#ccc', border: '1px solid #4a90e2', borderRadius: 4, padding: '3px 8px', fontSize: 12 }}
                    />
                    <button onClick={() => commitEdit(tag.id)} style={{ ...btnBase, padding: '3px 8px', color: '#6abf6a', borderColor: '#2a4a2a' }}>✓</button>
                    <button onClick={() => setEditingId(null)} style={{ ...btnBase, padding: '3px 8px' }}>✕</button>
                  </>
                ) : (
                  <>
                    {isUnmatched && (
                      <span title="No script tag with this label" style={{ fontSize: 14, flexShrink: 0, color: '#e25c5c' }}>⚠</span>
                    )}
                    <span style={{ flex: 1, color: isUnmatched ? '#e28c8c' : tag.label ? '#ccc' : '#555', fontSize: 12, fontStyle: tag.label ? 'normal' : 'italic' }}>
                      {tag.label || 'no label'}
                    </span>
                    <button onClick={() => startEdit(tag)} style={{ ...btnBase, padding: '3px 8px' }}>Edit</button>
                    <button onClick={() => deleteTag(tag.id)} style={{ ...btnBase, padding: '3px 8px', color: '#e25c5c', borderColor: '#4a2a2a' }}>✕</button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {audioUrl && audioTags.length === 0 && !transcriptWords && !transcribing && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555', fontSize: 13 }}>No tags yet</div>
      )}

      {transcriptError && (
        <div style={{ margin: '8px 16px', padding: '8px 12px', background: '#3a1a1a', border: '1px solid #6a2a2a', borderRadius: 4, color: '#e28c8c', fontSize: 12 }}>
          {transcriptError}
        </div>
      )}

      {transcriptWords && transcriptWords.length > 0 && (
        <div style={{ borderTop: '1px solid #3a3a3a' }}>
          <div style={{ padding: '6px 16px', fontSize: 11, color: '#666', textTransform: 'uppercase', letterSpacing: 1 }}>
            Transcript — {transcriptWords.length} words
          </div>
          <div style={{ overflowY: 'auto', maxHeight: 220, padding: '0 16px 12px', display: 'flex', flexWrap: 'wrap', gap: '4px 6px' }}>
            {transcriptWords.map((w, i) => (
              <span
                key={i}
                title={`${w.start.toFixed(2)}s – ${w.end.toFixed(2)}s`}
                onClick={() => onMasterSeek(w.start + audioPin)}
                style={{
                  fontSize: 12, color: '#ccc', background: '#2a2a2a',
                  border: '1px solid #3a3a3a', borderRadius: 3,
                  padding: '1px 5px', cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {w.word}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── VideoPanel ──────────────────────────────────────────────────────────────

interface VideoPanelProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  videoPin: VideoPin | null;
  onPin: () => void;
  onUnpin: () => void;
  masterTime: number;
  onMasterSeek: (t: number) => void;
}

function VideoPanel({ videoRef, videoPin, onPin, onUnpin, masterTime, onMasterSeek }: VideoPanelProps) {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    return () => { if (videoUrl) URL.revokeObjectURL(videoUrl); };
  }, [videoUrl]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoFile(file);
    setVideoUrl(URL.createObjectURL(file));
    setCurrentTime(0);
    setDuration(0);
    onUnpin();
  }

  function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
    const t = Number(e.target.value);
    if (videoPin) {
      onMasterSeek(t + videoPin.audioTime);
    } else {
      const video = videoRef.current;
      if (video) { video.currentTime = t; setCurrentTime(t); }
    }
  }

  function fmt(s: number) {
    return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
  }

  const btnBase: React.CSSProperties = {
    padding: '5px 12px', fontSize: 12, border: '1px solid #555',
    borderRadius: 4, cursor: 'pointer', background: '#3a3a3a', color: '#ccc',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={panelHeader}>Video</div>

      <div style={{ padding: '10px 16px', borderBottom: '1px solid #3a3a3a', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <label style={{ cursor: 'pointer' }}>
          <input type="file" accept=".mp4,video/mp4" style={{ display: 'none' }} onChange={handleFileChange} />
          <span style={{ ...btnBase, display: 'inline-block' }}>Upload .mp4</span>
        </label>
        {videoFile && <span style={{ color: '#aaa', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>{videoFile.name}</span>}
      </div>

      {videoUrl ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 12, gap: 8, overflow: 'hidden', minHeight: 0 }}>
          <video
            ref={videoRef}
            src={videoUrl}
            style={{ width: '100%', flex: 1, objectFit: 'contain', background: '#000', minHeight: 0, borderRadius: 4 }}
            onLoadedMetadata={() => setDuration(videoRef.current?.duration ?? 0)}
            onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime ?? 0)}
          />
          <input
            type="range" min={0} max={duration || 0} step={0.01} value={currentTime}
            onChange={handleSeek} style={{ width: '100%', accentColor: '#4a90e2', flexShrink: 0 }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <span style={{ color: '#888', fontSize: 11, flexShrink: 0 }}>{fmt(currentTime)} / {fmt(duration)}</span>
            {videoPin ? (
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: '#e8b86a', background: '#2a1e0e', border: '1px solid #7a5a2a', borderRadius: 4, padding: '2px 8px' }}>
                  Pinned @ {fmt(videoPin.audioTime)}
                </span>
                <button onClick={onUnpin} style={{ ...btnBase, padding: '3px 8px', color: '#e25c5c', borderColor: '#4a2a2a' }}>
                  Unpin
                </button>
              </div>
            ) : (
              <button
                onClick={onPin}
                style={{ ...btnBase, marginLeft: 'auto', background: '#2a1e0e', borderColor: '#7a5a2a', color: '#e8b86a' }}
              >
                Pin to timeline
              </button>
            )}
          </div>
        </div>
      ) : (
        <div style={{ ...panelBody, flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: 22 }}>🎬</span>
          <span>Upload a video file to get started</span>
        </div>
      )}
    </div>
  );
}

// ─── TimelinePanel ───────────────────────────────────────────────────────────

interface TimelinePanelProps {
  audioTags: AudioTag[];
  setAudioTags: React.Dispatch<React.SetStateAction<AudioTag[]>>;
  scriptTags: ScriptTag[];
  audioDuration: number;
  onSelectLine: (lineNumber: number | null) => void;
  videoPin: VideoPin | null;
  setVideoPin: React.Dispatch<React.SetStateAction<VideoPin | null>>;
  isPlaying: boolean;
  onTogglePlay: () => void;
  masterTime: number;
  onMasterSeek: (t: number) => void;
  audioPin: number;
  setAudioPin: (pin: number) => void;
}

function TimelinePanel({
  audioTags, setAudioTags, scriptTags, audioDuration, onSelectLine,
  videoPin, setVideoPin, isPlaying, onTogglePlay, masterTime,
  onMasterSeek, audioPin, setAudioPin,
}: TimelinePanelProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  // Total duration of the master timeline
  const totalDuration = audioPin + audioDuration;

  function pct(t: number) {
    return totalDuration > 0 ? Math.min((t / totalDuration) * 100, 100) : 0;
  }

  function fmt(s: number) {
    return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
  }

  function matchedLine(audioLabel: string) {
    return scriptTags.find(s => s.label === audioLabel) ?? null;
  }

  function clientXToMasterTime(clientX: number): number {
    const track = trackRef.current;
    if (!track) return 0;
    const rect = track.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) * totalDuration;
  }

  // Draggable audio tag markers
  function handleMarkerMouseDown(e: React.MouseEvent, tagId: number, currentTags: AudioTag[]) {
    e.preventDefault();
    const startX = e.clientX;
    let moved = false;

    function onMouseMove(ev: MouseEvent) {
      if (Math.abs(ev.clientX - startX) > 3) moved = true;
      if (!moved) return;
      const masterT = clientXToMasterTime(ev.clientX);
      const audioT = Math.max(0, masterT - audioPin);
      setAudioTags(prev => prev.map(tag => tag.id === tagId ? { ...tag, time: audioT } : tag));
    }

    function onMouseUp() {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      if (!moved) {
        setSelectedId(tagId);
        const tag = currentTags.find(t => t.id === tagId);
        const st = tag ? scriptTags.find(s => s.label === tag.label) : null;
        onSelectLine(st?.lineNumber ?? null);
      }
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  // Draggable audio pin marker
  function handleAudioPinMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    const startX = e.clientX;
    let moved = false;

    function onMouseMove(ev: MouseEvent) {
      if (Math.abs(ev.clientX - startX) > 2) moved = true;
      if (!moved) return;
      const masterT = clientXToMasterTime(ev.clientX);
      setAudioPin(Math.max(0, masterT));
    }

    function onMouseUp() {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  // Draggable video pin marker
  function handleVideoPinMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    const startX = e.clientX;
    let moved = false;

    function onMouseMove(ev: MouseEvent) {
      if (Math.abs(ev.clientX - startX) > 2) moved = true;
      if (!moved) return;
      const masterT = clientXToMasterTime(ev.clientX);
      setVideoPin(prev => prev ? { ...prev, audioTime: Math.max(0, masterT) } : prev);
    }

    function onMouseUp() {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  // Draggable playhead
  function handlePlayheadMouseDown(e: React.MouseEvent) {
    e.preventDefault();

    function onMouseMove(ev: MouseEvent) {
      onMasterSeek(clientXToMasterTime(ev.clientX));
    }

    function onMouseUp() {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  // Click on track background to seek
  function handleTrackClick(e: React.MouseEvent) {
    if ((e.target as HTMLElement) !== trackRef.current) return;
    onMasterSeek(clientXToMasterTime(e.clientX));
  }

  const playBtnStyle: React.CSSProperties = {
    padding: '3px 14px', fontSize: 13, border: '1px solid #555',
    borderRadius: 4, cursor: 'pointer',
    background: isPlaying ? '#2a4a2a' : '#3a3a3a',
    color: isPlaying ? '#6abf6a' : '#ccc',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ ...panelHeader, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span>Timeline</span>
        <button style={playBtnStyle} onClick={onTogglePlay}>
          {isPlaying ? '⏸ Pause' : '▶ Play'}
        </button>
        <span style={{ fontSize: 11, color: '#666', marginLeft: 4, fontFamily: 'monospace', fontWeight: 400 }}>
          {fmt(masterTime)}
        </span>
      </div>

      {audioDuration === 0 ? (
        <div style={{ ...panelBody }}>Transcribe audio to generate timeline markers</div>
      ) : (
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {/* Track area */}
          <div style={{ flex: 1, padding: '8px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0 }}>

            {/* Labels above track */}
            <div style={{ position: 'relative', height: 18, marginBottom: 4 }}>
              {/* Audio pin label */}
              <div style={{
                position: 'absolute', left: `${pct(audioPin)}%`, transform: 'translateX(-50%)',
                fontSize: 10, color: '#5abf8a', whiteSpace: 'nowrap', pointerEvents: 'none',
              }}>
                audio
              </div>
              {audioTags.map(tag => (
                <div key={tag.id} style={{
                  position: 'absolute', left: `${pct(tag.time + audioPin)}%`, transform: 'translateX(-50%)',
                  fontSize: 10, color: selectedId === tag.id ? '#fff' : '#7ab8e8',
                  fontWeight: selectedId === tag.id ? 600 : 400,
                  whiteSpace: 'nowrap', pointerEvents: 'none',
                }}>
                  {tag.label}
                </div>
              ))}
            </div>

            {/* Track + markers */}
            <div
              ref={trackRef}
              onClick={handleTrackClick}
              style={{ position: 'relative', height: 32, cursor: 'crosshair' }}
            >
              {/* Track bar */}
              <div style={{
                position: 'absolute', left: 0, right: 0, top: '50%', height: 4, marginTop: -2,
                background: '#2a2a2a', borderRadius: 2,
              }} />

              {/* Audio segment fills (positioned in master time) */}
              {audioTags.map((tag, i) => {
                const nextTag = audioTags[i + 1];
                const left = pct(tag.time + audioPin);
                const right = nextTag ? pct(nextTag.time + audioPin) : pct(totalDuration);
                return (
                  <div key={tag.id} style={{
                    position: 'absolute', left: `${left}%`, width: `${Math.max(right - left, 0)}%`,
                    top: '50%', height: 4, marginTop: -2,
                    background: matchedLine(tag.label) ? '#1a3a5a' : '#3a1a1a',
                    pointerEvents: 'none',
                  }} />
                );
              })}

              {/* Audio pin marker (green) — always visible, draggable */}
              <div
                onMouseDown={handleAudioPinMouseDown}
                title={`Audio starts at ${fmt(audioPin)} — drag to adjust`}
                style={{
                  position: 'absolute', left: `${pct(audioPin)}%`,
                  top: 0, bottom: 0, width: 14, marginLeft: -7,
                  cursor: 'ew-resize', zIndex: 5,
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                }}
              >
                <div style={{ width: 2, flex: 1, background: '#5abf8a', borderRadius: 1 }} />
                <div style={{
                  position: 'absolute', top: '50%', marginTop: -5,
                  width: 10, height: 10,
                  background: '#5abf8a', border: '2px solid #1a4a2a',
                  transform: 'rotate(45deg)', borderRadius: 2,
                }} />
              </div>

              {/* Draggable audio tag markers (blue) */}
              {audioTags.map(tag => {
                const sel = selectedId === tag.id;
                return (
                  <div
                    key={tag.id}
                    onMouseDown={e => handleMarkerMouseDown(e, tag.id, audioTags)}
                    title={`${tag.label} — ${fmt(tag.time)}\nDrag to adjust, click to select`}
                    style={{
                      position: 'absolute', left: `${pct(tag.time + audioPin)}%`,
                      top: 0, bottom: 0, width: 12, marginLeft: -6,
                      cursor: 'ew-resize', zIndex: 4,
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                    }}
                  >
                    <div style={{
                      width: 2, flex: 1,
                      background: sel ? '#ffffff' : '#4a90e2',
                      borderRadius: 1,
                    }} />
                    <div style={{
                      position: 'absolute', top: '50%', marginTop: -5,
                      width: 10, height: 10,
                      background: sel ? '#ffffff' : '#4a90e2',
                      border: `2px solid ${sel ? '#aaa' : '#1a3a6a'}`,
                      transform: 'rotate(45deg)',
                      borderRadius: 2,
                    }} />
                  </div>
                );
              })}

              {/* Video pin marker (amber) — draggable */}
              {videoPin && (
                <div
                  onMouseDown={handleVideoPinMouseDown}
                  title={`${videoPin.label} — drag to adjust\nVideo: ${fmt(videoPin.videoTime)}  Master: ${fmt(videoPin.audioTime)}`}
                  style={{
                    position: 'absolute', left: `${pct(videoPin.audioTime)}%`,
                    top: 0, bottom: 0, width: 14, marginLeft: -7,
                    zIndex: 6, display: 'flex', flexDirection: 'column', alignItems: 'center',
                    cursor: 'ew-resize',
                  }}
                >
                  <div style={{ width: 2, flex: 1, background: '#e8b86a', borderRadius: 1 }} />
                  <div style={{
                    position: 'absolute', top: '50%', marginTop: -5,
                    width: 10, height: 10,
                    background: '#e8b86a', border: '2px solid #7a5a2a',
                    transform: 'rotate(45deg)', borderRadius: 2,
                  }} />
                </div>
              )}

              {/* Draggable playhead (red) */}
              <div
                onMouseDown={handlePlayheadMouseDown}
                style={{
                  position: 'absolute', left: `${pct(masterTime)}%`,
                  top: -4, bottom: -4, width: 10, marginLeft: -5,
                  cursor: 'ew-resize', zIndex: 8,
                  display: 'flex', justifyContent: 'center',
                }}
              >
                <div style={{ width: 2, height: '100%', background: '#e25c5c', borderRadius: 1 }} />
                {/* Playhead handle */}
                <div style={{
                  position: 'absolute', top: 0, width: 10, height: 10,
                  background: '#e25c5c', borderRadius: '0 0 50% 50%',
                  clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
                }} />
              </div>
            </div>

            {/* Line numbers + time ticks below track */}
            <div style={{ position: 'relative', height: 18, marginTop: 4 }}>
              {audioTags.map(tag => {
                const st = matchedLine(tag.label);
                return st ? (
                  <div key={tag.id} style={{
                    position: 'absolute', left: `${pct(tag.time + audioPin)}%`, transform: 'translateX(-50%)',
                    fontSize: 10, color: selectedId === tag.id ? '#b0e8b0' : '#6abf6a',
                    whiteSpace: 'nowrap', pointerEvents: 'none',
                  }}>
                    L{st.lineNumber}
                  </div>
                ) : null;
              })}
            </div>
          </div>

          {/* Pair list sidebar */}
          <div style={{ width: 190, borderLeft: '1px solid #3a3a3a', overflowY: 'auto', padding: '6px 10px', display: 'flex', flexDirection: 'column', gap: 3, flexShrink: 0 }}>
            {audioTags.length === 0 && (
              <div style={{ color: '#555', fontSize: 11, textAlign: 'center', paddingTop: 8 }}>No markers</div>
            )}
            {audioTags.map(tag => {
              const st = matchedLine(tag.label);
              const sel = selectedId === tag.id;
              return (
                <div
                  key={tag.id}
                  onClick={() => {
                    setSelectedId(tag.id);
                    onSelectLine(st?.lineNumber ?? null);
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, fontSize: 11,
                    padding: '2px 4px', borderRadius: 3, cursor: 'pointer',
                    background: sel ? '#1e2d3d' : 'transparent',
                  }}
                >
                  <span style={{ color: '#4a90e2', fontFamily: 'monospace', flexShrink: 0 }}>{fmt(tag.time)}</span>
                  <span style={{ color: sel ? '#fff' : '#7ab8e8', flexShrink: 0 }}>{tag.label}</span>
                  {st
                    ? <span style={{ color: '#6abf6a', flexShrink: 0 }}>→ L{st.lineNumber}</span>
                    : <span style={{ color: '#e25c5c', flexShrink: 0 }}>⚠</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── StagePanel ──────────────────────────────────────────────────────────────

interface StageShape {
  id: number;
  label: string;
  x: number;     // fraction 0–1 of canvas width (used when onstage)
  y: number;     // fraction 0–1 of canvas height (used when onstage)
  offstage: boolean;
}

interface CuePositions {
  performers: { id: number; x: number; y: number; offstage: boolean }[];
  stageProps:  { id: number; x: number; y: number; offstage: boolean }[];
}

interface StagePanelProps {
  performers: StageShape[];
  setPerformers: React.Dispatch<React.SetStateAction<StageShape[]>>;
  stageProps: StageShape[];
  setStageProps: React.Dispatch<React.SetStateAction<StageShape[]>>;
  activeCueLabel: string | null;
  cuePositionMap: Record<string, CuePositions>;
  onRecordCue: (label: string, positions: CuePositions) => void;
}

function StagePanel({ performers, setPerformers, stageProps, setStageProps, activeCueLabel, cuePositionMap, onRecordCue }: StagePanelProps) {
  const [stageWidthFt, setStageWidthFt] = useState(40);
  const [stageDepthFt, setStageDepthFt] = useState(30);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const nextPerformerId = useRef(1);
  const nextPropId = useRef(1);
  const canvasRef = useRef<HTMLDivElement>(null);
  const offstageRef = useRef<HTMLDivElement>(null);
  const cuePositionMapRef = useRef(cuePositionMap);
  useEffect(() => { cuePositionMapRef.current = cuePositionMap; }, [cuePositionMap]);

  // Animate shapes to recorded positions (including offstage flag) when active cue changes
  useEffect(() => {
    if (!activeCueLabel) return;
    const cue = cuePositionMapRef.current[activeCueLabel];
    if (!cue) return;
    setPerformers(prev => prev.map(p => {
      const rec = cue.performers.find(r => r.id === p.id);
      return rec ? { ...p, x: rec.x, y: rec.y, offstage: rec.offstage } : p;
    }));
    setStageProps(prev => prev.map(sp => {
      const rec = cue.stageProps.find(r => r.id === sp.id);
      return rec ? { ...sp, x: rec.x, y: rec.y, offstage: rec.offstage } : sp;
    }));
  }, [activeCueLabel, setPerformers, setStageProps]);

  function addPerformer() {
    const id = nextPerformerId.current++;
    setPerformers(prev => [...prev, { id, label: `P${id}`, x: 0.5, y: 0.5, offstage: true }]);
  }

  function addProp() {
    const id = nextPropId.current++;
    setStageProps(prev => [...prev, { id, label: `Pr${id}`, x: 0.3, y: 0.3, offstage: true }]);
  }

  function recordCurrentPositions() {
    if (!activeCueLabel) return;
    onRecordCue(activeCueLabel, {
      performers: performers.map(p => ({ id: p.id, x: p.x, y: p.y, offstage: p.offstage })),
      stageProps: stageProps.map(sp => ({ id: sp.id, x: sp.x, y: sp.y, offstage: sp.offstage })),
    });
  }

  function handleShapeMouseDown(
    e: React.MouseEvent,
    id: number,
    setter: React.Dispatch<React.SetStateAction<StageShape[]>>
  ) {
    e.preventDefault();
    e.stopPropagation();
    const canvas = canvasRef.current;
    const offstageEl = offstageRef.current;
    setDraggingId(id);

    function onMouseMove(ev: MouseEvent) {
      if (!canvas) return;
      const cr = canvas.getBoundingClientRect();
      const inCanvas = ev.clientX >= cr.left && ev.clientX <= cr.right &&
                       ev.clientY >= cr.top  && ev.clientY <= cr.bottom;
      if (inCanvas) {
        const x = (ev.clientX - cr.left) / cr.width;
        const y = (ev.clientY - cr.top) / cr.height;
        setter(prev => prev.map(s => s.id === id ? { ...s, offstage: false, x, y } : s));
      }
    }

    function onMouseUp(ev: MouseEvent) {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      setDraggingId(null);
      // If released over the offstage area, send back offstage
      if (offstageEl) {
        const or = offstageEl.getBoundingClientRect();
        const inOffstage = ev.clientX >= or.left && ev.clientX <= or.right &&
                           ev.clientY >= or.top  && ev.clientY <= or.bottom;
        if (inOffstage) {
          setter(prev => prev.map(s => s.id === id ? { ...s, offstage: true } : s));
        }
      }
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  const btnBase: React.CSSProperties = {
    padding: '4px 10px', fontSize: 12, border: '1px solid #555',
    borderRadius: 4, cursor: 'pointer', background: '#3a3a3a', color: '#ccc',
  };

  function shapeTransition(id: number) {
    return draggingId === id ? 'none' : 'left 2.5s ease-in-out, top 2.5s ease-in-out';
  }

  const performerStyle = (p: StageShape): React.CSSProperties => {
    const hasRecordedPos = activeCueLabel && cuePositionMap[activeCueLabel]?.performers.some(r => r.id === p.id);
    return {
      width: 28, height: 28, borderRadius: '50%',
      background: '#1a4a7a',
      border: `2px solid ${hasRecordedPos ? '#6abf6a' : '#4a90e2'}`,
      cursor: 'grab', userSelect: 'none',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 9, color: '#a0d0ff', fontWeight: 700,
      flexShrink: 0,
    };
  };

  const propStyle = (sp: StageShape): React.CSSProperties => {
    const hasRecordedPos = activeCueLabel && cuePositionMap[activeCueLabel]?.stageProps.some(r => r.id === sp.id);
    return {
      width: 26, height: 26, borderRadius: 3,
      background: '#3a1e08',
      border: `2px solid ${hasRecordedPos ? '#6abf6a' : '#e8a050'}`,
      cursor: 'grab', userSelect: 'none',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 9, color: '#e8a050', fontWeight: 700,
      flexShrink: 0,
    };
  };

  const onstagePerformers = performers.filter(p => !p.offstage);
  const offstagePerformers = performers.filter(p => p.offstage);
  const onstageProps = stageProps.filter(sp => !sp.offstage);
  const offstageProps = stageProps.filter(sp => sp.offstage);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={panelHeader}>Stage</div>

      {/* Toolbar */}
      <div style={{ padding: '8px 12px', borderBottom: '1px solid #3a3a3a', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={addPerformer} style={{ ...btnBase, background: '#1a2a3a', borderColor: '#2a5a8a', color: '#6ab0e8' }}>
          + Performer
        </button>
        <button onClick={addProp} style={{ ...btnBase, background: '#2a1a0e', borderColor: '#8a5a2a', color: '#e8b06a' }}>
          + Prop
        </button>
        <button
          onClick={recordCurrentPositions}
          disabled={!activeCueLabel}
          title={activeCueLabel ? `Record positions for cue "${activeCueLabel}"` : 'No active cue'}
          style={{
            ...btnBase,
            background: activeCueLabel ? '#2a1a3a' : '#222',
            borderColor: activeCueLabel ? '#7a4aaa' : '#3a3a3a',
            color: activeCueLabel ? '#c08ae8' : '#444',
            cursor: activeCueLabel ? 'pointer' : 'default',
          }}
        >
          ⬤ Record cue{activeCueLabel ? ` "${activeCueLabel}"` : ''}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
          <span style={{ color: '#666', fontSize: 11 }}>W</span>
          <input
            type="number" min={1} value={stageWidthFt}
            onChange={e => setStageWidthFt(Math.max(1, Number(e.target.value)))}
            style={{ width: 44, background: '#2a2a2a', color: '#ccc', border: '1px solid #3a3a3a', borderRadius: 3, padding: '2px 4px', fontSize: 11 }}
          />
          <span style={{ color: '#666', fontSize: 11 }}>ft  D</span>
          <input
            type="number" min={1} value={stageDepthFt}
            onChange={e => setStageDepthFt(Math.max(1, Number(e.target.value)))}
            style={{ width: 44, background: '#2a2a2a', color: '#ccc', border: '1px solid #3a3a3a', borderRadius: 3, padding: '2px 4px', fontSize: 11 }}
          />
          <span style={{ color: '#666', fontSize: 11 }}>ft</span>
        </div>
      </div>

      {/* Canvas + offstage column */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '8px 12px', overflow: 'hidden', minHeight: 0, gap: 6 }}>
        <div style={{ textAlign: 'center', fontSize: 10, color: '#444', letterSpacing: 1 }}>US</div>

        {/* Stage canvas */}
        <div
          ref={canvasRef}
          style={{
            flex: 1, position: 'relative', overflow: 'hidden',
            background: '#141f12', border: '2px solid #3a5a3a',
            borderRadius: 3, minHeight: 0,
          }}
        >
          {/* Grid */}
          {[0.25, 0.5, 0.75].map(f => (
            <React.Fragment key={f}>
              <div style={{ position: 'absolute', left: `${f * 100}%`, top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', top: `${f * 100}%`, left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
            </React.Fragment>
          ))}
          <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,0.07)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.07)', pointerEvents: 'none' }} />

          {/* Performers on stage */}
          {onstagePerformers.map(p => (
            <div
              key={p.id}
              onMouseDown={e => handleShapeMouseDown(e, p.id, setPerformers)}
              title={p.label}
              style={{
                ...performerStyle(p),
                position: 'absolute', zIndex: 2,
                left: `${p.x * 100}%`, top: `${p.y * 100}%`,
                transform: 'translate(-50%, -50%)',
                transition: shapeTransition(p.id),
              }}
            >
              {p.label}
            </div>
          ))}

          {/* Props on stage */}
          {onstageProps.map(sp => (
            <div
              key={sp.id}
              onMouseDown={e => handleShapeMouseDown(e, sp.id, setStageProps)}
              title={sp.label}
              style={{
                ...propStyle(sp),
                position: 'absolute', zIndex: 2,
                left: `${sp.x * 100}%`, top: `${sp.y * 100}%`,
                transform: 'translate(-50%, -50%)',
                transition: shapeTransition(sp.id),
              }}
            >
              {sp.label}
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', fontSize: 10, color: '#444', letterSpacing: 1 }}>DS — {stageWidthFt} ft wide × {stageDepthFt} ft deep</div>

        {/* Offstage holding area */}
        <div
          ref={offstageRef}
          style={{
            minHeight: 52, flexShrink: 0,
            border: '2px dashed #3a3a3a',
            borderRadius: 4,
            padding: '6px 8px',
            display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6,
            background: '#181818',
          }}
        >
          <span style={{ fontSize: 10, color: '#4a4a4a', letterSpacing: 1, userSelect: 'none', flexShrink: 0 }}>
            OFFSTAGE
          </span>
          {offstagePerformers.map(p => (
            <div
              key={p.id}
              onMouseDown={e => handleShapeMouseDown(e, p.id, setPerformers)}
              title={`${p.label} — drag to stage`}
              style={performerStyle(p)}
            >
              {p.label}
            </div>
          ))}
          {offstageProps.map(sp => (
            <div
              key={sp.id}
              onMouseDown={e => handleShapeMouseDown(e, sp.id, setStageProps)}
              title={`${sp.label} — drag to stage`}
              style={propStyle(sp)}
            >
              {sp.label}
            </div>
          ))}
          {offstagePerformers.length === 0 && offstageProps.length === 0 && (
            <span style={{ fontSize: 11, color: '#3a3a3a', fontStyle: 'italic' }}>all on stage</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

function App() {
  const [audioTags, setAudioTags] = useState<AudioTag[]>([]);
  const [scriptTags, setScriptTags] = useState<ScriptTag[]>([]);
  const [scriptLines, setScriptLines] = useState<string[] | null>(null);
  const [activeSyncLine, setActiveSyncLine] = useState<number | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [videoPin, setVideoPin] = useState<VideoPin | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [masterTime, setMasterTime] = useState(0);
  const [audioPin, setAudioPin] = useState(0);
  const [performers, setPerformers] = useState<StageShape[]>([]);
  const [stageProps, setStageProps] = useState<StageShape[]>([]);
  const [activeCueLabel, setActiveCueLabel] = useState<string | null>(null);
  const [cuePositionMap, setCuePositionMap] = useState<Record<string, CuePositions>>({});

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const isPlayingRef = useRef(false);
  const masterTimeRef = useRef(0);
  const startWallRef = useRef(0);          // Date.now() when masterTime=0 started
  const audioPinRef = useRef(0);
  const videoPinRef = useRef<VideoPin | null>(null);
  const audioTagsRef = useRef<AudioTag[]>([]);
  const scriptTagsRef = useRef<ScriptTag[]>([]);

  // Keep refs in sync with state
  useEffect(() => { audioPinRef.current = audioPin; }, [audioPin]);
  useEffect(() => { videoPinRef.current = videoPin; }, [videoPin]);
  useEffect(() => { audioTagsRef.current = audioTags; }, [audioTags]);
  useEffect(() => { scriptTagsRef.current = scriptTags; }, [scriptTags]);

  // Master clock interval — 50ms, wall-clock based
  useEffect(() => {
    const id = setInterval(() => {
      if (!isPlayingRef.current) return;
      const t = (Date.now() - startWallRef.current) / 1000;
      masterTimeRef.current = t;
      setMasterTime(t);

      const pin = audioPinRef.current;
      const audio = audioRef.current;
      if (audio) {
        if (t >= pin) {
          const targetAudioTime = t - pin;
          if (audio.paused) {
            audio.currentTime = targetAudioTime;
            audio.play().catch(() => {});
          } else {
            const drift = Math.abs(audio.currentTime - targetAudioTime);
            if (drift > 0.3) audio.currentTime = targetAudioTime;
          }
        } else {
          if (!audio.paused) audio.pause();
        }
      }

      const vp = videoPinRef.current;
      const video = videoRef.current;
      if (video && vp) {
        if (t >= vp.audioTime) {
          const targetVideoTime = t - vp.audioTime;
          if (video.paused) {
            video.currentTime = targetVideoTime;
            video.play().catch(() => {});
          } else {
            const drift = Math.abs(video.currentTime - targetVideoTime);
            if (drift > 0.3) video.currentTime = targetVideoTime;
          }
        } else {
          if (!video.paused) {
            video.pause();
            video.currentTime = 0;
          }
        }
      }
    }, 50);
    return () => clearInterval(id);
  }, []);

  function play() {
    isPlayingRef.current = true;
    setIsPlaying(true);
    startWallRef.current = Date.now() - masterTimeRef.current * 1000;
  }

  function pause() {
    isPlayingRef.current = false;
    setIsPlaying(false);
    audioRef.current?.pause();
    videoRef.current?.pause();
  }

  function togglePlay() {
    if (isPlayingRef.current) pause(); else play();
  }

  function masterSeek(t: number) {
    const clamped = Math.max(0, t);
    masterTimeRef.current = clamped;
    setMasterTime(clamped);
    startWallRef.current = Date.now() - clamped * 1000;

    const pin = audioPinRef.current;
    const audio = audioRef.current;
    if (audio) {
      if (clamped >= pin) {
        audio.currentTime = clamped - pin;
        if (isPlayingRef.current) audio.play().catch(() => {});
        else audio.pause();
      } else {
        audio.pause();
      }
    }

    const vp = videoPinRef.current;
    const video = videoRef.current;
    if (video && vp) {
      if (clamped >= vp.audioTime) {
        video.currentTime = clamped - vp.audioTime;
        if (isPlayingRef.current) video.play().catch(() => {});
        else video.pause();
      } else {
        video.pause();
        video.currentTime = 0;
      }
    }
  }

  function handleSetAudioPin(pin: number) {
    audioPinRef.current = pin;
    setAudioPin(pin);
    // Re-seek audio to maintain master time position
    const audio = audioRef.current;
    if (audio) {
      const t = masterTimeRef.current;
      if (t >= pin) {
        audio.currentTime = t - pin;
        if (isPlayingRef.current) audio.play().catch(() => {});
        else audio.pause();
      } else {
        audio.pause();
      }
    }
  }

  function handlePinAudioHere() {
    handleSetAudioPin(masterTimeRef.current);
  }

  function handleUnpinAudio() {
    handleSetAudioPin(0);
  }

  function handleVideoPin() {
    const video = videoRef.current;
    if (!video) return;
    setVideoPin({ id: 1, videoTime: video.currentTime, audioTime: masterTimeRef.current, label: 'vid-1' });
  }

  function handleRecordCue(label: string, positions: CuePositions) {
    setCuePositionMap(prev => ({ ...prev, [label]: positions }));
  }

  function handleTranscriptComplete(lines: string[], newAudioTags: AudioTag[], newScriptTags: ScriptTag[]) {
    setScriptLines(lines);
    setAudioTags(newAudioTags);
    setScriptTags(newScriptTags);
  }

  // Sync engine: highlight script line based on masterTime relative to audioPin
  const syncEngine = useCallback(() => {
    const t = masterTimeRef.current - audioPinRef.current;
    const tags = audioTagsRef.current;
    const sTags = scriptTagsRef.current;
    const sorted = [...tags].sort((a, b) => a.time - b.time);
    let activeAudioTag: AudioTag | null = null;
    for (const tag of sorted) {
      if (tag.time <= t) activeAudioTag = tag;
    }
    if (!activeAudioTag?.label) { setActiveSyncLine(null); setActiveCueLabel(null); return; }
    setActiveCueLabel(activeAudioTag.label);
    const scriptTag = sTags.find(s => s.label === activeAudioTag!.label);
    setActiveSyncLine(scriptTag?.lineNumber ?? null);
  }, []);

  useEffect(() => {
    const id = setInterval(syncEngine, 200);
    return () => clearInterval(id);
  }, [syncEngine]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#1e1e1e', color: '#fff' }}>
      <div style={toolbar}>CoChoreographer</div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{ flex: 1, borderRight: '1px solid #3a3a3a', display: 'flex', flexDirection: 'column' }}>
          <ScriptPanel
            scriptTags={scriptTags}
            setScriptTags={setScriptTags}
            activeSyncLine={activeSyncLine}
            lines={scriptLines}
            setLines={setScriptLines}
          />
        </div>
        <div style={{ flex: 1, borderRight: '1px solid #3a3a3a', display: 'flex', flexDirection: 'column' }}>
          <AudioPanel
            audioTags={audioTags}
            setAudioTags={setAudioTags}
            audioRef={audioRef}
            scriptTags={scriptTags}
            onTranscriptComplete={handleTranscriptComplete}
            onDurationChange={setAudioDuration}
            audioPin={audioPin}
            onMasterSeek={masterSeek}
            onPinHere={handlePinAudioHere}
            onUnpinAudio={handleUnpinAudio}
          />
        </div>
        <div style={{ flex: 1, borderRight: '1px solid #3a3a3a', display: 'flex', flexDirection: 'column' }}>
          <VideoPanel
            videoRef={videoRef}
            videoPin={videoPin}
            onPin={handleVideoPin}
            onUnpin={() => setVideoPin(null)}
            masterTime={masterTime}
            onMasterSeek={masterSeek}
          />
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <StagePanel
            performers={performers}
            setPerformers={setPerformers}
            stageProps={stageProps}
            setStageProps={setStageProps}
            activeCueLabel={activeCueLabel}
            cuePositionMap={cuePositionMap}
            onRecordCue={handleRecordCue}
          />
        </div>
      </div>

      <div style={{ height: 200, borderTop: '1px solid #3a3a3a', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
        <TimelinePanel
          audioTags={audioTags}
          setAudioTags={setAudioTags}
          scriptTags={scriptTags}
          audioDuration={audioDuration}
          onSelectLine={setActiveSyncLine}
          videoPin={videoPin}
          setVideoPin={setVideoPin}
          isPlaying={isPlaying}
          onTogglePlay={togglePlay}
          masterTime={masterTime}
          onMasterSeek={masterSeek}
          audioPin={audioPin}
          setAudioPin={handleSetAudioPin}
        />
      </div>
    </div>
  );
}

export default App;
