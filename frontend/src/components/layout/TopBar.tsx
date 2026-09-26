import { useState, useRef, useEffect } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import styles from './TopBar.module.css';

const OPERATIONS_SUBITEMS = [
  { label: 'Receipts', path: '/operations/receipts' },
  { label: 'Deliveries', path: '/operations/deliveries' },
  { label: 'Internal Transfers', path: '/operations/transfers' },
  { label: 'Stock Adjustments', path: '/operations/adjustments' },
];

export default function TopBar() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const location = useLocation();

  const [opsOpen, setOpsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const opsRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  const isOpsActive = location.pathname.startsWith('/operations');

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (opsRef.current && !opsRef.current.contains(e.target as Node)) {
        setOpsOpen(false);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const displayName = user?.name || 'John Doe';
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className={styles.topbar}>
      {/* Logo */}
      <Link to="/dashboard" className={styles.logo}>
        <div className={styles.logoIcon}>S</div>
        <span className={styles.logoText}>StockSense</span>
      </Link>

      {/* Navigation */}
      <nav className={styles.nav}>
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `${styles.navLink} ${isActive ? styles.active : ''}`
          }
        >
          <span>Dashboard</span>
        </NavLink>

        {/* Operations dropdown */}
        <div className={styles.dropdownContainer} ref={opsRef}>
          <button
            className={`${styles.navLink} ${isOpsActive ? styles.active : ''}`}
            onClick={() => setOpsOpen(!opsOpen)}
            type="button"
          >
            <span>Operations</span>
            <span className={`${styles.dropdownChevron} ${opsOpen ? styles.open : ''}`}>
              ▾
            </span>
          </button>

          {opsOpen && (
            <div className={styles.dropdownMenu}>
              {OPERATIONS_SUBITEMS.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `${styles.dropdownItem} ${isActive ? styles.active : ''}`
                  }
                  onClick={() => setOpsOpen(false)}
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          )}
        </div>

        <NavLink
          to="/products"
          className={({ isActive }) =>
            `${styles.navLink} ${isActive ? styles.active : ''}`
          }
        >
          <span>Products</span>
        </NavLink>

        <NavLink
          to="/move-history"
          className={({ isActive }) =>
            `${styles.navLink} ${isActive ? styles.active : ''}`
          }
        >
          <span>Move History</span>
        </NavLink>

        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `${styles.navLink} ${isActive ? styles.active : ''}`
          }
        >
          <span>Settings</span>
        </NavLink>
      </nav>

      {/* Right Section */}
      <div className={styles.rightSection}>
        {/* Search */}
        <div className={styles.searchContainer}>
          <span className={styles.searchIcon}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          </span>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search..."
          />
        </div>

        {/* Notifications */}
        <button className={styles.iconButton} type="button" title="Notifications">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
        </button>

        {/* User pill */}
        <div className={styles.dropdownContainer} ref={userRef}>
          <button
            className={styles.userPill}
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            type="button"
          >
            <div className={styles.userAvatar}>{initials}</div>
            <span className={styles.userName}>{displayName}</span>
          </button>

          {userMenuOpen && (
            <div className={styles.dropdownMenu} style={{ right: 0, left: 'auto' }}>
              <button
                className={styles.dropdownItem}
                onClick={() => {
                  setUserMenuOpen(false);
                }}
              >
                <span className={styles.dropdownItemIcon}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </span>
                My Profile
              </button>
              <button
                className={styles.dropdownItem}
                onClick={() => {
                  logout();
                  setUserMenuOpen(false);
                }}
              >
                <span className={styles.dropdownItemIcon}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                </span>
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
