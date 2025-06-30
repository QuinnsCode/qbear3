// ShipStation API Types

export type AddressVerificationStatus = 
  | "Address not yet validated"
  | "Address validated successfully" 
  | "Address validation warning"
  | "Address validation failed";


export type BillToParty = 
  | "my_account"
  | "my_other_account"
  | "recipient"
  | "third_party";

export interface Address {
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
  residential: boolean;
  addressVerified: AddressVerificationStatus;
}

export interface AdvancedOptions {
  warehouseId: number | null;
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
  parentId: number | null;
  billToParty: BillToParty;
  billToAccount: string;
  billToPostalCode: string;
  billToCountryCode: string;
  billToMyOtherAccount: string;
}

export interface CustomsItem {
  customsItemId: string;
  description: string;
  quantity: number;
  value: number;
  harmonizedTariffCode: string;
  countryOfOrigin: string;
}

export type DimensionUnits = "inches" | "centimeters";

export interface Dimensions {
 length: number;
 width: number;
 height: number;
 units: DimensionUnits;
}

export type InsuranceProvider = "shipsurance" | "carrier" | "provider" | "xcover" | "parcelguard";

export interface InsuranceOptions {
 provider: InsuranceProvider;
 insureShipment: boolean;
 insuredValue: number;
}

export type InternationalContents = "merchandise" | "documents" | "gift" | "returned_goods" | "sample";

export type NonDeliveryOption = "return_to_sender" | "treat_as_abandoned";

export interface InternationalOptions {
 contents: InternationalContents;
 customsItems: CustomsItem[];
 nonDelivery: NonDeliveryOption;
}

export interface ItemOption {
 name: string;
 value: string;
}

export interface OrderItem {
 orderItemId: number;
 lineItemKey: string;
 sku: string;
 name: string;
 imageUrl: string;
 weight: Weight;
 quantity: number;
 unitPrice: number;
 taxAmount: number;
 shippingAmount: number;
 warehouseLocation: string;
 options: ItemOption[];
 productId: number;
 fulfillmentSku: string;
 adjustment: boolean;
 upc: string;
 createDate: string;
 modifyDate: string;
}

export type OrderStatus = "awaiting_payment" | "awaiting_shipment" | "shipped" | "on_hold" | "cancelled";

export interface Order {
 orderId: number;
 orderNumber: string;
 orderKey: string;
 orderDate: string;
 createDate: string;
 modifyDate: string;
 paymentDate: string;
 shipByDate: string;
 orderStatus: OrderStatus;
 customerId: number;
 customerUsername: string;
 customerEmail: string;
 billTo: Address;
 shipTo: Address;
 items: OrderItem[];
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
 weight: Weight;
 dimensions: Dimensions;
 insuranceOptions: InsuranceOptions;
 internationalOptions: InternationalOptions;
 advancedOptions: AdvancedOptions;
 tagIds: number[] | null;
 userId: string;
 externallyFulfilled: boolean;
 externallyFulfilledBy: string;
}

export interface ProductCategory {
 categoryId: number;
 name: string;
}

export interface ProductTag {
 tagId: number;
 name: string;
}

export interface Product {
 productId: number;
 sku: string;
 name: string;
 price: number;
 defaultCost: number;
 length: number;
 width: number;
 height: number;
 weightOz: number;
 internalNotes: string;
 fulfillmentSku: string;
 createDate: string;
 modifyDate: string;
 active: boolean;
 productCategory: ProductCategory;
 productType: string;
 warehouseLocation: string;
 defaultCarrierCode: string;
 defaultServiceCode: string;
 defaultPackageCode: string;
 defaultIntlCarrierCode: string;
 defaultIntlServiceCode: string;
 defaultIntlPackageCode: string;
 defaultConfirmation: string;
 defaultIntlConfirmation: string;
 customsDescription: string;
 customsValue: number;
 customsTariffNo: string;
 customsCountryCode: string;
 noCustoms: boolean;
 tags: ProductTag[];
}

export type WebhookResourceType = 
 | "ORDER_NOTIFY" 
 | "ITEM_ORDER_NOTIFY" 
 | "SHIP_NOTIFY" 
 | "ITEM_SHIP_NOTIFY" 
 | "FULFILLMENT_SHIPPED" 
 | "FULFILLMENT_REJECTED";

export interface Webhook {
 resource_url: string;
 resource_type: WebhookResourceType;
}

export type WeightUnits = "pounds" | "ounces" | "grams";

export interface Weight {
 value: number;
 units: WeightUnits;
 WeightUnits: number;
}