import React, { useEffect, useMemo, useRef, useState } from 'react';
import api from '../../services/api.service';
import { useSocket } from '../../context/SocketContext';

const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

const toAbsoluteUrl = (url) => {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_ORIGIN}${url}`;
};

export default function HostVideoUploadPanel({ open, onClose, onApplyVideo }) {
  const { on, off } = useSocket();

  const [tab, setTab] = useState('local');

  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const [externalTitle, setExternalTitle] = useState('');
  const [externalUrl, setExternalUrl] = useState('');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [statusText, setStatusText] = useState('');
  const [uploadPercent, setUploadPercent] = useState(null);
  const [processingPercent, setProcessingPercent] = useState(null);

  const [videoIdToPoll, setVideoIdToPoll] = useState('');
  const [resolvedVideo, setResolvedVideo] = useState(null);

  const intervalRef = useRef(null);

  const hlsUrl = useMemo(() => {
    const source = resolvedVideo?.masterPlaylist || resolvedVideo?.externalUrl || '';
    return toAbsoluteUrl(source);
  }, [resolvedVideo]);

  useEffect(() => {
    if (!open) {
      setError('');
      setStatusText('');
      setBusy(false);
      setUploadPercent(null);
      setProcessingPercent(null);
    }
  }, [open]);

  useEffect(() => {
    const handleProcessing = ({ videoId, progress }) => {
      if (!videoIdToPoll || videoIdToPoll !== videoId) return;
      const pct = Number.isFinite(progress) ? Math.max(0, Math.min(100, Math.round(progress))) : 0;
      setProcessingPercent(pct);
      setStatusText(`Transcoding to HLS... ${pct}%`);
    };

    const handleReady = ({ videoId }) => {
      if (!videoIdToPoll || videoIdToPoll !== videoId) return;
      setProcessingPercent(100);
      setStatusText('Transcoding complete. HLS URL is ready.');
    };

    const handleError = ({ videoId, message }) => {
      if (!videoIdToPoll || videoIdToPoll !== videoId) return;
      setError(message || 'Transcoding failed on server.');
      setBusy(false);
      setProcessingPercent(null);
      setVideoIdToPoll('');
    };

    on('video:processing', handleProcessing);
    on('video:ready', handleReady);
    on('video:error', handleError);

    return () => {
      off('video:processing', handleProcessing);
      off('video:ready', handleReady);
      off('video:error', handleError);
    };
  }, [videoIdToPoll, on, off]);

  useEffect(() => {
    if (!videoIdToPoll) return;

    const pollOnce = async () => {
      try {
        const { data } = await api.get(`/api/videos/${videoIdToPoll}`);
        const video = data?.video;
        if (!video) return;

        if (video.status === 'ready') {
          setResolvedVideo(video);
          setStatusText('Transcoding complete. HLS URL is ready.');
          setBusy(false);
          setProcessingPercent(100);
          setUploadPercent(null);
          setVideoIdToPoll('');
          if (intervalRef.current) clearInterval(intervalRef.current);
          intervalRef.current = null;
          return;
        }

        if (video.status === 'error') {
          setBusy(false);
          setVideoIdToPoll('');
          setUploadPercent(null);
          setProcessingPercent(null);
          setError('Transcoding failed on server. Please try another file.');
          if (intervalRef.current) clearInterval(intervalRef.current);
          intervalRef.current = null;
          return;
        }

        setStatusText(`Processing... status: ${video.status}`);
      } catch {
        setError('Could not fetch processing status.');
      }
    };

    pollOnce();
    intervalRef.current = setInterval(pollOnce, 3000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [videoIdToPoll]);

  const handleLocalUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please choose a video file.');
      return;
    }

    setError('');
    setBusy(true);
    setResolvedVideo(null);
    setUploadPercent(0);
    setProcessingPercent(null);
    setStatusText('Uploading file...');

    try {
      const fd = new FormData();
      fd.append('video', file);
      if (title.trim()) fd.append('title', title.trim());
      if (description.trim()) fd.append('description', description.trim());

      const { data } = await api.post('/api/videos/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 0,
        onUploadProgress: (evt) => {
          const total = evt?.total || 0;
          if (!total) return;
          const pct = Math.min(100, Math.max(0, Math.round((evt.loaded / total) * 100)));
          setUploadPercent(pct);
          setStatusText(`Uploading... ${pct}%`);
        },
      });

      const video = data?.video;
      if (!video?._id) throw new Error('Upload response missing video id');

      setUploadPercent(100);
      setProcessingPercent(0);
      setVideoIdToPoll(video._id);
      setStatusText('Upload complete. Starting transcoding...');
    } catch (err) {
      setBusy(false);
      setUploadPercent(null);
      setProcessingPercent(null);
      setError(err?.response?.data?.message || 'Upload failed.');
    }
  };

  const handleExternalSave = async (e) => {
    e.preventDefault();
    if (!externalTitle.trim() || !externalUrl.trim()) {
      setError('Please provide title and HLS URL.');
      return;
    }

    setError('');
    setBusy(true);
    setResolvedVideo(null);
    setStatusText('Saving external stream...');

    try {
      const { data } = await api.post('/api/videos/external', {
        title: externalTitle.trim(),
        url: externalUrl.trim(),
      });

      setResolvedVideo(data?.video || null);
      setStatusText('External stream saved. HLS URL is ready.');
      setBusy(false);
    } catch (err) {
      setBusy(false);
      setError(err?.response?.data?.message || 'Could not save external stream.');
    }
  };

  const handleCopyHls = async () => {
    if (!hlsUrl) return;
    try {
      await navigator.clipboard.writeText(hlsUrl);
      setStatusText('Copied HLS URL to clipboard.');
    } catch {
      setError('Could not copy URL.');
    }
  };

  const handleUseInRoom = () => {
    if (!hlsUrl) return;
    onApplyVideo?.({
      videoUrl: hlsUrl,
      videoId: resolvedVideo?._id || null,
    });
    setStatusText('Video applied to room.');
  };

  if (!open) return null;

  return (
    <div style={panelWrap}>
      <div style={panelHead}>
        <div style={{ fontWeight: 700 }}>Host Video Upload</div>
        <button className="btn btn-ghost btn-sm" onClick={onClose} type="button">Close</button>
      </div>

      <div style={tabRow}>
        <button
          type="button"
          className="btn btn-sm"
          style={tab === 'local' ? activeTabBtn : tabBtn}
          onClick={() => setTab('local')}
        >
          Upload Local
        </button>
        <button
          type="button"
          className="btn btn-sm"
          style={tab === 'external' ? activeTabBtn : tabBtn}
          onClick={() => setTab('external')}
        >
          External HLS (Cloudinary)
        </button>
      </div>

      {tab === 'local' && (
        <form onSubmit={handleLocalUpload} style={formCol}>
          <input
            type="file"
            className="input"
            accept="video/mp4,video/mpeg,video/quicktime,video/x-msvideo,video/webm,video/x-matroska"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            disabled={busy}
          />
          <input
            className="input"
            placeholder="Title (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={busy}
          />
          <input
            className="input"
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={busy}
          />
          <button className="btn btn-primary btn-sm" type="submit" disabled={busy}>
            {busy
              ? (uploadPercent !== null && uploadPercent < 100
                ? `Uploading... ${uploadPercent}%`
                : (processingPercent !== null
                  ? `Transcoding... ${processingPercent}%`
                  : 'Processing...'))
              : 'Start Upload'}
          </button>

          {uploadPercent !== null && uploadPercent < 100 && (
            <div style={progressWrap}>
              <div style={progressLabel}>Upload Progress</div>
              <div style={progressTrack}>
                <div style={{ ...progressFill, width: `${uploadPercent}%` }} />
              </div>
              <div style={progressText}>{uploadPercent}% uploaded</div>
            </div>
          )}

          {processingPercent !== null && (
            <div style={progressWrap}>
              <div style={progressLabel}>Transcoding Progress (HLS)</div>
              <div style={progressTrack}>
                <div style={{ ...processingFill, width: `${processingPercent}%` }} />
              </div>
              <div style={progressText}>{processingPercent}% transcoded</div>
            </div>
          )}
        </form>
      )}

      {tab === 'external' && (
        <form onSubmit={handleExternalSave} style={formCol}>
          <input
            className="input"
            placeholder="Video title"
            value={externalTitle}
            onChange={(e) => setExternalTitle(e.target.value)}
            disabled={busy}
          />
          <input
            className="input"
            placeholder="Cloudinary HLS URL (.../master.m3u8)"
            value={externalUrl}
            onChange={(e) => setExternalUrl(e.target.value)}
            disabled={busy}
          />
          <button className="btn btn-primary btn-sm" type="submit" disabled={busy}>
            {busy ? 'Saving...' : 'Save External Stream'}
          </button>
        </form>
      )}

      {(statusText || error) && (
        <div style={{ marginTop: 10 }}>
          {statusText ? <div style={okText}>{statusText}</div> : null}
          {error ? <div style={errText}>{error}</div> : null}
        </div>
      )}

      {hlsUrl && (
        <div style={resultBox}>
          <div style={{ fontSize: '0.8rem', color: 'var(--c-text-muted)', marginBottom: 6 }}>HLS Stream URL</div>
          <input className="input" readOnly value={hlsUrl} />
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button className="btn btn-ghost btn-sm" type="button" onClick={handleCopyHls}>Copy URL</button>
            <button className="btn btn-primary btn-sm" type="button" onClick={handleUseInRoom}>Use In Room</button>
          </div>
        </div>
      )}
    </div>
  );
}

const panelWrap = {
  position: 'absolute',
  right: 0,
  top: '110%',
  width: 460,
  maxWidth: '92vw',
  background: 'var(--c-surface2)',
  border: '1px solid var(--c-border)',
  borderRadius: 'var(--r-md)',
  boxShadow: 'var(--shadow-lg)',
  padding: 12,
  zIndex: 120,
};

const panelHead = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 10,
};

const tabRow = {
  display: 'flex',
  gap: 8,
  marginBottom: 10,
};

const tabBtn = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid var(--c-border)',
  color: 'var(--c-text)',
};

const activeTabBtn = {
  background: 'var(--g-accent)',
  border: '1px solid transparent',
  color: '#fff',
};

const formCol = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
};

const resultBox = {
  marginTop: 10,
  paddingTop: 10,
  borderTop: '1px solid var(--c-border)',
};

const okText = {
  fontSize: '0.8rem',
  color: 'var(--c-green)',
};

const errText = {
  fontSize: '0.8rem',
  color: 'var(--c-red)',
};

const progressWrap = {
  marginTop: 6,
};

const progressTrack = {
  width: '100%',
  height: 8,
  borderRadius: 999,
  background: 'rgba(255,255,255,0.12)',
  overflow: 'hidden',
  border: '1px solid var(--c-border)',
};

const progressFill = {
  height: '100%',
  background: 'var(--g-accent)',
  transition: 'width 200ms ease',
};

const progressText = {
  marginTop: 6,
  fontSize: '0.78rem',
  color: 'var(--c-text-muted)',
};

const progressLabel = {
  marginBottom: 4,
  fontSize: '0.76rem',
  color: 'var(--c-text-muted)',
};

const processingFill = {
  height: '100%',
  background: 'linear-gradient(90deg, var(--c-green), var(--c-blue))',
  transition: 'width 200ms ease',
};
