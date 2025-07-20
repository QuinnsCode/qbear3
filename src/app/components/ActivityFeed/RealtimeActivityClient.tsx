"use client";

import { useEffect, useState } from "react";

interface ActivityItem {
  id: string;
  type: 'webhook' | 'order';
  createdAt: Date;
  [key: string]: any;
}

interface RealtimeActivityClientProps {
  organizationId: string;
  initialActivities: ActivityItem[];
}


export function RealtimeActivityClient({ organizationId, initialActivities }: RealtimeActivityClientProps) {
  const [activities, setActivities] = useState<ActivityItem[]>(initialActivities);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // useEffect(() => {
    
  //   const realtimeKey = `/dashboard`;
    
  //   const connectRealtime = async () => {
  //     try {
  //       console.log('🔌 Connecting to realtime with key:', realtimeKey);
        
  //       await initRealtimeClient({
  //         key: realtimeKey
  //       });
        
  //       setIsConnected(true);
  //       setConnectionError(null);
  //       console.log('✅ Realtime client connected');
        
  //     } catch (error) {
  //       console.error('🚨 Failed to connect realtime client:', error);
  //       setConnectionError('Failed to connect to real-time updates');
  //       setIsConnected(false);
        
  //       // Retry connection after a delay
  //       setTimeout(() => {
  //         console.log('🔄 Retrying realtime connection...');
  //         connectRealtime();
  //       }, 3000);
  //     }
  //   };

  //   connectRealtime();

  //   // The rwsdk realtime client will automatically trigger re-renders
  //   // when renderRealtimeClients() is called on the server side
  //   // So this component will re-render with fresh data automatically

  // }, [organizationId]);

  // Since rwsdk handles the real-time updates by re-rendering the server component,
  // we don't need to manually handle WebSocket messages here.
  // The component will receive fresh initialActivities when the server re-renders.

  useEffect(() => {
    // Update activities when initialActivities changes (from server re-render)
    setActivities(initialActivities);
  }, [initialActivities]);

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
            <span className="text-sm text-gray-500">
              {isConnected ? 'Live' : 'Disconnected'}
            </span>
            <a 
              href="?" 
              className="text-sm text-gray-400 hover:text-gray-600"
              title="Disable real-time updates"
            >
              ✕
            </a>
          </div>
        </div>
        {connectionError && (
          <div className="mt-2 text-sm text-red-600">
            {connectionError}
          </div>
        )}
      </div>
      
      <div className="p-6">
        {activities.length > 0 ? (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {activities.map((activity, index) => (
              <ActivityItem 
                key={activity.id} 
                activity={activity} 
                isNew={index === 0 && Date.now() - new Date(activity.createdAt).getTime() < 10000}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className="mt-4 text-sm font-medium text-gray-900">Waiting for activity...</h3>
            <p className="mt-2 text-sm text-gray-500">
              Webhook and order updates will appear here in real-time.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Activity item component
function ActivityItem({ activity, isNew }: { activity: ActivityItem; isNew?: boolean }) {
  const isWebhook = activity.type === 'webhook';
  
  return (
    <div className={`flex items-start space-x-3 transition-all duration-500 ${
      isNew ? 'bg-blue-50 rounded-lg p-2 -m-2 animate-pulse' : ''
    }`}>
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
                  {activity.processed ? (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                      Processed
                    </span>
                  ) : (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                      Processing...
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

// Helper functions (same as server component)
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