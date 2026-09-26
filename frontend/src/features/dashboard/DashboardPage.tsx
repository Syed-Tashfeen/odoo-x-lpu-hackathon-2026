import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import styles from './DashboardPage.module.css';

export default function DashboardPage() {
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Empty state for Donut Chart
  const chartData = [{ name: 'Empty', value: 1 }];
  const emptyColor = '#E2E8F0';

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Dashboard</h1>
          <p className={styles.kpiLabel}>Overview of your warehouse operations</p>
        </div>
        <div className={styles.kpiLabel}>{currentDate}</div>
      </header>

      {/* KPI Cards Grid */}
      <div className={styles.kpiGrid}>
        {/* Card 1 */}
        <div className={styles.kpiCard}>
          <div className={`${styles.kpiIconWrapper} ${styles.receive}`}>📥</div>
          <div className={styles.kpiContent}>
            <div className={styles.kpiValue}>0</div>
            <div className={styles.kpiLabel}>To Receive</div>
            <div className={styles.kpiSublabel}>Pending receipts</div>
          </div>
        </div>

        {/* Card 2 */}
        <div className={styles.kpiCard}>
          <div className={`${styles.kpiIconWrapper} ${styles.deliver}`}>🚚</div>
          <div className={styles.kpiContent}>
            <div className={styles.kpiValue}>0</div>
            <div className={styles.kpiLabel}>To Deliver</div>
            <div className={styles.kpiSublabel}>Pending deliveries</div>
          </div>
        </div>

        {/* Card 3 */}
        <div className={styles.kpiCard}>
          <div className={`${styles.kpiIconWrapper} ${styles.late}`}>⚠️</div>
          <div className={styles.kpiContent}>
            <div className={styles.kpiValue}>0</div>
            <div className={styles.kpiLabel}>Late</div>
            <div className={styles.kpiSublabel}>Overdue operations</div>
          </div>
        </div>

        {/* Card 4 */}
        <div className={styles.kpiCard}>
          <div className={`${styles.kpiIconWrapper} ${styles.waiting}`}>⏳</div>
          <div className={styles.kpiContent}>
            <div className={styles.kpiValue}>0</div>
            <div className={styles.kpiLabel}>Waiting</div>
            <div className={styles.kpiSublabel}>Awaiting stock</div>
          </div>
        </div>

        {/* Card 5 */}
        <div className={styles.kpiCard}>
          <div className={`${styles.kpiIconWrapper} ${styles.total}`}>📦</div>
          <div className={styles.kpiContent}>
            <div className={styles.kpiValue}>0</div>
            <div className={styles.kpiLabel}>Total Products</div>
            <div className={styles.kpiSublabel}>In catalog</div>
          </div>
        </div>

        {/* Card 6 */}
        <div className={styles.kpiCard}>
          <div className={`${styles.kpiIconWrapper} ${styles.lowStock}`}>📉</div>
          <div className={styles.kpiContent}>
            <div className={styles.kpiValue}>0</div>
            <div className={styles.kpiLabel}>Low Stock</div>
            <div className={styles.kpiSublabel}>Below reorder point</div>
          </div>
        </div>

        {/* Card 7 */}
        <div className={styles.kpiCard}>
          <div className={`${styles.kpiIconWrapper} ${styles.outOfStock}`}>🚫</div>
          <div className={styles.kpiContent}>
            <div className={styles.kpiValue}>0</div>
            <div className={styles.kpiLabel}>Out of Stock</div>
            <div className={styles.kpiSublabel}>Need replenishment</div>
          </div>
        </div>

        {/* Card 8 */}
        <div className={styles.kpiCard}>
          <div className={`${styles.kpiIconWrapper} ${styles.operations}`}>✅</div>
          <div className={styles.kpiContent}>
            <div className={styles.kpiValue}>0</div>
            <div className={styles.kpiLabel}>Operations</div>
            <div className={styles.kpiSublabel}>Completed today</div>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className={styles.bottomRow}>
        {/* Left: Recent Operations table */}
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Recent Operations</h2>
            <button className={styles.sectionAction}>View All</button>
          </div>
          <div className={styles.sectionBody}>
            <table className={styles.opsTable}>
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Partner</th>
                  <th>Date</th>
                </tr>
              </thead>
            </table>
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>📋</div>
              <div className={styles.emptyTitle}>No recent operations</div>
              <div className={styles.emptySubtitle}>
                Operations will appear here as they are created
              </div>
            </div>
          </div>
        </div>

        {/* Right: Stock by Category (Donut Chart) */}
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Stock by Category</h2>
          </div>
          <div className={styles.sectionBody}>
            <div className={styles.chartContainer}>
              <div className={styles.chartWrapper}>
                <div className={styles.chartDonut}>
                  <ResponsiveContainer width="100%" height={170}>
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        dataKey="value"
                        stroke="none"
                      >
                        <Cell key="cell-0" fill={emptyColor} />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className={styles.donutCenter}>
                    <div className={styles.donutCenterLabel}>No data yet</div>
                  </div>
                </div>
              </div>
              <div className={styles.emptyState} style={{ padding: '0', marginTop: '1rem' }}>
                <div className={styles.emptySubtitle}>
                  Add products to see distribution
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
