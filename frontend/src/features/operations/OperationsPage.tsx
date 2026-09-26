import { useState, useEffect } from 'react';
import { useLocation, useSearchParams, NavLink } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../stores/authStore';
import {
  operationsService,
  type Operation,
  type OperationType,
  type OperationStatus,
} from '../../lib/operationsService';
import { productsService, type Product } from '../../lib/productsService';
import OperationStateModal, { type StateModalStep } from './OperationStateModal';
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

  // Visual Backend State Transition Modal state
  const [isStateModalOpen, setIsStateModalOpen] = useState(false);
  const [stateModalStep, setStateModalStep] = useState<StateModalStep>('initializing');
  const [stateModalReference, setStateModalReference] = useState('');
  const [stateModalLocation, setStateModalLocation] = useState('');
  const [stateModalLines, setStateModalLines] = useState<Array<{ productName: string; sku: string; quantity: number }>>([]);
  const [stateModalStatusBadge, setStateModalStatusBadge] = useState<OperationStatus>('draft');
  const [stateModalWaitingReason, setStateModalWaitingReason] = useState<string | undefined>();
  const [stateModalErrorMessage, setStateModalErrorMessage] = useState<string | undefined>();

  // Button loading states
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [actionLoadingText, setActionLoadingText] = useState<string>('');

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
      receiveFrom: opType === 'internal' ? 'Production Line' : 'Azure Interior',
      scheduleDate: new Date().toISOString().substring(0, 10),
      responsible: user?.name || 'Syed Tashfeen',
      toLocation: opType === 'receipt' ? 'WH/Stock1' : opType === 'internal' ? 'WH/Production' : 'Customer Location',
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
    const handleDataChanged = () => {
      loadOperations();
    };
    window.addEventListener('stocksense:data-changed', handleDataChanged);
    return () => window.removeEventListener('stocksense:data-changed', handleDataChanged);
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

  const handleModalConfirmDone = () => {
    setIsStateModalOpen(false);
    setIsValidating(false);
    setIsSavingDraft(false);
    setActionLoadingText('');
  };

  const handleSaveNewOperation = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formFields.lines || formFields.lines.length === 0 || !formFields.lines[0].productId) {
      toast.error('Please add at least one product line');
      return;
    }

    const previewLines = formFields.lines.map((l) => {
      const prod = products.find((p) => p.id === l.productId);
      return {
        productName: prod?.name || 'Product',
        sku: prod?.sku || 'SKU',
        quantity: Number(l.quantity) || 1,
      };
    });
    const targetLoc = opType === 'receipt' ? formFields.toLocation : formFields.fromLocation;

    setIsSavingDraft(true);
    setActionLoadingText('Creating Draft Order...');
    setStateModalReference('');
    setStateModalLocation(targetLoc || 'WH/Stock1');
    setStateModalLines(previewLines);
    setStateModalWaitingReason(undefined);
    setStateModalErrorMessage(undefined);
    setStateModalStatusBadge('draft');
    setStateModalStep('initializing');
    setIsStateModalOpen(true);

    try {
      await sleep(400); // Visual step cadence
      const created = await operationsService.createOperation({
        type: opType,
        fromLocation: formFields.fromLocation,
        toLocation: formFields.toLocation,
        contact: formFields.receiveFrom,
        responsible: formFields.responsible,
        scheduledDate: formFields.scheduleDate,
        lines: formFields.lines.map((l) => ({ productId: l.productId, quantity: Number(l.quantity) || 1 })),
      });
      setStateModalReference(created.reference);
      setStateModalStep('draft');
      setStateModalStatusBadge('draft');
      setActionLoadingText(`Draft ${created.reference} Saved!`);
      toast.success(`Created draft ${created.reference}`);
      setActiveOperation(created);
      setIsEditing(false);
      setSearchParams({ id: created.id });
      loadOperations();
      return created;
    } catch (err: any) {
      setStateModalStep('error');
      setStateModalErrorMessage(err.message || 'Failed to save operation');
      toast.error(err.message || 'Failed to save operation');
      return null;
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Direct 1-click Save and Validate with full visual state pipeline
  const handleSaveAndValidate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formFields.lines || formFields.lines.length === 0 || !formFields.lines[0].productId) {
      toast.error('Please add at least one product line');
      return;
    }

    const previewLines = formFields.lines.map((l) => {
      const prod = products.find((p) => p.id === l.productId);
      return {
        productName: prod?.name || 'Product',
        sku: prod?.sku || 'SKU',
        quantity: Number(l.quantity) || 1,
      };
    });
    const targetLoc = opType === 'receipt' ? formFields.toLocation : formFields.fromLocation;

    setIsValidating(true);
    setActionLoadingText('1. Creating Draft Order...');
    setStateModalReference('');
    setStateModalLocation(targetLoc || 'WH/Stock1');
    setStateModalLines(previewLines);
    setStateModalWaitingReason(undefined);
    setStateModalErrorMessage(undefined);
    setStateModalStatusBadge('draft');
    setStateModalStep('initializing');
    setIsStateModalOpen(true);

    try {
      // Step 1: Create operation in draft state
      await sleep(400); // Visual step cadence
      const created = await operationsService.createOperation({
        type: opType,
        fromLocation: formFields.fromLocation,
        toLocation: formFields.toLocation,
        contact: formFields.receiveFrom,
        responsible: formFields.responsible,
        scheduledDate: formFields.scheduleDate,
        lines: formFields.lines.map((l) => ({ productId: l.productId, quantity: Number(l.quantity) || 1 })),
      });
      setStateModalReference(created.reference);
      setStateModalStep('draft');
      setActionLoadingText('2. Checking Stock Availability...');

      // Step 2: Check stock availability & reserve
      await sleep(500); // Visual step cadence
      setStateModalStep('checking');

      let shortageInfo: string | null = null;
      if (opType === 'delivery' || opType === 'internal') {
        for (const line of created.lines) {
          const prod = products.find((p) => p.id === line.productId || p.sku === line.sku);
          const available = prod ? prod.totalStock : 0;
          if (available < line.quantity) {
            shortageInfo = `Insufficient stock for ${line.productName} (SKU: ${line.sku}). Available: ${available}, Required: ${line.quantity}.`;
            break;
          }
        }
      }

      if (shortageInfo) {
        const updated = await operationsService.markAsWaiting(created.id);
        setStateModalStep('waiting');
        setStateModalStatusBadge('waiting');
        setStateModalWaitingReason(shortageInfo);
        setActiveOperation(updated);
        setIsEditing(false);
        setSearchParams({ id: updated.id });
        toast.error(`Out of stock! ${created.reference} marked as Waiting.`);
        loadOperations();
        return;
      }

      // Mark as Ready
      const readyOp = await operationsService.markAsReady(created.id);
      setStateModalStep('ready');
      setStateModalStatusBadge('ready');
      setActionLoadingText('3. Mutating Stock Ledger...');

      // Step 3: Atomic Stock Mutation & Validation
      await sleep(550); // Visual step cadence
      setStateModalStep('mutating');
      const validated = await operationsService.validateOperation(readyOp.id);

      // Step 4: Finalize
      await sleep(450); // Visual step cadence
      setStateModalStep('done');
      setStateModalStatusBadge('done');
      setActionLoadingText('Validated & Stock Updated!');
      toast.success(`Created & Validated ${validated.reference}! Stock updated automatically.`);
      setActiveOperation(validated);
      setIsEditing(false);
      setSearchParams({ id: validated.id });
      loadOperations();
    } catch (err: any) {
      setStateModalStep('error');
      setStateModalErrorMessage(err.message || 'Failed to save & validate operation');
      toast.error(err.message || 'Failed to save & validate operation');
    } finally {
      setIsValidating(false);
    }
  };

  // Wireframe Workflow: Draft/Waiting -> Check Availability -> Ready or Waiting
  const handleCheckAvailabilityOrReady = async () => {
    if (!activeOperation) return;
    // Check if any product has insufficient stock for deliveries/transfers
    const outItem = activeOperation.lines.find((line) => {
      const p = products.find((prod) => prod.id === line.productId || prod.sku === line.sku);
      if (!p) return false;
      if (activeOperation.type === 'internal') {
        const loc = p.stockByLocation?.find(
          (s) => s.locationName === activeOperation.fromLocation || s.locationId === activeOperation.fromLocation
        );
        const available = loc !== undefined ? loc.quantity : p.totalStock;
        return available < line.quantity;
      }
      return p.totalStock < line.quantity;
    });

    try {
      if ((activeOperation.type === 'delivery' || activeOperation.type === 'internal') && outItem) {
        const updated = await operationsService.markAsWaiting(activeOperation.id);
        setActiveOperation(updated);
        toast.error(`Out of stock for ${outItem.productName}! Operation marked as Waiting.`);
      } else {
        const updated = await operationsService.markAsReady(activeOperation.id);
        setActiveOperation(updated);
        toast.success(
          activeOperation.type === 'receipt'
            ? 'Receipt marked as Ready for receiving!'
            : 'Stock reserved! Status updated to Ready.'
        );
      }
      loadOperations();
    } catch {
      toast.error('Failed to update status');
    }
  };

  // Validate operation (Stock decreases for delivery, increases for receipts, transfers for internal)
  const handleValidate = async () => {
    if (!activeOperation) return;

    const op = activeOperation;
    const previewLines = op.lines.map((l) => ({
      productName: l.productName,
      sku: l.sku,
      quantity: l.quantity,
    }));
    const targetLoc = op.type === 'receipt' ? op.toLocation : op.fromLocation;

    setIsValidating(true);
    setActionLoadingText('Checking Stock Availability...');
    setStateModalReference(op.reference);
    setStateModalLocation(targetLoc || 'WH/Stock1');
    setStateModalLines(previewLines);
    setStateModalWaitingReason(undefined);
    setStateModalErrorMessage(undefined);
    setStateModalStatusBadge(op.status);
    setStateModalStep('checking');
    setIsStateModalOpen(true);

    try {
      await sleep(400); // Visual observation
      // For deliveries/transfers, ensure stock is available before validating
      if (op.type === 'delivery' || op.type === 'internal') {
        let shortageInfo: string | null = null;
        for (const line of op.lines) {
          const p = products.find((prod) => prod.id === line.productId || prod.sku === line.sku);
          if (p) {
            let available = p.totalStock;
            if (op.type === 'internal') {
              const loc = p.stockByLocation?.find(
                (s) => s.locationName === op.fromLocation || s.locationId === op.fromLocation
              );
              available = loc !== undefined ? loc.quantity : p.totalStock;
            }
            if (available < line.quantity) {
              shortageInfo = `Insufficient stock for ${line.productName} (SKU: ${line.sku}). Available: ${available}, Required: ${line.quantity}.`;
              break;
            }
          }
        }

        if (shortageInfo) {
          const updated = await operationsService.markAsWaiting(op.id);
          setStateModalStep('waiting');
          setStateModalStatusBadge('waiting');
          setStateModalWaitingReason(shortageInfo);
          setActiveOperation(updated);
          toast.error(`Cannot validate: Insufficient stock! Marked as Waiting.`);
          loadOperations();
          return;
        }
      }

      // Mark as Ready if not ready
      if (op.status !== 'ready') {
        await operationsService.markAsReady(op.id);
        setStateModalStep('ready');
        setStateModalStatusBadge('ready');
      }

      // Step 3: Mutating
      setActionLoadingText('Mutating Stock Levels & Ledger...');
      await sleep(550);
      setStateModalStep('mutating');
      const updated = await operationsService.validateOperation(op.id);

      // Step 4: Done
      await sleep(450);
      setStateModalStep('done');
      setStateModalStatusBadge('done');
      setActionLoadingText('Validated & Stock Updated!');
      setActiveOperation(updated);
      toast.success(`Validated ${updated.reference}! Stock automatically updated.`);
      loadOperations();
    } catch (err: any) {
      setStateModalStep('error');
      setStateModalErrorMessage(err.message || 'Failed to validate operation');
      toast.error(err.message || 'Failed to validate operation');
    } finally {
      setIsValidating(false);
    }
  };

  // Wireframe: Print the receipt/delivery once confirmed
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
  // RENDER: Detailed View (Wireframe 5) or New Form
  // ============================================================
  if (activeOperation || isEditing) {
    const isNew = isEditing;
    const op = activeOperation;
    const currentStatus = isNew ? 'draft' : op?.status || 'draft';

    // Check if any product is out of stock in current view
    const checkIsOutOfStock = (productId: string, sku: string, qty: number) => {
      if (opType !== 'delivery' && opType !== 'internal') return false;
      const prod = products.find((p) => p.id === productId || p.sku === sku);
      if (!prod) return false;
      if (opType === 'internal') {
        const sourceLoc = isNew ? formFields.fromLocation : (op?.fromLocation || 'WH/Stock1');
        const loc = prod.stockByLocation?.find(
          (s) => s.locationName === sourceLoc || s.locationId === sourceLoc
        );
        const available = loc !== undefined ? loc.quantity : prod.totalStock;
        return available < qty;
      }
      return prod.totalStock < qty;
    };

    const hasOutOfStockItem = isNew
      ? formFields.lines.some((l) => checkIsOutOfStock(l.productId, '', Number(l.quantity) || 0))
      : op?.lines.some((l) => checkIsOutOfStock(l.productId, l.sku, l.quantity)) || false;

    return (
      <div className={styles.container}>
        <div className={styles.detailContainer}>
          {/* Top Bar matching Wireframe 5 */}
          <div className={styles.detailTopBar}>
            <div className={styles.actionBtns}>
              {/* Back to list */}
              <button
                type="button"
                className={styles.actionBtnSecondary}
                onClick={handleBackToList}
                title="Back to list"
              >
                ← {opTitle}
              </button>

              {/* [New] Button */}
              <button
                type="button"
                className={styles.actionBtnSecondary}
                onClick={() => startNewOperation()}
              >
                New
              </button>

              {/* Action Buttons for existing operations: Validate, Mark as Ready / Check Availability */}
              {!isNew && currentStatus !== 'done' && currentStatus !== 'cancelled' ? (
                <>
                  <button
                    type="button"
                    className={`${styles.actionBtnPrimary} ${isValidating ? styles.actionBtnLoading : ''}`}
                    style={{ background: '#15803D' }}
                    onClick={handleValidate}
                    disabled={isValidating}
                    title="Validate operation and automatically update stock"
                  >
                    {isValidating ? (
                      <>
                        <span className={styles.buttonSpinner} />
                        <span>{actionLoadingText || 'Validating...'}</span>
                      </>
                    ) : (
                      'Validate'
                    )}
                  </button>

                  {opType === 'receipt' && currentStatus === 'draft' ? (
                    <button
                      type="button"
                      className={styles.actionBtnSecondary}
                      onClick={handleCheckAvailabilityOrReady}
                      title="Move receipt from Draft to Ready"
                    >
                      Mark as Ready
                    </button>
                  ) : (opType === 'delivery' || opType === 'internal') ? (
                    <button
                      type="button"
                      className={styles.actionBtnSecondary}
                      onClick={handleCheckAvailabilityOrReady}
                      title="Check product stock availability"
                    >
                      {currentStatus === 'waiting' ? 'Re-check Availability' : 'Check Availability'}
                    </button>
                  ) : null}
                </>
              ) : null}

              {/* [Print] button */}
              {!isNew && (
                <button
                  type="button"
                  className={styles.actionBtnSecondary}
                  onClick={handlePrint}
                >
                  Print
                </button>
              )}

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

            {/* Breadcrumb status widget matching Wireframe 5: Draft > Waiting > Ready > Done */}
            <div className={styles.statusBreadcrumb}>
              <div
                className={`${styles.stepItem} ${
                  currentStatus === 'draft' ? styles.stepItemActive : ''
                }`}
                title="Draft: Initial state"
              >
                Draft
              </div>
              <span className={styles.stepSeparator}>&gt;</span>
              <div
                className={`${styles.stepItem} ${
                  currentStatus === 'waiting' ? styles.stepItemActive : ''
                }`}
                title="Waiting: Waiting for the out of stock product to be in"
              >
                Waiting
              </div>
              <span className={styles.stepSeparator}>&gt;</span>
              <div
                className={`${styles.stepItem} ${
                  currentStatus === 'ready' ? styles.stepItemActive : ''
                }`}
                title="Ready: Ready to deliver/receive"
              >
                Ready
              </div>
              <span className={styles.stepSeparator}>&gt;</span>
              <div
                className={`${styles.stepItem} ${
                  currentStatus === 'done' ? styles.stepItemActive : ''
                }`}
                title="Done: Received or delivered"
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

          {/* Form Fields matching Wireframe 5: Delivery Address / Receive From, Schedule Date, Responsible, Operation Type */}
          {isNew ? (
            <form onSubmit={handleSaveNewOperation} className={styles.detailContainer} style={{ border: 'none', padding: 0 }}>
              <div className={styles.formGrid}>
                {opType === 'internal' ? (
                  <>
                    <div className={styles.fieldGroup}>
                      <label className={styles.fieldLabel}>Source Location (From)</label>
                      <select
                        className={styles.fieldInput}
                        value={formFields.fromLocation}
                        onChange={(e) => setFormFields({ ...formFields, fromLocation: e.target.value })}
                        required
                      >
                        <option value="WH/Stock1">WH/Stock1 (Primary Storage)</option>
                        <option value="WH/Stock2">WH/Stock2 (Secondary Storage)</option>
                        <option value="WH/Rack A">WH/Rack A (Heavy Pallet Racks)</option>
                        <option value="WH/Production">WH/Production (Assembly Floor)</option>
                      </select>
                    </div>

                    <div className={styles.fieldGroup}>
                      <label className={styles.fieldLabel}>Destination Location (To)</label>
                      <select
                        className={styles.fieldInput}
                        value={formFields.toLocation}
                        onChange={(e) => setFormFields({ ...formFields, toLocation: e.target.value })}
                        required
                      >
                        <option value="WH/Production">WH/Production (Assembly Floor)</option>
                        <option value="WH/Stock2">WH/Stock2 (Secondary Storage)</option>
                        <option value="WH/Stock1">WH/Stock1 (Primary Storage)</option>
                        <option value="WH/Rack A">WH/Rack A (Heavy Pallet Racks)</option>
                      </select>
                    </div>

                    <div className={styles.fieldGroup}>
                      <label className={styles.fieldLabel}>Transfer Purpose / Department</label>
                      <input
                        type="text"
                        className={styles.fieldInput}
                        value={formFields.receiveFrom}
                        onChange={(e) => setFormFields({ ...formFields, receiveFrom: e.target.value })}
                        placeholder="e.g. Main Store → Production Floor"
                        required
                      />
                    </div>
                  </>
                ) : (
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>
                      {opType === 'delivery' ? 'Delivery Address' : 'Receive From (Contact)'}
                    </label>
                    <input
                      type="text"
                      className={styles.fieldInput}
                      value={formFields.receiveFrom}
                      onChange={(e) => setFormFields({ ...formFields, receiveFrom: e.target.value })}
                      placeholder={opType === 'delivery' ? 'e.g. Azure Interior, 45 Main St' : 'e.g. Azure Interior'}
                      required
                    />
                  </div>
                )}

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
                  <label className={styles.fieldLabel}>Responsible</label>
                  <input
                    type="text"
                    className={`${styles.fieldInput} ${styles.fieldInputReadOnly}`}
                    value={formFields.responsible}
                    readOnly
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Operation type</label>
                  <select
                    className={styles.fieldInput}
                    value={opType}
                    disabled
                  >
                    <option value="receipt">Receipt</option>
                    <option value="delivery">Delivery</option>
                    <option value="internal">Internal Transfer</option>
                    <option value="adjustment">Stock Adjustment</option>
                  </select>
                </div>
              </div>

              {/* Wireframe 5: Out of stock alert notification */}
              {hasOutOfStockItem && (
                <div className={styles.outOfStockAlertBanner} style={{ marginTop: 16 }}>
                  <span style={{ fontSize: 18 }}>⚠️</span>
                  <div>
                    <strong>Stock Alert: </strong>
                    One or more selected products are out of stock or exceed inventory on hand. Lines are marked in red and operation will enter Waiting state.
                  </div>
                </div>
              )}

              {/* Products Table matching Wireframe 5 */}
              <div className={styles.productsSection}>
                <h3 className={styles.sectionHeading}>Products</h3>

                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th style={{ width: '60%' }}>Product</th>
                      <th style={{ width: '30%' }}>Quantity</th>
                      <th style={{ width: '10%' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {formFields.lines.map((line, idx) => {
                      const isOut = checkIsOutOfStock(line.productId, '', Number(line.quantity) || 0);
                      const currentProd = products.find((p) => p.id === line.productId);

                      return (
                        <tr key={idx} className={isOut ? styles.rowOutOfStock : undefined}>
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
                                  [{p.sku}] {p.name} ({p.totalStock} in stock)
                                </option>
                              ))}
                            </select>
                            {isOut && (
                              <div style={{ marginTop: 4 }}>
                                <span className={styles.stockWarningTag}>
                                  ⚠️ Out of stock (Only {currentProd?.totalStock ?? 0} available)
                                </span>
                              </div>
                            )}
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
                      );
                    })}
                  </tbody>
                </table>

                {/* Wireframe 5: "+ Add New product" */}
                <button
                  type="button"
                  className={styles.addLineBtn}
                  onClick={handleAddLine}
                >
                  + Add New product
                </button>
              </div>

              <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
                <button
                  type="submit"
                  className={`${styles.actionBtnPrimary} ${isSavingDraft ? styles.actionBtnLoading : ''}`}
                  disabled={isSavingDraft || isValidating}
                >
                  {isSavingDraft ? (
                    <>
                      <span className={styles.buttonSpinner} />
                      <span>{actionLoadingText || 'Saving Draft...'}</span>
                    </>
                  ) : (
                    'Save as Draft'
                  )}
                </button>
                <button
                  type="button"
                  className={`${styles.actionBtnPrimary} ${isValidating ? styles.actionBtnLoading : ''}`}
                  style={{ background: '#15803D' }}
                  onClick={handleSaveAndValidate}
                  disabled={isSavingDraft || isValidating}
                >
                  {isValidating ? (
                    <>
                      <span className={styles.buttonSpinner} />
                      <span>{actionLoadingText || 'Saving & Validating...'}</span>
                    </>
                  ) : (
                    `Save & Validate ${singleTitle}`
                  )}
                </button>
              </div>
            </form>
          ) : (
            <>
              {/* Read / Active Operation details matching Wireframe 5 */}
              <div className={styles.formGrid}>
                {op?.type === 'internal' ? (
                  <>
                    <div className={styles.fieldGroup}>
                      <label className={styles.fieldLabel}>Source Location (From)</label>
                      <div className={styles.fieldInput} style={{ background: '#F8FAFC', fontWeight: 600 }}>
                        {op?.fromLocation || 'WH/Stock1'}
                      </div>
                    </div>
                    <div className={styles.fieldGroup}>
                      <label className={styles.fieldLabel}>Destination Location (To)</label>
                      <div className={styles.fieldInput} style={{ background: '#F8FAFC', fontWeight: 600 }}>
                        {op?.toLocation || 'WH/Production'}
                      </div>
                    </div>
                    <div className={styles.fieldGroup}>
                      <label className={styles.fieldLabel}>Purpose / Department</label>
                      <div className={styles.fieldInput} style={{ background: '#F8FAFC' }}>
                        {op?.contact || 'Internal Assembly'}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>
                      {op?.type === 'delivery' ? 'Delivery Address' : 'Receive From'}
                    </label>
                    <div className={styles.fieldInput} style={{ background: '#F8FAFC' }}>
                      {op?.contact || 'Azure Interior'}
                    </div>
                  </div>
                )}

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
                  <label className={styles.fieldLabel}>Operation type</label>
                  <div className={styles.fieldInput} style={{ background: '#F8FAFC', textTransform: 'capitalize' }}>
                    {op?.type === 'receipt' ? 'Receipt' : op?.type === 'delivery' ? 'Delivery' : op?.type === 'internal' ? 'Internal Transfer' : 'Stock Adjustment'}
                  </div>
                </div>
              </div>

              {/* Wireframe 5: Out of stock alert notification */}
              {hasOutOfStockItem && (
                <div className={styles.outOfStockAlertBanner} style={{ marginTop: 16 }}>
                  <span style={{ fontSize: 18 }}>⚠️</span>
                  <div>
                    <strong>Stock Alert: </strong>
                    One or more products on this {singleTitle.toLowerCase()} are currently out of stock. Lines are highlighted in red below and status is in <strong>Waiting</strong> state.
                  </div>
                </div>
              )}

              {/* Products Lines Table matching Wireframe 5 */}
              <div className={styles.productsSection}>
                <h3 className={styles.sectionHeading}>Products</h3>

                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th style={{ textAlign: 'right' }}>Quantity</th>
                      <th style={{ textAlign: 'right' }}>Availability</th>
                    </tr>
                  </thead>
                  <tbody>
                    {op?.lines.map((l) => {
                      const isOut = checkIsOutOfStock(l.productId, l.sku, l.quantity);
                      const prod = products.find((p) => p.id === l.productId || p.sku === l.sku);
                      const available = prod ? prod.totalStock : 0;

                      return (
                        <tr key={l.id} className={isOut ? styles.rowOutOfStock : undefined}>
                          <td>
                            <strong>[{l.sku}]</strong> {l.productName}
                            {isOut && (
                              <span className={styles.stockWarningTag}>
                                ⚠️ Out of Stock
                              </span>
                            )}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>{l.quantity}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600, color: isOut ? '#DC2626' : '#15803D' }}>
                            {op.type === 'receipt'
                              ? 'Incoming'
                              : isOut
                              ? `${available} in stock (Short: ${l.quantity - available})`
                              : `${available} in stock`}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <OperationStateModal
          isOpen={isStateModalOpen}
          type={opType}
          reference={stateModalReference}
          locationName={stateModalLocation}
          lines={stateModalLines}
          currentStep={stateModalStep}
          statusBadge={stateModalStatusBadge}
          waitingReason={stateModalWaitingReason}
          errorMessage={stateModalErrorMessage}
          onClose={() => {
            setIsStateModalOpen(false);
            setIsValidating(false);
            setIsSavingDraft(false);
            setActionLoadingText('');
          }}
          onConfirmDone={handleModalConfirmDone}
        />
      </div>
    );
  }

  // ============================================================
  // RENDER: List View & Kanban View (Wireframe 2)
  // ============================================================
  return (
    <div className={styles.container}>
      {/* Operation Type Switcher Tabs */}
      <div className={styles.typeTabs}>
        <NavLink
          to="/operations/receipts"
          className={({ isActive }) => `${styles.typeTab} ${isActive ? styles.typeTabActive : ''}`}
        >
          📥 Receipts
        </NavLink>
        <NavLink
          to="/operations/deliveries"
          className={({ isActive }) => `${styles.typeTab} ${isActive ? styles.typeTabActive : ''}`}
        >
          🚚 Deliveries
        </NavLink>
        <NavLink
          to="/operations/transfers"
          className={({ isActive }) => `${styles.typeTab} ${isActive ? styles.typeTabActive : ''}`}
        >
          🔄 Internal Transfers
        </NavLink>
        <NavLink
          to="/operations/adjustments"
          className={({ isActive }) => `${styles.typeTab} ${isActive ? styles.typeTabActive : ''}`}
        >
          ⚖️ Physical Inventory Adjustments
        </NavLink>
      </div>

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
                      : o.status === 'waiting'
                      ? styles.statusWaiting
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
        /* Kanban View (Grouped by Draft, Waiting, Ready, Done) */
        <div className={styles.kanbanBoard}>
          {(['draft', 'waiting', 'ready', 'done'] as const).map((colStatus) => {
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

      <OperationStateModal
        isOpen={isStateModalOpen}
        type={opType}
        reference={stateModalReference}
        locationName={stateModalLocation}
        lines={stateModalLines}
        currentStep={stateModalStep}
        statusBadge={stateModalStatusBadge}
        waitingReason={stateModalWaitingReason}
        errorMessage={stateModalErrorMessage}
        onClose={() => {
          setIsStateModalOpen(false);
          setIsValidating(false);
          setIsSavingDraft(false);
          setActionLoadingText('');
        }}
        onConfirmDone={handleModalConfirmDone}
      />
    </div>
  );
}
