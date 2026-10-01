import React, { useEffect, useState } from 'react';
import logo from '../assets/logos/logo_updated.png';
import './Playground.css';

async function requestJson(path, options) {
  const response = await fetch(path, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = data.detail;
    throw new Error(typeof detail === 'string' ? detail : `${response.status} ${response.statusText}`);
  }
  return data;
}

function Playground() {
  const [user, setUser] = useState(null);
  const [prompt, setPrompt] = useState('What is 18% GST on 2400?');
  const [stats, setStats] = useState(null);
  const [models, setModels] = useState([]);
  const [connection, setConnection] = useState('Connecting');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      try {
        const session = await requestJson('/api/auth/session');
        if (!session.authenticated) {
          window.location.replace('/login?returnTo=%2Fre-to-ai');
          return;
        }
        const [nextStats, nextModels] = await Promise.all([
          requestJson('/api/stats'),
          requestJson('/api/models')
        ]);
        if (!active) return;
        setUser(session.user);
        setStats(nextStats);
        setModels(nextModels);
        setConnection('Connected');
      } catch (requestError) {
        if (!active) return;
        setConnection('Offline');
        setError(requestError.message);
      }
    }

    loadDashboard();
    return () => { active = false; };
  }, []);

  async function refreshStats() {
    const nextStats = await requestJson('/api/stats');
    setStats(nextStats);
  }

  async function submitPrompt(event) {
    event.preventDefault();
    const content = prompt.trim();
    if (!content || submitting) return;

    setSubmitting(true);
    setError('');
    setResult(null);
    try {
      const data = await requestJson('/api/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: content, user_id: String(user.id) })
      });
      setResult(data);
      setConnection('Connected');
      await refreshStats();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="playground-page">
      <header className="playground-header">
        <a className="playground-brand" href="/" aria-label="Re-To home">
          <img src={logo} alt="" />
          <span>Re-To <b>AI</b></span>
        </a>
        <div className="playground-header-right">
          <span className={`connection-state ${connection === 'Connected' ? 'is-connected' : ''}`}><i /> API {connection}</span>
          <span className="playground-user">{user?.full_name || user?.email || ''}</span>
          <a className="playground-home" href="/">Re-To home <span aria-hidden="true">↗</span></a>
        </div>
      </header>

      <section className="playground-intro">
        <p className="playground-eyebrow">SMART ROUTER / LIVE PLAYGROUND</p>
        <h1>Try a prompt.<br /><span>See how it routes.</span></h1>
        <p className="playground-lede">Send a request through the Re-To router and inspect its answer, model choice, and estimated cost.</p>
      </section>

      <section className="playground-stats" aria-label="Router statistics">
        <div><span>REQUESTS</span><strong>{stats?.total_requests ?? '—'}</strong></div>
        <div><span>ROUTER SPEND</span><strong>{stats ? `$${stats.smart_router_cost.toFixed(4)}` : '—'}</strong></div>
        <div><span>EST. SAVED</span><strong>{stats ? `${stats.percent_saved}%` : '—'}</strong></div>
        <div><span>ENABLED MODELS</span><strong>{models.filter((model) => model.enabled).length || '—'}</strong></div>
      </section>

      <section className="playground-workspace">
        <form className="prompt-panel" onSubmit={submitPrompt}>
          <div className="panel-heading"><span>YOUR PROMPT</span><span>SMART AUTO</span></div>
          <label htmlFor="router-prompt">What should Re-To work on?</label>
          <textarea
            id="router-prompt"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                if (prompt.trim() && !submitting) event.currentTarget.form.requestSubmit();
              }
            }}
            placeholder="Ask a question or describe a task..."
            rows={6}
            maxLength={4000}
            required
          />
          {error && <p className="playground-error" role="alert">{error}</p>}
          <div className="prompt-footer">
            <span>Prompts are routed using your configured models and policies.</span>
            <button className="run-prompt" type="submit" disabled={submitting || !prompt.trim() || !user}>
              {submitting ? 'Routing...' : 'Run prompt'} <span aria-hidden="true">↗</span>
            </button>
          </div>
        </form>

        <aside className="router-panel">
          <div className="panel-heading"><span>AVAILABLE MODELS</span><span className={connection === 'Connected' ? 'status-ok' : 'status-wait'}>{connection.toUpperCase()}</span></div>
          <ul className="playground-model-list">
            {models.filter((model) => model.enabled).map((model) => (
              <li key={model.id}><span><i />{model.name}</span><small>{model.tier}</small></li>
            ))}
          </ul>
        </aside>
      </section>

      {result && (
        <section className="result-panel" aria-live="polite">
          <div className="panel-heading"><span>ROUTER RESPONSE</span><span>{result.demo_mode ? 'DEMO MODE' : 'LIVE MODEL'}</span></div>
          <p className="result-answer">{result.answer}</p>
          <p className="result-reason">{result.reason}</p>
          <div className="result-details">
            <div><span>MODEL</span><strong>{result.chosen_model}</strong></div>
            <div><span>TIER</span><strong>{result.tier}</strong></div>
            <div><span>TASK</span><strong>{result.task_type}</strong></div>
            <div><span>ESTIMATED COST</span><strong>${Number(result.estimated_cost).toFixed(6)}</strong></div>
            <div><span>COST SAVED</span><strong>{result.cost_saved_percent}%</strong></div>
            <div><span>REQUEST</span><strong>#{result.request_id}</strong></div>
          </div>
        </section>
      )}
    </main>
  );
}

export default Playground;