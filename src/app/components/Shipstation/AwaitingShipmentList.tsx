import ShipmentCard from './ShipmentCard';
import SkuAnalyticsSection from './SkuAnalyticsSection';
import { fetchAwaitingShipments } from './shipstationServerActions';

const AwaitingShipmentList = async ({ organizationId }: { organizationId: string }) => {
  const data = await fetchAwaitingShipments(organizationId);
  
  return (
    <div className="min-h-screen bg-gray-100 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 pt-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Shipstation - Awaiting Shipments</h1>
          <p className="text-gray-600">
            {data.total} shipment{data.total !== 1 ? 's' : ''} ready to ship
          </p>
        </div>

        {/* SKU Analytics Section */}
        {data.shipments.length > 0 && (
          <SkuAnalyticsSection shipments={data.shipments} />
        )}

        {/* Shipments List */}
        <div className="space-y-3">
          {data.shipments.map((shipment) => (
            <ShipmentCard key={shipment.shipmentId} shipment={shipment} />
          ))}
        </div>

        {/* Empty State */}
        {data.shipments.length === 0 && (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No shipments awaiting</h3>
            <p className="text-gray-500">All caught up! No shipments are currently awaiting to be shipped.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AwaitingShipmentList;