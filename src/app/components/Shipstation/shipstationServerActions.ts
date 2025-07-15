"use server"

import { ShipStationResponse, Shipment } from "@/app/types/Shipstation/shipment";
import { createShipStationAPIFromOrg } from "@/app/shipstation/shipstation";

export async function fetchAwaitingShipments(organizationId: string): Promise<ShipStationResponse> {
  try {
    // Get the org-scoped ShipStation API instance
    const shipstation = await createShipStationAPIFromOrg(organizationId);
    
    // Build query params for awaiting shipments
    const today = new Date();
    const futureDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // Next 14 days
    
    const queryParams = new URLSearchParams({
      includeShipmentItems: 'true',
      sortBy: 'shipDate',
      sortDir: 'ASC',
      shipDateStart: today.toISOString().split('T')[0],
      shipDateEnd: futureDate.toISOString().split('T')[0]
    });

    // Call ShipStation API for shipments (not orders)
    const response = await fetch(`${shipstation.baseUrl}/shipments?${queryParams}`, {
      method: 'GET',
      headers: {
        'Authorization': shipstation.getAuthHeader(),
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ShipStation API Error: ${response.status} - ${errorText}`);
    }

    const data: ShipStationResponse = await response.json();
    return data;

  } catch (error) {
    console.error('Error fetching awaiting shipments:', error);
    
    // Fall back to mock data for development
    return fetchAwaitingShipmentsMock();
  }
}