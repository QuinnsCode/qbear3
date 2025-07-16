// @/app/api/shipstation/shipstation.ts
import { Order } from "./shipstationTypes"; 
import { ShipStationResponse } from "@/app/types/Shipstation/shipment";
import { getOrgShipStationCredentials } from "@/lib/middleware/shipstationMiddleware";

// ShipStation API utilities
const SHIPSTATION_API_BASE = "https://ssapi.shipstation.com";

// ShipStation API response wrapper
interface ShipStationOrderResponse {
  orders: Order[];
  total: number;
  page: number;
  pages: number;
}

// Unified ShipStation HTTP Client
class ShipStationClient {
  private organizationId: string;
  private credentials: { authString: string } | null = null;

  constructor(organizationId: string) {
    this.organizationId = organizationId;
  }

  // Get and cache credentials for this client instance
  private async getCredentials() {
    if (!this.credentials) {
      this.credentials = await getOrgShipStationCredentials(this.organizationId);
      
      if (!this.credentials?.authString) {
        throw new Error(`No ShipStation credentials configured for organization: ${this.organizationId}`);
      }
    }
    return this.credentials;
  }

  // Unified HTTP request method
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const credentials = await this.getCredentials();
    
    const response = await fetch(`${SHIPSTATION_API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': credentials.authString,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ShipStation API Error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  // Fetch from arbitrary ShipStation URLs (for webhook batch imports)
  async fetchUrl(url: string): Promise<any> {
    const credentials = await this.getCredentials();
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': credentials.authString,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`ShipStation API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  // API Methods
  async getOrder(orderId: string) {
    return this.request(`/orders/${orderId}`);
  }

  async listOrders(params?: Record<string, any>): Promise<ShipStationOrderResponse> {
    const searchParams = new URLSearchParams(params);
    return this.request<ShipStationOrderResponse>(
      `/orders${searchParams.toString() ? `?${searchParams}` : ''}`
    );
  }

  async createOrder(orderData: Partial<Order>): Promise<Order> {
    return this.request<Order>('/orders/createorder', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  }
}

// Legacy function exports for backwards compatibility
export async function getOrder(orderId: string, organizationId: string) {
  const client = new ShipStationClient(organizationId);
  return client.getOrder(orderId);
}

export async function listOrders(
  organizationId: string,
  params?: Record<string, any>
): Promise<ShipStationOrderResponse> {
  const client = new ShipStationClient(organizationId);
  return client.listOrders(params);
}

export async function createOrder(
  organizationId: string,
  orderData: Partial<Order>
): Promise<Order> {
  const client = new ShipStationClient(organizationId);
  return client.createOrder(orderData);
}

// Export the client class for direct use
export { ShipStationClient };

// Main handler for /api/shipstation/*
export default async function handler({ request, params, ctx }) {
  try {
    // Require organization context
    if (!ctx.organization?.id) {
      return Response.json(
        { error: "Organization context required for ShipStation API access" },
        { status: 400 }
      );
    }

    // Create client instance for this organization
    const client = new ShipStationClient(ctx.organization.id);

    // Extract path from URL params
    const apiPath = params["*"]; // This captures everything after /api/shipstation/
    
    if (!apiPath) {
      return Response.json(
        { error: "API endpoint not specified" },
        { status: 400 }
      );
    }

    // Parse the route - expecting formats like "order/12345", "orders", etc.
    const pathParts = apiPath.split('/');
    const resource = pathParts[0];
    const resourceId = pathParts[1];

    // Handle different resources and HTTP methods
    switch (resource) {
      case 'order':
        if (!resourceId) {
          return Response.json(
            { error: "Order ID is required. Use /api/shipstation/order/:orderId" },
            { status: 400 }
          );
        }

        // Validate orderId is numeric
        if (!/^\d+$/.test(resourceId)) {
          return Response.json(
            { error: "Order ID must be numeric" },
            { status: 400 }
          );
        }

        switch (request.method) {
          case 'GET':
            const order = await client.getOrder(resourceId);
            return Response.json(order);

          default:
            return Response.json(
              { error: `Method ${request.method} not allowed for order resource` },
              { status: 405 }
            );
        }

      case 'orders':
        switch (request.method) {
          case 'GET':
            const url = new URL(request.url);
            const queryParams = Object.fromEntries(url.searchParams);
            const orders = await client.listOrders(queryParams);
            return Response.json(orders);

          case 'POST':
            const orderData = await request.json();
            const newOrder = await client.createOrder(orderData);
            return Response.json(newOrder);

          default:
            return Response.json(
              { error: `Method ${request.method} not allowed for orders resource` },
              { status: 405 }
            );
        }

      default:
        return Response.json(
          { 
            error: "Unknown resource", 
            available: ["order/:id", "orders"],
            requested: resource 
          },
          { status: 404 }
        );
    }

  } catch (error) {
    console.error('ShipStation API Error:', error);
    
    return Response.json(
      { 
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}