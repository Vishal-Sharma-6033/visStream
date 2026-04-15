/**
 * WebRTC service — manages peer connections for voice chat.
 * Full-mesh topology for up to ~8 peers.
 */

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

class WebRTCService {
  constructor() {
    this.peers      = new Map(); // socketId → RTCPeerConnection
    this.localStream = null;
    this.onTrack    = null; // callback(socketId, stream)
    this.socket     = null;
    this.isMuted    = false;
  }

  init(socket, onTrack) {
    this.socket  = socket;
    this.onTrack = onTrack;
  }

  async getLocalStream() {
    if (this.localStream) return this.localStream;
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    } catch (err) {
      console.warn('Microphone not available:', err.message);
      // Create silent stream as fallback
      const ctx = new AudioContext();
      const dest = ctx.createMediaStreamDestination();
      this.localStream = dest.stream;
    }
    return this.localStream;
  }

  getOrCreatePeer(remoteSocketId) {
    const existing = this.peers.get(remoteSocketId);
    if (existing && existing.connectionState !== 'closed') return existing;
    return this.createPeer(remoteSocketId);
  }

  createPeer(remoteSocketId) {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.onicecandidate = ({ candidate }) => {
      if (candidate && this.socket) {
        this.socket.emit('webrtc:ice-candidate', { targetSocketId: remoteSocketId, candidate });
      }
    };

    pc.ontrack = ({ streams }) => {
      if (this.onTrack && streams[0]) this.onTrack(remoteSocketId, streams[0]);
    };

    pc.onconnectionstatechange = () => {
      if (['failed', 'closed'].includes(pc.connectionState)) {
        this.peers.delete(remoteSocketId);
      }
    };

    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => pc.addTrack(t, this.localStream));
    }

    this.peers.set(remoteSocketId, pc);
    return pc;
  }

  async initiateCall(remoteSocketId) {
    await this.getLocalStream();
    const pc = this.getOrCreatePeer(remoteSocketId);
    if (pc.signalingState !== 'stable') return;

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    this.socket?.emit('webrtc:offer', { targetSocketId: remoteSocketId, offer });
  }

  async handleOffer(fromSocketId, offer) {
    await this.getLocalStream();
    const pc = this.getOrCreatePeer(fromSocketId);
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    this.socket?.emit('webrtc:answer', { targetSocketId: fromSocketId, answer });
  }

  async handleAnswer(fromSocketId, answer) {
    const pc = this.peers.get(fromSocketId);
    if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
  }

  async handleIceCandidate(fromSocketId, candidate) {
    const pc = this.peers.get(fromSocketId);
    if (pc) {
      try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch (e) { /* ignore stale candidates */ }
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    this.localStream?.getAudioTracks().forEach((t) => (t.enabled = !this.isMuted));
    return this.isMuted;
  }

  disconnectPeer(socketId) {
    const pc = this.peers.get(socketId);
    if (pc) { pc.close(); this.peers.delete(socketId); }
  }

  destroy() {
    this.peers.forEach((pc) => pc.close());
    this.peers.clear();
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.localStream = null;
    this.isMuted = false;
    this.socket = null;
    this.onTrack = null;
  }
}

export const webrtcService = new WebRTCService();
export default webrtcService;
