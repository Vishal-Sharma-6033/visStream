import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const [mode,     setMode]     = useState('login'); // 'login' | 'register'
  const [form,     setForm]     = useState({ username:'', email:'', password:'' });
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      if (mode === 'login') await login(form.email, form.password);
      else                  await register(form.username, form.email, form.password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally { setLoading(false); }
  };

  return (
    <div style={pg}>
      <div style={glow} />

      {/* Back link */}
      <nav style={{ padding:'20px 32px', position:'relative', zIndex:10 }}>
        <Link to="/" style={{ display:'inline-flex', alignItems:'center', gap:6, color:'var(--c-text-muted)', fontSize:'0.88rem' }}>
          ← Back to Home
        </Link>
      </nav>

      <div style={center}>
        <div className="glass animate-scale-in" style={card}>
          {/* Logo */}
          <div style={{ textAlign:'center', marginBottom:28 }}>
            <div style={{ fontSize:'2.5rem', marginBottom:8 }}>🎬</div>
            <h1 style={{ fontSize:'1.6rem', fontWeight:800 }}>visStream</h1>
            <p style={{ fontSize:'0.88rem', marginTop:4 }}>
              {mode === 'login' ? 'Welcome back! Sign in to continue.' : 'Create your account to get started.'}
            </p>
          </div>

          {/* Mode toggle */}
          <div style={tabs}>
            {['login','register'].map(m => (
              <button key={m} style={{ ...tabBtn, ...(mode===m ? tabActive : {}) }} onClick={() => { setMode(m); setError(''); }}>
                {m === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {mode === 'register' && (
              <div className="form-group">
                <label>Username</label>
                <input id="register-username" className="input" name="username" placeholder="coolwatcher" value={form.username} onChange={handleChange} required minLength={3} />
              </div>
            )}
            <div className="form-group">
              <label>Email</label>
              <input id="login-email" className="input" name="email" type="email" placeholder="you@example.com" value={form.email} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input id="login-password" className="input" name="password" type="password" placeholder="••••••••" value={form.password} onChange={handleChange} required minLength={6} />
            </div>
            {error && <p className="form-error" style={{ textAlign:'center' }}>{error}</p>}
            <button id="auth-submit-btn" className="btn btn-primary" type="submit" disabled={loading} style={{ marginTop:4 }}>
              {loading ? '…' : mode === 'login' ? 'Sign In →' : 'Create Account →'}
            </button>
          </form>

          <p style={{ textAlign:'center', marginTop:20, fontSize:'0.83rem', color:'var(--c-text-dim)' }}>
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button onClick={() => { setMode(mode==='login'?'register':'login'); setError(''); }} style={{ background:'none', border:'none', color:'var(--c-accent)', cursor:'pointer', fontFamily:'inherit', fontSize:'inherit', fontWeight:600 }}>
              {mode === 'login' ? 'Register' : 'Sign In'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

const pg     = { minHeight:'100vh', display:'flex', flexDirection:'column', position:'relative' };
const glow   = { position:'fixed', top:0, left:'50%', transform:'translateX(-50%)', width:'60vw', height:'40vh', background:'var(--g-hero)', pointerEvents:'none' };
const center = { flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:24, position:'relative', zIndex:1 };
const card   = { width:'100%', maxWidth:420, padding:'36px 32px' };
const tabs   = { display:'grid', gridTemplateColumns:'1fr 1fr', gap:4, marginBottom:24, background:'var(--c-surface2)', borderRadius:'var(--r-md)', padding:4 };
const tabBtn = { padding:'10px 0', border:'none', borderRadius:'var(--r-sm)', background:'transparent', color:'var(--c-text-muted)', cursor:'pointer', fontFamily:'var(--font)', fontWeight:600, fontSize:'0.88rem', transition:'all 0.2s' };
const tabActive = { background:'var(--c-surface3)', color:'var(--c-text)', boxShadow:'0 2px 8px rgba(0,0,0,0.3)' };
