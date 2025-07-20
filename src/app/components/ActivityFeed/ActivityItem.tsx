
interface ActivityItem {
  id: string;
  type: 'webhook' | 'order';
  createdAt: Date;
  [key: string]: any;
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

// Activity item component
export function ActivityItem({ activity }: { activity: ActivityItem }) {
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