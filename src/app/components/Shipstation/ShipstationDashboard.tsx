import { Suspense } from 'react';
import AwaitingShipmentList from './AwaitingShipmentList';
import ProductsList from './ProductsList';

interface ShipStationDashboardProps {
  organizationId: string;
  searchParams?: {
    view?: string;
  };
}

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

// Main server component with URL param support
const ShipStationDashboard = async ({ organizationId, searchParams }: ShipStationDashboardProps) => {
  
  // Server-side logic:
  // - Check user permissions for organizationId
  // - Server-side logging/monitoring
  // - Validate organization access
  
  // Get current view from URL params (default to awaiting-shipments)
  const currentView = searchParams?.view || '';
  
  // Define navigation items
  const navItems = [
    { id: 'awaiting-shipments', name: 'Awaiting Shipments', color: 'bg-blue-500' },
    { id: 'products', name: 'Products', color: 'bg-green-500' },
    { id: 'analytics', name: 'Analytics', color: 'bg-purple-500' },
    { id: 'settings', name: 'Settings', color: 'bg-gray-500' }
  ];

  // Render content based on current view
  const renderContent = () => {
    switch (currentView) {
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
      {/* Header with clickable navigation */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">ShipStation Dashboard</h1>
        </div>
        
        {/* Clickable Feature Carousel */}
        <div className="overflow-x-auto">
          <div className="flex space-x-4 px-4 pb-4 min-w-max">
            {navItems.map((item) => {
              const isActive = currentView === item.id;
              const href = item.id === 'awaiting-shipments' ? '/shipstation' : `/shipstation?view=${item.id}`;
              
              return (
                <a
                  key={item.id}
                  href={href}
                  className={`flex-shrink-0 w-32 h-32 rounded-2xl p-4 transition-all duration-200 hover:shadow-lg ${
                    isActive
                      ? `${item.color} text-white shadow-lg scale-105`
                      : 'bg-white text-gray-600 shadow-md hover:scale-102'
                  }`}
                >
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="mb-2">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {item.id === 'analytics' ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        ) : item.id === 'settings' ? (
                          <>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </>
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        )}
                      </svg>
                    </div>
                    <p className="text-xs font-medium leading-tight">
                      {item.name}
                    </p>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* Content Area - Renders based on current view */}
      <div>
        <Suspense fallback={<LoadingSpinner />}>
          {renderContent()}
        </Suspense>
      </div>
    </div>
  );
};

export default ShipStationDashboard;