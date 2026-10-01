import React, { useState } from 'react';
import logo from '../assets/logos/logo_updated.png';
import pricingDiagram from '../assets/images/pricing-model-plan-diagram.png';
import landscape from '../assets/images/lucentracode-landscape.png';

const models = ['Nvidia', 'Qwen', 'Open AI', 'Kimi', 'Minimax'];

function ReToLanding() {
  const [menuOpen, setMenuOpen] = useState(false);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <div className="site-shell" id="home">
      <header className="topbar">
        <a className="brand" href="#home" aria-label="Re-To home">
          <img src={logo} alt="" />
          <span>Re-To</span>
        </a>
        <nav className={`nav ${menuOpen ? 'open' : ''}`} aria-label="Main navigation">
          <a href="#home" onClick={closeMenu}>Home</a>
          <a href="#why-us" onClick={closeMenu}>Why Us</a>
          <a href="#models" onClick={closeMenu}>Models</a>
          <a href="#pricing" onClick={closeMenu}>Pricing</a>
        </nav>
        <div className="nav-actions">
          <a className="button button-outline" href="/re-to-ai">Pair CLI <span aria-hidden="true">↗</span></a>
          <a className="button button-pink login-button" href="/login">Login/Signup <span aria-hidden="true">↗</span></a>
        </div>
        <button className="menu-toggle" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? '×' : '☰'}
        </button>
      </header>

      <main>
        <section className="hero">
          <p className="hero-brand">Re-To</p>
          <p className="hero-subheading">Code Without Burning</p>
          <div className="hero-art"><img src={landscape} alt="A landscape illustration showing multiple AI models connected through Re-To." /></div>
          <div className="hero-copy">
            <p className="eyebrow"><span /> AI MODELS, WITHOUT THE MARKUP</p>
            <h1>Same power.<br /><span>Less cost.</span></h1>
            <p className="hero-description">Your favorite AI models, all in one place. Re-To makes powerful coding models more affordable, with Smart Auto choosing the right one for every prompt.</p>
          </div>
        </section>

        <div className="ticker" aria-label="Same models, less cost, smart auto routing">
          <div className="ticker-track">
            {[0, 1].map((copy) => (
              <div className="ticker-group" aria-hidden={copy === 1} key={copy}>
                <span>SAME MODELS</span><b>✳</b><span>LESS COST</span><b>✳</b><span>SMART AUTO</span><b>✳</b><span>ONE CLEAR CHOICE</span><b>✳</b><span>BUILT FOR YOUR TERMINAL · MODEL CHOICE · AUTONUMOUS AGENTS · LESS COST · SAME POWER</span><b>✳</b>
              </div>
            ))}
          </div>
        </div>

        <section className="why section" id="why-us">
          <div className="section-heading">
            <p className="eyebrow"><span /> 01 / WHY RE-TO</p>
            <h2>More models.<br /><span>One clear choice.</span></h2>
            <p>Stop juggling subscriptions and guessing which model to use. Re-To brings leading coding models together in one simple, lower-cost plan.</p>
          </div>
          <figure className="pricing-diagram">
            <img src={pricingDiagram} alt="NVIDIA, Codex, Z.AI, Kimi, and Minimax connect through one command to a $20 per month Re-To plan." />
          </figure>
          <div className="why-points">
            <article><span>01</span><h3>Same models</h3><p>Use the leading AI models you already know, together in one place.</p></article>
            <article><span>02</span><h3>One lower price</h3><p>One straightforward subscription instead of paying for each model separately.</p></article>
            <article><span>03</span><h3>Smart Auto</h3><p>Share your prompt. Re-To picks a strong-fit model for the task automatically.</p></article>
          </div>
        </section>

        <section className="models section" id="models">
          <div className="section-heading models-heading">
            <p className="eyebrow"><span /> 02 / YOUR MODEL LINEUP</p>
            <h2>One prompt.<br /><span>Best-fit model.</span></h2>
            <p>Let Smart Auto route each prompt to the model that fits, or pick your preferred model whenever you want direct control.</p>
          </div>
          <div className="model-list">
            <div className="model-list-head"><span>MODEL</span><span>HOW YOU USE IT</span><span>ACCESS</span></div>
            <div className="model-entry smart-entry"><strong><span className="auto-star">✳</span> Smart Auto</strong><span>Chooses a model based on your prompt</span><b>RECOMMENDED</b></div>
            {models.map((model) => <div className="model-entry" key={model}><strong>{model}</strong><span>Choose it directly for your task</span><b>INCLUDED</b></div>)}
          </div>
        </section>

        <section className="pricing section" id="pricing">
          <div className="pricing-copy">
            <p className="eyebrow"><span /> 03 / SIMPLE PRICING</p>
            <h2>All in one.<br /><span>₹659 / month.</span></h2>
            <p>One plan brings your favorite models together, with Smart Auto built in. Fewer subscriptions to manage, more room to get work done.</p>
            <small>Cancel anytime. No separate model subscriptions required.</small>
          </div>
          <div className="plan-card">
            <div className="plan-brand"><img src={logo} alt="" /><span>Re-To</span><b>ALL IN ONE PLAN</b></div>
            <p className="plan-price"><strong>₹659</strong><span>/ mo</span></p>
            <ul>{models.map((model) => <li key={model}><span>✓</span>{model}</li>)}<li><span>✓</span>Smart Auto routing</li></ul>
          </div>
        </section>
      </main>

      <footer className="footer">
        <a className="brand" href="#home"><img src={logo} alt="" /><span>Re-To</span></a>
        <p>Same power. Less cost.</p>
        <div><a href="#why-us">Why Us</a><a href="#models">Models</a><a href="#pricing">Pricing</a></div>
        <small>© 2026 RE-TO</small>
      </footer>
    </div>
  );
}

export default ReToLanding;
