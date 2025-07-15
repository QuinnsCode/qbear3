interface Address {
  name: string;
  company: string;
  street1: string;
  street2: string;
  street3: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
  residential: boolean | null;
}

interface Weight {
  value: number;
  units: string;
}

interface Dimensions {
  units: string;
  length: number;
  width: number;
  height: number;
}

interface InsuranceOptions {
  provider: string | null;
  insureShipment: boolean;
  insuredValue: number;
}

// interface ShipmentItem {
//   orderItemId: number;
//   lineItemKey: string | null;
//   sku: string;
//   name: string;
//   imageUrl: string | null;
//   weight: Weight | null;
//   quantity: number;
//   unitPrice: number;
//   warehouseLocation: string | null;
//   options: any | null;
//   productId: number;
//   fulfillmentSku: string | null;
// }

interface AdvancedOptions {
  warehouseId?: number;
  nonMachinable?: boolean;
  saturdayDelivery?: boolean;
  containsAlcohol?: boolean;
  storeId?: number;
  customField1?: string;
  customField2?: string;
  customField3?: string;
  source?: string;
  billToParty?: string;
  billToAccount?: string;
  billToPostalCode?: string;
  billToCountryCode?: string;
  billToMyOtherAccount?: string;
}

export interface ShipStationShipment {
  shipmentId: number;
  orderId: number;
  orderKey?: string;
  userId: string;
  orderNumber: string;
  createDate: string; // ISO 8601 format
  shipDate: string; // YYYY-MM-DD format
  shipmentCost: number;
  insuranceCost: number;
  trackingNumber: string;
  isReturnLabel: boolean;
  batchNumber: string;
  carrierCode: string;
  serviceCode: string;
  packageCode: string;
  confirmation: string;
  warehouseId: number;
  voided: boolean;
  voidDate: string | null;
  marketplaceNotified: boolean;
  notifyErrorMessage: string | null;
  shipTo: Address;
  weight: Weight;
  dimensions: Dimensions | null;
  insuranceOptions: InsuranceOptions;
  advancedOptions: AdvancedOptions | null;
  shipmentItems: ShipmentItem[];
  labelData: any | null; // Base64 encoded label data
  formData: any | null; // Additional form data
}

export interface ShipStationShipmentsResponse {
  shipments: ShipStationShipment[];
  total: number;
  page: number;
  pages: number;
}

// Common carrier codes
export type CarrierCode = 
  | 'stamps_com'
  | 'usps'
  | 'fedex'
  | 'ups'
  | 'dhl_express'
  | 'amazon_shipping'
  | string; // Allow custom carriers

// Common service codes for USPS
export type USPSServiceCode =
  | 'usps_first_class_mail'
  | 'usps_priority_mail'
  | 'usps_priority_mail_express'
  | 'usps_ground_advantage'
  | 'usps_media_mail'
  | string; // Allow other services

// Common package codes
export type PackageCode =
  | 'package'
  | 'envelope'
  | 'flat_rate_envelope'
  | 'flat_rate_legal_envelope'
  | 'flat_rate_padded_envelope'
  | 'flat_rate_small_box'
  | 'flat_rate_medium_box'
  | 'flat_rate_large_box'
  | string; // Allow custom packages

// Confirmation types
export type ConfirmationType =
  | 'none'
  | 'delivery'
  | 'signature'
  | 'adult_signature'
  | string;

export interface ShipStationOrder {
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

export interface ShipStationSearchOrderNumberResponse {
  orders: ShipStationOrder[];
  total: number;
  page: number;
  pages: number;
}

export interface ShipmentItem {
  orderItemId: number;
  lineItemKey: string | null;
  sku: string;
  name: string;
  imageUrl: string | null;
  weight: {
    value: number;
    units: string;
  } | null;
  quantity: number;
  unitPrice: number;
  warehouseLocation: string | null;
  productId: number;
  fulfillmentSku: string | null;
}

export interface Shipment {
  shipmentId: number;
  orderId: number;
  orderKey: string;
  orderNumber: string;
  createDate: string;
  shipDate: string;
  shipmentCost: number;
  insuranceCost: number;
  trackingNumber: string;
  carrierCode: string;
  serviceCode: string;
  packageCode: string;
  confirmation: string;
  warehouseId: number;
  voided: boolean;
  shipTo: {
    name: string;
    company: string;
    street1: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone: string;
  };
  weight: {
    value: number;
    units: string;
  };
  shipmentItems: ShipmentItem[];
}

export interface ShipStationResponse {
  shipments: Shipment[];
  total: number;
  page: number;
  pages: number;
}