// @/app/shipstation/shipstation.ts
import { db } from "@/db";
import { decrypt } from '@/app/components/ThirdPartyApiKeys/thirdPartyApiKeyFunctions';
import { ShipStationOrder, ShipStationSearchOrderNumberResponse,ShipStationResponse } from "@/app/types/Shipstation/shipment"; 
import { ShipStationProductsResponse } from "@/app/types/Shipstation/product";

export class ShipStationAPI {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl: string = 'https://ssapi.shipstation.com/') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  private getAuthHeader(): string {
    return `${this.apiKey}`;
  }

  async getOrderByNumber(orderNumber: string): Promise<ShipStationOrder | null> {
    try {
      const response = await fetch(`${this.baseUrl}/orders?orderNumber=${encodeURIComponent(orderNumber)}`, {
        method: 'GET',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`ShipStation API error: ${response.status} ${response.statusText}`);
      }

      const data: ShipStationSearchOrderNumberResponse = await response.json();
      
      // Return the first matching order, or null if no orders found
      return data.orders.length > 0 ? data.orders[0] : null;
    } catch (error) {
      console.error('Error fetching order from ShipStation:', error);
      throw error;
    }
  }

  async getOrders(params: {
    orderStatus?: string;
    orderDateStart?: string;
    orderDateEnd?: string;
    page?: number;
    pageSize?: number;
  } = {}): Promise<ShipStationSearchOrderNumberResponse> {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });

    try {
      const response = await fetch(`${this.baseUrl}/orders?${queryParams.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`ShipStation API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching orders from ShipStation:', error);
      throw error;
    }
  }

  async getShipments(params: {
    includeShipmentItems?: boolean;
    sortBy?: string;
    sortDir?: string;
    shipDateStart?: string;
    shipDateEnd?: string;
    page?: number;
    pageSize?: number;
  } = {}): Promise<ShipStationResponse> {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });

    try {
      const response = await fetch(`${this.baseUrl}/shipments?${queryParams.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`ShipStation API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching shipments from ShipStation:', error);
      throw error;
    }
  }

  async getProducts(params: {
  sku?: string;
  name?: string;
  productCategoryId?: number;
  productTypeId?: number;
  tagId?: number;
  startDate?: string;
  endDate?: string;
  showInactive?: boolean;
  sortBy?: string;
  sortDir?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<ShipStationProductsResponse> {
  const queryParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      queryParams.append(key, value.toString());
    }
  });

  console.log('🔍 Fetching products with params:', params);

  console.log(this.baseUrl);

  try {
    // const reqStr = `${this.baseUrl}/products?${queryParams.toString()}`;

    const reqStr = `${this.baseUrl}/products?pageSize=100`;

    `${this.baseUrl}/products?${queryParams.toString()}`
    console.log('🔍 Requesting:', reqStr);
    const response = await fetch(reqStr, {
      method: 'GET',
      headers: {
        'Authorization': this.getAuthHeader(),
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`ShipStation API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching products from ShipStation:', error);
    throw error;
  }
}
}

export const createShipStationAPIFromOrg = async (organizationId: string) => {
  const apiKey = await db.thirdPartyApiKey.findFirst({
    where: {
      organizationId,
      service: 'shipstation',
      enabled: true
    }
  });

  if (!apiKey) {
    throw new Error(`No enabled ShipStation API key found for organization ${organizationId}`);
  }

  const decryptedAuth = decrypt(apiKey.encryptedAuth);
  
  // Update last used
  await db.thirdPartyApiKey.update({
    where: { id: apiKey.id },
    data: { lastUsed: new Date() }
  });

  return new ShipStationAPI(decryptedAuth);
};