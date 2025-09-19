import { beforeEach, describe, expect, it } from 'vitest';
import { initDb } from '../src/db';
import { createShipper } from '../src/services/user-service';
import {
  addTrackingEvent,
  buildOrdersCsv,
  createOrder,
  getOrderMetrics,
  getTrackingEvents
} from '../src/services/order-service';

beforeEach(async () => {
  await initDb({ filename: ':memory:', seedAdmin: false, force: true });
});

describe('order lifecycle', () => {
  it('creates orders, records events, and reports metrics', async () => {
    const shipper = await createShipper({
      email: 'shipper@example.com',
      name: 'Example Shipper',
      companyName: 'Acme Shipping',
      phone: '+1-555-0100',
      password: 'supersecure'
    });

    const order = await createOrder(shipper.id, {
      reference: 'ORDER-1001',
      recipientName: 'Jane Smith',
      recipientEmail: 'jane@example.com',
      recipientPhone: '+1-555-0101',
      destinationAddress1: '123 Market Street',
      destinationCity: 'San Francisco',
      destinationState: 'CA',
      destinationPostalCode: '94105',
      destinationCountry: 'US',
      packageWeight: 1.5,
      serviceLevel: 'Express'
    });

    expect(order.trackingNumber).toMatch(/^TRK-/);

    let metrics = await getOrderMetrics(shipper.id);
    expect(metrics.total).toBe(1);
    expect(metrics.created).toBe(1);

    const occurredAt = new Date().toISOString();
    await addTrackingEvent(order.id, {
      status: 'In Transit',
      description: 'Departed origin facility',
      occurredAt
    });

    const events = await getTrackingEvents(order.id);
    expect(events[0]?.status).toBe('In Transit');
    expect(events[0]?.description).toBe('Departed origin facility');

    metrics = await getOrderMetrics(shipper.id);
    expect(metrics.inTransit).toBe(1);

    const csv = buildOrdersCsv([order]);
    expect(csv).toContain('ORDER-1001');
    expect(csv.split('\n')[0]).toContain('reference');
  });
});
