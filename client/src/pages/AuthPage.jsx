import React, { useState } from 'react';
import { api, setToken } from '../api.js';

export default function AuthPage({ onAuthed }) {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const data = mode === 'login'
        ? await api.login({ email, password })
        : await api.register({ name, email, password });
      setToken(data.token);
      onAuthed(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="dw-auth-wrap">
      <div className="dw-auth-card">
        <div className="dw-brand" style={{ border: 'none', padding: 0, marginBottom: 20 }}>
          <div className="dw-brand-name" style={{ color: 'var(--navy)' }}>
            <span className="dw-facet"></span>The Webb Pricing
          </div>
          <div className="dw-brand-sub" style={{ color: 'var(--ink-soft)' }}>Cost &amp; Pricing Studio</div>
        </div>
        {error && <div className="dw-error">{error}</div>}
        <form onSubmit={submit}>
          {mode === 'register' && (
            <div className="dw-field">
              <label>Your name</label>
              <input value={name} onChange={e => setName(e.target.value)} required />
            </div>
          )}
          <div className="dw-field">
            <label>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="dw-field">
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
          </div>
          <button className="dw-btn dw-btn-gold" style={{ width: '100%' }} disabled={busy}>
            {busy ? 'Please wait…' : mode === 'login' ? 'Log In' : 'Create Account'}
          </button>
        </form>
        <div className="dw-auth-toggle">
          {mode === 'login' ? (
            <>New to the team? <button onClick={() => setMode('register')}>Create an account</button></>
          ) : (
            <>Already have an account? <button onClick={() => setMode('login')}>Log in</button></>
          )}
        </div>
      </div>
    </div>
  );
}
