interface ShipStationOrder {
  orderId: number;
  orderNumber: string;
  orderKey: string;
  orderDate: string;
  orderStatus: string;
  customerUsername: string;
  customerEmail: string;
  billTo: {
    name: string;
    company: string;
    street1: string;
    street2: string;
    street3: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone: string;
  };
  shipTo: {
    name: string;
    company: string;
    street1: string;
    street2: string;
    street3: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone: string;
  };
  items: Array<{
    orderItemId: number;
    lineItemKey: string;
    sku: string;
    name: string;
    imageUrl: string;
    weight: {
      value: number;
      units: string;
    };
    quantity: number;
    unitPrice: number;
    taxAmount: number;
    shippingAmount: number;
    warehouseLocation: string;
  }>;
  orderTotal: number;
  amountPaid: number;
  taxAmount: number;
  shippingAmount: number;
  customerNotes: string;
  internalNotes: string;
  gift: boolean;
  giftMessage: string;
  paymentMethod: string;
  requestedShippingService: string;
  carrierCode: string;
  serviceCode: string;
  packageCode: string;
  confirmation: string;
  shipDate: string;
  holdUntilDate: string;
  weight: {
    value: number;
    units: string;
  };
  dimensions: {
    units: string;
    length: number;
    width: number;
    height: number;
  };
  insuranceOptions: {
    provider: string;
    insureShipment: boolean;
    insuredValue: number;
  };
  internationalOptions: {
    contents: string;
    customsItems: Array<{
      customsItemId: number;
      description: string;
      quantity: number;
      value: number;
      harmonizedTariffCode: string;
      countryOfOrigin: string;
    }>;
    nonDelivery: string;
  };
  advancedOptions: {
    warehouseId: number;
    nonMachinable: boolean;
    saturdayDelivery: boolean;
    containsAlcohol: boolean;
    storeId: number;
    customField1: string;
    customField2: string;
    customField3: string;
    source: string;
    mergedOrSplit: boolean;
    mergedIds: number[];
    parentId: number;
    billToParty: string;
    billToAccount: string;
    billToPostalCode: string;
    billToCountryCode: string;
    billToMyOtherAccount: string;
  };
  tagIds: number[];
  userId: string;
  externallyFulfilled: boolean;
  externallyFulfilledBy: string;
}

interface ShipStationSearchOrderNumberResponse {
  orders: ShipStationOrder[];
  total: number;
  page: number;
  pages: number;
}

export class ShipStationAPI {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl: string = 'https://ssapi6.shipstation.com/') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  private getAuthHeader(): string {
    return `${this.apiKey}`;
  }

  async getOrderByNumber(orderNumber: string): Promise<ShipStationOrder | null> {
    try {
      const response = await fetch(`${this.baseUrl}/orders?orderNumber=${encodeURIComponent(orderNumber)}`, {
        method: 'GET',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`ShipStation API error: ${response.status} ${response.statusText}`);
      }

      const data: ShipStationSearchOrderNumberResponse = await response.json();
      
      // Return the first matching order, or null if no orders found
      return data.orders.length > 0 ? data.orders[0] : null;
    } catch (error) {
      console.error('Error fetching order from ShipStation:', error);
      throw error;
    }
  }

  async getOrders(params: {
    orderStatus?: string;
    orderDateStart?: string;
    orderDateEnd?: string;
    page?: number;
    pageSize?: number;
  } = {}): Promise<ShipStationSearchOrderNumberResponse> {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });

    try {
      const response = await fetch(`${this.baseUrl}/orders?${queryParams.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`ShipStation API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching orders from ShipStation:', error);
      throw error;
    }
  }
}

// Helper function to create ShipStation API instance
export const createShipStationAPI = (env: any): ShipStationAPI => {
  return new ShipStationAPI(
    env.SHIPSTATION_API_KEY,
  );
};