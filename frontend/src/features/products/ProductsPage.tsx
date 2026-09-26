import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  productsService,
  type Product,
  type Category,
} from '../../lib/productsService';
import styles from './ProductsPage.module.css';

export default function ProductsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [lowStockOnly, setLowStockOnly] = useState(
    searchParams.get('low_stock') === 'true'
  );
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isProductModalOpen, setIsProductModalOpen] = useState(
    searchParams.get('action') === 'new'
  );
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // New Product form state
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    categoryId: '',
    unitOfMeasure: 'Units',
    reorderPoint: 5,
    reorderQty: 10,
    initialStock: 0,
    initialLocation: 'WH/Stock1',
    description: '',
  });

  // New Category form state
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [newCatColor, setNewCatColor] = useState('#714B67');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [prodsRes, catsRes] = await Promise.all([
        productsService.getProducts({
          search,
          categoryId: selectedCategory,
          lowStockOnly,
        }),
        productsService.getCategories(),
      ]);
      setProducts(prodsRes.items);
      setCategories(catsRes);
    } catch {
      toast.error('Failed to load products');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, selectedCategory, lowStockOnly]);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.sku.trim()) {
      toast.error('Please enter Product Name and SKU');
      return;
    }

    try {
      await productsService.createProduct(formData);
      toast.success(`Product "${formData.name}" created successfully!`);
      setIsProductModalOpen(false);
      setFormData({
        name: '',
        sku: '',
        categoryId: '',
        unitOfMeasure: 'Units',
        reorderPoint: 5,
        reorderQty: 10,
        initialStock: 0,
        initialLocation: 'WH/Stock1',
        description: '',
      });
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create product');
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) {
      toast.error('Please enter category name');
      return;
    }

    try {
      await productsService.createCategory({
        name: newCatName,
        description: newCatDesc,
        color: newCatColor,
      });
      toast.success(`Category "${newCatName}" added!`);
      setNewCatName('');
      setNewCatDesc('');
      setIsCategoryModalOpen(false);
      loadData();
    } catch {
      toast.error('Failed to add category');
    }
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;
    try {
      await productsService.deleteProduct(id);
      toast.success('Product deleted');
      setSelectedProduct(null);
      loadData();
    } catch {
      toast.error('Failed to delete product');
    }
  };

  const handleCreateReceiptForProduct = (p: Product) => {
    navigate(`/operations/receipts?action=new&sku=${encodeURIComponent(p.sku)}&name=${encodeURIComponent(p.name)}`);
  };

  return (
    <div className={styles.container}>
      {/* Page Header */}
      <header className={styles.header}>
        <div className={styles.titleArea}>
          <h1 className={styles.title}>Products & Catalog</h1>
          <p className={styles.subtitle}>
            Manage inventory items, SKUs, reorder thresholds, and multi-location stock levels
          </p>
        </div>

        <div className={styles.headerActions}>
          <button
            className={styles.secondaryBtn}
            onClick={() => setIsCategoryModalOpen(true)}
          >
            Manage Categories ({categories.length})
          </button>

          <button
            className={styles.primaryBtn}
            onClick={() => setIsProductModalOpen(true)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Product
          </button>
        </div>
      </header>

      {/* Control Bar: Search, Category Filter, Low Stock Toggle, View Switcher */}
      <div className={styles.controlBar}>
        <div className={styles.filtersLeft}>
          <div className={styles.searchBox}>
            <span className={styles.searchIcon}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </span>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search by SKU, product name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className={styles.filterSelect}
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            aria-label="Filter by Category"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <label className={styles.filterToggle}>
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={(e) => setLowStockOnly(e.target.checked)}
            />
            <span>Low Stock / Out of Stock</span>
          </label>
        </div>

        {/* View Switcher: List vs Kanban */}
        <div className={styles.viewSwitcher}>
          <button
            className={`${styles.viewBtn} ${viewMode === 'list' ? styles.viewBtnActive : ''}`}
            onClick={() => setViewMode('list')}
            title="List View"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
          </button>
          <button
            className={`${styles.viewBtn} ${viewMode === 'kanban' ? styles.viewBtnActive : ''}`}
            onClick={() => setViewMode('kanban')}
            title="Kanban Cards"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="18" rx="1"/><rect x="14" y="3" width="7" height="10" rx="1"/></svg>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className={styles.emptyState}>Loading catalog...</div>
      ) : products.length === 0 ? (
        <div className={styles.tableCard}>
          <div className={styles.emptyState}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>📦</div>
            <h3>No products found</h3>
            <p>Try modifying your search query or add a new product.</p>
            <button
              className={styles.primaryBtn}
              style={{ marginTop: 12 }}
              onClick={() => setIsProductModalOpen(true)}
            >
              + Create Product
            </button>
          </div>
        </div>
      ) : viewMode === 'list' ? (
        /* List View */
        <div className={styles.tableCard}>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Unit</th>
                  <th>On Hand</th>
                  <th>Reorder Point</th>
                  <th>Target Restock</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const statusBadgeClass =
                    p.totalStock === 0
                      ? styles.badgeOutOfStock
                      : p.totalStock <= p.reorderPoint
                      ? styles.badgeLowStock
                      : styles.badgeInStock;

                  const statusText =
                    p.totalStock === 0
                      ? 'Out of Stock'
                      : p.totalStock <= p.reorderPoint
                      ? 'Low Stock'
                      : 'In Stock';

                  return (
                    <tr
                      key={p.id}
                      className={styles.tableRow}
                      onClick={() => setSelectedProduct(p)}
                    >
                      <td>
                        <div className={styles.productCell}>
                          <div className={styles.productThumb}>
                            {p.imageUrl ? (
                              <img
                                src={p.imageUrl}
                                alt={p.name}
                                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 5 }}
                              />
                            ) : (
                              '📦'
                            )}
                          </div>
                          <div className={styles.productMeta}>
                            <span className={styles.productName}>{p.name}</span>
                            <span className={styles.productSku}>{p.sku}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={styles.catBadge}>{p.categoryName || 'General'}</span>
                      </td>
                      <td style={{ color: 'var(--color-text-muted)' }}>{p.unitOfMeasure}</td>
                      <td>
                        <strong style={{ fontSize: 15 }}>{p.totalStock}</strong>
                      </td>
                      <td style={{ color: 'var(--color-text-muted)' }}>{p.reorderPoint}</td>
                      <td style={{ color: 'var(--color-text-muted)' }}>+{p.reorderQty}</td>
                      <td>
                        <span className={`${styles.stockBadge} ${statusBadgeClass}`}>
                          {statusText}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                        <button
                          className={styles.secondaryBtn}
                          style={{ padding: '4px 8px', fontSize: 12 }}
                          onClick={() => handleCreateReceiptForProduct(p)}
                          title="Create incoming receipt"
                        >
                          + Receive
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Kanban View */
        <div className={styles.kanbanGrid}>
          {products.map((p) => {
            const statusBadgeClass =
              p.totalStock === 0
                ? styles.badgeOutOfStock
                : p.totalStock <= p.reorderPoint
                ? styles.badgeLowStock
                : styles.badgeInStock;

            const statusText =
              p.totalStock === 0
                ? 'Out of Stock'
                : p.totalStock <= p.reorderPoint
                ? 'Low Stock'
                : 'In Stock';

            return (
              <div
                key={p.id}
                className={styles.kanbanCard}
                onClick={() => setSelectedProduct(p)}
              >
                <div className={styles.kanbanTop}>
                  <span className={styles.kanbanSku}>{p.sku}</span>
                  <span className={`${styles.stockBadge} ${statusBadgeClass}`}>
                    {statusText}
                  </span>
                </div>

                <div>
                  <h3 className={styles.kanbanTitle}>{p.name}</h3>
                  <span className={styles.catBadge} style={{ marginTop: 6 }}>
                    {p.categoryName || 'General'}
                  </span>
                </div>

                <div className={styles.kanbanStats}>
                  <div>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>ON HAND</span>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>
                      {p.totalStock} {p.unitOfMeasure}
                    </div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>REORDER AT</span>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{p.reorderPoint} units</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div className={styles.modalOverlay} onClick={() => setSelectedProduct(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <span className={styles.productSku}>{selectedProduct.sku}</span>
                <h2 className={styles.modalTitle}>{selectedProduct.name}</h2>
              </div>
              <button
                className={styles.closeBtn}
                onClick={() => setSelectedProduct(null)}
              >
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <span className={styles.catBadge}>{selectedProduct.categoryName || 'General'}</span>
                <span style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
                  Unit: <strong>{selectedProduct.unitOfMeasure}</strong>
                </span>
                <span style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
                  Reorder Threshold: <strong>{selectedProduct.reorderPoint}</strong>
                </span>
              </div>

              {selectedProduct.description && (
                <p style={{ fontSize: 14, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                  {selectedProduct.description}
                </p>
              )}

              {/* Location Breakdown */}
              <div style={{ marginTop: 10 }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: 14, color: 'var(--color-text)' }}>
                  Stock by Location
                </h4>
                <div style={{ border: '1px solid #E2E8F0', borderRadius: 8, overflow: 'hidden' }}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Location</th>
                        <th style={{ textAlign: 'right' }}>On-Hand Quantity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedProduct.stockByLocation.map((loc) => (
                        <tr key={loc.locationId}>
                          <td style={{ fontWeight: 500 }}>{loc.locationName}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700 }}>
                            {loc.quantity} {selectedProduct.unitOfMeasure}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                className={styles.secondaryBtn}
                style={{ color: '#DC2626', borderColor: '#FCA5A5' }}
                onClick={() => handleDeleteProduct(selectedProduct.id, selectedProduct.name)}
              >
                Delete
              </button>

              <button
                className={styles.primaryBtn}
                onClick={() => {
                  const p = selectedProduct;
                  setSelectedProduct(null);
                  handleCreateReceiptForProduct(p);
                }}
              >
                Create Receipt (+ Restock)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Product Modal */}
      {isProductModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsProductModalOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Add New Product</h2>
              <button
                className={styles.closeBtn}
                onClick={() => setIsProductModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProduct}>
              <div className={styles.modalBody}>
                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label>Product Name *</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      placeholder="e.g. Ergonomic Office Desk"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      autoFocus
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>SKU / Internal Reference *</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      placeholder="e.g. DSK-001"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label>Category</label>
                    <select
                      className={styles.formSelect}
                      value={formData.categoryId}
                      onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    >
                      <option value="">Select Category</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Unit of Measure</label>
                    <select
                      className={styles.formSelect}
                      value={formData.unitOfMeasure}
                      onChange={(e) => setFormData({ ...formData, unitOfMeasure: e.target.value })}
                    >
                      <option value="Units">Units (pcs)</option>
                      <option value="kg">Kilograms (kg)</option>
                      <option value="m">Meters (m)</option>
                      <option value="Packs">Packs</option>
                      <option value="Boxes">Boxes</option>
                      <option value="Litres">Litres</option>
                    </select>
                  </div>
                </div>

                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label>Reorder Point (Min)</label>
                    <input
                      type="number"
                      min="0"
                      className={styles.formInput}
                      value={formData.reorderPoint}
                      onChange={(e) => setFormData({ ...formData, reorderPoint: Number(e.target.value) })}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Suggested Reorder Qty</label>
                    <input
                      type="number"
                      min="0"
                      className={styles.formInput}
                      value={formData.reorderQty}
                      onChange={(e) => setFormData({ ...formData, reorderQty: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label>Initial Stock on Hand</label>
                    <input
                      type="number"
                      min="0"
                      className={styles.formInput}
                      value={formData.initialStock}
                      onChange={(e) => setFormData({ ...formData, initialStock: Number(e.target.value) })}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Warehouse Location</label>
                    <select
                      className={styles.formSelect}
                      value={formData.initialLocation}
                      onChange={(e) => setFormData({ ...formData, initialLocation: e.target.value })}
                    >
                      <option value="WH/Stock1">WH/Stock1 (Primary Storage)</option>
                      <option value="WH/Rack A">WH/Rack A (Heavy Racks)</option>
                      <option value="WH/Production">WH/Production Floor</option>
                    </select>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Description (Optional)</label>
                  <textarea
                    className={styles.formTextarea}
                    rows={2}
                    placeholder="Brief description or technical specifications..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={() => setIsProductModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className={styles.primaryBtn}>
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Management Modal */}
      {isCategoryModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsCategoryModalOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Manage Categories</h2>
              <button
                className={styles.closeBtn}
                onClick={() => setIsCategoryModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              {/* Existing Categories List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 600 }}>Active Categories</label>
                {categories.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      background: '#F8FAFC',
                      borderRadius: 6,
                      border: '1px solid #E2E8F0',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          backgroundColor: c.color || '#714B67',
                        }}
                      />
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</span>
                    </div>
                    <span style={{ fontSize: 12, color: '#64748B' }}>{c.description || '—'}</span>
                  </div>
                ))}
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid #E2E8F0', margin: '8px 0' }} />

              {/* Add New Category */}
              <form onSubmit={handleCreateCategory} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <label style={{ fontSize: 13, fontWeight: 600 }}>Add New Category</label>
                <div className={styles.formGrid}>
                  <input
                    type="text"
                    className={styles.formInput}
                    placeholder="Category Name"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    required
                  />
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type="color"
                      value={newCatColor}
                      onChange={(e) => setNewCatColor(e.target.value)}
                      style={{ width: 42, height: 38, border: 'none', cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: 12, color: '#64748B' }}>Color tag</span>
                  </div>
                </div>

                <input
                  type="text"
                  className={styles.formInput}
                  placeholder="Optional description"
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                />

                <button type="submit" className={styles.primaryBtn} style={{ alignSelf: 'flex-start' }}>
                  + Add Category
                </button>
              </form>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={() => setIsCategoryModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
