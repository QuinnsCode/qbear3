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

interface ShipmentItem {
  orderItemId: number;
  lineItemKey: string | null;
  sku: string;
  name: string;
  imageUrl: string | null;
  weight: Weight | null;
  quantity: number;
  unitPrice: number;
  warehouseLocation: string | null;
  options: any | null;
  productId: number;
  fulfillmentSku: string | null;
}

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