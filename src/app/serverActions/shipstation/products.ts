"use server"

import { ShipStationProductsResponse } from "@/app/types/Shipstation/product";
import { createShipStationAPIFromOrg } from "@/app/shipstation/shipstation";

export async function fetchProducts(
  organizationId: string,
  params: {
    sku?: string;
    name?: string;
    productCategoryId?: number;
    showInactive?: boolean;
    sortBy?: string;
    sortDir?: string;
    page?: number;
    pageSize?: number;
  } = {}
): Promise<ShipStationProductsResponse> {
  try {
    console.log('Fetching products for organization:', organizationId);
    
    // Get the org-scoped ShipStation API instance
    const shipstation = await createShipStationAPIFromOrg(organizationId);
    
    // Default parameters for better UX
    const defaultParams = {
      showInactive: false,
      sortBy: 'name',
      sortDir: 'ASC',
      pageSize: 50,
      ...params
    };

    console.log('Using parameters:', defaultParams);

    // Call the products API using org credentials
    const response = await shipstation.getProducts(defaultParams);
    console.log('Received response:', response);

    return response;

  } catch (error) {
    console.error('Error fetching products:', error);
    
    // Fall back to empty data for development
    return {
      products: [],
      total: 0,
      page: 1,
      pages: 0
    };
  }
}