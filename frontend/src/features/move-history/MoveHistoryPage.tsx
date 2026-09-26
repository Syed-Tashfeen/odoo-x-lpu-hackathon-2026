import styles from './MoveHistoryPage.module.css';

export default function MoveHistoryPage() {
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.icon}>📋</div>
        <h1 className={styles.title}>Move History</h1>
        <h2 className={styles.subtitle}>Coming Soon</h2>
        <p className={styles.description}>This feature is under development.</p>
      </div>
    </div>
  );
}
