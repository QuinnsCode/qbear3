// @/lib/activityRealtime.ts
import { renderRealtimeClients } from "rwsdk/realtime/worker";
import { env } from "cloudflare:workers";

// Helper function to trigger activity feed updates
export async function notifyActivityUpdate(organizationId: string) {
  try {
    const realtimeKey = `/dashboard`;  // Match the client's key
    
    console.log('📡 Triggering activity feed update for org:', organizationId);
    console.log('🔑 Using realtime key:', realtimeKey);
    
    await renderRealtimeClients({
      durableObjectNamespace: env.REALTIME_DURABLE_OBJECT as any,
      key: realtimeKey,
    });
    
    console.log('✅ Activity feed update triggered successfully');
  } catch (error) {
    console.error('❌ Failed to trigger activity feed update:', error);
  }
}

// Specific helpers for different types of activities
export async function notifyWebhookReceived(organizationId: string, webhookId: string) {
  console.log(`📨 Webhook received notification for org ${organizationId}, webhook ${webhookId}`);
  await notifyActivityUpdate(organizationId);
}

export async function notifyWebhookProcessed(organizationId: string, webhookId: string, orderCount?: number) {
  console.log(`✅ Webhook processed notification for org ${organizationId}, webhook ${webhookId}, orders: ${orderCount}`);
  await notifyActivityUpdate(organizationId);
}

export async function notifyOrderUpdate(organizationId: string, orderId: number, action: 'created' | 'updated') {
  console.log(`📦 Order ${action} notification for org ${organizationId}, order ${orderId}`);
  await notifyActivityUpdate(organizationId);
}