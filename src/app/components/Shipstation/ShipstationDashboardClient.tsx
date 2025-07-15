"use client";

import { Suspense, useState } from 'react';
import AwaitingShipmentList from './AwaitingShipmentList';
import ProductsList from './ProductsList';
import FeatureNavigation, { FeatureType } from './FeatureNavigation';

// Loading component for server components
const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-8 min-h-[400px]">
    <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
    <span className="ml-3 text-gray-600">Loading...</span>
  </div>
);

// Placeholder components for features not yet implemented
const AnalyticsPlaceholder = () => (
  <div className="min-h-screen bg-gray-100 px-4">
    <div className="max-w-7xl mx-auto pt-6">
      <div className="text-center py-12">
        <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 mb-1">Analytics Coming Soon</h3>
        <p className="text-gray-500">Advanced shipping analytics and reporting features will be available here.</p>
      </div>
    </div>
  </div>
);

const SettingsPlaceholder = () => (
  <div className="min-h-screen bg-gray-100 px-4">
    <div className="max-w-7xl mx-auto pt-6">
      <div className="text-center py-12">
        <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 mb-1">Settings Coming Soon</h3>
        <p className="text-gray-500">ShipStation configuration and settings will be available here.</p>
      </div>
    </div>
  </div>
);


// Client wrapper component to handle navigation state
const ShipstationDashboardClient = ({ organizationId }: { organizationId: string }) => {
  "use client";
  
  const [currentFeature, setCurrentFeature] = useState<FeatureType>('awaiting-shipments');

  const renderContent = () => {
    switch (currentFeature) {
      case 'awaiting-shipments':
        return <AwaitingShipmentList organizationId={organizationId} />;
      case 'products':
        return <ProductsList organizationId={organizationId} />;
      case 'analytics':
        return <AnalyticsPlaceholder />;
      case 'settings':
        return <SettingsPlaceholder />;
      default:
        return <AwaitingShipmentList organizationId={organizationId} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <FeatureNavigation 
        onFeatureChange={setCurrentFeature}
        initialFeature="awaiting-shipments"
      />
      
      <div className="transition-opacity duration-300">
        <Suspense fallback={<LoadingSpinner />}>
          {renderContent()}
        </Suspense>
      </div>
    </div>
  );
};

export default ShipstationDashboardClient;