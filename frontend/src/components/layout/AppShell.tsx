import { Outlet } from 'react-router-dom';
import TopBar from './TopBar';
import styles from './AppShell.module.css';

export default function AppShell() {
  return (
    <div className={styles.shell}>
      <TopBar />
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
