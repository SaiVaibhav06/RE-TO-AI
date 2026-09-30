import React, { useState } from 'react';

const logo = '/assets/reto-brand-mark.png';

function Button({ children, href = '#install', kind = 'outline' }) {
  return <a className={`button button-${kind}`} href={href}>{children}</a>;
}

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState('');
  const [yearly, setYearly] = useState(false);

  async function copyCommand(command) {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(command);
      window.setTimeout(() => setCopied(''), 1400);
    } catch {
      setCopied('');
    }
  }

  const closeMenu = () => setMenuOpen(false);

  return <>
    <header className="topbar">
      <a className="brand" href="#home" aria-label="Re-To home"><img src={logo} alt=""/><span>Re-To</span></a>
      <nav className={`nav ${menuOpen ? 'open' : ''}`} aria-label="Main navigation">
        <a href="#home" onClick={closeMenu}>Home</a><a href="#why-us" onClick={closeMenu}>Why Us</a><a href="#models" onClick={closeMenu}>Models</a><a href="#pricing" onClick={closeMenu}>Pricing</a>
      </nav>
      <div className="nav-actions"><Button href="#login">Login</Button><Button kind="pink">Get Started <span>↗</span></Button></div>
      <button className="menu-toggle" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? '×' : '☰'}</button>
    </header>

    <main id="home">
      <section className="hero">
        <div className="stars" aria-hidden="true"/><img className="hero-landscape" src="/assets/reto-landscape.png" alt="" aria-hidden="true"/>
        <div className="hero-copy"><div className="eyebrow"><i/> OPEN-SOURCE AI CODING CLI</div><h1>Make software<br/><span>move forward.</span></h1><p>Autonomous coding, from your terminal.<br/>Built for engineers who work in flow.</p><div className="hero-buttons"><Button kind="pink">Get started <span>↗</span></Button><Button href="#why-us">Explore Re-To <span>↓</span></Button></div><div className="hero-meta"><span><b className="green-dot"/> Open source</span><span>⌘ macOS · Linux · Windows</span></div></div>
        <div className="terminal-wrap"><div className="terminal"><div className="terminal-bar"><div className="lights"><i/><i/><i/></div><span>re-to — ~/projects/website</span><span className="terminal-menu">•••</span></div><div className="terminal-body"><div className="terminal-welcome"><img src={logo} alt=""/><div><strong>Re-To</strong><small>Open-source AI coding CLI</small></div></div><p className="muted">Let’s build something great.</p><div className="term-line"><span className="prompt">❯</span> <span>reto</span><span className="cursor"/></div><div className="term-output"><span className="green">✓</span> Project indexed <span className="dim">· 248 files</span><br/><span className="green">✓</span> Ready for your task</div><div className="term-line task"><span className="prompt">›</span> Add a responsive pricing page<span className="cursor"/></div><div className="agent"><span className="spinner">◌</span> Planning implementation <span className="dots">···</span></div><div className="term-bottom"><span>Smart Auto <span className="green">●</span></span><span>main · ●●●</span></div></div></div><div className="terminal-caption"><span><i/> YOUR TERMINAL. YOUR WORKFLOW.</span><span>01 — 04</span></div></div>
        <div className="hero-foot"><span>SCROLL TO EXPLORE</span><span className="scroll-line"/><span>BUILT FOR THE NEXT LOOP</span></div>
      </section>

      <section className="ticker"><div>OPEN SOURCE <b>✳</b> MODEL CHOICE <b>✳</b> AUTONOMOUS AGENTS <b>✳</b> DEVELOPER CONTROL <b>✳</b> BUILT FOR YOUR TERMINAL <b>✳</b> OPEN SOURCE <b>✳</b> MODEL CHOICE <b>✳</b></div></section>

      <section className="why section" id="why-us"><div className="section-label"><span>01 / THE IDEA</span><span>WHY RE-TO</span></div><div className="why-grid"><div><p className="kicker">A BETTER WAY TO BUILD</p><h2>Stay in flow.<br/><span>Ship with confidence.</span></h2></div><div><p className="lead">Your coding agent should adapt to the way you work. Re-To brings capable models, autonomous workflows, and clear developer control together in one open-source CLI.</p><a className="text-link" href="#models">See how it works <span>↗</span></a></div></div><div className="feature-grid"><article className="feature"><span className="feature-index">01</span><div className="feature-icon pink-icon">⌘</div><h3>Your terminal, your rules.</h3><p>Work where your code lives. Keep your tools, your editor, and your workflow in your hands.</p><span className="feature-arrow">↗</span></article><article className="feature"><span className="feature-index">02</span><div className="feature-icon">◇</div><h3>Models without lock-in.</h3><p>Choose the right model for the task. Switch when you need to, with Smart Auto ready to help.</p><span className="feature-arrow">↗</span></article><article className="feature"><span className="feature-index">03</span><div className="feature-icon">⟳</div><h3>Built to verify.</h3><p>Plan, make changes, run commands, and review results in a loop you can see and steer.</p><span className="feature-arrow">↗</span></article></div></section>

      <section className="release section"><div className="section-label"><span>02 / WHAT'S NEW</span><span>THE PROJECT KEEPS MOVING</span></div><div className="release-box"><div className="release-head"><span className="release-tag"><i/> RE-TO // RELEASE NOTES</span><span>V. 2.4 — 2026</span></div><div className="release-content"><div><p className="kicker">A MORE CAPABLE CODING LOOP</p><h2>Built for the<br/><span>long run.</span></h2></div><div><p>More room for ambitious work. The latest runtime brings expanded model access, parallel requests, and a smoother way to carry projects from first prompt to verified change.</p><Button>See what's new <span>↗</span></Button></div></div><div className="release-bottom"><span>INDEPENDENT. OPEN SOURCE. ALWAYS EVOLVING.</span><span>RT / 0024</span></div></div></section>

      <section className="models section" id="models"><div className="section-label"><span>03 / THE RUNTIME</span><span>MODELS & AGENTS</span></div><div className="models-intro"><div><p className="kicker">ONE CLI. MANY WAYS TO THINK.</p><h2>Right model.<br/><span>Right moment.</span></h2></div><p>Bring your workflow to the model that fits. Use Smart Auto for everyday tasks, or choose a model when you want more control.</p></div><div className="model-panel"><div className="model-panel-top"><span>re-to / models</span><span className="live"><i/> AVAILABLE RUNTIMES</span></div><div className="model-row"><span className="model-num">01</span><span className="model-name">Smart Auto</span><span className="model-desc">Let the router choose for the task</span><span className="model-badge">RECOMMENDED</span><span className="model-arrow">↗</span></div><div className="model-row"><span className="model-num">02</span><span className="model-name">Choose your model</span><span className="model-desc">Match capability to the work</span><span className="model-badge">YOUR CALL</span><span className="model-arrow">↗</span></div><div className="model-row"><span className="model-num">03</span><span className="model-name">Bring your own key</span><span className="model-desc">Connect the providers you trust</span><span className="model-badge">FLEXIBLE</span><span className="model-arrow">↗</span></div></div></section>

      <section className="pricing section" id="pricing"><div className="section-label"><span>04 / PLANS</span><span>START SMALL. THINK BIG.</span></div><div className="pricing-header"><div><p className="kicker">A PLAN FOR YOUR PACE</p><h2>Pick your<br/><span>next horizon.</span></h2></div><p>Start with a focused workflow, then find the plan that gives your projects room to grow.</p><div className="billing"><button className={!yearly ? 'active' : ''} onClick={() => setYearly(false)}>Monthly</button><button className={yearly ? 'active' : ''} onClick={() => setYearly(true)}>Yearly <span>Save 20%</span></button></div></div><div className="pricing-grid"><article className="plan"><div className="plan-top"><span>01 / OBSERVER</span><span className="plan-symbol">◉</span></div><h3>Observer</h3><p>Get a feel for the workflow.</p><div className="price">${yearly ? '19' : '2'}<span> / {yearly ? 'year' : '7 days'}</span></div><ul><li>Explore the coding loop</li><li>Focused usage allowance</li><li>Core model access</li></ul><Button>Get started <span>↗</span></Button></article><article className="plan plan-featured"><div className="plan-top"><span>02 / OPERATOR</span><span className="plan-symbol">◈</span></div><h3>Operator</h3><p>For everyday engineering work.</p><div className="price">${yearly ? '192' : '20'}<span> / {yearly ? 'year' : 'month'}</span></div><ul><li>More room for real projects</li><li>Expanded usage allowance</li><li>3 parallel requests</li></ul><Button kind="pink">Choose Operator <span>↗</span></Button><div className="popular">MOST POPULAR</div></article><article className="plan"><div className="plan-top"><span>03 / OBSESSED</span><span className="plan-symbol">✳</span></div><h3>Obsessed</h3><p>For ambitious, ongoing builds.</p><div className="price">${yearly ? '384' : '40'}<span> / {yearly ? 'year' : 'month'}</span></div><ul><li>Highest-capacity runtime</li><li>Higher usage allowance</li><li>6 parallel requests</li></ul><Button>Go all in <span>↗</span></Button></article></div><p className="fine-print">Models subject to availability. Usage is capped per billing period. Taxes may apply.</p></section>

      <section className="install section" id="install"><div className="section-label"><span>05 / GET MOVING</span><span>INSTALL IN SECONDS</span></div><div className="install-box"><div><p className="kicker">YOUR NEXT TASK STARTS HERE</p><h2>Ideas in.<br/><span>Working code out.</span></h2><p>Install Re-To, then bring autonomous coding to your terminal.</p><div className="install-commands"><div><span>01 / INSTALL</span><code><b>$</b> npm install -g re-to</code><button className="copy" onClick={() => copyCommand('npm install -g re-to')} aria-label="Copy install command">{copied === 'npm install -g re-to' ? '✓' : '▢'}</button></div><div><span>02 / LAUNCH</span><code><b>$</b> reto</code><button className="copy" onClick={() => copyCommand('reto')} aria-label="Copy launch command">{copied === 'reto' ? '✓' : '▢'}</button></div></div><div className="install-links"><Button kind="pink">Get started <span>↗</span></Button><a className="text-link" href="#">Read the docs <span>↗</span></a></div></div><div className="install-mark"><img src={logo} alt="Re-To mark"/><span>BUILD<br/>WHAT'S<br/>NEXT<span className="pink">.</span></span><small>OPEN SOURCE · BUILT FOR DEVELOPERS</small></div></div></section>
    </main>

    <footer className="footer"><div className="footer-main"><div className="footer-brand"><a className="brand" href="#home"><img src={logo} alt=""/><span>Re-To</span></a><p>Open-source AI coding<br/>from your terminal.</p><div className="socials"><a href="#">GH</a><a href="#">X</a></div></div><div className="footer-col"><b>PRODUCT</b><a href="#home">Home</a><a href="#models">Models</a><a href="#pricing">Pricing</a><a href="#install">Download / Install</a></div><div className="footer-col"><b>DEVELOPERS</b><a href="#">Documentation</a><a href="#">Getting Started</a><a href="#">CLI Commands</a><a href="#">Supported Models</a></div><div className="footer-col"><b>COMPANY / SUPPORT</b><a href="#">About</a><a href="#">Contact</a><a href="#">Support</a><a href="#">Security</a></div></div><div className="footer-bottom"><span>© 2026 RE-TO</span><span>MADE FOR THE WORK AHEAD <b>✳</b></span><div><a href="#">Privacy</a><a href="#">Terms</a></div></div></footer>
  </>;
}

export default App;
