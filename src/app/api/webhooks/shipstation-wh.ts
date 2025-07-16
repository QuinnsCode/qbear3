import { Webhook, WebhookResourceType } from "@/app/api/shipstation/shipstationTypes";
import { ShipStationClient } from "@/app/api/shipstation/shipstation";
import { db } from "@/db";
import { type AppContext } from "@/worker";
import { notifyWebhookReceived, notifyWebhookProcessed, notifyOrderUpdate } from "@/lib/realtime/activityRealtime";

// Webhook handler for /api/webhooks/shipstation-wh.ts
export default async function handler({ 
  request, 
  params, 
  ctx 
}: { 
  request: Request; 
  params: any; 
  ctx: AppContext;
}) {
  if (request.method !== 'POST') {
    return Response.json(
      { error: "Method not allowed. Webhooks must use POST." },
      { status: 405 }
    );
  }

  try {
    // Parse the webhook payload
    const webhookData: Webhook = await request.json();
    
    console.log('📨 ShipStation webhook received:', {
      organization: ctx.organization?.slug || 'no-org',
      resource_type: webhookData.resource_type,
      resource_url: webhookData.resource_url
    });

    // Validate required fields
    if (!webhookData.resource_type || !webhookData.resource_url) {
      return Response.json(
        { error: "Invalid webhook payload. Missing resource_type or resource_url." },
        { status: 400 }
      );
    }

    // Require organization context for webhook processing
    if (!ctx.organization?.id) {
      console.error('❌ No organization context provided - cannot process webhook without org');
      return Response.json(
        { error: "Organization context required for webhook processing" },
        { status: 400 }
      );
    }

    // Store webhook in D1 with required org scoping
    const webhook = await db.shipStationWebhook.create({
      data: {
        organizationId: ctx.organization.id, 
        resourceUrl: webhookData.resource_url,
        resourceType: webhookData.resource_type,
        rawData: JSON.stringify(webhookData),
        processed: false
      }
    });

    console.log('✅ Webhook stored in D1:', webhook.id, 'for org:', ctx.organization.slug);

    // 🚀 NOTIFY: Webhook received
    await notifyWebhookReceived(ctx.organization.id, webhook.id);

    // Process the webhook and fetch order data
    const orderCount = await processWebhook(webhookData, webhook.id, ctx.organization);

    // Mark webhook as processed
    await db.shipStationWebhook.update({
      where: { id: webhook.id },
      data: { processed: true }
    });

    // 🚀 NOTIFY: Webhook processed
    await notifyWebhookProcessed(ctx.organization.id, webhook.id, orderCount);

    // Return success response
    return Response.json({ 
      message: "Webhook processed successfully",
      event_type: webhookData.resource_type,
      webhook_id: webhook.id,
      organization: ctx.organization.slug,
      orders_processed: orderCount
    });

  } catch (error) {
    console.error('❌ ShipStation webhook error:', error);
    
    return Response.json(
      { 
        error: "Internal server error processing webhook",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

async function processWebhook(
  webhookData: Webhook, 
  webhookId: string,
  organization: { id: string; slug: string | null; name: string; }
): Promise<number> {
  try {
    console.log(`🔍 Processing ${webhookData.resource_type} for URL ${webhookData.resource_url} in org ${organization.slug || 'no-org'}`);

    // Create ShipStation client for this organization
    const client = new ShipStationClient(organization.id);
    console.log('✅ Created ShipStation client for organization:', organization.slug);

    // Check if this is a batch import URL or a single order URL
    const isBatchImport = webhookData.resource_url.includes('?importBatch=');
    
    let response;
    
    if (isBatchImport) {
      // For batch imports, we need to fetch from the exact URL provided
      console.log('📥 Batch import detected, fetching orders from:', webhookData.resource_url);
      response = await client.fetchUrl(webhookData.resource_url);
    } else {
      // For single order webhooks, extract the order ID and use existing logic
      const orderId = extractOrderIdFromUrl(webhookData.resource_url);
      
      if (!orderId) {
        console.warn('⚠️ Could not extract order ID from URL:', webhookData.resource_url);
        return 0;
      }

      console.log(`🔍 Processing single order ${orderId}`);
      response = await client.getOrder(orderId);
    }
    
    console.log('📦 Fetched order response:', {
      total: response.total,
      page: response.page,
      pages: response.pages,
      ordersCount: response.orders?.length || 0
    });
    
    // Handle the response structure - it contains an orders array
    if (!response.orders || !Array.isArray(response.orders) || response.orders.length === 0) {
      console.warn('⚠️ No orders found in response:', {
        total: response.total,
        page: response.page,
        pages: response.pages,
        hasOrders: !!response.orders,
        ordersLength: response.orders?.length || 0
      });
      return 0;
    }

    console.log(`📋 Processing ${response.orders.length} orders from page ${response.page} of ${response.pages} (total: ${response.total})`);

    // Check if there are more pages to process
    if (response.pages > 1 && response.page < response.pages) {
      console.log(`⚠️ More pages available - currently on page ${response.page} of ${response.pages}`);
      // TODO: Consider implementing pagination handling if needed
    }

    let processedCount = 0;

    // Process each order in the response
    for (const orderData of response.orders) {
      console.log(`📋 Processing order ${orderData.orderId} (${orderData.orderNumber}) for org ${organization.slug || 'no-org'}`);
      
      // Check if order already exists for this org
      const existingOrder = await db.shipStationOrder.findFirst({
        where: { 
          orderId: orderData.orderId, 
          organizationId: organization.id 
        }
      });

      let isNew = false;

      if (existingOrder) {
        // Update existing order
        await db.shipStationOrder.update({
          where: { id: existingOrder.id },
          data: {
            orderNumber: orderData.orderNumber,
            orderStatus: orderData.orderStatus,
            rawData: JSON.stringify(orderData),
            updatedAt: new Date()
          }
        });
        
        console.log('🔄 Updated existing order:', orderData.orderId);
        
        // 🚀 NOTIFY: Order updated
        await notifyOrderUpdate(organization.id, orderData.orderId, 'updated');
      } else {
        // Create new order
        await db.shipStationOrder.create({
          data: {
            organizationId: organization.id,
            orderId: orderData.orderId,
            orderNumber: orderData.orderNumber,
            orderStatus: orderData.orderStatus,
            rawData: JSON.stringify(orderData)
          }
        });
        
        console.log('✅ Created new order:', orderData.orderId);
        isNew = true;
        
        // 🚀 NOTIFY: Order created
        await notifyOrderUpdate(organization.id, orderData.orderId, 'created');
      }

      processedCount++;

      // Handle specific webhook types with access to full order data
      switch (webhookData.resource_type) {
        case 'SHIP_NOTIFY':
          console.log('🚚 Order shipped:', orderData.orderNumber, 'for org:', organization.slug);
          console.log('📅 Ship date:', orderData.shipDate);
          console.log('📦 Tracking:', orderData.trackingNumber || 'No tracking');
          // TODO: Send shipping notification email with tracking info
          break;
        case 'ORDER_NOTIFY':
          console.log('📦 Order updated:', orderData.orderNumber, 'for org:', organization.slug);
          console.log('📊 Status:', orderData.orderStatus);
          console.log('💰 Total:', orderData.orderTotal);
          // TODO: Handle order status changes
          break;
        // Add other cases as needed
      }
    }

    return processedCount;

  } catch (error) {
    console.error('❌ Error processing webhook for org', organization.slug || 'no-org', ':', error);
    throw error;
  }
}

// Utility function to extract order ID from ShipStation resource URL
function extractOrderIdFromUrl(resourceUrl: string): string | null {
  try {
    // Expected format: https://ssapi.shipstation.com/orders/{orderId}
    const urlParts = resourceUrl.split('/');
    const orderId = urlParts[urlParts.length - 1];
    
    // Validate it's numeric
    if (/^\d+$/.test(orderId)) {
      return orderId;
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting order ID from URL:', resourceUrl, error);
    return null;
  }
}