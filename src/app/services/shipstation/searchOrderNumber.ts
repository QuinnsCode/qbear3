import { env } from "cloudflare:workers";
import { createShipStationAPI } from "@/app/shipstation/shipstation";
import { db } from "@/db";

export const searchOrderNumber = async (orderNumber: string) => {
  try {
    // First, check D1 for existing order
    const existingOrder = await db.order.findUnique({
      where: { orderNumber },
      include: { notes: true },
    });

    if (existingOrder) {
      // Check if order data is recent (< 5 minutes old)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const isRecent = existingOrder.updatedAt > fiveMinutesAgo;

      if (isRecent) {
        // Return cached data as object, not Response
        return {
          ...JSON.parse(existingOrder.orderData),
          internalNotes: existingOrder.notes,
          source: 'cache'
        };
      }
    }

    // Data is stale or doesn't exist - fetch fresh from ShipStation API
    const shipstation = createShipStationAPI(env);
    const freshOrder = await shipstation.getOrderByNumber(orderNumber);
    
    if (freshOrder) {
      // Update/create in D1
      await db.order.upsert({
        where: { orderNumber },
        update: {
          orderData: JSON.stringify(freshOrder),
          status: freshOrder.orderStatus || 'unknown',
          storeId: freshOrder.advancedOptions?.storeId || 0,
          updatedAt: new Date(),
        },
        create: {
          orderNumber: freshOrder.orderNumber,
          shipstationId: freshOrder.orderId,
          orderData: JSON.stringify(freshOrder),
          status: freshOrder.orderStatus || 'unknown',
          storeId: freshOrder.advancedOptions?.storeId || 0,
        },
      });

      return {
        ...freshOrder,
        internalNotes: existingOrder?.notes || [],
        source: 'api'
      };
    }

    throw new Error('Order not found');

  } catch (error) {
    console.error('Search error:', error);
    throw error; // Let the route handler deal with the error
  }
}