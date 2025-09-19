export type AskStatus = 'Success' | 'Failure';

export interface EccangError {
  errCode: string;
  errMessage: string;
}

export interface EccangResponse<TData> {
  ask: AskStatus;
  message?: string;
  Error?: EccangError | EccangError[] | [];
  data?: TData;
  time_cost?: string;
  [key: string]: unknown;
}

export interface Consignee {
  consignee_name: string;
  telephone?: string;
  mobile?: string;
  street?: string;
  street2?: string;
  street3?: string;
  city?: string;
  province?: string;
  postcode?: string;
  email?: string;
}

export interface Shipper {
  shipper_name?: string;
  shipper_company?: string;
  countrycode?: string;
  province?: string;
  city?: string;
  street?: string;
  postcode?: string;
  telephone?: string;
  mobile?: string;
  email?: string;
}

export interface CreateOrderItem {
  invoice_enname: string;
  invoice_cnname?: string;
  invoice_weight: number;
  invoice_quantity: number;
  invoice_unitcharge: number;
  hs_code?: string;
  sku?: string;
  invoice_brand?: string;
  box_number?: string;
  model?: string;
  unit_code?: string;
  is_magnetoelectric?: 'Y' | 'N';
  [key: string]: unknown;
}

export interface CreateOrderVolume {
  length: number;
  width: number;
  height: number;
  weight: number;
  box_number: string;
  child_number?: string;
  [key: string]: unknown;
}

export interface CreateOrderRequest {
  reference_no: string;
  shipping_method: string;
  country_code: string;
  order_weight?: number;
  order_pieces?: number;
  consignee?: Consignee;
  shipper?: Shipper;
  ItemArr?: CreateOrderItem[];
  Volume?: CreateOrderVolume[];
  [key: string]: unknown;
}

export interface CreateOrderResponseItem {
  reference_no: string;
  shipping_method_no: string;
  order_code: string;
  track_status: string;
  sender_info_status?: string;
  ODA?: string;
  agent_number?: string;
  [key: string]: unknown;
}

export interface GetTrackNumberRequest {
  reference_no: string[];
}

export interface TrackingNumberList {
  [boxNumber: string]: string;
}

export interface GetTrackNumberDataItem {
  OrderNumber: string;
  TrackingNumber?: string;
  WayBillNumber?: string;
  PlatformNumber?: string;
  channelGroupCode?: string;
  channelNumber?: string;
  trackingnumberlist?: TrackingNumberList;
  [key: string]: unknown;
}

export interface GetLabelUrlRequest {
  reference_no: string;
  type?: 1 | 2 | 3;
  label_type?: 1 | 2 | 3;
  label_content_type?: 1 | 2 | 3 | 4 | 5 | 6 | 7;
}

export interface LabelData {
  ask: AskStatus;
  message?: string;
  type?: string;
  url?: string;
  invoice_url?: string;
  reference_no?: string;
  [key: string]: unknown;
}

export interface CargoTrackRequest {
  codes: string[];
  type?: string | null;
  lang?: 'EN' | 'CN' | string;
}

export interface CargoTrackDetail {
  OccurDate?: string;
  Comment?: string;
  StatusCode?: string;
  Area?: string;
  [key: string]: unknown;
}

export interface CargoTrackDataItem {
  Code: string;
  Country_code?: string;
  New_date?: string;
  New_Comment?: string;
  Status?: string;
  WaybillNumber?: string;
  TrackingNumber?: string;
  product_code?: string;
  product_name?: string;
  Detail?: CargoTrackDetail[];
  [key: string]: unknown;
}

export interface FeeTrailRequest {
  country_code: string;
  weight: string;
  length?: string;
  width?: string;
  height?: string;
  shipping_type_id: string;
  group?: string;
  [key: string]: unknown;
}

export interface FeeTrailQuote {
  ServiceCode: string;
  ServiceCnName?: string;
  ServiceEnName?: string;
  FreightFee?: string;
  FuelFee?: string;
  RegisteredFee?: string;
  OtherFee?: string;
  TotalFee?: string;
  Effectiveness?: string;
  Traceability?: string;
  VolumeCharge?: string;
  Remark?: string;
  ChargeWeight?: string;
  ChargeWeightUnit?: string;
  ProductSort?: string;
  Formula?: string;
  [key: string]: unknown;
}

export interface SimpleCodeName {
  code: string;
  name: string;
  [key: string]: unknown;
}

export interface CountryInfo {
  country_code: string;
  country_cn?: string;
  country_en?: string;
  [key: string]: unknown;
}

export interface GoodsTypeInfo {
  goods_type_id: string;
  goods_type_name?: string;
  goods_type_name_en?: string;
  [key: string]: unknown;
}

export interface ShippingMethodInfo {
  shipping_method: string;
  shipping_method_en?: string;
  shipping_method_cn?: string;
  channel_code?: string;
  [key: string]: unknown;
}

export interface AddressValidateRequest {
  shipping_method: string;
  country_code: string;
  province?: string;
  postcode?: string;
  city?: string;
  consignee?: Consignee;
  ItemArr?: CreateOrderItem[];
  [key: string]: unknown;
}

export interface AddressValidateData {
  ask: AskStatus;
  message?: string;
  ErrorMessage?: string;
  [key: string]: unknown;
}

export interface FieldRuleRequest {
  shipping_method: string;
  country_code: string;
  [key: string]: unknown;
}

export interface FieldRuleField {
  field: string;
  required: boolean;
  label?: string;
  message?: string;
  [key: string]: unknown;
}

export interface FieldRuleData {
  consignee?: FieldRuleField[];
  shipper?: FieldRuleField[];
  ItemArr?: FieldRuleField[];
  Volume?: FieldRuleField[];
  [key: string]: unknown;
}

export interface ReceivingExpenseRequest {
  reference_no: string;
}

export interface ReceivingExpenseDataItem {
  reference_no: string;
  Freight?: string;
  Register?: string;
  FuelCharge?: string;
  OtherFee?: string;
  TotalFee?: string;
  [key: string]: unknown;
}

export type GenericRecord = Record<string, unknown>;

export interface PickupRequest {
  reference_no: string;
  [key: string]: unknown;
}

export interface PrintTemplateInfo {
  template_name: string;
  template_code: string;
  type?: string;
  [key: string]: unknown;
}

export interface LabelByTemplateRequest {
  template_code: string;
  codes: string[];
  [key: string]: unknown;
}

export interface SenderMessage {
  reference_no: string;
  shipper_name?: string;
  shipper_company?: string;
  shipper_country?: string;
  shipper_province?: string;
  shipper_city?: string;
  shipper_street?: string;
  shipper_postcode?: string;
  shipper_telephone?: string;
  shipper_mobile?: string;
  shipper_email?: string;
  [key: string]: unknown;
}
