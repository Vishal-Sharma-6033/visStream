import Hls from 'hls.js';

/**
 * HLS service — wraps hls.js with quality management.
 */
class HlsService {
  constructor() {
    this.hls         = null;
    this.videoEl     = null;
    this.onError     = null;
    this.onReady     = null;
    this.onLevelLoad = null;
  }

  attach(videoElement, onReady, onError) {
    this.destroy();
    this.videoEl = videoElement;
    this.onReady  = onReady;
    this.onError  = onError;
  }

  load(src) {
    if (!this.videoEl) return;

    // Native HLS (Safari)
    if (!Hls.isSupported() && this.videoEl.canPlayType('application/vnd.apple.mpegurl')) {
      this.videoEl.src = src;
      this.videoEl.addEventListener('loadedmetadata', () => this.onReady?.(), { once: true });
      return;
    }

    if (!Hls.isSupported()) { this.onError?.('HLS not supported in this browser'); return; }

    this.hls = new Hls({
      enableWorker:     true,
      lowLatencyMode:   false,
      backBufferLength: 60,
      maxBufferLength:  30,
      maxMaxBufferLength: 60,
      startLevel: -1, // ABR auto-select
    });

    this.hls.loadSource(src);
    this.hls.attachMedia(this.videoEl);

    this.hls.on(Hls.Events.MANIFEST_PARSED, (_e, data) => {
      const levels = data.levels.map((l, i) => ({ index: i, height: l.height, bitrate: l.bitrate, name: `${l.height}p` }));
      this.onReady?.(levels);
    });

    this.hls.on(Hls.Events.ERROR, (_e, data) => {
      if (data.fatal) {
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) this.hls.startLoad();
        else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) this.hls.recoverMediaError();
        else this.onError?.(data.details);
      }
    });
  }

  setQuality(levelIndex) {
    if (this.hls) this.hls.currentLevel = levelIndex; // -1 = auto
  }

  getCurrentLevel() {
    return this.hls?.currentLevel ?? -1;
  }

  destroy() {
    this.hls?.destroy();
    this.hls = null;
  }
}

export const hlsService = new HlsService();
export default hlsService;
