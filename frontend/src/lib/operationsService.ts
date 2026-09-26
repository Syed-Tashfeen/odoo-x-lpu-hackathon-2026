import api from './axios';
import { productsService } from './productsService';

export type OperationType = 'receipt' | 'delivery' | 'internal' | 'adjustment';
export type OperationStatus = 'draft' | 'waiting' | 'ready' | 'done' | 'cancelled';

export interface OperationLine {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  quantityDone?: number;
}

export interface Operation {
  id: string;
  reference: string; // e.g. WH/IN/0001
  type: OperationType;
  status: OperationStatus;
  warehouseId?: string;
  warehouseCode?: string; // e.g. WH
  fromLocation?: string; // e.g. vendor
  toLocation?: string; // e.g. WH/Stock1
  contact?: string; // e.g. Azure Interior
  responsible?: string; // auto-filled with user name
  scheduledDate: string;
  completedDate?: string | null;
  notes?: string;
  lines: OperationLine[];
  createdAt: string;
  updatedAt?: string;
}

const STORAGE_KEY_OPERATIONS = 'stocksense_operations_db';

export const DEFAULT_OPERATIONS: Operation[] = [
  {
    id: 'op_rec_0001',
    reference: 'WH/IN/0001',
    type: 'receipt',
    status: 'ready',
    warehouseCode: 'WH',
    fromLocation: 'vendor',
    toLocation: 'WH/Stock1',
    contact: 'Azure Interior',
    responsible: 'Syed Tashfeen',
    scheduledDate: '2026-09-27',
    lines: [
      {
        id: 'line_1_1',
        productId: 'prod_desk001',
        productName: 'Desk Large Wooden',
        sku: 'DESK001',
        quantity: 6,
        quantityDone: 0,
      },
    ],
    createdAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
  },
  {
    id: 'op_rec_0002',
    reference: 'WH/IN/0002',
    type: 'receipt',
    status: 'ready',
    warehouseCode: 'WH',
    fromLocation: 'vendor',
    toLocation: 'WH/Stock1',
    contact: 'Azure Interior',
    responsible: 'Syed Tashfeen',
    scheduledDate: '2026-09-28',
    lines: [
      {
        id: 'line_2_1',
        productId: 'prod_chair01',
        productName: 'Ergonomic Office Chair',
        sku: 'CHAIR01',
        quantity: 10,
        quantityDone: 0,
      },
    ],
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
  {
    id: 'op_rec_0003',
    reference: 'WH/IN/0003',
    type: 'receipt',
    status: 'draft',
    warehouseCode: 'WH',
    fromLocation: 'Deco Addict Supplier',
    toLocation: 'WH/Stock1',
    contact: 'Deco Addict',
    responsible: 'Syed Tashfeen',
    scheduledDate: '2026-09-30',
    lines: [
      {
        id: 'line_3_1',
        productId: 'prod_lamp01',
        productName: 'LED Desk Lamp Pro Touch',
        sku: 'LAMP01',
        quantity: 15,
        quantityDone: 0,
      },
      {
        id: 'line_3_2',
        productId: 'prod_bolt08',
        productName: 'M8 Industrial Hex Bolts (Pack of 100)',
        sku: 'BOLT08',
        quantity: 30,
        quantityDone: 0,
      },
    ],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'op_rec_0004',
    reference: 'WH/IN/0004',
    type: 'receipt',
    status: 'done',
    warehouseCode: 'WH',
    fromLocation: 'Industrial Metal Supplies',
    toLocation: 'WH/Stock1',
    contact: 'Ready Mat',
    responsible: 'Syed Tashfeen',
    scheduledDate: '2026-09-25',
    completedDate: '2026-09-25',
    lines: [
      {
        id: 'line_4_1',
        productId: 'prod_stl001',
        productName: 'Steel Rods 12mm High-Tensile',
        sku: 'STL001',
        quantity: 200,
        quantityDone: 200,
      },
    ],
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
  },
  {
    id: 'op_del_0001',
    reference: 'WH/OUT/0001',
    type: 'delivery',
    status: 'ready',
    warehouseCode: 'WH',
    fromLocation: 'WH/Stock1',
    toLocation: 'vendor',
    contact: 'Azure Interior',
    responsible: 'Syed Tashfeen',
    scheduledDate: '2026-09-29',
    lines: [
      {
        id: 'line_d1_1',
        productId: 'prod_desk001',
        productName: 'Desk Large Wooden',
        sku: 'DESK001',
        quantity: 6,
        quantityDone: 0,
      },
    ],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'op_del_0002',
    reference: 'WH/OUT/0002',
    type: 'delivery',
    status: 'ready',
    warehouseCode: 'WH',
    fromLocation: 'WH/Stock1',
    toLocation: 'vendor',
    contact: 'Azure Interior',
    responsible: 'Syed Tashfeen',
    scheduledDate: '2026-09-30',
    lines: [
      {
        id: 'line_d2_1',
        productId: 'prod_chair01',
        productName: 'Ergonomic Office Chair',
        sku: 'CHAIR01',
        quantity: 2,
        quantityDone: 0,
      },
    ],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'op_del_0003',
    reference: 'WH/OUT/0003',
    type: 'delivery',
    status: 'waiting',
    warehouseCode: 'WH',
    fromLocation: 'WH/Stock1',
    toLocation: 'Customer Location',
    contact: 'Deco Addict',
    responsible: 'Syed Tashfeen',
    scheduledDate: '2026-10-02',
    lines: [
      {
        id: 'line_d3_1',
        productId: 'prod_desk001',
        productName: 'Desk Large Wooden',
        sku: 'DESK001',
        quantity: 999,
        quantityDone: 0,
      },
    ],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'op_int_0001',
    reference: 'WH/INT/0001',
    type: 'internal',
    status: 'ready',
    warehouseCode: 'WH',
    fromLocation: 'WH/Stock1',
    toLocation: 'WH/Production',
    contact: 'Internal Assembly',
    responsible: 'Syed Tashfeen',
    scheduledDate: '2026-09-28',
    lines: [
      {
        id: 'line_i1_1',
        productId: 'prod_stl001',
        productName: 'Steel Rods 12mm High-Tensile',
        sku: 'STL001',
        quantity: 50,
        quantityDone: 0,
      },
    ],
    createdAt: new Date().toISOString(),
  },
];

export function getStoredOperations(): Operation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_OPERATIONS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_OPERATIONS, JSON.stringify(DEFAULT_OPERATIONS));
      return DEFAULT_OPERATIONS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_OPERATIONS;
  } catch {
    return DEFAULT_OPERATIONS;
  }
}

export function saveStoredOperations(ops: Operation[]): void {
  localStorage.setItem(STORAGE_KEY_OPERATIONS, JSON.stringify(ops));
}

export const operationsService = {
  /**
   * List operations with optional type, status, and search filters
   */
  async getOperations(params?: {
    type?: OperationType;
    status?: OperationStatus;
    search?: string;
  }): Promise<Operation[]> {
    let list = getStoredOperations();

    try {
      const q = new URLSearchParams();
      if (params?.type) q.set('type', params.type);
      if (params?.status) q.set('status', params.status);
      const res = await api.get(`/operations?${q.toString()}`);
      if (res.data?.data && Array.isArray(res.data.data)) {
        // Sync local
        const serverOps: Operation[] = res.data.data.map((o: any) => ({
          id: o.id,
          reference: o.reference,
          type: o.type,
          status: o.status,
          warehouseCode: 'WH',
          fromLocation: o.sourceLocation?.name || 'vendor',
          toLocation: o.destLocation?.name || 'WH/Stock1',
          contact: o.partnerName || 'Unknown Partner',
          responsible: o.createdBy?.name || 'Staff',
          scheduledDate: o.scheduledDate ? o.scheduledDate.substring(0, 10) : new Date().toISOString().substring(0, 10),
          completedDate: o.completedDate,
          notes: o.notes,
          lines: o.lines || [],
          createdAt: o.createdAt || new Date().toISOString(),
        }));
        if (serverOps.length > 0) {
          saveStoredOperations(serverOps);
          list = serverOps;
        }
      }
    } catch {
      // Local fallback
    }

    if (params?.type) {
      list = list.filter((o) => o.type === params.type);
    }

    if (params?.status) {
      list = list.filter((o) => o.status === params.status);
    }

    if (params?.search) {
      const q = params.search.toLowerCase().trim();
      list = list.filter(
        (o) =>
          o.reference.toLowerCase().includes(q) ||
          (o.contact && o.contact.toLowerCase().includes(q)) ||
          (o.fromLocation && o.fromLocation.toLowerCase().includes(q)) ||
          (o.toLocation && o.toLocation.toLowerCase().includes(q))
      );
    }

    return list;
  },

  /**
   * Get single operation by ID or Reference
   */
  async getOperationById(idOrRef: string): Promise<Operation | null> {
    const list = getStoredOperations();
    const found = list.find((o) => o.id === idOrRef || o.reference === idOrRef);
    if (found) return found;

    try {
      const res = await api.get(`/operations/${idOrRef}`);
      if (res.data?.data) {
        const o = res.data.data;
        return {
          id: o.id,
          reference: o.reference,
          type: o.type,
          status: o.status,
          warehouseCode: 'WH',
          fromLocation: o.sourceLocation?.name || 'vendor',
          toLocation: o.destLocation?.name || 'WH/Stock1',
          contact: o.partnerName || 'Unknown',
          responsible: o.createdBy?.name || 'Staff',
          scheduledDate: o.scheduledDate ? o.scheduledDate.substring(0, 10) : new Date().toISOString().substring(0, 10),
          completedDate: o.completedDate,
          notes: o.notes,
          lines: (o.lines || []).map((l: any) => ({
            id: l.id,
            productId: l.productId,
            productName: l.product?.name || 'Product',
            sku: l.product?.sku || 'SKU',
            quantity: l.quantity,
            quantityDone: l.quantityDone || 0,
          })),
          createdAt: o.createdAt,
        };
      }
    } catch {
      // Fallback
    }
    return null;
  },

  /**
   * Generate next auto-increment reference formatted like WH/IN/0005
   */
  generateReference(type: OperationType, warehouse = 'WH'): string {
    const list = getStoredOperations();
    const typeCode = type === 'receipt' ? 'IN' : type === 'delivery' ? 'OUT' : type === 'internal' ? 'INT' : 'ADJ';
    const prefix = `${warehouse}/${typeCode}/`;
    const matching = list.filter((o) => o.reference.startsWith(prefix));
    let nextNum = 1;
    if (matching.length > 0) {
      const numbers = matching.map((m) => {
        const parts = m.reference.split('/');
        const last = parts[parts.length - 1];
        return parseInt(last, 10) || 0;
      });
      nextNum = Math.max(...numbers) + 1;
    }
    return `${prefix}${String(nextNum).padStart(4, '0')}`;
  },

  /**
   * Create new operation
   */
  async createOperation(data: {
    type: OperationType;
    fromLocation?: string;
    toLocation?: string;
    contact?: string;
    responsible: string;
    scheduledDate: string;
    notes?: string;
    lines: Array<{ productId: string; quantity: number }>;
  }): Promise<Operation> {
    const list = getStoredOperations();
    const products = await productsService.getProducts();

    const fullLines: OperationLine[] = data.lines.map((item, idx) => {
      const matched = products.items.find((p) => p.id === item.productId);
      return {
        id: `line_${Date.now()}_${idx}`,
        productId: item.productId,
        productName: matched?.name || 'Unknown Product',
        sku: matched?.sku || 'SKU',
        quantity: item.quantity,
        quantityDone: 0,
      };
    });

    const newOp: Operation = {
      id: `op_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      reference: this.generateReference(data.type),
      type: data.type,
      status: 'draft',
      warehouseCode: 'WH',
      fromLocation: data.fromLocation || (data.type === 'receipt' ? 'vendor' : 'WH/Stock1'),
      toLocation: data.toLocation || (data.type === 'delivery' ? 'Customer Location' : 'WH/Stock1'),
      contact: data.contact || 'Azure Interior',
      responsible: data.responsible,
      scheduledDate: data.scheduledDate || new Date().toISOString().substring(0, 10),
      notes: data.notes,
      lines: fullLines,
      createdAt: new Date().toISOString(),
    };

    list.unshift(newOp);
    saveStoredOperations(list);

    try {
      const res = await api.post('/operations', {
        type: newOp.type,
        partnerName: newOp.contact,
        scheduledDate: newOp.scheduledDate,
        notes: newOp.notes,
        lines: newOp.lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
      });
      if (res.data?.data) {
        newOp.id = res.data.data.id;
        newOp.reference = res.data.data.reference || newOp.reference;
        list[0].id = res.data.data.id;
        list[0].reference = newOp.reference;
        saveStoredOperations(list);
      }
    } catch {
      // Offline fallback
    }

    return newOp;
  },

  /**
   * Transition Draft -> Ready (Wireframe: "On click, TODO, move to Ready")
   */
  async markAsReady(id: string): Promise<Operation> {
    const list = getStoredOperations();
    const index = list.findIndex((o) => o.id === id);
    if (index === -1) throw new Error('Operation not found');

    list[index].status = 'ready';
    list[index].updatedAt = new Date().toISOString();
    saveStoredOperations(list);
    return list[index];
  },

  /**
   * Transition to Waiting (Wireframe: "Waiting: Waiting for the out of stock product to be in")
   */
  async markAsWaiting(id: string): Promise<Operation> {
    const list = getStoredOperations();
    const index = list.findIndex((o) => o.id === id);
    if (index === -1) throw new Error('Operation not found');

    list[index].status = 'waiting';
    list[index].updatedAt = new Date().toISOString();
    saveStoredOperations(list);
    return list[index];
  },

  /**
   * Transition Ready -> Done (Wireframe: "onclick, Validate move to Done")
   * This also mutates the actual stock for the involved products!
   */
  async validateOperation(id: string): Promise<Operation> {
    const list = getStoredOperations();
    const index = list.findIndex((o) => o.id === id);
    if (index === -1) throw new Error('Operation not found');

    const op = list[index];
    op.status = 'done';
    op.completedDate = new Date().toISOString().substring(0, 10);
    op.updatedAt = new Date().toISOString();

    // Mark lines as completed
    op.lines = op.lines.map((l) => ({ ...l, quantityDone: l.quantity }));

    // Mutate product stock levels
    const allProducts = await productsService.getProducts();
    for (const line of op.lines) {
      const prod = allProducts.items.find((p) => p.id === line.productId);
      if (prod) {
        if (op.type === 'receipt') {
          // Add to stock
          const newTotal = prod.totalStock + line.quantity;
          const loc = prod.stockByLocation.find((s) => s.locationName === op.toLocation) || prod.stockByLocation[0];
          if (loc) loc.quantity += line.quantity;
          await productsService.updateProduct(prod.id, {
            totalStock: newTotal,
            stockByLocation: [...prod.stockByLocation],
          });
        } else if (op.type === 'delivery') {
          // Deduct from stock
          const newTotal = Math.max(0, prod.totalStock - line.quantity);
          const loc = prod.stockByLocation.find((s) => s.locationName === op.fromLocation) || prod.stockByLocation[0];
          if (loc) loc.quantity = Math.max(0, loc.quantity - line.quantity);
          await productsService.updateProduct(prod.id, {
            totalStock: newTotal,
            stockByLocation: [...prod.stockByLocation],
          });
        } else if (op.type === 'internal') {
          // Internal transfer between locations
          const fromLoc = prod.stockByLocation.find((s) => s.locationName === op.fromLocation);
          let toLoc = prod.stockByLocation.find((s) => s.locationName === op.toLocation);
          if (fromLoc) fromLoc.quantity = Math.max(0, fromLoc.quantity - line.quantity);
          if (!toLoc && op.toLocation) {
            toLoc = { locationId: `loc_${Date.now()}`, locationName: op.toLocation, quantity: 0 };
            prod.stockByLocation.push(toLoc);
          }
          if (toLoc) toLoc.quantity += line.quantity;
          await productsService.updateProduct(prod.id, {
            stockByLocation: [...prod.stockByLocation],
          });
        } else if (op.type === 'adjustment') {
          // Physical inventory adjustment: line.quantity is counted quantity
          let loc = prod.stockByLocation.find((s) => s.locationName === op.toLocation);
          if (!loc && op.toLocation) {
            loc = { locationId: `loc_${Date.now()}`, locationName: op.toLocation, quantity: 0 };
            prod.stockByLocation.push(loc);
          }
          if (loc) loc.quantity = line.quantity;
          const newTotal = prod.stockByLocation.reduce((acc, s) => acc + s.quantity, 0);
          await productsService.updateProduct(prod.id, {
            totalStock: newTotal,
            stockByLocation: [...prod.stockByLocation],
          });
        }
      }
    }

    saveStoredOperations(list);

    try {
      await api.post(`/operations/${id}/validate`);
    } catch {
      // Offline fallback
    }

    return op;
  },

  /**
   * Cancel operation
   */
  async cancelOperation(id: string): Promise<Operation> {
    const list = getStoredOperations();
    const index = list.findIndex((o) => o.id === id);
    if (index === -1) throw new Error('Operation not found');

    list[index].status = 'cancelled';
    list[index].updatedAt = new Date().toISOString();
    saveStoredOperations(list);

    try {
      await api.post(`/operations/${id}/cancel`);
    } catch {
      // Offline fallback
    }

    return list[index];
  },
};
