#!/usr/bin/env bash
set -euo pipefail

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "Error: ffmpeg is not installed or not in PATH"
  exit 1
fi

INPUT_PATH="${1:-}"
OUT_DIR="public/hls"
OUT_KEY="${2:-video}"

if [[ -z "$INPUT_PATH" ]]; then
  echo "Usage: ./scripts/generate-hls.sh <input-video-file> [stream-key]"
  echo "Example: ./scripts/generate-hls.sh ./media/movie.mp4 video"
  exit 1
fi

if [[ ! -f "$INPUT_PATH" ]]; then
  echo "Error: input file not found: $INPUT_PATH"
  exit 1
fi

mkdir -p "$OUT_DIR"
rm -f "$OUT_DIR/${OUT_KEY}"*.ts "$OUT_DIR/${OUT_KEY}.m3u8"

ffmpeg -y \
  -i "$INPUT_PATH" \
  -vf "scale='min(1280,iw)':-2,format=yuv420p" \
  -c:v libx264 \
  -profile:v main \
  -level 4.0 \
  -pix_fmt yuv420p \
  -preset veryfast \
  -g 60 \
  -keyint_min 60 \
  -sc_threshold 0 \
  -c:a aac \
  -b:a 128k \
  -ar 48000 \
  -ac 2 \
  -f hls \
  -hls_time 4 \
  -hls_list_size 0 \
  -hls_playlist_type vod \
  -hls_flags independent_segments \
  -hls_segment_filename "$OUT_DIR/${OUT_KEY}%03d.ts" \
  "$OUT_DIR/${OUT_KEY}.m3u8"

echo "Generated HLS playlist: $OUT_DIR/${OUT_KEY}.m3u8"
echo "Generated segments: $OUT_DIR/${OUT_KEY}000.ts ..."
