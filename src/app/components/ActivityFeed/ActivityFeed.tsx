import { db } from "@/db";
import { RealtimeActivityClient } from "./RealtimeActivityClient";

interface ActivityFeedProps {
  organizationId: string;
  enableRealtime?: boolean;
}

interface WebhookActivity {
  id: string;
  resourceType: string;
  resourceUrl: string;
  processed: boolean;
  createdAt: Date;
  orderCount?: number;
  orderNumbers?: string[];
}

interface OrderActivity {
  id: string;
  orderId: number;
  orderNumber: string;
  orderStatus: string;
  action: 'created' | 'updated';
  createdAt: Date;
}

type ActivityItem = (WebhookActivity | OrderActivity) & { type: 'webhook' | 'order' };

// Server Component - fetches initial data
export default async function ActivityFeed({ organizationId, enableRealtime = false }: ActivityFeedProps) {
  // Fetch recent webhook activity
  const recentWebhooks = await db.shipStationWebhook.findMany({
    where: {
      organizationId: organizationId
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 20
  });

  // Fetch recent order updates
  const recentOrders = await db.shipStationOrder.findMany({
    where: {
      organizationId: organizationId
    },
    orderBy: {
      updatedAt: 'desc'
    },
    take: 20
  });

  // Transform webhook data
  const webhookActivities: WebhookActivity[] = recentWebhooks.map(webhook => {
    let orderCount = 0;
    let orderNumbers: string[] = [];
    
    // Try to extract order info from rawData
    try {
      if (webhook.rawData) {
        const rawData = JSON.parse(webhook.rawData);
        if (webhook.resourceUrl.includes('?importBatch=')) {
          orderCount = 1; // We'll update this when we get the actual response
        } else {
          orderCount = 1;
        }
      }
    } catch (e) {
      // Handle parsing errors
    }

    return {
      id: webhook.id,
      resourceType: webhook.resourceType,
      resourceUrl: webhook.resourceUrl,
      processed: webhook.processed,
      createdAt: webhook.createdAt,
      orderCount,
      orderNumbers
    };
  });

  // Transform order data
  const orderActivities: OrderActivity[] = recentOrders.map(order => ({
    id: order.id,
    orderId: order.orderId,
    orderNumber: order.orderNumber || `Order ${order.orderId}`,
    orderStatus: order.orderStatus || 'unknown',
    action: 'updated' as const,
    createdAt: order.updatedAt
  }));

  // Combine and sort activities by date
  const allActivities: ActivityItem[] = [
    ...webhookActivities.map(a => ({ ...a, type: 'webhook' as const })),
    ...orderActivities.map(a => ({ ...a, type: 'order' as const }))
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (enableRealtime) {
    // Return the client component for real-time updates using rwsdk
    return (
      <RealtimeActivityClient 
        organizationId={organizationId}
        initialActivities={allActivities}
      />
    );
  }

  // Static server component
  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
      </div>
      <div className="p-6">
        {allActivities.length > 0 ? (
          <div className="space-y-4">
            {allActivities.slice(0, 10).map((activity) => (
              <ActivityItem key={activity.id} activity={activity} />
            ))}
            
            {allActivities.length > 10 && (
              <div className="text-center pt-4">
                <button className="text-sm text-blue-600 hover:text-blue-500">
                  View all activity
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className="mt-4 text-sm font-medium text-gray-900">No recent activity</h3>
            <p className="mt-2 text-sm text-gray-500">
              Webhook and order activity will appear here as it happens.
            </p>
            <div className="mt-4">
              <a 
                href="?realtime=true" 
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
              >
                Enable Real-time Updates
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Activity item component
function ActivityItem({ activity }: { activity: ActivityItem }) {
  const isWebhook = activity.type === 'webhook';
  
  return (
    <div className="flex items-start space-x-3">
      <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${
        isWebhook 
          ? activity.processed 
            ? 'bg-green-400' 
            : 'bg-yellow-400'
          : 'bg-blue-400'
      }`} />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            {isWebhook ? (
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {getWebhookTypeLabel(activity.resourceType)} Webhook
                  {activity.processed && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                      Processed
                    </span>
                  )}
                </p>
                <p className="text-sm text-gray-500">
                  {activity.orderCount > 0 && `${activity.orderCount} order${activity.orderCount > 1 ? 's' : ''} • `}
                  {formatTimeAgo(activity.createdAt)}
                </p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Order {activity.orderNumber} {activity.action}
                  <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(activity.orderStatus)}`}>
                    {activity.orderStatus}
                  </span>
                </p>
                <p className="text-sm text-gray-500">
                  Order ID: {activity.orderId} • {formatTimeAgo(activity.createdAt)}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper functions
function getWebhookTypeLabel(resourceType: string): string {
  switch (resourceType) {
    case 'SHIP_NOTIFY':
      return 'Shipment';
    case 'ORDER_NOTIFY':
      return 'Order Update';
    case 'ITEM_ORDER_NOTIFY':
      return 'Item Order';
    default:
      return resourceType.replace('_', ' ');
  }
}

function getStatusColor(status: string): string {
  switch (status?.toLowerCase()) {
    case 'shipped':
      return 'bg-green-100 text-green-800';
    case 'awaiting_shipment':
      return 'bg-yellow-100 text-yellow-800';
    case 'on_hold':
      return 'bg-red-100 text-red-800';
    case 'cancelled':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-blue-100 text-blue-800';
  }
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - new Date(date).getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return 'Just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes}m ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}h ago`;
  } else {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days}d ago`;
  }
}