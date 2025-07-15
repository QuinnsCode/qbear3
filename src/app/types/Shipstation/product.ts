// @/app/types/Shipstation/product.ts

export interface ProductCategory {
  categoryId: number;
  name: string;
}

export interface ProductTag {
  tagId: number;
  name: string;
}

export interface Product {
  aliases: string[] | null;
  productId: number;
  sku: string;
  name: string;
  price: number;
  defaultCost: number | null;
  length: number;
  width: number;
  height: number;
  weightOz: number;
  internalNotes: string | null;
  fulfillmentSku: string | null;
  createDate: string;
  modifyDate: string;
  active: boolean;
  productCategory: ProductCategory | null;
  productType: string | null;
  warehouseLocation: string | null;
  defaultCarrierCode: string | null;
  defaultServiceCode: string | null;
  defaultPackageCode: string | null;
  defaultIntlCarrierCode: string | null;
  defaultIntlServiceCode: string | null;
  defaultIntlPackageCode: string | null;
  defaultConfirmation: string | null;
  defaultIntlConfirmation: string | null;
  customsDescription: string | null;
  customsValue: number | null;
  customsTariffNo: string | null;
  customsCountryCode: string | null;
  noCustoms: boolean | null;
  tags: ProductTag[];
  upc: string | null;
  thumbnailURL: string | null;
}

export interface ShipStationProductsResponse {
  products: Product[];
  total: number;
  page: number;
  pages: number;
}