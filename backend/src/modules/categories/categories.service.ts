import { eq, sql } from "drizzle-orm";
import { db } from "../../config/db.js";
import { categories, products } from "../../db/schema/index.js";
import { ApiError } from "../../lib/api-error.js";

/**
 * List all categories with product count.
 */
export async function listCategories() {
  const result = await db
    .select({
      id: categories.id,
      name: categories.name,
      description: categories.description,
      createdAt: categories.createdAt,
      productCount: sql<number>`count(${products.id})::int`,
    })
    .from(categories)
    .leftJoin(products, eq(products.categoryId, categories.id))
    .groupBy(categories.id)
    .orderBy(categories.name);

  return result;
}

/**
 * Get category by ID.
 */
export async function getCategoryById(id: string) {
  const [category] = await db
    .select()
    .from(categories)
    .where(eq(categories.id, id))
    .limit(1);

  if (!category) {
    throw ApiError.notFound(`Category with ID ${id} not found`);
  }

  return category;
}

/**
 * Create a new category.
 */
export async function createCategory(data: { name: string; description?: string }) {
  const trimmedName = data.name.trim();

  // Check unique name
  const existing = await db
    .select()
    .from(categories)
    .where(eq(categories.name, trimmedName))
    .limit(1);

  if (existing.length > 0) {
    throw ApiError.conflict(`Category "${trimmedName}" already exists`);
  }

  const [category] = await db
    .insert(categories)
    .values({
      name: trimmedName,
      description: data.description?.trim() || null,
    })
    .returning();

  return category;
}

/**
 * Update an existing category.
 */
export async function updateCategory(
  id: string,
  data: { name?: string; description?: string }
) {
  await getCategoryById(id);

  const updateData: { name?: string; description?: string | null } = {};

  if (data.name !== undefined) {
    const trimmedName = data.name.trim();
    const existing = await db
      .select()
      .from(categories)
      .where(eq(categories.name, trimmedName))
      .limit(1);

    if (existing.length > 0 && existing[0].id !== id) {
      throw ApiError.conflict(`Category "${trimmedName}" already exists`);
    }
    updateData.name = trimmedName;
  }

  if (data.description !== undefined) {
    updateData.description = data.description ? data.description.trim() : null;
  }

  const [updated] = await db
    .update(categories)
    .set(updateData)
    .where(eq(categories.id, id))
    .returning();

  return updated;
}

/**
 * Delete a category.
 */
export async function deleteCategory(id: string) {
  await getCategoryById(id);

  // Unlink products or delete (FK onDelete is "set null")
  await db.delete(categories).where(eq(categories.id, id));

  return { message: "Category deleted successfully" };
}
