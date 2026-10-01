import React, { useEffect, useState } from 'react';
import authCover from '../assets/images/auth-cover.png';
import logo from '../assets/logos/logo_updated.png';
import './AuthPage.css';

const authErrors = {
  google_cancelled: 'Google sign-in was cancelled.',
  github_cancelled: 'GitHub sign-in was cancelled.',
  google_invalid_state: 'Google sign-in expired. Please try again.',
  github_invalid_state: 'GitHub sign-in expired. Please try again.',
  google_failed: 'Google sign-in could not be completed.',
  github_failed: 'GitHub sign-in could not be completed.'
};

function AuthPage({ initialMode = 'signin' }) {
  const [mode, setMode] = useState(initialMode);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [providers, setProviders] = useState({ google: false, github: false });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    document.title = mode === 'signup' ? 'Create account | Re-To' : 'Sign in | Re-To';

    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get('error');
    if (oauthError) setError(authErrors[oauthError] || 'Sign-in could not be completed. Please try again.');

    fetch('/api/auth/providers')
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (active && data) setProviders(data);
      })
      .catch(() => {});

    fetch('/api/auth/session')
      .then((response) => response.ok ? response.json() : null)
      .then((session) => {
        if (active && session?.authenticated) window.location.replace('/re-to-ai');
      })
      .catch(() => {});

    return () => { active = false; };
  }, [mode]);

  const returnTo = new URLSearchParams(window.location.search).get('returnTo');
  const destination = returnTo?.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/re-to-ai';

  function selectMode(nextMode) {
    setMode(nextMode);
    setError('');
    window.history.replaceState(null, '', nextMode === 'signup' ? '/signup' : '/login');
  }

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const response = await fetch(`/api/auth/${mode === 'signup' ? 'register' : 'login'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          ...(mode === 'signup' ? { full_name: fullName } : {})
        })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        const detail = result.detail;
        throw new Error(typeof detail === 'string' ? detail : 'Check your details and try again.');
      }
      window.location.assign(destination);
    } catch (requestError) {
      setError(requestError.message || 'Could not reach the sign-in service.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-cover">
        <img src={authCover} alt="Let's code illustration" />
      </div>
      <section className="auth-panel" aria-label={mode === 'signup' ? 'Create Re-To account' : 'Sign in to Re-To'}>
        <div className="auth-panel-inner">
          <a className="auth-brand" href="/" aria-label="Re-To home">
            <img src={logo} alt="" />
            <span>Re-To</span>
          </a>

          <div className="auth-main">
            <div className="auth-form-wrap">
              <div className="auth-tabs" role="tablist" aria-label="Account access">
                <button type="button" role="tab" aria-selected={mode === 'signin'} className={mode === 'signin' ? 'active' : ''} onClick={() => selectMode('signin')}>Sign in</button>
                <button type="button" role="tab" aria-selected={mode === 'signup'} className={mode === 'signup' ? 'active' : ''} onClick={() => selectMode('signup')}>Create account</button>
              </div>

              <h1>{mode === 'signup' ? 'Create your account' : 'Welcome back'}</h1>
              <p className="auth-description">
                {mode === 'signup' ? 'Create an account to get started with Re-To.' : 'Enter your email and password to access your account dashboard.'}
              </p>

              <div className="auth-socials">
                <button type="button" disabled={!providers.google} onClick={() => { window.location.href = '/api/auth/google'; }}>
                  <span className="google-mark" aria-hidden="true">G</span>Continue with Google
                </button>
                <button type="button" disabled={!providers.github} onClick={() => { window.location.href = '/api/auth/github'; }}>
                  <span className="github-mark" aria-hidden="true">GH</span>Continue with GitHub
                </button>
              </div>
              {!providers.google && !providers.github && (
                <p className="auth-provider-note">Social sign-in needs provider credentials. Email sign-in is ready.</p>
              )}

              <div className="auth-divider"><span />or sign in with email<span /></div>

              <form onSubmit={submit}>
                {mode === 'signup' && (
                  <label className="auth-field">
                    <span>Full name</span>
                    <input autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Your name" required maxLength={100} />
                  </label>
                )}
                <label className="auth-field">
                  <span>Email address</span>
                  <input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@work-email.com" required maxLength={254} />
                </label>
                <label className="auth-field">
                  <span>Password</span>
                  <span className="auth-password-wrap">
                    <input type={showPassword ? 'text' : 'password'} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" required minLength={8} maxLength={128} />
                    <button type="button" className="auth-password-toggle" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </span>
                </label>
                {error && <p className="auth-error" role="alert">{error}</p>}
                <button className="auth-submit" type="submit" disabled={submitting}>
                  {submitting ? 'Please wait...' : mode === 'signup' ? 'Create account' : 'Sign in'} <span aria-hidden="true">→</span>
                </button>
              </form>

              <p className="auth-switch">
                {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}{' '}
                <button type="button" onClick={() => selectMode(mode === 'signup' ? 'signin' : 'signup')}>
                  {mode === 'signup' ? 'Sign in' : 'Create one'}
                </button>
              </p>
            </div>
          </div>

          <footer className="auth-footer">© Re-To</footer>
        </div>
      </section>
    </main>
  );
}

export default AuthPage;