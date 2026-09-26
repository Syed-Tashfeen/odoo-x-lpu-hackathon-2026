import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import styles from './LandingPage.module.css';

export default function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'features' | 'architecture' | 'stack'>('features');

  return (
    <div className={styles.container}>
      {/* Navigation Header */}
      <header className={styles.navbar}>
        <div className={styles.navContainer}>
          <Link to="/" className={styles.logo}>
            <div style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: '#714B67', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16 }}>S</div>
            <span className={styles.logoText}>StockSense</span>
          </Link>

          <nav className={styles.navLinks}>
            <a href="#features" className={styles.navLink}>Features</a>
            <a href="#tech" className={styles.navLink}>Tech Stack</a>
          </nav>

          <div className={styles.authButtons}>
            {isAuthenticated ? (
              <div className={styles.userProfile}>
                <span className={styles.userName}>Hi, {user?.name || 'User'}</span>
                <Link to="/dashboard" className={styles.primaryButton}>
                  Go to Dashboard
                </Link>
                <button
                  id="logout-btn"
                  onClick={logout}
                  className={styles.secondaryButton}
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <>
                <Link to="/login" id="nav-login-btn" className={styles.secondaryButton}>
                  Sign In
                </Link>
                <Link to="/register" id="nav-register-btn" className={styles.primaryButton}>
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className={styles.mainContent}>
        <section className={styles.heroSection}>
          <div className={styles.badgeWrapper}>
            <span className={styles.heroBadge}>
              <span className={styles.badgePulse}></span>
              Enterprise Inventory Management
            </span>
          </div>

          <h1 className={styles.heroTitle}>
            Modern Inventory Control <span className={styles.gradientText}>Built for Scale</span>
          </h1>

          <p className={styles.heroDescription}>
            StockSense streamlines your supply chain: double-entry stock tracking, automated reordering, internal warehouse transfers, and real-time ledger auditing.
          </p>

          <div className={styles.ctaGroup}>
            <button
              id="hero-get-started-btn"
              onClick={() => navigate(isAuthenticated ? '/dashboard' : '/login')}
              className={styles.heroPrimaryCta}
            >
              <span>{isAuthenticated ? 'Open Dashboard' : 'Launch App'}</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
            <a
              id="hero-docs-btn"
              href="#features"
              className={styles.heroSecondaryCta}
            >
              Explore Features
            </a>
          </div>

          {/* Quick Metrics */}
          <div className={styles.metricsGrid}>
            <div className={styles.metricCard}>
              <span className={styles.metricVal}>&lt; 50ms</span>
              <span className={styles.metricLabel}>Vite Fast Refresh</span>
            </div>
            <div className={styles.metricCard}>
              <span className={styles.metricVal}>100%</span>
              <span className={styles.metricLabel}>TypeScript Typed</span>
            </div>
            <div className={styles.metricCard}>
              <span className={styles.metricVal}>Zero</span>
              <span className={styles.metricLabel}>Boilerplate Bloat</span>
            </div>
          </div>
        </section>

        {/* Interactive Feature Preview Section */}
        <section id="features" className={styles.previewSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Everything You Need to Win</h2>
            <p className={styles.sectionSubtitle}>
              Clean foundations so you can focus on building what matters during the hackathon.
            </p>
          </div>

          {/* Tab Selector */}
          <div className={styles.tabNav}>
            <button
              className={`${styles.tabBtn} ${activeTab === 'features' ? styles.activeTabBtn : ''}`}
              onClick={() => setActiveTab('features')}
            >
              ✨ Core Features
            </button>
            <button
              className={`${styles.tabBtn} ${activeTab === 'architecture' ? styles.activeTabBtn : ''}`}
              onClick={() => setActiveTab('architecture')}
            >
              🏗️ Clean Architecture
            </button>
            <button
              id="tech"
              className={`${styles.tabBtn} ${activeTab === 'stack' ? styles.activeTabBtn : ''}`}
              onClick={() => setActiveTab('stack')}
            >
              ⚡ Tech Stack
            </button>
          </div>

          {/* Tab Contents */}
          <div className={styles.tabContent}>
            {activeTab === 'features' && (
              <div className={styles.cardsGrid}>
                <div className={styles.featureCard}>
                  <div className={styles.featureIcon}>🔐</div>
                  <h3>Auth & State Store</h3>
                  <p>Pre-configured Zustand store with local storage persistence and mock authentication workflows.</p>
                </div>
                <div className={styles.featureCard}>
                  <div className={styles.featureIcon}>🎨</div>
                  <h3>Design System</h3>
                  <p>Custom CSS variables, fluid responsive layouts, buttons, cards, modal dialogs, and inputs.</p>
                </div>
                <div className={styles.featureCard}>
                  <div className={styles.featureIcon}>🛡️</div>
                  <h3>Type Safe & Guarded</h3>
                  <p>React Router 7 with route guards, Suspense lazy-loading, and comprehensive TypeScript interfaces.</p>
                </div>
                <div className={styles.featureCard}>
                  <div className={styles.featureIcon}>📡</div>
                  <h3>API & Query Ready</h3>
                  <p>Axios interceptor setup and TanStack React Query pre-configured for asynchronous data fetching.</p>
                </div>
              </div>
            )}

            {activeTab === 'architecture' && (
              <div className={styles.architectureBox}>
                <div className={styles.codeHeader}>
                  <span className={styles.codeDot}></span>
                  <span className={styles.codeDot}></span>
                  <span className={styles.codeDot}></span>
                  <span className={styles.codeTitle}>Project Structure</span>
                </div>
                <pre className={styles.codeSnippet}>
{`src/
├── components/     # Reusable UI primitives (Button, Card, Input, Modal...)
├── features/       # Modular feature pages (landing, auth)
├── lib/            # Axios API client & TanStack Query client
├── router/         # Declarative routes, lazy-loading & guards
├── stores/         # Zustand global state (authStore)
├── styles/         # Design system tokens & utility classes
└── types/          # Central TypeScript type definitions`}
                </pre>
              </div>
            )}

            {activeTab === 'stack' && (
              <div className={styles.stackGrid}>
                <div className={styles.stackItem}>
                  <span className={styles.stackItemTitle}>React 19 + TypeScript</span>
                  <span className={styles.stackItemDesc}>Modern UI rendering and strict type safety</span>
                </div>
                <div className={styles.stackItem}>
                  <span className={styles.stackItemTitle}>Vite 8</span>
                  <span className={styles.stackItemDesc}>Ultra-fast development and build bundling</span>
                </div>
                <div className={styles.stackItem}>
                  <span className={styles.stackItemTitle}>Zustand 5</span>
                  <span className={styles.stackItemDesc}>Lightweight, predictable client-side state</span>
                </div>
                <div className={styles.stackItem}>
                  <span className={styles.stackItemTitle}>TanStack Query v5</span>
                  <span className={styles.stackItemDesc}>Server-state caching, deduping, and sync</span>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* CTA Callout */}
        <section className={styles.ctaBanner}>
          <div className={styles.ctaContent}>
            <h2>Ready to Start Building?</h2>
            <p>Jump straight into the login flow or customize the components to fit your project.</p>
            <div className={styles.ctaButtons}>
              <Link to="/login" className={styles.primaryButton}>
                Go to Login Page →
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContainer}>
          <div className={styles.footerBrand}>
            <div style={{ width: 22, height: 22, borderRadius: 4, backgroundColor: '#714B67', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, marginRight: 8 }}>S</div>
            <span>StockSense • Modern Inventory Management System</span>
          </div>
          <p className={styles.footerCopy}>© {new Date().getFullYear()} StockSense. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

