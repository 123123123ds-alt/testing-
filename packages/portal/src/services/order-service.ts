import PDFDocument from 'pdfkit';
import { getDb } from '../db';
import { createId, createTrackingNumber } from '../lib/ids';
import { now } from '../lib/dates';
import { toCsv } from '../lib/csv';

export interface Order {
  id: string;
  shipperId: string;
  reference: string;
  recipientName: string;
  recipientEmail: string | null;
  recipientPhone: string | null;
  destinationAddress1: string;
  destinationAddress2: string | null;
  destinationCity: string;
  destinationState: string | null;
  destinationPostalCode: string | null;
  destinationCountry: string;
  packageWeight: number;
  packageLength: number | null;
  packageWidth: number | null;
  packageHeight: number | null;
  serviceLevel: string | null;
  status: string;
  trackingNumber: string | null;
  labelGeneratedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface OrderRow {
  id: string;
  shipper_id: string;
  reference: string;
  recipient_name: string;
  recipient_email: string | null;
  recipient_phone: string | null;
  destination_address1: string;
  destination_address2: string | null;
  destination_city: string;
  destination_state: string | null;
  destination_postal_code: string | null;
  destination_country: string;
  package_weight: number;
  package_length: number | null;
  package_width: number | null;
  package_height: number | null;
  service_level: string | null;
  status: string;
  tracking_number: string | null;
  label_generated_at: string | null;
  created_at: string;
  updated_at: string;
}

function mapOrder(row: OrderRow): Order {
  return {
    id: row.id,
    shipperId: row.shipper_id,
    reference: row.reference,
    recipientName: row.recipient_name,
    recipientEmail: row.recipient_email,
    recipientPhone: row.recipient_phone,
    destinationAddress1: row.destination_address1,
    destinationAddress2: row.destination_address2,
    destinationCity: row.destination_city,
    destinationState: row.destination_state,
    destinationPostalCode: row.destination_postal_code,
    destinationCountry: row.destination_country,
    packageWeight: row.package_weight,
    packageLength: row.package_length,
    packageWidth: row.package_width,
    packageHeight: row.package_height,
    serviceLevel: row.service_level,
    status: row.status,
    trackingNumber: row.tracking_number,
    labelGeneratedAt: row.label_generated_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export interface CreateOrderInput {
  reference: string;
  recipientName: string;
  recipientEmail?: string;
  recipientPhone?: string;
  destinationAddress1: string;
  destinationAddress2?: string;
  destinationCity: string;
  destinationState?: string;
  destinationPostalCode?: string;
  destinationCountry: string;
  packageWeight: number;
  packageLength?: number;
  packageWidth?: number;
  packageHeight?: number;
  serviceLevel?: string;
}

export interface TrackingEvent {
  id: string;
  orderId: string;
  status: string;
  description: string | null;
  occurredAt: string;
  createdAt: string;
}

interface TrackingEventRow {
  id: string;
  order_id: string;
  status: string;
  description: string | null;
  occurred_at: string;
  created_at: string;
}

function mapTrackingEvent(row: TrackingEventRow): TrackingEvent {
  return {
    id: row.id,
    orderId: row.order_id,
    status: row.status,
    description: row.description,
    occurredAt: row.occurred_at,
    createdAt: row.created_at
  };
}

export interface OrderMetrics {
  total: number;
  created: number;
  inTransit: number;
  delivered: number;
}

export async function createOrder(shipperId: string, input: CreateOrderInput): Promise<Order> {
  const db = getDb();
  const id = createId('ord');
  const timestamp = now();
  const trackingNumber = createTrackingNumber();

  await db.run(
    `INSERT INTO orders (
      id,
      shipper_id,
      reference,
      recipient_name,
      recipient_email,
      recipient_phone,
      destination_address1,
      destination_address2,
      destination_city,
      destination_state,
      destination_postal_code,
      destination_country,
      package_weight,
      package_length,
      package_width,
      package_height,
      service_level,
      status,
      tracking_number,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Created', ?, ?, ?)`,
    id,
    shipperId,
    input.reference,
    input.recipientName,
    input.recipientEmail ?? null,
    input.recipientPhone ?? null,
    input.destinationAddress1,
    input.destinationAddress2 ?? null,
    input.destinationCity,
    input.destinationState ?? null,
    input.destinationPostalCode ?? null,
    input.destinationCountry,
    input.packageWeight,
    input.packageLength ?? null,
    input.packageWidth ?? null,
    input.packageHeight ?? null,
    input.serviceLevel ?? null,
    trackingNumber,
    timestamp,
    timestamp
  );

  await db.run(
    `INSERT INTO tracking_events (id, order_id, status, description, occurred_at, created_at)
     VALUES (?, ?, 'Created', 'Order created', ?, ?)`,
    createId('trk'),
    id,
    timestamp,
    timestamp
  );

  const created = await getOrderById(id);
  if (!created) {
    throw new Error('Unable to load the newly created order.');
  }
  return created;
}

export async function getOrderById(id: string): Promise<Order | null> {
  const db = getDb();
  const row = await db.get<OrderRow>('SELECT * FROM orders WHERE id = ?', id);
  return row ? mapOrder(row) : null;
}

export async function getOrderForShipper(id: string, shipperId: string): Promise<Order | null> {
  const db = getDb();
  const row = await db.get<OrderRow>(
    'SELECT * FROM orders WHERE id = ? AND shipper_id = ?',
    id,
    shipperId
  );
  return row ? mapOrder(row) : null;
}

export async function listOrdersForShipper(shipperId: string): Promise<Order[]> {
  const db = getDb();
  const rows = await db.all<OrderRow>(
    'SELECT * FROM orders WHERE shipper_id = ? ORDER BY created_at DESC',
    shipperId
  );
  return rows.map(mapOrder);
}

export async function getTrackingEvents(orderId: string): Promise<TrackingEvent[]> {
  const db = getDb();
  const rows = await db.all<TrackingEventRow>(
    'SELECT * FROM tracking_events WHERE order_id = ? ORDER BY occurred_at DESC',
    orderId
  );
  return rows.map(mapTrackingEvent);
}

export interface AddTrackingEventInput {
  status: string;
  description?: string;
  occurredAt: string;
}

export async function addTrackingEvent(orderId: string, input: AddTrackingEventInput): Promise<void> {
  const db = getDb();
  const id = createId('trk');
  const timestamp = now();
  await db.run(
    `INSERT INTO tracking_events (id, order_id, status, description, occurred_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    id,
    orderId,
    input.status,
    input.description ?? null,
    input.occurredAt,
    timestamp
  );

  await db.run(
    'UPDATE orders SET status = ?, updated_at = ? WHERE id = ?',
    input.status,
    timestamp,
    orderId
  );
}

export async function markLabelGenerated(orderId: string): Promise<void> {
  const db = getDb();
  const timestamp = now();
  await db.run(
    'UPDATE orders SET label_generated_at = ?, updated_at = ? WHERE id = ?',
    timestamp,
    timestamp,
    orderId
  );
}


export async function getOrderCountForShipper(shipperId: string): Promise<number> {
  const db = getDb();
  const row = await db.get<{ count: number }>(
    'SELECT COUNT(*) as count FROM orders WHERE shipper_id = ?',
    shipperId
  );
  return row?.count ?? 0;
}

export async function getOrderMetrics(shipperId: string): Promise<OrderMetrics> {
  const db = getDb();
  const row = await db.get<{
    total: number;
    created: number;
    in_transit: number;
    delivered: number;
  }>(
    `SELECT
       COUNT(*) AS total,
       SUM(CASE WHEN status = 'Created' THEN 1 ELSE 0 END) AS created,
       SUM(CASE WHEN status LIKE 'In Transit%' THEN 1 ELSE 0 END) AS in_transit,
       SUM(CASE WHEN status LIKE 'Delivered%' THEN 1 ELSE 0 END) AS delivered
     FROM orders
     WHERE shipper_id = ?`,
    shipperId
  );

  return {
    total: row?.total ?? 0,
    created: row?.created ?? 0,
    inTransit: row?.in_transit ?? 0,
    delivered: row?.delivered ?? 0
  };
}

export function buildOrdersCsv(orders: Order[]): string {
  return toCsv(
    orders.map((order) => ({
      reference: order.reference,
      created_at: order.createdAt,
      status: order.status,
      tracking_number: order.trackingNumber ?? '',
      recipient: order.recipientName,
      destination: `${order.destinationCity}, ${order.destinationCountry}`,
      weight: order.packageWeight
    })),
    ['reference', 'created_at', 'status', 'tracking_number', 'recipient', 'destination', 'weight']
  );
}

export function createLabelDocument(order: Order): PDFDocument {
  const doc = new PDFDocument({ size: 'A6', margin: 20 });
  doc.fontSize(16).text('Shipping Label', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`Order Reference: ${order.reference}`);
  doc.text(`Tracking Number: ${order.trackingNumber ?? 'Pending'}`);
  doc.moveDown();
  doc.text('Ship To:', { underline: true });
  doc.text(order.recipientName);
  doc.text(order.destinationAddress1);
  if (order.destinationAddress2) {
    doc.text(order.destinationAddress2);
  }
  doc.text(`${order.destinationCity}${order.destinationState ? `, ${order.destinationState}` : ''}`);
  if (order.destinationPostalCode) {
    doc.text(order.destinationPostalCode);
  }
  doc.text(order.destinationCountry);
  doc.moveDown();
  doc.text(`Weight: ${order.packageWeight} kg`);
  if (order.serviceLevel) {
    doc.text(`Service: ${order.serviceLevel}`);
  }
  return doc;
}
