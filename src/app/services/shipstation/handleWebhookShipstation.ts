import { db } from "@/db";

interface ShipStationWebhookPayload {
  resource_url: string;
  resource_type: 'ORDER_NOTIFY' | 'ITEM_ORDER_NOTIFY' | 'SHIP_NOTIFY' | 'ITEM_SHIP_NOTIFY' | 'FULFILLMENT_SHIPPED' | 'FULFILLMENT_REJECTED';
}

interface ShipStationOrder {
  orderId: number;
  orderNumber: string;
  orderStatus?: string;
  customerEmail?: string;
  advancedOptions?: {
    storeId?: number;
  };
  [key: string]: any; // Allow additional properties
}

interface ShipStationResponse {
  orders?: ShipStationOrder[];
  orderId?: number;
  orderNumber?: string;
  orderStatus?: string;
  customerEmail?: string;
  advancedOptions?: {
    storeId?: number;
  };
  [key: string]: any; // Allow additional properties
}

export const handleWebhookShipstation = async (request: Request, env: any) => {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const payload = await request.json() as ShipStationWebhookPayload;
    console.log('Received webhook payload:', JSON.stringify(payload, null, 2));
    
    if (payload.resource_url === "test") {
      console.log("Test webhook received");
      return new Response('OK', { status: 200 });
    }

    // Store the webhook trigger
    const webhook = await db.shipstationWebhookResponse.create({
      data: {
        resourceUrl: payload.resource_url,
        resourceType: payload.resource_type,
      },
    });

    // Fetch the actual data from ShipStation using Basic Auth
    const authHeader = `${env.SHIPSTATION_API_KEY}`;

    
    console.log('Fetching data from:', payload.resource_url);
    
    const response = await fetch(payload.resource_url, {
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const orderData = await response.json() as ShipStationResponse;
      console.log('Fetched order data:', JSON.stringify(orderData, null, 2));
      
      // Update webhook with the fetched data
      await db.shipstationWebhookResponse.update({
        where: { id: webhook.id },
        data: {
          orderData: JSON.stringify(orderData),
          processed: true,
          updatedAt: new Date(),
        },
      });

      // Now process the order data for your Order table
      if (payload.resource_type.includes('ORDER')) {
        if (orderData.orders) {
          console.log(`Processing ${orderData.orders.length} orders`);
          for (const order of orderData.orders) {
            await processOrderData(order);
          }
        } else if (orderData.orderId && orderData.orderNumber) {
          console.log('Processing single order:', orderData.orderId);
          await processOrderData(orderData);
        }
      }
    } else {
      console.error('Failed to fetch from ShipStation:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Error response:', errorText);
    }

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response('Error processing webhook', { status: 500 });
  }
}

async function processOrderData(orderData: ShipStationOrder | ShipStationResponse) {
  // Extract the order properties, handling both single order and response formats
  const orderId = 'orderId' in orderData ? orderData.orderId : undefined;
  const orderNumber = 'orderNumber' in orderData ? orderData.orderNumber : undefined;
  
  console.log('Processing order:', orderId, orderNumber);
  
  // Extract order info and store in Order table
  if (orderId && orderNumber) {
    // Extract storeId from advancedOptions
    const storeId = orderData.advancedOptions?.storeId || 0;
    
    try {
      const result = await db.order.upsert({
        where: { shipstationId: orderId },
        update: {
          orderData: JSON.stringify(orderData),
          status: orderData.orderStatus || 'unknown',
          storeId: storeId,
          updatedAt: new Date(),
        },
        create: {
          orderNumber: orderNumber,
          shipstationId: orderId,
          orderData: JSON.stringify(orderData),
          status: orderData.orderStatus || 'unknown',
          storeId: storeId,
        },
      });
      
      console.log('Successfully processed order:', orderId, 'storeId:', storeId);
    } catch (error) {
      console.error('Error processing order:', orderId, error);
    }
  } else {
    console.warn('Skipping order - missing orderId or orderNumber:', { orderId, orderNumber });
  }
}