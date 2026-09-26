import React from 'react';
import type { OperationType, OperationStatus } from '../../lib/operationsService';
import styles from './OperationStateModal.module.css';

export type StateModalStep = 'initializing' | 'draft' | 'checking' | 'waiting' | 'ready' | 'mutating' | 'done' | 'error';

export interface OperationStateModalProps {
  isOpen: boolean;
  type: OperationType;
  reference: string;
  locationName: string;
  lines: Array<{
    productName: string;
    sku: string;
    quantity: number;
  }>;
  currentStep: StateModalStep;
  statusBadge: OperationStatus;
  waitingReason?: string;
  errorMessage?: string;
  onClose: () => void;
  onConfirmDone?: () => void;
}

export default function OperationStateModal({
  isOpen,
  type,
  reference,
  locationName,
  lines,
  currentStep,
  statusBadge: _statusBadge,
  waitingReason,
  errorMessage,
  onClose,
  onConfirmDone,
}: OperationStateModalProps) {
  if (!isOpen) return null;

  const isReceipt = type === 'receipt';
  const isDelivery = type === 'delivery';
  const isInternal = type === 'internal';

  const operationName = isReceipt
    ? 'Receipt'
    : isDelivery
    ? 'Delivery Order'
    : isInternal
    ? 'Internal Transfer'
    : 'Stock Adjustment';

  const typeLabel = isReceipt
    ? 'Receipt (Inbound)'
    : isDelivery
    ? 'Delivery Order (Outbound)'
    : isInternal
    ? 'Internal Transfer'
    : 'Stock Adjustment';

  const typeBadgeClass = isReceipt
    ? styles.badgeReceipt
    : isDelivery
    ? styles.badgeDelivery
    : styles.badgeInternal;

  // Determine progress percentage
  let progressPct = 25;
  if (currentStep === 'initializing' || currentStep === 'draft') {
    progressPct = 25;
  } else if (currentStep === 'checking' || currentStep === 'ready' || currentStep === 'waiting') {
    progressPct = 50;
  } else if (currentStep === 'mutating') {
    progressPct = 75;
  } else if (currentStep === 'done') {
    progressPct = 100;
  }

  const progressBarTheme = currentStep === 'waiting'
    ? styles.progressBarWaiting
    : isReceipt
    ? styles.progressBarOdooTeal
    : styles.progressBarOdooPlum;

  // Step 1: Draft Creation status
  const isStep1Done = currentStep !== 'initializing';
  const isStep1Active = currentStep === 'initializing' || currentStep === 'draft';

  // Step 2: Availability / Ready status
  const isStep2Active = currentStep === 'checking';
  const isStep2Waiting = currentStep === 'waiting';
  const isStep2Done = currentStep === 'ready' || currentStep === 'mutating' || currentStep === 'done';

  // Step 3: Stock Mutation status
  const isStep3Active = currentStep === 'mutating';
  const isStep3Done = currentStep === 'done';

  // Step 4: Done status
  const isStep4Done = currentStep === 'done';

  const modalTitle = currentStep === 'done'
    ? `${operationName} Completed`
    : currentStep === 'waiting'
    ? 'Stock Shortage — Order Waiting'
    : `Processing ${operationName} Lifecycle`;

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={styles.modal}>
        {/* Odoo Top progress track */}
        <div className={styles.progressBarTrack}>
          <div
            className={`${styles.progressBarFill} ${progressBarTheme}`}
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.badgeRow}>
              <span className={`${styles.typeBadge} ${typeBadgeClass}`}>{typeLabel}</span>
              <span className={styles.referenceCode}>{reference || 'Generating Ref...'}</span>
            </div>
            <h2 className={styles.title}>{modalTitle}</h2>
          </div>

          <div>
            {currentStep === 'waiting' ? (
              <span className={`${styles.statusIndicator} ${styles.statusWaiting}`}>
                ⚠️ Waiting
              </span>
            ) : currentStep === 'done' ? (
              <span className={`${styles.statusIndicator} ${styles.statusDone}`}>
                ✓ Done
              </span>
            ) : currentStep === 'mutating' ? (
              <span className={`${styles.statusIndicator} ${styles.statusMutating}`}>
                ⚡ Updating Stock
              </span>
            ) : currentStep === 'ready' ? (
              <span className={`${styles.statusIndicator} ${styles.statusReady}`}>
                ✓ Ready
              </span>
            ) : (
              <span className={`${styles.statusIndicator} ${styles.statusDraft}`}>
                Draft
              </span>
            )}
          </div>
        </div>

        {/* Stepper Pipeline */}
        <div className={styles.stepperContainer}>
          {/* Step 1: Draft Order */}
          <div className={styles.stepRow}>
            <div
              className={`${styles.stepIconWrapper} ${
                isStep1Done ? styles.iconDone : isStep1Active ? styles.iconActive : styles.iconPending
              }`}
            >
              {isStep1Done ? '✓' : '1'}
            </div>
            <div className={styles.stepContent}>
              <h4 className={styles.stepTitle}>
                <span>1. Draft Order Record</span>
                {isStep1Done && (
                  <span style={{ fontSize: '0.75rem', color: '#008784', fontWeight: 600 }}>
                    Saved (Status: draft)
                  </span>
                )}
              </h4>
              <p className={styles.stepSubtitle}>
                Backend allocated reference <strong>{reference || '...'}</strong> and saved {lines.length} product line(s).
              </p>
            </div>
            <div className={`${styles.stepConnector} ${isStep1Done ? styles.connectorDone : ''}`} />
          </div>

          {/* Step 2: Availability & Reservation */}
          <div className={styles.stepRow}>
            <div
              className={`${styles.stepIconWrapper} ${
                isStep2Waiting
                  ? styles.iconWaiting
                  : isStep2Done
                  ? styles.iconDone
                  : isStep2Active
                  ? styles.iconActive
                  : styles.iconPending
              }`}
            >
              {isStep2Waiting ? '!' : isStep2Done ? '✓' : '2'}
            </div>
            <div className={styles.stepContent}>
              <h4 className={styles.stepTitle}>
                <span>2. Stock Availability & Reservation</span>
                {isStep2Waiting ? (
                  <span style={{ fontSize: '0.75rem', color: '#D97706', fontWeight: 600 }}>
                    Status: waiting
                  </span>
                ) : isStep2Done ? (
                  <span style={{ fontSize: '0.75rem', color: '#008784', fontWeight: 600 }}>
                    Status: ready
                  </span>
                ) : isStep2Active ? (
                  <span style={{ fontSize: '0.75rem', color: '#714B67', fontWeight: 600 }}>
                    Checking stock...
                  </span>
                ) : null}
              </h4>
              <p className={styles.stepSubtitle}>
                {isStep2Waiting
                  ? waitingReason || 'One or more items exceed warehouse stock on hand. Placed on waiting list.'
                  : isReceipt
                  ? `Destination storage verified at ${locationName || 'WH/Stock1'}.`
                  : `Source stock reserved at ${locationName || 'WH/Stock1'}.`}
              </p>
            </div>
            <div
              className={`${styles.stepConnector} ${
                isStep2Done ? styles.connectorDone : ''
              }`}
            />
          </div>

          {/* Step 3: Stock Mutation & Ledger Audit */}
          <div className={styles.stepRow}>
            <div
              className={`${styles.stepIconWrapper} ${
                isStep3Done ? styles.iconDone : isStep3Active ? styles.iconActive : styles.iconPending
              }`}
            >
              {isStep3Done ? '✓' : isStep3Active ? '⚡' : '3'}
            </div>
            <div className={styles.stepContent}>
              <h4 className={styles.stepTitle}>
                <span>3. Atomic Stock Mutation & Audit Ledger</span>
                {isStep3Done && (
                  <span style={{ fontSize: '0.75rem', color: '#008784', fontWeight: 600 }}>
                    Transaction Committed
                  </span>
                )}
                {isStep3Active && (
                  <span style={{ fontSize: '0.75rem', color: '#714B67', fontWeight: 600 }}>
                    Executing SQL...
                  </span>
                )}
              </h4>
              <p className={styles.stepSubtitle}>
                {isReceipt
                  ? `Incrementing stock_levels and writing stock_moves ledger ("in").`
                  : isDelivery
                  ? `Decrementing stock_levels and writing stock_moves ledger ("out").`
                  : isInternal
                  ? `Transferring stock_levels between locations and logging ledger.`
                  : `Updating stock_levels and writing stock_moves ledger.`}
              </p>
            </div>
            <div className={`${styles.stepConnector} ${isStep3Done ? styles.connectorDone : ''}`} />
          </div>

          {/* Step 4: Completion */}
          <div className={styles.stepRow}>
            <div
              className={`${styles.stepIconWrapper} ${
                isStep4Done ? styles.iconDone : styles.iconPending
              }`}
            >
              {isStep4Done ? '✓' : '4'}
            </div>
            <div className={styles.stepContent}>
              <h4 className={styles.stepTitle}>
                <span>4. Operation Validated</span>
                {isStep4Done && (
                  <span style={{ fontSize: '0.75rem', color: '#008784', fontWeight: 600 }}>
                    Status: done
                  </span>
                )}
              </h4>
              <p className={styles.stepSubtitle}>
                Completion timestamp stamped. Quantities marked as done.
              </p>
            </div>
          </div>
        </div>

        {/* Stock Impact Summary Box */}
        {lines.length > 0 && (
          <div className={styles.impactBox}>
            <div className={styles.impactHeader}>
              <span>Inventory Impact ({locationName || 'WH/Stock1'})</span>
              <span>
                {isReceipt
                  ? 'Stock Addition'
                  : isDelivery
                  ? 'Stock Deduction'
                  : isInternal
                  ? 'Stock Transfer'
                  : 'Count Adjustment'}
              </span>
            </div>
            <div className={styles.impactItemsList}>
              {lines.map((line, idx) => (
                <div key={idx} className={styles.impactItem}>
                  <div className={styles.impactItemLeft}>
                    <span className={styles.skuPill}>{line.sku || 'SKU'}</span>
                    <span className={styles.productName}>{line.productName}</span>
                  </div>
                  <div>
                    {isReceipt ? (
                      <span className={styles.deltaBadgePositive}>
                        +{line.quantity} units
                      </span>
                    ) : isDelivery ? (
                      <span className={styles.deltaBadgeNegative}>
                        -{line.quantity} units
                      </span>
                    ) : (
                      <span className={styles.deltaBadgeTransfer}>
                        ⇄ {line.quantity} units
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Shortage Alert */}
        {currentStep === 'waiting' && waitingReason && (
          <div className={styles.alertBox}>
            <span style={{ fontSize: '1.25rem' }}>⚠️</span>
            <div>
              <strong>Stock Insufficient: </strong>
              {waitingReason}
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className={styles.alertBox} style={{ background: '#FEF2F2', borderColor: '#FECACA', color: '#991B1B' }}>
            <span style={{ fontSize: '1.25rem' }}>✕</span>
            <div>
              <strong>Backend Error: </strong>
              {errorMessage}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className={styles.footer}>
          {currentStep === 'done' ? (
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={onConfirmDone || onClose}
            >
              ✓ View Completed {operationName}
            </button>
          ) : currentStep === 'waiting' ? (
            <button
              type="button"
              className={styles.primaryBtn}
              style={{ background: '#D97706' }}
              onClick={onClose}
            >
              Keep in Waiting State
            </button>
          ) : currentStep === 'error' ? (
            <button
              type="button"
              className={styles.closeBtn}
              onClick={onClose}
            >
              Dismiss
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.8125rem', color: '#64748B' }}>
              <span className={styles.spinner} />
              <span>Applying Odoo backend state transitions...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
