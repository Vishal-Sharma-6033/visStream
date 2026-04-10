const ffmpeg = require('fluent-ffmpeg');
const path   = require('path');
const fs     = require('fs');
const Video  = require('../models/Video');

const HLS_BASE = path.join(__dirname, '..', process.env.HLS_DIR || 'uploads/hls');

const QUALITY_PROFILES = [
  { name: '480p',  w: 854,  h: 480,  vbr: '800k',  abr: '96k',  bw: 800000  },
  { name: '720p',  w: 1280, h: 720,  vbr: '2500k', abr: '128k', bw: 2500000 },
  { name: '1080p', w: 1920, h: 1080, vbr: '5000k', abr: '192k', bw: 5000000 },
];

// Probe file duration
const getDuration = (filePath) =>
  new Promise((resolve) => {
    ffmpeg.ffprobe(filePath, (err, meta) => resolve(err ? 0 : Math.round(meta?.format?.duration || 0)));
  });

// Transcode one quality level
const transcodeOne = (input, outputDir, q) =>
  new Promise((resolve, reject) => {
    const playlist = path.join(outputDir, `${q.name}.m3u8`);
    const segments = path.join(outputDir, `${q.name}_%03d.ts`);
    ffmpeg(input)
      .outputOptions([
        `-vf scale=${q.w}:${q.h}`,
        '-c:v libx264', '-preset fast', '-crf 22',
        `-b:v ${q.vbr}`, `-maxrate ${q.vbr}`,
        `-bufsize ${parseInt(q.vbr) * 2}k`,
        '-c:a aac', `-b:a ${q.abr}`, '-ar 44100',
        '-hls_time 6', '-hls_playlist_type vod',
        `-hls_segment_filename ${segments}`, '-f hls',
      ])
      .output(playlist)
      .on('end', () => resolve(playlist))
      .on('error', reject)
      .run();
  });

// Build master playlist
const writeMaster = (outDir, videoId) => {
  let m3u8 = '#EXTM3U\n#EXT-X-VERSION:3\n\n';
  for (const q of QUALITY_PROFILES) {
    m3u8 += `#EXT-X-STREAM-INF:BANDWIDTH=${q.bw},RESOLUTION=${q.w}x${q.h},NAME="${q.name}"\n`;
    m3u8 += `/hls/${videoId}/${q.name}.m3u8\n\n`;
  }
  fs.writeFileSync(path.join(outDir, 'master.m3u8'), m3u8);
};

// Main export
const transcodeToHLS = async (videoId, inputPath, io) => {
  const id       = videoId.toString();
  const outDir   = path.join(HLS_BASE, id);
  fs.mkdirSync(outDir, { recursive: true });

  const emit = (event, data) => { if (io) io.emit(event, { videoId: id, ...data }); };

  try {
    const duration = await getDuration(inputPath);
    await Video.findByIdAndUpdate(videoId, { status: 'processing', duration });
    emit('video:processing', { progress: 0 });

    const qualities = [];

    for (let i = 0; i < QUALITY_PROFILES.length; i++) {
      const q = QUALITY_PROFILES[i];
      emit('video:processing', { progress: Math.round((i / QUALITY_PROFILES.length) * 90) });
      await transcodeOne(inputPath, outDir, q);
      qualities.push({ resolution: q.name, bandwidth: q.bw, playlistUrl: `/hls/${id}/${q.name}.m3u8` });
    }

    writeMaster(outDir, id);
    const masterPlaylist = `/hls/${id}/master.m3u8`;

    await Video.findByIdAndUpdate(videoId, { status: 'ready', hlsPath: outDir, masterPlaylist, qualities });
    emit('video:ready', { masterPlaylist });

    console.log(`✅  Transcoding complete → ${masterPlaylist}`);
  } catch (err) {
    console.error('❌  Transcoding failed:', err.message);
    await Video.findByIdAndUpdate(videoId, { status: 'error' });
    emit('video:error', { message: err.message });
  }
};

module.exports = { transcodeToHLS };
