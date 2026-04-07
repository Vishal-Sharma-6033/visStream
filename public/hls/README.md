Place room playlists and transport stream segments in this folder.

Expected format:
- {ROOM_ID}.m3u8
- Corresponding .ts segment files referenced by each playlist

Example:
- ABC123.m3u8
- ABC123_000.ts
- ABC123_001.ts

Use HLS output from ffmpeg or your encoder pipeline.
