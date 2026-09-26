import api from './axios';
import { productsService } from './productsService';
import { operationsService, type Operation } from './operationsService';

export interface DashboardKPIs {
  totalProducts: number;
  totalStockQuantity: number;
  lowStockCount: number;
  outOfStockCount: number;
  pendingReceipts: number;
  pendingDeliveries: number;
  scheduledTransfers: number;
  completedOperations: number;
  totalWarehouses: number;
  totalLocations: number;
}

export interface CategoryStockChartItem {
  name: string;
  value: number;
  color: string;
}

export interface DashboardData {
  kpis: DashboardKPIs;
  recentOperations: Operation[];
  quickAlerts: Array<{
    id: string;
    sku: string;
    name: string;
    totalStock: number;
    reorderPoint: number;
    reorderQty: number;
  }>;
  categoryDistribution: CategoryStockChartItem[];
}

export const dashboardService = {
  async getDashboardData(): Promise<DashboardData> {
    // Fetch products, categories, operations, and backend KPIs concurrently
    const [productsRes, categories, operations, apiRes] = await Promise.all([
      productsService.getProducts().catch(() => ({ items: [], total: 0 })),
      productsService.getCategories().catch(() => []),
      operationsService.getOperations().catch(() => []),
      api.get('/dashboard/kpis').catch(() => null),
    ]);

    const products = productsRes?.items || [];
    const apiData = apiRes?.data?.data || null;

    // Compute KPIs
    const totalProducts = products.length;
    const totalStockQuantity = products.reduce((acc, p) => acc + (p.totalStock || 0), 0);
    const lowStockItems = products.filter((p) => p.totalStock > 0 && p.totalStock <= p.reorderPoint);
    const outOfStockItems = products.filter((p) => p.totalStock <= 0);

    const pendingReceipts = operations.filter(
      (o) => o.type === 'receipt' && (o.status === 'draft' || o.status === 'ready')
    ).length;
    const pendingDeliveries = operations.filter(
      (o) => o.type === 'delivery' && (o.status === 'draft' || o.status === 'ready')
    ).length;
    const scheduledTransfers = operations.filter(
      (o) => o.type === 'internal' && (o.status === 'draft' || o.status === 'ready')
    ).length;
    const completedOperations = operations.filter((o) => o.status === 'done').length;

    // Category distribution for donut chart
    const catMap = new Map<string, number>();
    for (const prod of products) {
      const catName = prod.categoryName || 'General';
      const cur = catMap.get(catName) || 0;
      catMap.set(catName, cur + prod.totalStock);
    }

    const defaultColors = ['#714B67', '#0284C7', '#10B981', '#F59E0B', '#6366F1', '#EC4899'];
    const categoryDistribution: CategoryStockChartItem[] = Array.from(catMap.entries()).map(
      ([name, value], idx) => {
        const cat = categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
        return {
          name,
          value: value > 0 ? value : 1,
          color: cat?.color || defaultColors[idx % defaultColors.length],
        };
      }
    );

    const quickAlerts = [...outOfStockItems, ...lowStockItems].map((p) => ({
      id: p.id,
      sku: p.sku,
      name: p.name,
      totalStock: p.totalStock,
      reorderPoint: p.reorderPoint,
      reorderQty: p.reorderQty,
    }));

    return {
      kpis: {
        totalProducts: apiData?.kpis?.totalProducts ?? totalProducts,
        totalStockQuantity: apiData?.kpis?.totalStockQuantity ?? totalStockQuantity,
        lowStockCount: apiData?.kpis?.lowStockCount ?? lowStockItems.length,
        outOfStockCount: apiData?.kpis?.outOfStockCount ?? outOfStockItems.length,
        pendingReceipts: apiData?.kpis?.pendingReceipts ?? pendingReceipts,
        pendingDeliveries: apiData?.kpis?.pendingDeliveries ?? pendingDeliveries,
        scheduledTransfers: apiData?.kpis?.scheduledTransfers ?? scheduledTransfers,
        completedOperations: apiData?.kpis?.completedOperations ?? completedOperations,
        totalWarehouses: apiData?.kpis?.totalWarehouses ?? 1,
        totalLocations: apiData?.kpis?.totalLocations ?? 3,
      },
      recentOperations: operations.slice(0, 10),
      quickAlerts: quickAlerts.slice(0, 5),
      categoryDistribution:
        categoryDistribution.length > 0
          ? categoryDistribution
          : [{ name: 'Empty', value: 1, color: '#CBD5E1' }],
    };
  },
};
