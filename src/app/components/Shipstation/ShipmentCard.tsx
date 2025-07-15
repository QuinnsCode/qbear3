"use client";

import { useState } from 'react';
import { Shipment } from '@/app/types/Shipstation/shipment';

// Expandable shipment card component
const ShipmentCard = ({ shipment }: { shipment: Shipment }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Fixed formatOrderNumber - always returns a value
  const formatOrderNumber = (orderNumber: string) => {
    if (orderNumber.length > 15) {
      return orderNumber.substring(0, 15) + '...';
    }
    return orderNumber; // Always return the original if 15 chars or less
  };

  const getCarrierColor = (carrier: string) => {
    const colors: Record<string, string> = {
      ups: 'bg-yellow-100 text-yellow-800',
      fedex: 'bg-purple-100 text-purple-800',
      usps: 'bg-blue-100 text-blue-800',
      dhl: 'bg-red-100 text-red-800'
    };
    return colors[carrier] || 'bg-gray-100 text-gray-800';
  };

  const totalItems = shipment.shipmentItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow duration-200">
      {/* Card Header - Always Visible */}
      <div 
        className="px-4 py-2 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Order Number */}
            <div>
              <h2 
                className="font-semibold text-gray-900 text-lg"
                title={shipment.orderNumber} // Show full number on hover
              >
                {formatOrderNumber(shipment.orderNumber)}
              </h2>
              <p className="text-sm text-gray-500">Order #{shipment.orderId}</p>
            </div>
            
            {/* Ship Date */}
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-sm font-medium text-gray-600">
                Ships: {formatDate(shipment.shipDate)}
              </span>
            </div>

            {/* Warehouse ID */}
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H9m11 0v-3.5a2 2 0 00-2-2h-1m-4 0H7a2 2 0 00-2 2V21m-1 0h4m-2 0v-3h2v3" />
              </svg>
              <span className="text-sm text-gray-600">WH: {shipment.warehouseId}</span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Carrier Badge */}
            <span className={`px-2 py-1 rounded-full text-xs font-medium uppercase ${getCarrierColor(shipment.carrierCode)}`}>
              {shipment.carrierCode}
            </span>

            {/* Items Count */}
            <span className="text-sm text-gray-500">
              {totalItems} item{totalItems !== 1 ? 's' : ''}
            </span>

            {/* Expand/Collapse Icon */}
            <svg 
              className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          {/* Shipping Details */}
          <div className="mb-4">
            <h4 className="font-medium text-gray-900 mb-2">Shipping Details</h4>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
              <div>
                <span className="text-gray-500">Service:</span>
                <span className="ml-1 font-medium">{shipment.serviceCode.replace(/_/g, ' ').toUpperCase()}</span>
              </div>
              <div>
                <span className="text-gray-500">Cost:</span>
                <span className="ml-1 font-medium">${shipment.shipmentCost.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-gray-500">Weight:</span>
                <span className="ml-1 font-medium">{shipment.weight.value} {shipment.weight.units}</span>
              </div>
              <div>
                <span className="text-gray-500">Tracking:</span>
                <span className="ml-1 font-medium font-mono text-xs">{shipment.trackingNumber}</span>
              </div>
            </div>
          </div>

          {/* Ship To Address */}
          <div className="mb-4">
            <h4 className="font-medium text-gray-900 mb-2">Ship To</h4>
            <div className="text-sm text-gray-600">
              <p className="font-medium">{shipment.shipTo.name}</p>
              {shipment.shipTo.company && <p>{shipment.shipTo.company}</p>}
              <p>{shipment.shipTo.street1}</p>
              <p>{shipment.shipTo.city}, {shipment.shipTo.state} {shipment.shipTo.postalCode}</p>
              <p>{shipment.shipTo.country}</p>
            </div>
          </div>

          {/* Items List */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Items ({totalItems})</h4>
            <div className="space-y-3">
              {shipment.shipmentItems && shipment.shipmentItems.map((item) => (
                <div key={item.orderItemId} className="flex items-center space-x-3 bg-white p-3 rounded-lg border">
                  {/* Product Image */}
                  {item.imageUrl ? (
                    <img 
                      src={item.imageUrl} 
                      alt={item.name}
                      className="w-12 h-12 object-cover rounded-md border border-gray-200"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  {/* Fallback placeholder div */}
                  <div className={`w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-md border border-gray-200 flex items-center justify-center ${item.imageUrl ? 'hidden' : ''}`}>
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  
                  {/* Item Details */}
                  <div className="flex-1 min-w-0">
                    <h5 className="font-medium text-gray-900 truncate">{item.name}</h5>
                    <p className="text-sm text-gray-500">SKU: {item.sku}</p>
                    <div className="flex items-center space-x-4 text-xs text-gray-400 mt-1">
                      <span>Qty: {item.quantity}</span>
                      <span>${item.unitPrice.toFixed(2)} each</span>
                      {item.warehouseLocation && <span>Loc: {item.warehouseLocation}</span>}
                    </div>
                  </div>

                  {/* Item Total */}
                  <div className="text-right">
                    <p className="font-medium text-gray-900">
                      ${(item.quantity * item.unitPrice).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShipmentCard;