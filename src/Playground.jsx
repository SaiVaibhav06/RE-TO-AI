import React, { useEffect, useRef, useState } from 'react';
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

function renderInlineMarkdown(text, keyPrefix) {
  const tokenPattern = /(\*\*|__)(.+?)\1|~~(.+?)~~|`([^`]+)`|\*([^*\n]+)\*/g;
  const nodes = [];
  let lastIndex = 0;
  let match;
  let tokenIndex = 0;

  while ((match = tokenPattern.exec(text))) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    const key = `${keyPrefix}-${tokenIndex++}`;
    if (match[2] !== undefined) nodes.push(<strong key={key}>{match[2]}</strong>);
    else if (match[3] !== undefined) nodes.push(<del key={key}>{match[3]}</del>);
    else if (match[4] !== undefined) nodes.push(<code key={key}>{match[4]}</code>);
    else nodes.push(<em key={key}>{match[5]}</em>);
    lastIndex = tokenPattern.lastIndex;
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

function renderAssistantContent(content) {
  const lines = content.replace(/\r\n?/g, '\n').split('\n');
  const blocks = [];
  let paragraph = [];
  let list = [];
  let listType = '';
  let codeLines = null;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    blocks.push(<p key={`p-${blocks.length}`}>{paragraph.map((line, index) => <React.Fragment key={index}>{index > 0 && <br />}{renderInlineMarkdown(line, `p-${blocks.length}-${index}`)}</React.Fragment>)}</p>);
    paragraph = [];
  };
  const flushList = () => {
    if (!list.length) return;
    const ListTag = listType === 'ordered' ? 'ol' : 'ul';
    blocks.push(<ListTag key={`list-${blocks.length}`}>{list.map((item, index) => <li key={index}>{renderInlineMarkdown(item, `list-${blocks.length}-${index}`)}</li>)}</ListTag>);
    list = [];
    listType = '';
  };

  lines.forEach((line, index) => {
    if (line.trim().startsWith('```')) {
      flushParagraph();
      flushList();
      if (codeLines) {
        blocks.push(<pre key={`code-${blocks.length}`}><code>{codeLines.join('\n')}</code></pre>);
        codeLines = null;
      } else codeLines = [];
      return;
    }
    if (codeLines) {
      codeLines.push(line);
      return;
    }

    const unordered = line.match(/^\s*[-*+]\s+(.+)$/);
    const ordered = line.match(/^\s*\d+[.)]\s+(.+)$/);
    if (unordered || ordered) {
      flushParagraph();
      const nextType = ordered ? 'ordered' : 'unordered';
      if (list.length && nextType !== listType) flushList();
      listType = nextType;
      list.push((unordered || ordered)[1]);
      return;
    }

    flushList();
    if (!line.trim()) {
      flushParagraph();
      return;
    }

    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      const HeadingTag = `h${heading[1].length + 1}`;
      blocks.push(<HeadingTag key={`h-${index}`}>{renderInlineMarkdown(heading[2], `h-${index}`)}</HeadingTag>);
      return;
    }

    const quote = line.match(/^\s*&gt;\s*(.*)$/) || line.match(/^\s*>\s*(.*)$/);
    if (quote) {
      flushParagraph();
      blocks.push(<blockquote key={`quote-${index}`}>{renderInlineMarkdown(quote[1], `quote-${index}`)}</blockquote>);
      return;
    }
    paragraph.push(line);
  });

  flushParagraph();
  flushList();
  if (codeLines) blocks.push(<pre key={`code-${blocks.length}`}><code>{codeLines.join('\n')}</code></pre>);
  return blocks;
}

function Playground() {
  const [user, setUser] = useState(null);
  const [connection, setConnection] = useState('Connecting');
  const [models, setModels] = useState([]);
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatTitle, setChatTitle] = useState('New chat');
  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pendingDeleteChat, setPendingDeleteChat] = useState(null);
  const [fullName, setFullName] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const bottomRef = useRef(null);
  const userMenuRef = useRef(null);

  const displayName = user?.full_name || user?.email || '';
  const initial = displayName ? displayName.trim().charAt(0).toUpperCase() : '·';
  const routedMessages = messages.filter((message) => message.role === 'assistant' && message.metadata);
  const routerSpend = routedMessages.reduce((total, message) => total + Number(message.metadata.estimated_cost || 0), 0);
  const savedPercent = routedMessages.length
    ? Math.round(routedMessages.reduce((total, message) => total + Number(message.metadata.cost_saved_percent || 0), 0) / routedMessages.length)
    : 0;
  const latestRoute = routedMessages[routedMessages.length - 1]?.metadata;
  const enabledModelCount = models.filter((model) => model.enabled).length;

  useEffect(() => {
    let active = true;

    async function loadWorkspace() {
      try {
        const session = await requestJson('/api/auth/session');
        if (!session.authenticated) {
          window.location.replace('/login?returnTo=%2Fre-to-ai');
          return;
        }
        const chatList = await requestJson('/api/chats');
        if (!active) return;
        const configuredModels = await requestJson('/api/models').catch(() => []);
        if (!active) return;
        setUser(session.user);
        setFullName(session.user.full_name || '');
        setChats(chatList);
        setModels(configuredModels);
        setConnection('Connected');
      } catch (requestError) {
        if (!active) return;
        setConnection('Offline');
        setError(requestError.message);
      }
    }

    loadWorkspace();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages, submitting]);

  useEffect(() => {
    function onDocumentClick(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocumentClick);
    return () => document.removeEventListener('mousedown', onDocumentClick);
  }, []);

  useEffect(() => {
    if (!pendingDeleteChat) return undefined;
    function onDialogKeyDown(event) {
      if (event.key === 'Escape') setPendingDeleteChat(null);
    }
    document.addEventListener('keydown', onDialogKeyDown);
    return () => document.removeEventListener('keydown', onDialogKeyDown);
  }, [pendingDeleteChat]);

  async function refreshChats() {
    try {
      setChats(await requestJson('/api/chats'));
    } catch {
      /* keep the previous list if the refresh fails */
    }
  }

  function startNewChat() {
    setActiveChatId(null);
    setMessages([]);
    setChatTitle('New chat');
    setError('');
    setSidebarOpen(false);
  }

  async function openChat(chatId) {
    setSidebarOpen(false);
    if (submitting || chatId === activeChatId) return;
    try {
      setError('');
      const data = await requestJson(`/api/chats/${chatId}`);
      setActiveChatId(data.chat.id);
      setChatTitle(data.chat.title);
      setMessages(data.messages);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  function deleteChat(chat, event) {
    event.stopPropagation();
    if (submitting) return;
    setPendingDeleteChat(chat);
  }

  async function confirmDeleteChat() {
    if (!pendingDeleteChat || submitting) return;
    const chat = pendingDeleteChat;
    try {
      await requestJson(`/api/chats/${chat.id}`, { method: 'DELETE' });
      setChats((current) => current.filter((item) => item.id !== chat.id));
      if (chat.id === activeChatId) {
        setActiveChatId(null);
        setMessages([]);
        setChatTitle('New chat');
      }
      setPendingDeleteChat(null);
      setError('');
    } catch (requestError) {
      setError(requestError.message);
      setPendingDeleteChat(null);
    }
  }

  async function sendPrompt(event) {
    event.preventDefault();
    const content = prompt.trim();
    if (!content || submitting) return;

    setSubmitting(true);
    setError('');
    setPrompt('');
    setMessages((current) => [
      ...current,
      { id: `local-user-${Date.now()}`, role: 'user', content },
    ]);

    try {
      let chatId = activeChatId;
      if (!chatId) {
        const chat = await requestJson('/api/chats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: content.slice(0, 80) }),
        });
        chatId = chat.id;
        setActiveChatId(chatId);
      }
      const data = await requestJson(`/api/chats/${chatId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: content }),
      });
      const assistantMessage = data.messages.find((message) => message.role === 'assistant');
      if (assistantMessage) {
        setMessages((current) => [...current, assistantMessage]);
      }
      setChatTitle(data.chat_title);
      setConnection('Connected');
      await refreshChats();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function logout() {
    try {
      await requestJson('/api/auth/logout', { method: 'POST' });
    } catch {
      /* sign out locally even if the request fails */
    }
    window.location.replace('/login');
  }

  async function saveProfile(event) {
    event.preventDefault();
    try {
      const data = await requestJson('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName.trim() || user.email }),
      });
      setUser((current) => ({ ...current, full_name: data.user.full_name }));
      setSettingsOpen(false);
      setUserMenuOpen(false);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <main className="playground-page">
      {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}

      <aside className={`chat-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <a className="playground-brand" href="/" aria-label="Re-To home">
          <img src={logo} alt="" />
          <span>Re-To <b>AI</b></span>
        </a>

        <button className="new-chat" onClick={startNewChat}>
          <span aria-hidden="true">+</span> New chat
        </button>

        <div className="recent-chats">
          <p className="recent-heading">RECENT CHATS</p>
          {chats.length === 0 ? (
            <p className="recent-empty">No chats yet. Start one above.</p>
          ) : (
            <ul>
              {chats.map((chat) => (
                <li key={chat.id}>
                  <button
                    className={`recent-chat-open ${chat.id === activeChatId ? 'active' : ''}`}
                    onClick={() => openChat(chat.id)}
                    title={chat.title}
                  >
                    <span className="recent-title">{chat.title}</span>
                    <small>{chat.message_count} {chat.message_count === 1 ? 'msg' : 'msgs'}</small>
                  </button>
                  <button className="delete-chat" type="button" onClick={(event) => deleteChat(chat, event)} aria-label={`Delete ${chat.title}`} title="Delete chat" disabled={submitting}>
                    <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 6h12M8 6V4h4v2m-7 0 1 10h8l1-10M8 9v4m4-4v4" /></svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="sidebar-user" ref={userMenuRef}>
          <button
            className="user-chip"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            aria-expanded={userMenuOpen}
          >
            <span className="user-avatar">{initial}</span>
            <span className="user-name">{displayName}</span>
            <span className="user-caret" aria-hidden="true">{userMenuOpen ? '⌃' : '⌄'}</span>
          </button>
          {userMenuOpen && (
            <div className="user-menu" role="menu">
              <button type="button" onClick={() => { setSettingsOpen(true); setUserMenuOpen(false); }}>
                <span aria-hidden="true">⚙</span> Settings
              </button>
              <button type="button" onClick={logout}>
                <span aria-hidden="true">⏻</span> Log out
              </button>
            </div>
          )}
        </div>
      </aside>

      <section className="chat-main">
        <header className="chat-header">
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open chats"
          >
            ☰
          </button>
          <span className="chat-title">{chatTitle}</span>
          <div className="chat-header-right">
            <span className={`connection-state ${connection === 'Connected' ? 'is-connected' : ''}`}>
              <i /> API {connection}
            </span>
            <a className="playground-home" href="/">Re-To home <span aria-hidden="true">↗</span></a>
          </div>
        </header>

        <section className="chat-stats" aria-label="Current chat usage">
          <div className="chat-stat"><span>REQUESTS</span><strong>{routedMessages.length}</strong></div>
          <div className="chat-stat"><span>ROUTER SPEND</span><strong>${routerSpend.toFixed(4)}</strong></div>
          <div className="chat-stat"><span>EST. SAVED</span><strong>{savedPercent}%</strong></div>
          <div className="chat-stat"><span>ENABLED MODELS</span><strong>{enabledModelCount || '—'}</strong></div>
        </section>

        <div className="chat-scroll">
          {messages.length === 0 && !submitting ? (
            <div className="chat-welcome">
              <img src={logo} alt="" />
              <h1>Re-To <span>AI</span></h1>
              <p>Ask anything. Re-To routes your prompt to the right model and answers here.</p>
            </div>
          ) : (
            messages.map((message) =>
              message.role === 'user' ? (
                <div className="msg msg-user" key={message.id}>
                  <p>{message.content}</p>
                </div>
              ) : (
                <div className="msg msg-assistant" key={message.id}>
                  <img className="msg-avatar" src={logo} alt="" />
                  <div className="msg-body">
                    <div className="msg-text">{renderAssistantContent(message.content)}</div>
                    {message.metadata && (
                      <p className="msg-meta">
                        {message.metadata.chosen_model} · {message.metadata.tier} tier · $
                        {Number(message.metadata.estimated_cost).toFixed(6)} · saved{' '}
                        {message.metadata.cost_saved_percent}%
                        {message.metadata.demo_mode ? ' · DEMO' : ''}
                      </p>
                    )}
                  </div>
                </div>
              ),
            )
          )}

          {submitting && (
            <div className="msg msg-assistant">
              <img className="msg-avatar" src={logo} alt="" />
              <div className="msg-body">
                <p className="msg-text typing"><span className="spinner" aria-hidden="true">◌</span> Re-To is routing your prompt…</p>
              </div>
            </div>
          )}

          {error && <p className="playground-error" role="alert">{error}</p>}
          <div ref={bottomRef} />
        </div>

        <section className="chat-insights" aria-label="Model and routing details">
          <article className="insight-card models-card">
            <div className="insight-heading">
              <span>AVAILABLE MODELS</span>
              <span className={`models-status ${connection === 'Connected' ? 'is-connected' : ''}`}><i /> {connection.toUpperCase()}</span>
            </div>
            <div className="available-models">
              {models.filter((model) => model.enabled).map((model) => (
                <div className="available-model" key={model.id}>
                  <span><i />{model.name}</span><small>{model.tier}</small>
                </div>
              ))}
              {models.length === 0 && <p className="insight-empty">Model details are unavailable.</p>}
            </div>
          </article>

          <article className="insight-card route-card" aria-live="polite">
            <div className="insight-heading"><span>ROUTER RESPONSE</span><span className="route-live">{latestRoute ? 'LATEST ROUTE' : 'AWAITING PROMPT'}</span></div>
            {latestRoute ? (
              <>
                <p className="route-reason">{latestRoute.reason}</p>
                <div className="route-details">
                  <div><span>MODEL</span><strong>{latestRoute.chosen_model}</strong></div>
                  <div><span>TIER</span><strong>{latestRoute.tier}</strong></div>
                  <div><span>TASK</span><strong>{latestRoute.task_type}</strong></div>
                  <div><span>EST. COST</span><strong>${Number(latestRoute.estimated_cost || 0).toFixed(6)}</strong></div>
                </div>
              </>
            ) : <p className="insight-empty">Send a prompt to see the selected model and route details.</p>}
          </article>
        </section>

        <form className="chat-composer" onSubmit={sendPrompt}>
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
            rows={2}
            maxLength={4000}
          />
          <button className="send-prompt" type="submit" disabled={submitting || !prompt.trim()}>
            {submitting ? 'Sending...' : 'Send'} <span aria-hidden="true">↗</span>
          </button>
        </form>
      </section>

      {settingsOpen && (
        <div className="settings-overlay" onClick={() => setSettingsOpen(false)}>
          <form className="settings-modal" onClick={(event) => event.stopPropagation()} onSubmit={saveProfile}>
            <div className="panel-heading"><span>SETTINGS</span><span>ACCOUNT</span></div>
            <label htmlFor="full-name">Display name</label>
            <input
              id="full-name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              maxLength={80}
              placeholder="Your name"
            />
            <p className="settings-email">{user?.email}</p>
            <div className="settings-actions">
              <button type="button" className="settings-cancel" onClick={() => setSettingsOpen(false)}>Cancel</button>
              <button type="submit" className="settings-save">Save changes</button>
            </div>
          </form>
        </div>
      )}

      {pendingDeleteChat && (
        <div className="delete-overlay" onClick={() => setPendingDeleteChat(null)}>
          <section
            className="delete-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
            aria-describedby="delete-dialog-description"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="delete-dialog-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M4.5 7h15M9 7V4.5h6V7m-9 0 1.1 12h9.8L18 7m-8 3.5v5m4-5v5" /></svg>
            </div>
            <p className="delete-dialog-kicker">CHAT MANAGEMENT</p>
            <h2 id="delete-dialog-title">Delete this chat?</h2>
            <p id="delete-dialog-description" className="delete-dialog-copy">
              <strong>{pendingDeleteChat.title}</strong> and its messages will be permanently removed.
            </p>
            <div className="delete-dialog-actions">
              <button type="button" className="delete-dialog-cancel" autoFocus onClick={() => setPendingDeleteChat(null)}>Keep chat</button>
              <button type="button" className="delete-dialog-confirm" onClick={confirmDeleteChat}>Delete chat</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

export default Playground;
