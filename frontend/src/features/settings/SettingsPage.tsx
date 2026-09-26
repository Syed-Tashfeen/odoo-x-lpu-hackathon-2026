import styles from './SettingsPage.module.css';

export default function SettingsPage() {
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.icon}>🛠️</div>
        <h1 className={styles.title}>Settings</h1>
        <h2 className={styles.subtitle}>Coming Soon</h2>
        <p className={styles.description}>This feature is under development.</p>
      </div>
    </div>
  );
}
