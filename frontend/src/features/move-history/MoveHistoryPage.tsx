import { useState, useEffect } from 'react';
import { operationsService, type Operation } from '../../lib/operationsService';
import styles from './MoveHistoryPage.module.css';

interface StockMoveRecord {
  id: string;
  date: string;
  reference: string;
  product: string;
  from: string;
  to: string;
  quantity: number;
  type: string;
}

export default function MoveHistoryPage() {
  const [moves, setMoves] = useState<StockMoveRecord[]>([]);

  useEffect(() => {
    operationsService.getOperations().then((ops: Operation[]) => {
      const records: StockMoveRecord[] = [];
      for (const op of ops) {
        for (const line of op.lines) {
          records.push({
            id: `${op.id}_${line.id}`,
            date: op.completedDate || op.scheduledDate,
            reference: op.reference,
            product: `[${line.sku}] ${line.productName}`,
            from: op.fromLocation || 'vendor',
            to: op.toLocation || 'WH/Stock1',
            quantity: line.quantity,
            type: op.type === 'receipt' ? 'IN' : op.type === 'delivery' ? 'OUT' : 'TRANSFER',
          });
        }
      }
      setMoves(records);
    });
  }, []);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Stock Move History (Ledger)</h1>
          <p className={styles.subtitle}>
            Immutable audit log of all stock movements, incoming receipts, and dispatch transactions
          </p>
        </div>
      </header>

      <div className={styles.card}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Reference</th>
                <th>Product</th>
                <th>From Location</th>
                <th>To Location</th>
                <th style={{ textAlign: 'right' }}>Quantity</th>
                <th>Movement</th>
              </tr>
            </thead>
            <tbody>
              {moves.map((m) => (
                <tr key={m.id}>
                  <td style={{ color: 'var(--color-text-muted)' }}>{m.date}</td>
                  <td className={styles.refCode}>{m.reference}</td>
                  <td style={{ fontWeight: 600 }}>{m.product}</td>
                  <td>{m.from}</td>
                  <td>{m.to}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{m.quantity}</td>
                  <td>
                    <span className={m.type === 'IN' ? styles.badgeIn : styles.badgeOut}>
                      {m.type}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
