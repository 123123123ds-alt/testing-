import nock from 'nock';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EccangClient } from '../src';
import type { ApiLogEntry } from '../src';

const BASE_URL = 'http://example.com/default/svc/web-service';

describe('EccangClient', () => {
  beforeEach(() => {
    nock.cleanAll();
  });

  afterEach(() => {
    expect(nock.isDone()).toBe(true);
    nock.cleanAll();
  });

  it('sends a createOrder request and parses the response payload', async () => {
    const logs: ApiLogEntry[] = [];
    const client = new EccangClient({
      baseUrl: BASE_URL,
      appToken: 'token',
      appKey: 'key',
      logger: {
        log: (entry) => {
          logs.push(entry);
        }
      }
    });

    const responseEnvelope =
      '<SOAP-ENV:Envelope><SOAP-ENV:Body><ns1:callServiceResponse><response><![CDATA[{"ask":"Success","message":"Created","data":[{"reference_no":"REF123","order_code":"OC123","shipping_method_no":"SM001","track_status":"1"}]}]]></response></ns1:callServiceResponse></SOAP-ENV:Body></SOAP-ENV:Envelope>';

    nock('http://example.com')
      .post('/default/svc/web-service', (body) => {
        const xml = String(body);
        expect(xml).toContain('<service>createOrder</service>');
        expect(xml).toContain('<appToken>token</appToken>');
        expect(xml).toContain('<appKey>key</appKey>');
        expect(xml).toContain('<paramsJson><![CDATA[{"reference_no":"REF123","shipping_method":"SM","country_code":"US"');
        return true;
      })
      .reply(200, responseEnvelope, { 'Content-Type': 'text/xml' });

    const result = await client.createOrder({
      reference_no: 'REF123',
      shipping_method: 'SM',
      country_code: 'US',
      consignee: {
        consignee_name: 'John Doe',
        email: 'john@example.com'
      }
    });

    expect(result.ask).toBe('Success');
    expect(result.data?.[0]?.order_code).toBe('OC123');
    expect(logs).toHaveLength(1);
    expect(logs[0].status).toBe('success');
    expect(logs[0].request).toMatchObject({
      consignee: { email: 'j***m' }
    });
  });

  it('normalises cargo track detail entries into arrays', async () => {
    const client = new EccangClient({
      baseUrl: BASE_URL,
      appToken: 'token',
      appKey: 'key'
    });

    const responseEnvelope =
      '<SOAP-ENV:Envelope><SOAP-ENV:Body><ns1:callServiceResponse><response>{"ask":"Success","data":[{"Code":"C1","Detail":{"OccurDate":"2024-01-01 10:00:00","Comment":"In transit"}}]}</response></ns1:callServiceResponse></SOAP-ENV:Body></SOAP-ENV:Envelope>';

    nock('http://example.com')
      .post('/default/svc/web-service')
      .reply(200, responseEnvelope, { 'Content-Type': 'text/xml' });

    const result = await client.getCargoTrack({ codes: ['C1'], lang: 'EN', type: null });
    expect(result.data).toBeDefined();
    expect(result.data?.[0].Detail).toEqual([
      {
        OccurDate: '2024-01-01 10:00:00',
        Comment: 'In transit'
      }
    ]);
  });

  it('normalises tracking number maps', async () => {
    const client = new EccangClient({
      baseUrl: BASE_URL,
      appToken: 'token',
      appKey: 'key'
    });

    const responseEnvelope =
      '<SOAP-ENV:Envelope><SOAP-ENV:Body><ns1:callServiceResponse><response>{"ask":"Success","data":[{"OrderNumber":"REF123","trackingnumberlist":{"U001":["TRK123"]}}]}</response></ns1:callServiceResponse></SOAP-ENV:Body></SOAP-ENV:Envelope>';

    nock('http://example.com')
      .post('/default/svc/web-service')
      .reply(200, responseEnvelope, { 'Content-Type': 'text/xml' });

    const result = await client.getTrackNumber({ reference_no: ['REF123'] });
    expect(result.data?.[0].trackingnumberlist?.U001).toBe('TRK123');
  });

  it('throws a descriptive error when the SOAP body is not valid JSON', async () => {
    const client = new EccangClient({
      baseUrl: BASE_URL,
      appToken: 'token',
      appKey: 'key'
    });

    const responseEnvelope =
      '<SOAP-ENV:Envelope><SOAP-ENV:Body><ns1:callServiceResponse><response>not-json</response></ns1:callServiceResponse></SOAP-ENV:Body></SOAP-ENV:Envelope>';

    nock('http://example.com')
      .post('/default/svc/web-service')
      .reply(200, responseEnvelope, { 'Content-Type': 'text/xml' });

    await expect(client.getCountry()).rejects.toThrow('Failed to parse ECCANG response JSON');
  });
});
