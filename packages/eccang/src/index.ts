import axios, { AxiosInstance } from 'axios';
import type {
  AddressValidateData,
  AddressValidateRequest,
  CargoTrackDataItem,
  CargoTrackRequest,
  CreateOrderRequest,
  CreateOrderResponseItem,
  EccangResponse,
  FeeTrailQuote,
  FeeTrailRequest,
  FieldRuleData,
  FieldRuleRequest,
  GetLabelUrlRequest,
  GetTrackNumberDataItem,
  GetTrackNumberRequest,
  GoodsTypeInfo,
  LabelByTemplateRequest,
  LabelData,
  PickupRequest,
  PrintTemplateInfo,
  ReceivingExpenseDataItem,
  ReceivingExpenseRequest,
  SenderMessage,
  ShippingMethodInfo,
  CountryInfo,
  GenericRecord,
  CreateOrderVolume,
  CreateOrderItem
} from './types';
import { redactSensitive } from './logger';
import type { ApiLogEntry, ApiLogger } from './logger';

export interface EccangClientOptions {
  baseUrl: string;
  appToken: string;
  appKey: string;
  httpClient?: AxiosInstance;
  logger?: ApiLogger;
}

const XML_PREFIX =
  '<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns1="http://www.example.org/Ec/">\n  <SOAP-ENV:Body>\n    <ns1:callService>';
const XML_SUFFIX =
  '    </ns1:callService>\n  </SOAP-ENV:Body>\n</SOAP-ENV:Envelope>';

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function ensureArray<T>(value: T | T[] | undefined): T[] | undefined {
  if (value === undefined) {
    return undefined;
  }
  return Array.isArray(value) ? value : [value];
}

export class EccangClient {
  private readonly appToken: string;

  private readonly appKey: string;

  private readonly client: AxiosInstance;

  private readonly logger?: ApiLogger;

  constructor(options: EccangClientOptions) {
    this.appToken = options.appToken;
    this.appKey = options.appKey;
    this.client =
      options.httpClient ??
      axios.create({
        baseURL: options.baseUrl,
        headers: {
          'Content-Type': 'text/xml; charset=UTF-8'
        },
        timeout: 60_000
      });
    this.logger = options.logger;
  }

  private buildEnvelope(params: unknown, service: string): string {
    const payload =
      typeof params === 'string' ? params : JSON.stringify(params ?? {});
    return [
      XML_PREFIX,
      `      <paramsJson><![CDATA[${payload}]]></paramsJson>`,
      `      <appToken>${this.appToken}</appToken>`,
      `      <appKey>${this.appKey}</appKey>`,
      `      <service>${service}</service>`,
      XML_SUFFIX
    ].join('\n');
  }

  private extractResponse<TData>(xml: string): EccangResponse<TData> {
    const match = xml.match(/<response>([\s\S]*?)<\/response>/i);
    if (!match) {
      throw new Error('Unable to parse SOAP response payload.');
    }

    let jsonPayload = match[1].trim();

    if (jsonPayload.startsWith('<![CDATA[')) {
      jsonPayload = jsonPayload.slice(9, -3);
    }

    jsonPayload = decodeXmlEntities(jsonPayload.trim());

    if (!jsonPayload) {
      throw new Error('Received empty response body.');
    }

    try {
      return JSON.parse(jsonPayload) as EccangResponse<TData>;
    } catch (error) {
      throw new Error(`Failed to parse ECCANG response JSON: ${(error as Error).message}`);
    }
  }

  private async soapCall<TRequest, TResponse>(
    service: string,
    params: TRequest
  ): Promise<EccangResponse<TResponse>> {
    const envelope = this.buildEnvelope(params, service);
    const start = Date.now();

    try {
      const response = await this.client.post('', envelope);
      const parsed = this.extractResponse<TResponse>(response.data);

      await this.log({
        service,
        request: redactSensitive(params),
        response: redactSensitive(parsed),
        status: 'success',
        durationMs: Date.now() - start
      });

      return parsed;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      await this.log({
        service,
        request: redactSensitive(params),
        status: 'error',
        durationMs: Date.now() - start,
        error: { message }
      });

      throw error;
    }
  }

  private async log(entry: ApiLogEntry): Promise<void> {
    if (!this.logger) {
      return;
    }

    await this.logger.log(entry);
  }

  async createOrder(
    params: CreateOrderRequest
  ): Promise<EccangResponse<CreateOrderResponseItem[]>> {
    return this.soapCall<CreateOrderRequest, CreateOrderResponseItem[]>(
      'createOrder',
      params
    );
  }

  async batchCreateOrder(
    params: { order_list: CreateOrderRequest[] }
  ): Promise<EccangResponse<CreateOrderResponseItem[]>> {
    return this.soapCall<typeof params, CreateOrderResponseItem[]>(
      'batchCreateOrder',
      params
    );
  }

  async getTrackNumber(
    params: GetTrackNumberRequest
  ): Promise<EccangResponse<GetTrackNumberDataItem[]>> {
    const result = await this.soapCall<
      GetTrackNumberRequest,
      GetTrackNumberDataItem[]
    >('getTrackNumber', params);

    if (Array.isArray(result.data)) {
      result.data = result.data.map((item) => ({
        ...item,
        trackingnumberlist: item.trackingnumberlist
          ? Object.fromEntries(
              Object.entries(item.trackingnumberlist).map(([key, value]) => [
                key,
                Array.isArray(value) ? value.join(',') : (value as string)
              ])
            )
          : undefined
      }));
    }

    return result;
  }

  async getLabelUrl(
    params: GetLabelUrlRequest
  ): Promise<EccangResponse<LabelData>> {
    return this.soapCall<GetLabelUrlRequest, LabelData>('getLabelUrl', params);
  }

  async getCargoTrack(
    params: CargoTrackRequest
  ): Promise<EccangResponse<CargoTrackDataItem[]>> {
    const response = await this.soapCall<CargoTrackRequest, CargoTrackDataItem[]>(
      'getCargoTrack',
      params
    );
    if (Array.isArray(response.data)) {
      response.data = response.data.map((item) => ({
        ...item,
        Detail: ensureArray(item.Detail)
      }));
    }
    return response;
  }

  async feeTrail(
    params: FeeTrailRequest
  ): Promise<EccangResponse<FeeTrailQuote[]>> {
    return this.soapCall<FeeTrailRequest, FeeTrailQuote[]>('feeTrail', params);
  }

  async getReceivingExpense(
    params: ReceivingExpenseRequest
  ): Promise<EccangResponse<ReceivingExpenseDataItem[]>> {
    return this.soapCall<ReceivingExpenseRequest, ReceivingExpenseDataItem[]>(
      'getReceivingExpense',
      params
    );
  }

  async getShippingMethod(
    params: GenericRecord
  ): Promise<EccangResponse<ShippingMethodInfo[]>> {
    return this.soapCall<GenericRecord, ShippingMethodInfo[]>(
      'getShippingMethod',
      params
    );
  }

  async getCountry(): Promise<EccangResponse<CountryInfo[]>> {
    return this.soapCall<Record<string, never>, CountryInfo[]>(
      'getCountry',
      {}
    );
  }

  async getGoodstype(): Promise<EccangResponse<GoodsTypeInfo[]>> {
    return this.soapCall<Record<string, never>, GoodsTypeInfo[]>(
      'getGoodstype',
      {}
    );
  }

  async register(params: GenericRecord): Promise<EccangResponse<GenericRecord>> {
    return this.soapCall('register', params);
  }

  async getShippingMethodInfo(
    params: GenericRecord
  ): Promise<EccangResponse<ShippingMethodInfo[]>> {
    return this.soapCall<GenericRecord, ShippingMethodInfo[]>(
      'getShippingMethodInfo',
      params
    );
  }

  async addressValidate(
    params: AddressValidateRequest
  ): Promise<EccangResponse<AddressValidateData>> {
    return this.soapCall<AddressValidateRequest, AddressValidateData>(
      'addressValidate',
      params
    );
  }

  async checkReferenceNo(
    params: { reference_no: string }
  ): Promise<EccangResponse<GenericRecord>> {
    return this.soapCall<typeof params, GenericRecord>('checkReferenceNo', params);
  }

  async batchGetLabel(
    params: { reference_nos: string[]; label_type?: number }
  ): Promise<EccangResponse<LabelData[]>> {
    return this.soapCall<typeof params, LabelData[]>('batchGetLabel', params);
  }

  async batchGetPod(
    params: { reference_nos: string[] }
  ): Promise<EccangResponse<GenericRecord>> {
    return this.soapCall<typeof params, GenericRecord>('batchGetPod', params);
  }

  async editOrderSize(
    params: { reference_no: string; Volume: CreateOrderVolume[] }
  ): Promise<EccangResponse<GenericRecord>> {
    return this.soapCall<typeof params, GenericRecord>('editOrderSize', params);
  }

  async modifyOrderWeight(
    params: { reference_no: string; order_weight: number }
  ): Promise<EccangResponse<GenericRecord>> {
    return this.soapCall<typeof params, GenericRecord>(
      'modifyOrderWeight',
      params
    );
  }

  async interceptOrder(
    params: { reference_no: string; reason?: string }
  ): Promise<EccangResponse<GenericRecord>> {
    return this.soapCall<typeof params, GenericRecord>('interceptOrder', params);
  }

  async cancelInterceptOrderByTms(
    params: { reference_no: string }
  ): Promise<EccangResponse<GenericRecord>> {
    return this.soapCall<typeof params, GenericRecord>(
      'cancelInterceptOrderByTms',
      params
    );
  }

  async cancelOrder(
    params: { reference_no: string }
  ): Promise<EccangResponse<GenericRecord>> {
    return this.soapCall<typeof params, GenericRecord>('cancelOrder', params);
  }

  async getFieldRule(
    params: FieldRuleRequest
  ): Promise<EccangResponse<FieldRuleData>> {
    return this.soapCall<FieldRuleRequest, FieldRuleData>('getFieldRule', params);
  }

  async getBasicData(
    params: GenericRecord
  ): Promise<EccangResponse<GenericRecord>> {
    return this.soapCall<GenericRecord, GenericRecord>('getBasicData', params);
  }

  async getPrintTemplateName(
    params: GenericRecord
  ): Promise<EccangResponse<PrintTemplateInfo[]>> {
    return this.soapCall<GenericRecord, PrintTemplateInfo[]>(
      'getPrintTemplateName',
      params
    );
  }

  async getLabelByTemplate(
    params: LabelByTemplateRequest
  ): Promise<EccangResponse<LabelData[]>> {
    return this.soapCall<LabelByTemplateRequest, LabelData[]>(
      'getLabelByTemplate',
      params
    );
  }

  async getSenderMessage(
    params: { reference_no: string }
  ): Promise<EccangResponse<SenderMessage>> {
    return this.soapCall<typeof params, SenderMessage>(
      'getSenderMessage',
      params
    );
  }

  async createUpsPickup(
    params: PickupRequest
  ): Promise<EccangResponse<GenericRecord>> {
    return this.soapCall<PickupRequest, GenericRecord>('createUpsPickup', params);
  }

  async createMydhlPickup(
    params: PickupRequest
  ): Promise<EccangResponse<GenericRecord>> {
    return this.soapCall<PickupRequest, GenericRecord>(
      'createMydhlPickup',
      params
    );
  }

  async updateTrackingNumberAndLabel(
    params: GenericRecord
  ): Promise<EccangResponse<GenericRecord>> {
    return this.soapCall<GenericRecord, GenericRecord>(
      'updateTrackingNumberAndLabel',
      params
    );
  }
}

export * from './types';
export * from './logger';
