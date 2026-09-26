import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import TopBar from './TopBar';
import { useDashboardStore } from '../../stores/dashboardStore';
import styles from './AppShell.module.css';

export default function AppShell() {
  useEffect(() => {
    // Prefetch dashboard metrics into Zustand cache in background
    useDashboardStore.getState().prefetch();
  }, []);

  return (
    <div className={styles.shell}>
      <TopBar />
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
