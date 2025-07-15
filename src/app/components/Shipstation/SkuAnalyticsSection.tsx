import { Shipment } from '@/app/types/Shipstation/shipment';

interface SkuAnalytics {
  sku: string;
  totalQuantity: number;
  shipmentCount: number;
  productName: string;
  avgQuantityPerShipment: number;
}

interface SkuAnalyticsProps {
  shipments: Shipment[];
}

const SkuAnalyticsSection = ({ shipments }: SkuAnalyticsProps) => {
  // Create SKU analysis map
  const skuMap = new Map<string, {
    totalQuantity: number;
    shipmentCount: number;
    productNames: Set<string>;
  }>();

  // Process all shipment items
  shipments.forEach(shipment => {
    shipment.shipmentItems.forEach(item => {
      const existing = skuMap.get(item.sku) || {
        totalQuantity: 0,
        shipmentCount: 0,
        productNames: new Set<string>()
      };

      existing.totalQuantity += item.quantity;
      existing.shipmentCount += 1;
      existing.productNames.add(item.name);
      
      skuMap.set(item.sku, existing);
    });
  });

  // Convert to analytics array and sort by total quantity (descending)
  const skuAnalytics: SkuAnalytics[] = Array.from(skuMap.entries())
    .map(([sku, data]) => ({
      sku,
      totalQuantity: data.totalQuantity,
      shipmentCount: data.shipmentCount,
      productName: Array.from(data.productNames)[0], // Use first product name
      avgQuantityPerShipment: Number((data.totalQuantity / data.shipmentCount).toFixed(1))
    }))
    .sort((a, b) => b.totalQuantity - a.totalQuantity);

  const totalUniqueSkus = skuAnalytics.length;
  const totalItemsToShip = skuAnalytics.reduce((sum, sku) => sum + sku.totalQuantity, 0);
  const topSku = skuAnalytics[0];

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mb-6">
      {/* <h2 className="text-xl font-semibold text-gray-900 mb-4">SKU Analysis</h2> */}
      
      {/* Summary Stats */}
      <div className="grid grid-cols-3 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-600">Unique SKUs</h3>
          <p className="text-2xl font-bold text-blue-900">{totalUniqueSkus}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-green-600">Total Items to Ship</h3>
          <p className="text-2xl font-bold text-green-900">{totalItemsToShip}</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-purple-600">Top SKU</h3>
          <p className="text-lg font-bold text-purple-900">{topSku?.sku || 'N/A'}</p>
          <p className="text-sm text-purple-700">{topSku?.totalQuantity || 0} units</p>
        </div>
      </div>

      {/* SKU List */}
      <div>
        {/* <h3 className="text-lg font-medium text-gray-900 mb-3">SKU Breakdown</h3> */}
        <div className="space-y-3 max-h-48 overflow-y-auto border-2 border-black rounded-sm"> 
          {skuAnalytics.map((skuData, index) => (
            <div 
              key={skuData.sku} 
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-3">
                  <span className="text-xs font-medium text-gray-500 w-6">#{index + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 truncate">{skuData.sku}</p>
                    <p className="text-sm text-gray-500 truncate">{skuData.productName}</p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-6 text-sm">
                <div className="text-center">
                  <p className="font-semibold text-gray-900">{skuData.totalQuantity}</p>
                  <p className="text-xs text-gray-500">Total Qty</p>
                </div>
                <div className="text-center">
                  <p className="font-semibold text-gray-900">{skuData.shipmentCount}</p>
                  <p className="text-xs text-gray-500">Shipments</p>
                </div>
                <div className="text-center">
                  <p className="font-semibold text-gray-900">{skuData.avgQuantityPerShipment}</p>
                  <p className="text-xs text-gray-500">Avg/Shipment</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Raw Data (for debugging/development) */}
      <details className="mt-4">
        <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
          View Raw Data (Debug)
        </summary>
        <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto max-h-40">
          {JSON.stringify(skuAnalytics, null, 2)}
        </pre>
      </details>
    </div>
  );
};

export default SkuAnalyticsSection;