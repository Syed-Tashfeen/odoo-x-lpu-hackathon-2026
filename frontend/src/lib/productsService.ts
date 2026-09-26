import api from './axios';

export interface StockLocationLevel {
  locationId: string;
  locationName: string;
  quantity: number;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  color?: string;
  createdAt: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  categoryId?: string | null;
  categoryName?: string;
  unitOfMeasure: string;
  description?: string | null;
  imageUrl?: string | null;
  reorderPoint: number;
  reorderQty: number;
  totalStock: number;
  stockByLocation: StockLocationLevel[];
  isLowStock?: boolean;
  isOutOfStock?: boolean;
  createdAt: string;
  updatedAt?: string;
}

const STORAGE_KEY_PRODUCTS = 'stocksense_products_db';
const STORAGE_KEY_CATEGORIES = 'stocksense_categories_db';

export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'cat_furniture',
    name: 'Furniture',
    description: 'Desks, chairs, cabinets and office ergonomics',
    color: '#714B67',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cat_raw',
    name: 'Raw Materials',
    description: 'Steel rods, sheets, structural components',
    color: '#0284C7',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cat_electronics',
    name: 'Electronics',
    description: 'Monitors, desk lamps, computing peripherals',
    color: '#10B981',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cat_hardware',
    name: 'Hardware & Fasteners',
    description: 'Bolts, nuts, brackets and assembly hardware',
    color: '#F59E0B',
    createdAt: new Date().toISOString(),
  },
];

export const DEFAULT_PRODUCTS: Product[] = [
  {
    id: 'prod_desk001',
    sku: 'DESK001',
    name: 'Desk Large Wooden',
    categoryId: 'cat_furniture',
    categoryName: 'Furniture',
    unitOfMeasure: 'Units',
    description: 'Solid wood modular workstation desk with cable management',
    imageUrl: 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=300&q=80',
    reorderPoint: 5,
    reorderQty: 10,
    totalStock: 14,
    stockByLocation: [
      { locationId: 'loc_wh_stock1', locationName: 'WH/Stock1', quantity: 10 },
      { locationId: 'loc_wh_rack_a', locationName: 'WH/Rack A', quantity: 4 },
    ],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prod_chair01',
    sku: 'CHAIR01',
    name: 'Ergonomic Office Chair',
    categoryId: 'cat_furniture',
    categoryName: 'Furniture',
    unitOfMeasure: 'Units',
    description: 'High-back mesh ergonomic task chair with adjustable armrests',
    imageUrl: 'https://images.unsplash.com/photo-1580481077195-c3a821a501e2?w=300&q=80',
    reorderPoint: 8,
    reorderQty: 15,
    totalStock: 3, // LOW STOCK
    stockByLocation: [
      { locationId: 'loc_wh_stock1', locationName: 'WH/Stock1', quantity: 3 },
    ],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prod_stl001',
    sku: 'STL001',
    name: 'Steel Rods 12mm High-Tensile',
    categoryId: 'cat_raw',
    categoryName: 'Raw Materials',
    unitOfMeasure: 'kg',
    description: 'Standard industrial grade cold-rolled structural steel rods',
    imageUrl: null,
    reorderPoint: 100,
    reorderQty: 250,
    totalStock: 450,
    stockByLocation: [
      { locationId: 'loc_wh_stock1', locationName: 'WH/Stock1', quantity: 300 },
      { locationId: 'loc_wh_production', locationName: 'WH/Production', quantity: 150 },
    ],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prod_cab002',
    sku: 'CAB002',
    name: 'Storage Cabinet 4-Door Steel',
    categoryId: 'cat_furniture',
    categoryName: 'Furniture',
    unitOfMeasure: 'Units',
    description: 'Heavy duty fire-resistant double locking cabinet',
    imageUrl: null,
    reorderPoint: 2,
    reorderQty: 5,
    totalStock: 0, // OUT OF STOCK
    stockByLocation: [
      { locationId: 'loc_wh_stock1', locationName: 'WH/Stock1', quantity: 0 },
    ],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prod_lamp01',
    sku: 'LAMP01',
    name: 'LED Desk Lamp Pro Touch',
    categoryId: 'cat_electronics',
    categoryName: 'Electronics',
    unitOfMeasure: 'Units',
    description: 'Dimmable color-adjustable aluminum LED workbench lamp',
    imageUrl: null,
    reorderPoint: 10,
    reorderQty: 20,
    totalStock: 28,
    stockByLocation: [
      { locationId: 'loc_wh_stock1', locationName: 'WH/Stock1', quantity: 28 },
    ],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prod_bolt08',
    sku: 'BOLT08',
    name: 'M8 Industrial Hex Bolts (Pack of 100)',
    categoryId: 'cat_hardware',
    categoryName: 'Hardware & Fasteners',
    unitOfMeasure: 'Packs',
    description: 'Galvanized zinc coated structural hex bolt fasteners',
    imageUrl: null,
    reorderPoint: 20,
    reorderQty: 50,
    totalStock: 74,
    stockByLocation: [
      { locationId: 'loc_wh_rack_a', locationName: 'WH/Rack A', quantity: 74 },
    ],
    createdAt: new Date().toISOString(),
  },
];

// Helper to sanitize stock flags
function withComputedFlags(p: Product): Product {
  const isOutOfStock = p.totalStock <= 0;
  const isLowStock = !isOutOfStock && p.totalStock <= p.reorderPoint;
  return {
    ...p,
    isOutOfStock,
    isLowStock,
  };
}

export function getStoredCategories(): Category[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CATEGORIES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_CATEGORIES, JSON.stringify(DEFAULT_CATEGORIES));
      return DEFAULT_CATEGORIES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_CATEGORIES;
  } catch {
    return DEFAULT_CATEGORIES;
  }
}

export function saveStoredCategories(categories: Category[]): void {
  localStorage.setItem(STORAGE_KEY_CATEGORIES, JSON.stringify(categories));
}

export function getStoredProducts(): Product[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PRODUCTS);
    if (!raw) {
      const computed = DEFAULT_PRODUCTS.map(withComputedFlags);
      localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(computed));
      return computed;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      const computed = DEFAULT_PRODUCTS.map(withComputedFlags);
      localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(computed));
      return computed;
    }
    return parsed.map(withComputedFlags);
  } catch {
    return DEFAULT_PRODUCTS.map(withComputedFlags);
  }
}

export function saveStoredProducts(products: Product[]): void {
  localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(products.map(withComputedFlags)));
}

export const productsService = {
  /**
   * Fetch all categories (from API or local storage)
   */
  async getCategories(): Promise<Category[]> {
    try {
      const res = await api.get('/categories');
      if (res.data?.data && Array.isArray(res.data.data)) {
        const cats: Category[] = res.data.data.map((c: any) => ({
          id: c.id,
          name: c.name,
          description: c.description || '',
          color: c.color || '#714B67',
          createdAt: c.createdAt || new Date().toISOString(),
        }));
        saveStoredCategories(cats);
        return cats;
      }
    } catch {
      // Fallback to local
    }
    return getStoredCategories();
  },

  /**
   * Create category
   */
  async createCategory(data: { name: string; description?: string; color?: string }): Promise<Category> {
    const cats = getStoredCategories();
    const newCat: Category = {
      id: `cat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: data.name.trim(),
      description: data.description?.trim(),
      color: data.color || '#714B67',
      createdAt: new Date().toISOString(),
    };
    cats.push(newCat);
    saveStoredCategories(cats);

    try {
      await api.post('/categories', { name: newCat.name, description: newCat.description });
    } catch {
      // Offline fallback
    }
    return newCat;
  },

  /**
   * List products with search, category and low stock filters
   */
  async getProducts(params?: {
    search?: string;
    categoryId?: string;
    lowStockOnly?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ items: Product[]; total: number }> {
    let list = getStoredProducts();

    try {
      const queryParams = new URLSearchParams();
      if (params?.search) queryParams.set('search', params.search);
      if (params?.categoryId) queryParams.set('category', params.categoryId);
      if (params?.lowStockOnly) queryParams.set('low_stock', 'true');
      const res = await api.get(`/products?${queryParams.toString()}`);
      if (res.data?.data && Array.isArray(res.data.data)) {
        // Sync local
        const serverProducts: Product[] = res.data.data.map((p: any) => ({
          id: p.id,
          sku: p.sku,
          name: p.name,
          categoryId: p.categoryId,
          categoryName: p.category?.name || 'General',
          unitOfMeasure: p.unitOfMeasure,
          description: p.description,
          imageUrl: p.imageUrl,
          reorderPoint: p.reorderPoint || 0,
          reorderQty: p.reorderQty || 0,
          totalStock: p.totalStock || 0,
          stockByLocation: p.stockByLocation || [
            { locationId: 'loc_wh_stock1', locationName: 'WH/Stock1', quantity: p.totalStock || 0 },
          ],
          createdAt: p.createdAt || new Date().toISOString(),
        }));
        if (serverProducts.length > 0) {
          saveStoredProducts(serverProducts);
          list = serverProducts.map(withComputedFlags);
        }
      }
    } catch {
      // Use local storage
    }

    if (params?.search) {
      const q = params.search.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (p.categoryName && p.categoryName.toLowerCase().includes(q))
      );
    }

    if (params?.categoryId && params.categoryId !== 'all') {
      list = list.filter((p) => p.categoryId === params.categoryId);
    }

    if (params?.lowStockOnly) {
      list = list.filter((p) => p.totalStock <= p.reorderPoint);
    }

    return {
      items: list,
      total: list.length,
    };
  },

  /**
   * Get single product by id
   */
  async getProductById(id: string): Promise<Product | null> {
    const list = getStoredProducts();
    const found = list.find((p) => p.id === id);
    if (found) return found;

    try {
      const res = await api.get(`/products/${id}`);
      if (res.data?.data) {
        const p = res.data.data;
        return withComputedFlags({
          id: p.id,
          sku: p.sku,
          name: p.name,
          categoryId: p.categoryId,
          categoryName: p.category?.name,
          unitOfMeasure: p.unitOfMeasure,
          description: p.description,
          imageUrl: p.imageUrl,
          reorderPoint: p.reorderPoint,
          reorderQty: p.reorderQty,
          totalStock: p.totalStock || 0,
          stockByLocation: p.stockByLocation || [],
          createdAt: p.createdAt,
        });
      }
    } catch {
      // Fallback
    }
    return null;
  },

  /**
   * Create product
   */
  async createProduct(data: {
    sku: string;
    name: string;
    categoryId?: string;
    unitOfMeasure: string;
    description?: string;
    reorderPoint: number;
    reorderQty: number;
    initialStock?: number;
    initialLocation?: string;
  }): Promise<Product> {
    const list = getStoredProducts();
    const cats = getStoredCategories();
    const matchedCategory = cats.find((c) => c.id === data.categoryId);

    const initialQty = Number(data.initialStock) || 0;
    const locName = data.initialLocation || 'WH/Stock1';

    const newProduct: Product = withComputedFlags({
      id: `prod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sku: data.sku.trim().toUpperCase(),
      name: data.name.trim(),
      categoryId: data.categoryId || null,
      categoryName: matchedCategory?.name || 'General',
      unitOfMeasure: data.unitOfMeasure || 'Units',
      description: data.description?.trim() || null,
      imageUrl: null,
      reorderPoint: Number(data.reorderPoint) || 0,
      reorderQty: Number(data.reorderQty) || 0,
      totalStock: initialQty,
      stockByLocation: [
        { locationId: 'loc_wh_stock1', locationName: locName, quantity: initialQty },
      ],
      createdAt: new Date().toISOString(),
    });

    list.unshift(newProduct);
    saveStoredProducts(list);

    try {
      await api.post('/products', {
        sku: newProduct.sku,
        name: newProduct.name,
        categoryId: newProduct.categoryId || undefined,
        unitOfMeasure: newProduct.unitOfMeasure,
        description: newProduct.description,
        reorderPoint: newProduct.reorderPoint,
        reorderQty: newProduct.reorderQty,
      });
    } catch {
      // Offline fallback
    }

    return newProduct;
  },

  /**
   * Update product
   */
  async updateProduct(id: string, data: Partial<Product>): Promise<Product> {
    const list = getStoredProducts();
    const index = list.findIndex((p) => p.id === id);
    if (index === -1) throw new Error('Product not found');

    const cats = getStoredCategories();
    const categoryName = data.categoryId
      ? cats.find((c) => c.id === data.categoryId)?.name || list[index].categoryName
      : list[index].categoryName;

    const updated: Product = withComputedFlags({
      ...list[index],
      ...data,
      categoryName,
      updatedAt: new Date().toISOString(),
    });

    list[index] = updated;
    saveStoredProducts(list);

    try {
      await api.patch(`/products/${id}`, data);
    } catch {
      // Offline fallback
    }

    return updated;
  },

  /**
   * Delete product
   */
  async deleteProduct(id: string): Promise<void> {
    const list = getStoredProducts();
    const filtered = list.filter((p) => p.id !== id);
    saveStoredProducts(filtered);

    try {
      await api.delete(`/products/${id}`);
    } catch {
      // Offline fallback
    }
  },
};
