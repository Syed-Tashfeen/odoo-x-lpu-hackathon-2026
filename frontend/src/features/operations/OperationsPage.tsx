import { useLocation } from 'react-router-dom';
import styles from './OperationsPage.module.css';

export default function OperationsPage() {
  const location = useLocation();
  const segment = location.pathname.split('/').pop();

  const getPageInfo = () => {
    switch (segment) {
      case 'receipts':
        return { title: 'Receipts', icon: '📥' };
      case 'deliveries':
        return { title: 'Deliveries', icon: '📤' };
      case 'transfers':
        return { title: 'Internal Transfers', icon: '🔄' };
      case 'adjustments':
        return { title: 'Stock Adjustments', icon: '⚖️' };
      default:
        return { title: 'Operations', icon: '⚙️' };
    }
  };

  const { title, icon } = getPageInfo();

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.icon}>{icon}</div>
        <h1 className={styles.title}>{title}</h1>
        <h2 className={styles.subtitle}>Coming Soon</h2>
        <p className={styles.description}>This feature is under development.</p>
      </div>
    </div>
  );
}
