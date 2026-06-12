/**
 * useProductFilter
 * Shared hook that reads the global product filter from useAppStore and exposes
 * helpers for filtering local mock data arrays consistently across all screens.
 *
 * Pattern:
 *  - selectedProductId: 'all' collapses to null (show everything)
 *  - filterByProductId  → for data with a `productId` field (store IDs, e.g. 'lig-2847')
 *  - filterByProductName → for data with a `product` field carrying the name ('LIG-2847')
 *  - matchesProductId / matchesProductName → single-item guards
 *  - allProducts → full product list for left-rail selectors
 *
 * @version 0.125.0
 */

import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '@/store/useAppStore';
import { useProducts } from '@/stores/products-store';
import type { Product } from '@/types/core';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProductFilter {
  /** Store ID of the selected product, or null when 'all' */
  selectedProductId: string | null;
  /** Full Product object for the selected product, or null */
  selectedProduct: Product | null;
  /** True when a specific product (not 'all') is selected */
  isFiltered: boolean;
  /** All products in the store — for left-rail selectors */
  allProducts: Product[];

  /**
   * Filter an array whose items have a `productId` store-ID field.
   * Pass-through when no specific product is selected.
   */
  filterByProductId: <T extends { productId?: string }>(items: T[]) => T[];

  /**
   * Filter an array whose items have a `product` display-name field
   * (e.g. 'LIG-2847', 'Nexavant (LIG-2847)', 'Nexavant').
   * Matching is case-insensitive and checks whether the field includes
   * either the product name or brand name.
   */
  filterByProductName: <T extends { product?: string }>(items: T[]) => T[];

  /**
   * Filter an array whose items have a `products` string[] field
   * (e.g. MedicalAffairs insight.products = ['Nexavant']).
   */
  filterByProductsArray: <T extends { products?: string[] }>(items: T[]) => T[];

  /** True when the given store product ID matches the filter (always true if 'all'). */
  matchesProductId: (productId: string) => boolean;

  /**
   * True when the given display name matches the selected product
   * (always true if 'all').
   */
  matchesProductName: (name: string) => boolean;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useProductFilter(): ProductFilter {
  const rawProductFilter = useAppStore(useShallow((s) => s.filters.product));
  const allProducts = useProducts();

  return useMemo(() => {
    const selectedProductId = rawProductFilter === 'all' ? null : rawProductFilter;
    const isFiltered = selectedProductId !== null;

    const selectedProduct = isFiltered
      ? (allProducts.find((p) => p.id === selectedProductId) ?? null)
      : null;

    // Build a set of candidate display strings for fast matching
    const nameTokens: string[] = selectedProduct
      ? [
          selectedProduct.name.toLowerCase(),           // 'lig-2847'
          (selectedProduct.brandName ?? '').toLowerCase(), // 'nexavant'
          (selectedProduct.genericName ?? '').toLowerCase(),
        ].filter(Boolean)
      : [];

    const nameMatchesSome = (value: string): boolean => {
      if (!isFiltered) return true;
      const v = value.toLowerCase();
      return nameTokens.some((t) => v.includes(t));
    };

    const filterByProductId = <T extends { productId?: string }>(items: T[]): T[] => {
      if (!isFiltered) return items;
      return items.filter((item) => item.productId === selectedProductId);
    };

    const filterByProductName = <T extends { product?: string }>(items: T[]): T[] => {
      if (!isFiltered) return items;
      return items.filter((item) => item.product !== undefined && nameMatchesSome(item.product));
    };

    const filterByProductsArray = <T extends { products?: string[] }>(items: T[]): T[] => {
      if (!isFiltered) return items;
      return items.filter(
        (item) => item.products !== undefined && item.products.some((p) => nameMatchesSome(p))
      );
    };

    const matchesProductId = (productId: string): boolean => {
      if (!isFiltered) return true;
      return productId === selectedProductId;
    };

    const matchesProductName = (name: string): boolean => {
      if (!isFiltered) return true;
      return nameMatchesSome(name);
    };

    return {
      selectedProductId,
      selectedProduct,
      isFiltered,
      allProducts,
      filterByProductId,
      filterByProductName,
      filterByProductsArray,
      matchesProductId,
      matchesProductName,
    };
  }, [rawProductFilter, allProducts]);
}
