import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { operationsService, type Operation } from '../../lib/operationsService';
import styles from './MoveHistoryPage.module.css';

interface MoveHistoryRow {
  rowId: string;
  operationId: string;
  reference: string;
  date: string;
  contact: string;
  from: string;
  to: string;
  quantity: number;
  productName: string;
  sku: string;
  status: string;
  isIncoming: boolean;
  operationType?: 'receipt' | 'delivery' | 'internal' | 'adjustment';
}

export default function MoveHistoryPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<MoveHistoryRow[]>([]);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadMoveHistory = () => {
      operationsService.getOperations().then((ops: Operation[]) => {
        const generatedRows: MoveHistoryRow[] = [];

        for (const op of ops) {
          const isIncoming = op.type === 'receipt';
          const dateFormatted = op.completedDate || op.scheduledDate;

          if (op.lines && op.lines.length > 0) {
            for (let i = 0; i < op.lines.length; i++) {
              const line = op.lines[i];
              generatedRows.push({
                rowId: `${op.id}_line_${i}`,
                operationId: op.id,
                reference: op.reference,
                date: dateFormatted,
                contact: op.contact || 'Azure Interior',
                from: op.fromLocation || (isIncoming ? 'vendor' : 'WH/Stock1'),
                to: op.toLocation || (isIncoming ? 'WH/Stock1' : 'vendor'),
                quantity: line.quantity,
                productName: line.productName,
                sku: line.sku,
                status: op.status === 'ready' ? 'Ready' : op.status === 'done' ? 'Done' : op.status === 'waiting' ? 'Waiting' : 'Draft',
                isIncoming,
                operationType: op.type,
              });
            }
          } else {
            generatedRows.push({
              rowId: `${op.id}_0`,
              operationId: op.id,
              reference: op.reference,
              date: dateFormatted,
              contact: op.contact || 'Azure Interior',
              from: op.fromLocation || (isIncoming ? 'vendor' : 'WH/Stock1'),
              to: op.toLocation || (isIncoming ? 'WH/Stock1' : 'vendor'),
              quantity: 1,
              productName: 'General Stock',
              sku: 'GEN',
              status: op.status === 'ready' ? 'Ready' : op.status === 'done' ? 'Done' : op.status === 'waiting' ? 'Waiting' : 'Draft',
              isIncoming,
              operationType: op.type,
            });
          }
        }

        setRows(generatedRows);
        setIsLoading(false);
      });
    };

    loadMoveHistory();
    window.addEventListener('stocksense:data-changed', loadMoveHistory);
    return () => window.removeEventListener('stocksense:data-changed', loadMoveHistory);
  }, []);

  // Filter based on reference & contacts
  const filteredRows = rows.filter((r) => {
    const q = search.toLowerCase().trim();
    return (
      r.reference.toLowerCase().includes(q) ||
      r.contact.toLowerCase().includes(q) ||
      r.productName.toLowerCase().includes(q) ||
      r.sku.toLowerCase().includes(q)
    );
  });

  const handleRowClick = (row: MoveHistoryRow) => {
    if (row.reference.includes('/IN/')) {
      navigate(`/operations/receipts?id=${row.operationId}`);
    } else {
      navigate(`/operations/deliveries?id=${row.operationId}`);
    }
  };

  return (
    <div className={styles.container}>
      {/* Top Header matching Wireframe 1 */}
      <header className={styles.header}>
        <div className={styles.leftHeader}>
          <button
            type="button"
            className={styles.newBtn}
            onClick={() => navigate('/operations/receipts?action=new')}
          >
            NEW
          </button>
          <h1 className={styles.title}>Move History</h1>
        </div>

        {/* Right Controls: Search bar + View Switcher */}
        <div className={styles.rightControls}>
          <div className={styles.searchBox}>
            <span className={styles.searchIcon}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </span>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search based on reference & contacts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className={styles.viewSwitcher}>
            <button
              type="button"
              className={`${styles.viewBtn} ${viewMode === 'list' ? styles.viewBtnActive : ''}`}
              onClick={() => setViewMode('list')}
              title="List View"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            </button>
            <button
              type="button"
              className={`${styles.viewBtn} ${viewMode === 'kanban' ? styles.viewBtnActive : ''}`}
              onClick={() => setViewMode('kanban')}
              title="Kanban View"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="18" rx="1" />
                <rect x="14" y="3" width="7" height="10" rx="1" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main Table / Kanban */}
      {isLoading ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: '#64748B' }}>
          Loading move history...
        </div>
      ) : filteredRows.length === 0 ? (
        <div className={styles.card}>
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748B' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
            <h3>No moves found</h3>
            <p>Moves will appear as receipts and deliveries are processed.</p>
          </div>
        </div>
      ) : viewMode === 'list' ? (
        /* List View matching Wireframe 1 */
        <div className={styles.card}>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Date</th>
                  <th>Contact</th>
                  <th>From</th>
                  <th>To</th>
                  <th style={{ textAlign: 'right' }}>Quantity</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((r) => {
                  const isInternal = r.operationType === 'internal';
                  const rowClass = isInternal ? '' : r.isIncoming ? styles.rowIn : styles.rowOut;
                  const refClass = isInternal ? '' : r.isIncoming ? styles.refCodeIn : styles.refCodeOut;

                  return (
                    <tr
                      key={r.rowId}
                      className={`${styles.tableRow} ${rowClass}`}
                      onClick={() => handleRowClick(r)}
                      title={`View ${r.reference} details`}
                    >
                      <td className={`${styles.refCode} ${refClass}`}>
                        {r.reference}
                        <span style={{ fontSize: 11, display: 'block', opacity: 0.8, fontWeight: 500 }}>
                          [{r.sku}] {r.productName}
                        </span>
                      </td>
                      <td style={{ color: 'var(--color-text-muted)' }}>{r.date}</td>
                      <td style={{ fontWeight: 600 }}>{r.contact}</td>
                      <td>{r.from}</td>
                      <td>{r.to}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, fontSize: 15 }}>
                        <span
                          style={{
                            color: isInternal ? '#4F46E5' : r.isIncoming ? '#059669' : '#DC2626',
                          }}
                        >
                          {isInternal ? `↔ ${r.quantity}` : r.isIncoming ? `+${r.quantity}` : `-${r.quantity}`}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`${styles.statusBadge} ${
                            r.status === 'Ready'
                              ? styles.statusReady
                              : r.status === 'Done'
                              ? styles.statusDone
                              : styles.statusDraft
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Kanban View Grouped by Status */
        <div className={styles.kanbanBoard}>
          {['Ready', 'Done', 'Draft'].map((statusKey) => {
            const items = filteredRows.filter((r) => r.status === statusKey);
            return (
              <div key={statusKey} className={styles.kanbanCol}>
                <div className={styles.kanbanColHeader}>
                  <span>{statusKey.toUpperCase()}</span>
                  <span>({items.length})</span>
                </div>

                {items.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px 0', fontSize: 12, color: '#94A3B8' }}>
                    No {statusKey} moves
                  </div>
                ) : (
                  items.map((r) => (
                    <div
                      key={r.rowId}
                      className={styles.kanbanItem}
                      onClick={() => handleRowClick(r)}
                      style={{
                        borderLeft: r.isIncoming ? '4px solid #10B981' : '4px solid #EF4444',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className={styles.refCode} style={{ color: r.isIncoming ? '#059669' : '#DC2626' }}>
                          {r.reference}
                        </span>
                        <span style={{ fontSize: 11, color: '#64748B' }}>{r.date}</span>
                      </div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{r.contact}</div>
                      <div style={{ fontSize: 12, color: '#64748B' }}>
                        {r.from} → {r.to}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                        <span style={{ fontSize: 11, color: '#64748B' }}>[{r.sku}]</span>
                        <strong style={{ color: r.isIncoming ? '#059669' : '#DC2626', fontSize: 13 }}>
                          {r.isIncoming ? `+${r.quantity}` : `-${r.quantity}`}
                        </strong>
                      </div>
                    </div>
                  ))
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
