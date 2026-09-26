import { useState, useEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../stores/authStore';
import {
  operationsService,
  type Operation,
  type OperationType,
} from '../../lib/operationsService';
import { productsService, type Product } from '../../lib/productsService';
import styles from './OperationsPage.module.css';

export default function OperationsPage() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const user = useAuthStore((s) => s.user);

  // Determine operation type based on path
  const segment = location.pathname.split('/').pop() || 'receipts';
  const opType: OperationType =
    segment === 'deliveries'
      ? 'delivery'
      : segment === 'transfers'
      ? 'internal'
      : segment === 'adjustments'
      ? 'adjustment'
      : 'receipt';

  const opTitle =
    opType === 'receipt'
      ? 'Receipts'
      : opType === 'delivery'
      ? 'Deliveries'
      : opType === 'internal'
      ? 'Internal Transfers'
      : 'Stock Adjustments';

  const singleTitle =
    opType === 'receipt'
      ? 'Receipt'
      : opType === 'delivery'
      ? 'Delivery Order'
      : opType === 'internal'
      ? 'Internal Transfer'
      : 'Stock Adjustment';

  // State
  const [operations, setOperations] = useState<Operation[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [activeOperation, setActiveOperation] = useState<Operation | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Form state for creating/editing operation
  const [formFields, setFormFields] = useState({
    receiveFrom: 'Azure Interior',
    scheduleDate: new Date().toISOString().substring(0, 10),
    responsible: user?.name || 'Syed Tashfeen',
    toLocation: 'WH/Stock1',
    fromLocation: 'vendor',
    lines: [{ productId: '', quantity: 1 }],
  });

  const startNewOperation = (availableProducts = products) => {
    const defaultProdId = availableProducts[0]?.id || '';
    const skuParam = searchParams.get('sku');
    const matched = skuParam
      ? availableProducts.find((p) => p.sku.toLowerCase() === skuParam.toLowerCase())
      : null;

    setFormFields({
      receiveFrom: 'Azure Interior',
      scheduleDate: new Date().toISOString().substring(0, 10),
      responsible: user?.name || 'Syed Tashfeen',
      toLocation: opType === 'receipt' ? 'WH/Stock1' : 'Customer Location',
      fromLocation: opType === 'receipt' ? 'vendor' : 'WH/Stock1',
      lines: [{ productId: matched ? matched.id : defaultProdId, quantity: 6 }],
    });
    setActiveOperation(null);
    setIsEditing(true);
  };

  const loadOperations = async () => {
    setIsLoading(true);
    try {
      const [ops, prodsRes] = await Promise.all([
        operationsService.getOperations({ type: opType, search }),
        productsService.getProducts(),
      ]);
      setOperations(ops);
      setProducts(prodsRes.items);

      // Check URL query for direct operation load or new form
      const idParam = searchParams.get('id');
      const actionParam = searchParams.get('action');

      if (idParam) {
        const found = ops.find((o) => o.id === idParam || o.reference === idParam);
        if (found) {
          setActiveOperation(found);
          setIsEditing(false);
        }
      } else if (actionParam === 'new') {
        startNewOperation(prodsRes.items);
      }
    } catch {
      toast.error('Failed to load operations');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOperations();
  }, [opType, search]);

  const handleSelectOperation = (op: Operation) => {
    setActiveOperation(op);
    setIsEditing(false);
    setSearchParams({ id: op.id });
  };

  const handleBackToList = () => {
    setActiveOperation(null);
    setIsEditing(false);
    setSearchParams({});
    loadOperations();
  };

  const handleSaveNewOperation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFields.lines || formFields.lines.length === 0 || !formFields.lines[0].productId) {
      toast.error('Please add at least one product line');
      return;
    }

    try {
      const created = await operationsService.createOperation({
        type: opType,
        fromLocation: formFields.fromLocation,
        toLocation: formFields.toLocation,
        contact: formFields.receiveFrom,
        responsible: formFields.responsible,
        scheduledDate: formFields.scheduleDate,
        lines: formFields.lines.map((l) => ({ productId: l.productId, quantity: Number(l.quantity) || 1 })),
      });
      toast.success(`Created ${created.reference}`);
      setActiveOperation(created);
      setIsEditing(false);
      setSearchParams({ id: created.id });
      loadOperations();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save operation');
    }
  };

  // Wireframe Workflow: Draft -> Ready (To DO button)
  const handleMarkAsReady = async () => {
    if (!activeOperation) return;
    try {
      const updated = await operationsService.markAsReady(activeOperation.id);
      setActiveOperation(updated);
      toast.success('Status updated to Ready');
      loadOperations();
    } catch {
      toast.error('Failed to update status');
    }
  };

  // Wireframe Workflow: Ready -> Done (Validate button)
  const handleValidate = async () => {
    if (!activeOperation) return;
    try {
      const updated = await operationsService.validateOperation(activeOperation.id);
      setActiveOperation(updated);
      toast.success(`Validated ${updated.reference}! Stock updated.`);
      loadOperations();
    } catch {
      toast.error('Failed to validate operation');
    }
  };

  // Wireframe: Print the receipt once it's DONE
  const handlePrint = () => {
    window.print();
  };

  // Wireframe: Cancel button
  const handleCancel = async () => {
    if (!activeOperation) return;
    if (!confirm('Are you sure you want to cancel this operation?')) return;
    try {
      const updated = await operationsService.cancelOperation(activeOperation.id);
      setActiveOperation(updated);
      toast.success('Operation cancelled');
      loadOperations();
    } catch {
      toast.error('Failed to cancel');
    }
  };

  // Add line to form
  const handleAddLine = () => {
    setFormFields({
      ...formFields,
      lines: [...formFields.lines, { productId: products[0]?.id || '', quantity: 1 }],
    });
  };

  // Remove line from form
  const handleRemoveLine = (idx: number) => {
    const next = [...formFields.lines];
    next.splice(idx, 1);
    setFormFields({ ...formFields, lines: next });
  };

  // ============================================================
  // RENDER: Detailed View (Wireframe 1) or New Form
  // ============================================================
  if (activeOperation || isEditing) {
    const isNew = isEditing;
    const op = activeOperation;
    const currentStatus = isNew ? 'draft' : op?.status || 'draft';

    return (
      <div className={styles.container}>
        <div className={styles.detailContainer}>
          {/* Top Bar matching Wireframe 1 */}
          <div className={styles.detailTopBar}>
            <div className={styles.actionBtns}>
              {/* Back to list */}
              <button
                type="button"
                className={styles.actionBtnSecondary}
                onClick={handleBackToList}
                title="Back to list"
              >
                ← Receipts
              </button>

              {/* [New] Button */}
              <button
                type="button"
                className={styles.actionBtnSecondary}
                onClick={() => startNewOperation()}
              >
                New
              </button>

              {/* Status Action Button: "To DO" in Draft, "Validate" in Ready */}
              {isNew ? (
                <button
                  type="button"
                  className={styles.actionBtnPrimary}
                  onClick={handleSaveNewOperation}
                >
                  Save as Draft
                </button>
              ) : currentStatus === 'draft' ? (
                <button
                  type="button"
                  className={styles.actionBtnPrimary}
                  onClick={handleMarkAsReady}
                >
                  To DO
                </button>
              ) : currentStatus === 'ready' ? (
                <button
                  type="button"
                  className={styles.actionBtnPrimary}
                  onClick={handleValidate}
                >
                  Validate
                </button>
              ) : null}

              {/* [Print] button */}
              <button
                type="button"
                className={styles.actionBtnSecondary}
                onClick={handlePrint}
              >
                Print
              </button>

              {/* [Cancel] button */}
              {!isNew && currentStatus !== 'cancelled' && currentStatus !== 'done' && (
                <button
                  type="button"
                  className={styles.actionBtnSecondary}
                  style={{ color: '#DC2626' }}
                  onClick={handleCancel}
                >
                  Cancel
                </button>
              )}
            </div>

            {/* Breadcrumb status widget: Draft > Ready > Done */}
            <div className={styles.statusBreadcrumb}>
              <div
                className={`${styles.stepItem} ${
                  currentStatus === 'draft' ? styles.stepItemActive : ''
                }`}
              >
                Draft
              </div>
              <span className={styles.stepSeparator}>&gt;</span>
              <div
                className={`${styles.stepItem} ${
                  currentStatus === 'ready' ? styles.stepItemActive : ''
                }`}
              >
                Ready
              </div>
              <span className={styles.stepSeparator}>&gt;</span>
              <div
                className={`${styles.stepItem} ${
                  currentStatus === 'done' ? styles.stepItemActive : ''
                }`}
              >
                Done
              </div>
            </div>
          </div>

          {/* Reference & Title */}
          <div>
            <span style={{ fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 600 }}>
              {singleTitle}
            </span>
            <h1 className={styles.referenceTitle}>
              {isNew ? 'New ' + singleTitle : op?.reference}
            </h1>
          </div>

          {/* Form Fields: Receive From, Schedule Date, Responsible */}
          {isNew ? (
            <form onSubmit={handleSaveNewOperation} className={styles.detailContainer} style={{ border: 'none', padding: 0 }}>
              <div className={styles.formGrid}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Receive From (Contact / Vendor)</label>
                  <input
                    type="text"
                    className={styles.fieldInput}
                    value={formFields.receiveFrom}
                    onChange={(e) => setFormFields({ ...formFields, receiveFrom: e.target.value })}
                    required
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Schedule Date</label>
                  <input
                    type="date"
                    className={styles.fieldInput}
                    value={formFields.scheduleDate}
                    onChange={(e) => setFormFields({ ...formFields, scheduleDate: e.target.value })}
                    required
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Responsible (Logged-in User)</label>
                  <input
                    type="text"
                    className={`${styles.fieldInput} ${styles.fieldInputReadOnly}`}
                    value={formFields.responsible}
                    readOnly
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Destination Location (Warehouse)</label>
                  <select
                    className={styles.fieldInput}
                    value={formFields.toLocation}
                    onChange={(e) => setFormFields({ ...formFields, toLocation: e.target.value })}
                  >
                    <option value="WH/Stock1">WH/Stock1 (Primary Warehouse)</option>
                    <option value="WH/Rack A">WH/Rack A</option>
                    <option value="WH/Production">WH/Production</option>
                  </select>
                </div>
              </div>

              {/* Products Table */}
              <div className={styles.productsSection}>
                <h3 className={styles.sectionHeading}>Products</h3>

                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th style={{ width: '65%' }}>Product</th>
                      <th style={{ width: '25%' }}>Quantity</th>
                      <th style={{ width: '10%' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {formFields.lines.map((line, idx) => (
                      <tr key={idx}>
                        <td>
                          <select
                            className={styles.fieldInput}
                            style={{ width: '100%' }}
                            value={line.productId}
                            onChange={(e) => {
                              const next = [...formFields.lines];
                              next[idx].productId = e.target.value;
                              setFormFields({ ...formFields, lines: next });
                            }}
                            required
                          >
                            <option value="">Select product...</option>
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                [{p.sku}] {p.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            type="number"
                            min="1"
                            className={styles.fieldInput}
                            style={{ width: '100%' }}
                            value={line.quantity}
                            onChange={(e) => {
                              const next = [...formFields.lines];
                              next[idx].quantity = Number(e.target.value) || 1;
                              setFormFields({ ...formFields, lines: next });
                            }}
                            required
                          />
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {formFields.lines.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveLine(idx)}
                              style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', fontSize: 16 }}
                            >
                              ✕
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <button
                  type="button"
                  className={styles.addLineBtn}
                  onClick={handleAddLine}
                >
                  + Add a line
                </button>
              </div>

              <div style={{ marginTop: 20 }}>
                <button type="submit" className={styles.actionBtnPrimary}>
                  Save & Confirm Receipt
                </button>
              </div>
            </form>
          ) : (
            <>
              {/* Read / Active Operation details */}
              <div className={styles.formGrid}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Receive From</label>
                  <div className={styles.fieldInput} style={{ background: '#F8FAFC' }}>
                    {op?.contact || '—'}
                  </div>
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Schedule Date</label>
                  <div className={styles.fieldInput} style={{ background: '#F8FAFC' }}>
                    {op?.scheduledDate || '—'}
                  </div>
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Responsible</label>
                  <div className={styles.fieldInput} style={{ background: '#F8FAFC' }}>
                    {op?.responsible || 'Syed Tashfeen'}
                  </div>
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Destination Location</label>
                  <div className={styles.fieldInput} style={{ background: '#F8FAFC' }}>
                    {op?.toLocation || 'WH/Stock1'}
                  </div>
                </div>
              </div>

              {/* Products Lines Table */}
              <div className={styles.productsSection}>
                <h3 className={styles.sectionHeading}>Products</h3>

                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th style={{ textAlign: 'right' }}>Planned Quantity</th>
                      <th style={{ textAlign: 'right' }}>Processed Quantity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {op?.lines.map((l) => (
                      <tr key={l.id}>
                        <td>
                          <strong>[{l.sku}]</strong> {l.productName}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{l.quantity}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: op.status === 'done' ? '#047857' : '#64748B' }}>
                          {op.status === 'done' ? l.quantity : l.quantityDone ?? 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDER: List View & Kanban View (Wireframe 2)
  // ============================================================
  return (
    <div className={styles.container}>
      {/* Top Header matching Wireframe 2 */}
      <header className={styles.header}>
        <div className={styles.leftHeader}>
          <button
            type="button"
            className={styles.newBtn}
            onClick={() => startNewOperation()}
          >
            NEW
          </button>
          <h1 className={styles.title}>{opTitle}</h1>
        </div>

        {/* Right Controls: Search bar + View Switcher */}
        <div className={styles.rightControls}>
          <div className={styles.searchBox}>
            <span className={styles.searchIcon}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </span>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search by reference & contacts..."
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
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            </button>
            <button
              type="button"
              className={`${styles.viewBtn} ${viewMode === 'kanban' ? styles.viewBtnActive : ''}`}
              onClick={() => setViewMode('kanban')}
              title="Kanban View"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="18" rx="1"/><rect x="14" y="3" width="7" height="10" rx="1"/></svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748B' }}>
          Loading operations...
        </div>
      ) : operations.length === 0 ? (
        <div className={styles.card}>
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748B' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📥</div>
            <h3>No {opTitle.toLowerCase()} found</h3>
            <p>Click "NEW" to create your first {singleTitle.toLowerCase()}.</p>
            <button
              type="button"
              className={styles.newBtn}
              style={{ marginTop: 12 }}
              onClick={() => startNewOperation()}
            >
              NEW {singleTitle.toUpperCase()}
            </button>
          </div>
        </div>
      ) : viewMode === 'list' ? (
        /* List View (Wireframe 2 table) */
        <div className={styles.card}>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Contact</th>
                  <th>Schedule date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {operations.map((o) => {
                  const statusClass =
                    o.status === 'ready'
                      ? styles.statusReady
                      : o.status === 'done'
                      ? styles.statusDone
                      : o.status === 'cancelled'
                      ? styles.statusCancelled
                      : styles.statusDraft;

                  return (
                    <tr
                      key={o.id}
                      className={styles.tableRow}
                      onClick={() => handleSelectOperation(o)}
                    >
                      <td className={styles.refCode}>{o.reference}</td>
                      <td>{o.fromLocation || 'vendor'}</td>
                      <td>{o.toLocation || 'WH/Stock1'}</td>
                      <td style={{ fontWeight: 600 }}>{o.contact || '—'}</td>
                      <td style={{ color: 'var(--color-text-muted)' }}>{o.scheduledDate}</td>
                      <td>
                        <span className={`${styles.statusBadge} ${statusClass}`}>
                          {o.status}
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
        /* Kanban View (Grouped by Draft, Ready, Done) */
        <div className={styles.kanbanBoard}>
          {(['draft', 'ready', 'done'] as const).map((colStatus) => {
            const items = operations.filter((o) => o.status === colStatus);
            return (
              <div key={colStatus} className={styles.kanbanCol}>
                <div className={styles.kanbanColHeader}>
                  <span>{colStatus.toUpperCase()}</span>
                  <span>({items.length})</span>
                </div>

                {items.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px 0', fontSize: 12, color: '#94A3B8' }}>
                    No {colStatus} operations
                  </div>
                ) : (
                  items.map((o) => (
                    <div
                      key={o.id}
                      className={styles.kanbanItem}
                      onClick={() => handleSelectOperation(o)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className={styles.refCode}>{o.reference}</span>
                        <span style={{ fontSize: 11, color: '#64748B' }}>{o.scheduledDate}</span>
                      </div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{o.contact}</div>
                      <div style={{ fontSize: 12, color: '#64748B' }}>
                        {o.fromLocation} → {o.toLocation}
                      </div>
                      <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>
                        {o.lines.length} product {o.lines.length === 1 ? 'line' : 'lines'}
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
