// @/app/api/shipstation/shipstation.ts
import { Order } from "./shipstationTypes"; 
import { ShipStationResponse } from "@/app/types/Shipstation/shipment";
import { env } from "cloudflare:workers";

// ShipStation API utilities
const SHIPSTATION_API_BASE = "https://ssapi.shipstation.com";

// ShipStation API response wrapper
interface ShipStationOrderResponse {
  orders: Order[];
  total: number;
  page: number;
  pages: number;
}

async function shipstationRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const apiKey = env.SHIPSTATION_API_KEY;
  
  if (!apiKey) {
    throw new Error("SHIPSTATION_API_KEY environment variable is required");
  }

  const response = await fetch(`${SHIPSTATION_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': apiKey,
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

// ShipStation API methods
export async function getOrder(orderId: string, credentials?: { authString: string }) {
  const authHeader = credentials?.authString || env.SHIPSTATION_API_KEY;
  
  if (!authHeader) {
    throw new Error('ShipStation authentication not configured');
  }

  const response = await fetch(`https://ssapi.shipstation.com/orders/${orderId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${authHeader}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`ShipStation API error: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

export async function listOrders(params?: Record<string, any>): Promise<ShipStationOrderResponse> {
  const searchParams = new URLSearchParams(params);
  return shipstationRequest<ShipStationOrderResponse>(`/orders${searchParams.toString() ? `?${searchParams}` : ''}`);
}

export async function createOrder(orderData: Partial<Order>): Promise<Order> {
  return shipstationRequest<Order>('/orders/createorder', {
    method: 'POST',
    body: JSON.stringify(orderData),
  });
}

// Main handler for /api/shipstation/*
export default async function handler({ request, params, ctx }) {
  try {
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
            const order = await getOrder(resourceId);
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
            const orders = await listOrders(queryParams);
            return Response.json(orders);

          case 'POST':
            const orderData = await request.json();
            const newOrder = await createOrder(orderData);
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