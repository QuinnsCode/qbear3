import { Webhook, WebhookResourceType } from "@/app/api/shipstation/shipstationTypes";
import { getOrder } from "@/app/api/shipstation/shipstation";
import { db } from "@/db";
import { type AppContext } from "@/worker";
import { getOrgShipStationCredentials } from "@/lib/middlewareFunctions";

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

    // Store webhook in D1 with optional org scoping
    const webhook = await db.shipStationWebhook.create({
      data: {
        organizationId: ctx.organization?.id || null, // Nullable for now
        resourceUrl: webhookData.resource_url,
        resourceType: webhookData.resource_type,
        rawData: JSON.stringify(webhookData),
        processed: false
      }
    });

    console.log('✅ Webhook stored in D1:', webhook.id, 'for org:', ctx.organization?.slug || 'no-org');

    // Process the webhook and fetch order data
    await processWebhook(webhookData, webhook.id, ctx.organization);

    // Mark webhook as processed
    await db.shipStationWebhook.update({
      where: { id: webhook.id },
      data: { processed: true }
    });

    // Return success response
    return Response.json({ 
      message: "Webhook processed successfully",
      event_type: webhookData.resource_type,
      webhook_id: webhook.id,
      organization: ctx.organization?.slug || 'no-org'
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
  organization?: { id: string; slug: string | null; name: string; } | null
) {
  try {
    // Extract order ID from resource URL
    const orderId = extractOrderIdFromUrl(webhookData.resource_url);
    
    if (!orderId) {
      console.warn('⚠️ Could not extract order ID from URL:', webhookData.resource_url);
      return;
    }

    console.log(`🔍 Processing ${webhookData.resource_type} for order ${orderId} in org ${organization?.slug || 'no-org'}`);

    let apiCredentials;
    
    // Try to get org-specific credentials, fallback to default
    if (organization?.id) {
      try {
        apiCredentials = await getOrgShipStationCredentials(organization.id);
        console.log('✅ Using org-specific ShipStation credentials');
      } catch (error) {
        console.warn('⚠️ No org-specific credentials found, using default:', error.message);
        // Fallback to default credentials from env
        apiCredentials = undefined; // This will use env credentials in getOrder
      }
    } else {
      console.log('⚠️ No organization context, using default credentials');
      apiCredentials = undefined;
    }

    // Fetch the response from ShipStation using appropriate credentials
    const response = await getOrder(orderId, apiCredentials);
    
    console.log('📦 Fetched order response:', response);
    
    // Handle the response structure - it contains an orders array
    if (!response.orders || !Array.isArray(response.orders) || response.orders.length === 0) {
      console.warn('⚠️ No orders found in response:', response);
      return;
    }

    // Process each order in the response
    for (const orderData of response.orders) {
      console.log(`📋 Processing order ${orderData.orderId} (${orderData.orderNumber}) for org ${organization?.slug || 'no-org'}`);
      
      // Check if order already exists for this org (or globally if no org)
      const existingOrder = await db.shipStationOrder.findFirst({
        where: { 
          orderId: orderData.orderId,
          organizationId: organization?.id || null
        }
      });

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
      } else {
        // Create new order
        await db.shipStationOrder.create({
          data: {
            organizationId: organization?.id || null,
            orderId: orderData.orderId,
            orderNumber: orderData.orderNumber,
            orderStatus: orderData.orderStatus,
            rawData: JSON.stringify(orderData)
          }
        });
      }

      console.log('✅ Order stored/updated in D1:', {
        org: organization?.slug || 'no-org',
        orderId: orderData.orderId,
        orderNumber: orderData.orderNumber,
        status: orderData.orderStatus
      });

      // Handle specific webhook types if needed
      switch (webhookData.resource_type) {
        case 'SHIP_NOTIFY':
          console.log('🚚 Order shipped:', orderData.orderNumber, 'for org:', organization?.slug || 'no-org');
          // TODO: Send shipping notification email
          break;
        case 'ORDER_NOTIFY':
          console.log('📦 Order updated:', orderData.orderNumber, 'for org:', organization?.slug || 'no-org');
          // TODO: Handle order status changes
          break;
        // Add other cases as needed
      }
    }

  } catch (error) {
    console.error('❌ Error processing webhook for org', organization?.slug || 'no-org', ':', error);
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