"use client";

import { useState } from 'react';

export type FeatureType = 'awaiting-shipments' | 'products' | 'analytics' | 'settings';

interface Feature {
  id: FeatureType;
  name: string;
  icon: React.ReactNode;
  description: string;
  color: string;
}

interface FeatureNavigationProps {
  initialFeature?: FeatureType;
  onFeatureChange: (feature: FeatureType) => void;
}

const FeatureNavigation = ({ initialFeature = 'awaiting-shipments', onFeatureChange }: FeatureNavigationProps) => {
  const [selectedFeature, setSelectedFeature] = useState<FeatureType>(initialFeature);

  const features: Feature[] = [
    {
      id: 'awaiting-shipments',
      name: 'Awaiting Shipments',
      description: 'View and manage pending shipments',
      color: 'bg-blue-500',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      )
    },
    {
      id: 'products',
      name: 'Products',
      description: 'Browse your product catalog',
      color: 'bg-green-500',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      )
    },
    {
      id: 'analytics',
      name: 'Analytics',
      description: 'View shipping analytics and reports',
      color: 'bg-purple-500',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    {
      id: 'settings',
      name: 'Settings',
      description: 'Configure ShipStation settings',
      color: 'bg-gray-500',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    }
  ];

  const handleFeatureSelect = (feature: FeatureType) => {
    setSelectedFeature(feature);
    onFeatureChange(feature);
  };

  return (
    <>
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">ShipStation Dashboard</h1>
        </div>
        
        {/* Feature Carousel */}
        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex space-x-4 px-4 pb-4 min-w-max">
            {features.map((feature) => (
              <button
                key={feature.id}
                onClick={() => handleFeatureSelect(feature.id)}
                className={`flex-shrink-0 w-32 h-32 rounded-2xl p-4 transition-all duration-200 transform ${
                  selectedFeature === feature.id
                    ? `${feature.color} text-white shadow-lg scale-105`
                    : 'bg-white text-gray-600 shadow-md hover:shadow-lg hover:scale-102'
                }`}
              >
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="mb-2">
                    {feature.icon}
                  </div>
                  <p className="text-xs font-medium leading-tight">
                    {feature.name}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Add custom scrollbar hiding */}
      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .hover\\:scale-102:hover {
          transform: scale(1.02);
        }
      `}</style>
    </>
  );
};

export default FeatureNavigation;