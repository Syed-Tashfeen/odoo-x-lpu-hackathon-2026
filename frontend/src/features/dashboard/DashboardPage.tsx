import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { dashboardService, type DashboardData } from '../../lib/dashboardService';
import type { Operation } from '../../lib/operationsService';
import styles from './DashboardPage.module.css';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  useEffect(() => {
    let mounted = true;
    dashboardService.getDashboardData().then((res) => {
      if (mounted) {
        setData(res);
        setIsLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const handleRowClick = (op: Operation) => {
    if (op.type === 'receipt') {
      navigate(`/operations/receipts?id=${op.id}`);
    } else if (op.type === 'delivery') {
      navigate(`/operations/deliveries?id=${op.id}`);
    } else {
      navigate(`/operations/receipts?id=${op.id}`);
    }
  };

  const handleReorderClick = (sku: string, name: string) => {
    navigate(`/operations/receipts?action=new&sku=${encodeURIComponent(sku)}&name=${encodeURIComponent(name)}`);
  };

  if (isLoading || !data) {
    return (
      <div className={styles.page}>
        <div style={{ padding: '60px 0', textAlign: 'center', color: '#64748B' }}>
          Loading dashboard metrics...
        </div>
      </div>
    );
  }

  const filteredOps =
    selectedType === 'all'
      ? data.recentOperations
      : data.recentOperations.filter((o) => o.type === selectedType);

  const hasAlerts = data.kpis.lowStockCount > 0 || data.kpis.outOfStockCount > 0;

  return (
    <div className={styles.page}>
      {/* Top Header */}
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Inventory Overview</h1>
          <p className={styles.subtitle}>Real-time stock levels, operations, and warehouse tracking • {currentDate}</p>
        </div>

        <div className={styles.headerActions}>
          <select className={styles.warehouseSelect} defaultValue="wh_main" aria-label="Select Warehouse">
            <option value="wh_main">Main Warehouse (WH)</option>
            <option value="wh_north">North Distribution Center</option>
          </select>

          <Link to="/operations/receipts?action=new" className={styles.primaryBtn}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Receipt
          </Link>

          <Link to="/products?action=new" className={styles.secondaryBtn}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
            Add Product
          </Link>
        </div>
      </header>

      {/* Alert Banner if any stock issues */}
      {hasAlerts && (
        <div className={styles.alertBanner} role="alert">
          <div className={styles.alertLeft}>
            <span className={styles.alertIcon}>⚠️</span>
            <span className={styles.alertText}>
              Attention: <strong>{data.kpis.lowStockCount} items</strong> are below reorder threshold
              {data.kpis.outOfStockCount > 0 && ` and ${data.kpis.outOfStockCount} items are out of stock`}.
            </span>
          </div>
          <button
            className={styles.alertLink}
            onClick={() => navigate('/products?low_stock=true')}
          >
            Review Replenishment Queue →
          </button>
        </div>
      )}

      {/* 8 Primary KPI Cards */}
      <div className={styles.kpiGrid}>
        {/* Card 1: To Receive */}
        <Link to="/operations/receipts" className={styles.kpiCard}>
          <div className={`${styles.kpiIconWrapper} ${styles.receive}`}>📥</div>
          <div className={styles.kpiContent}>
            <div className={styles.kpiValue}>{data.kpis.pendingReceipts}</div>
            <div className={styles.kpiLabel}>To Receive</div>
            <div className={styles.kpiSublabel}>Pending vendor receipts</div>
          </div>
        </Link>

        {/* Card 2: To Deliver */}
        <Link to="/operations/deliveries" className={styles.kpiCard}>
          <div className={`${styles.kpiIconWrapper} ${styles.deliver}`}>🚚</div>
          <div className={styles.kpiContent}>
            <div className={styles.kpiValue}>{data.kpis.pendingDeliveries}</div>
            <div className={styles.kpiLabel}>To Deliver</div>
            <div className={styles.kpiSublabel}>Pending shipments</div>
          </div>
        </Link>

        {/* Card 3: Internal Transfers */}
        <Link to="/operations/transfers" className={styles.kpiCard}>
          <div className={`${styles.kpiIconWrapper} ${styles.transfer}`}>🔄</div>
          <div className={styles.kpiContent}>
            <div className={styles.kpiValue}>{data.kpis.scheduledTransfers}</div>
            <div className={styles.kpiLabel}>Transfers</div>
            <div className={styles.kpiSublabel}>Internal re-allocations</div>
          </div>
        </Link>

        {/* Card 4: Total Products */}
        <Link to="/products" className={styles.kpiCard}>
          <div className={`${styles.kpiIconWrapper} ${styles.total}`}>📦</div>
          <div className={styles.kpiContent}>
            <div className={styles.kpiValue}>{data.kpis.totalProducts}</div>
            <div className={styles.kpiLabel}>Products</div>
            <div className={styles.kpiSublabel}>{data.kpis.totalStockQuantity} total units on hand</div>
          </div>
        </Link>

        {/* Card 5: Low Stock */}
        <Link to="/products?low_stock=true" className={styles.kpiCard}>
          <div className={`${styles.kpiIconWrapper} ${styles.lowStock}`}>📉</div>
          <div className={styles.kpiContent}>
            <div className={styles.kpiValue}>{data.kpis.lowStockCount}</div>
            <div className={styles.kpiLabel}>Low Stock</div>
            <div className={styles.kpiSublabel}>At or below threshold</div>
          </div>
        </Link>

        {/* Card 6: Out of Stock */}
        <Link to="/products?low_stock=true" className={styles.kpiCard}>
          <div className={`${styles.kpiIconWrapper} ${styles.outOfStock}`}>🚫</div>
          <div className={styles.kpiContent}>
            <div className={styles.kpiValue}>{data.kpis.outOfStockCount}</div>
            <div className={styles.kpiLabel}>Out of Stock</div>
            <div className={styles.kpiSublabel}>Zero inventory units</div>
          </div>
        </Link>

        {/* Card 7: Completed Operations */}
        <div className={styles.kpiCard} style={{ cursor: 'default' }}>
          <div className={`${styles.kpiIconWrapper} ${styles.completed}`}>✅</div>
          <div className={styles.kpiContent}>
            <div className={styles.kpiValue}>{data.kpis.completedOperations}</div>
            <div className={styles.kpiLabel}>Validated</div>
            <div className={styles.kpiSublabel}>Completed operations</div>
          </div>
        </div>

        {/* Card 8: Warehouses */}
        <div className={styles.kpiCard} style={{ cursor: 'default' }}>
          <div className={`${styles.kpiIconWrapper} ${styles.warehouse}`}>🏢</div>
          <div className={styles.kpiContent}>
            <div className={styles.kpiValue}>{data.kpis.totalLocations}</div>
            <div className={styles.kpiLabel}>Locations</div>
            <div className={styles.kpiSublabel}>Across {data.kpis.totalWarehouses} active warehouse</div>
          </div>
        </div>
      </div>

      {/* Main 2-Column Section */}
      <div className={styles.mainGrid}>
        {/* Left Column: Recent Operations with filters */}
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Recent Operations</h2>
            <div className={styles.tabsBar}>
              {(['all', 'receipt', 'delivery', 'internal'] as const).map((t) => (
                <button
                  key={t}
                  className={`${styles.tabBtn} ${selectedType === t ? styles.tabBtnActive : ''}`}
                  onClick={() => setSelectedType(t)}
                >
                  {t === 'all' ? 'All' : t === 'receipt' ? 'Receipts' : t === 'delivery' ? 'Deliveries' : 'Transfers'}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.tableWrapper}>
            {filteredOps.length === 0 ? (
              <div className={styles.emptyState}>No operations found for this filter.</div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Type</th>
                    <th>Contact / Partner</th>
                    <th>To Location</th>
                    <th>Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOps.map((op) => {
                    const statusClass =
                      op.status === 'ready'
                        ? styles.statusReady
                        : op.status === 'done'
                        ? styles.statusDone
                        : op.status === 'cancelled'
                        ? styles.statusCancelled
                        : styles.statusDraft;

                    const typeClass =
                      op.type === 'receipt'
                        ? styles.receiptBadge
                        : op.type === 'delivery'
                        ? styles.deliveryBadge
                        : styles.transferBadge;

                    return (
                      <tr
                        key={op.id}
                        className={styles.tableRow}
                        onClick={() => handleRowClick(op)}
                        title="Click to view details"
                      >
                        <td className={styles.refCode}>{op.reference}</td>
                        <td>
                          <span className={`${styles.typeBadge} ${typeClass}`}>
                            {op.type}
                          </span>
                        </td>
                        <td style={{ fontWeight: 500 }}>{op.contact || '—'}</td>
                        <td style={{ color: 'var(--color-text-muted)' }}>{op.toLocation || '—'}</td>
                        <td style={{ color: 'var(--color-text-muted)' }}>{op.scheduledDate}</td>
                        <td>
                          <span className={`${styles.statusBadge} ${statusClass}`}>
                            {op.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right Column: Category Distribution & Quick Alerts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6, 1.5rem)' }}>
          {/* Stock by Category Donut */}
          <div className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Stock by Category</h2>
            </div>

            <div className={styles.chartContainer}>
              <div style={{ width: '100%', height: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.categoryDistribution}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={75}
                      paddingAngle={4}
                    >
                      {data.categoryDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any, name: any) => [`${val} units`, name]}
                      contentStyle={{
                        borderRadius: 8,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        border: '1px solid #E2E8F0',
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend */}
              <div className={styles.legendList}>
                {data.categoryDistribution.map((item) => (
                  <div key={item.name} className={styles.legendItem}>
                    <div className={styles.legendLeft}>
                      <span className={styles.legendDot} style={{ backgroundColor: item.color }} />
                      <span className={styles.legendName}>{item.name}</span>
                    </div>
                    <span className={styles.legendValue}>{item.value} units</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Low Stock Replenishment Quick Queue */}
          <div className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Replenishment Queue</h2>
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                {data.quickAlerts.length} items
              </span>
            </div>

            {data.quickAlerts.length === 0 ? (
              <div className={styles.emptyState} style={{ padding: '16px 0' }}>
                🎉 All products have healthy stock levels!
              </div>
            ) : (
              <div className={styles.alertList}>
                {data.quickAlerts.map((item) => (
                  <div key={item.id} className={styles.alertItem}>
                    <div className={styles.alertItemInfo}>
                      <span className={styles.alertItemSku}>{item.sku}</span>
                      <span className={styles.alertItemName}>{item.name}</span>
                      <span
                        className={`${styles.alertItemStock} ${
                          item.totalStock === 0 ? styles.stockRed : styles.stockOrange
                        }`}
                      >
                        {item.totalStock} on hand (Min: {item.reorderPoint})
                      </span>
                    </div>

                    <button
                      className={styles.reorderBtn}
                      onClick={() => handleReorderClick(item.sku, item.name)}
                      title="Create incoming receipt for this item"
                    >
                      + Reorder
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
