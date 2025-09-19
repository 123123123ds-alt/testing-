import { Router } from 'express';
import { z } from 'zod';
import { addFlash } from '../lib/flash';
import { requireRole, logout } from '../middleware/auth';
import {
  authenticateUser,
  getUserById
} from '../services/user-service';
import {
  addTrackingEvent,
  buildOrdersCsv,
  createLabelDocument,
  createOrder,
  getOrderForShipper,
  getTrackingEvents,
  listOrdersForShipper,
  markLabelGenerated,
  getOrderMetrics
} from '../services/order-service';

export const shipperRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const optionalString = z
  .string()
  .optional()
  .transform((value) => (value && value.trim().length > 0 ? value.trim() : undefined));

const numberField = z
  .string()
  .min(1)
  .transform((value) => Number(value))
  .refine((value) => !Number.isNaN(value) && value > 0, 'Must be a positive number.');

const optionalNumberField = z
  .string()
  .optional()
  .transform((value) => {
    if (!value || value.trim().length === 0) {
      return undefined;
    }
    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
      throw new Error('Invalid number');
    }
    return parsed;
  });

const createOrderSchema = z.object({
  reference: z.string().min(1),
  recipientName: z.string().min(1),
  recipientEmail: optionalString,
  recipientPhone: optionalString,
  destinationAddress1: z.string().min(1),
  destinationAddress2: optionalString,
  destinationCity: z.string().min(1),
  destinationState: optionalString,
  destinationPostalCode: optionalString,
  destinationCountry: z.string().min(2),
  packageWeight: numberField,
  packageLength: optionalNumberField,
  packageWidth: optionalNumberField,
  packageHeight: optionalNumberField,
  serviceLevel: optionalString
});

const trackingEventSchema = z.object({
  status: z.string().min(1),
  description: optionalString,
  occurredAt: z.string().min(1)
});

shipperRouter.get('/shipper/login', (request, response) => {
  if (request.session.userId && request.session.role === 'shipper') {
    return response.redirect('/shipper');
  }
  response.render('shipper/login', { title: 'Shipper Login' });
});

shipperRouter.post('/shipper/login', async (request, response) => {
  const result = loginSchema.safeParse({
    email: request.body.email,
    password: request.body.password
  });

  if (!result.success) {
    addFlash(request, 'error', 'Please provide a valid email address and password.');
    return response.redirect('/shipper/login');
  }

  const user = await authenticateUser(result.data.email, result.data.password);
  if (!user || user.role !== 'shipper') {
    addFlash(request, 'error', 'Invalid credentials or inactive account.');
    return response.redirect('/shipper/login');
  }

  request.session.userId = user.id;
  request.session.role = user.role;
  addFlash(request, 'success', 'Welcome back!');
  response.redirect('/shipper');
});

shipperRouter.post('/shipper/logout', requireRole('shipper'), (request, response) => {
  logout(request);
  addFlash(request, 'success', 'You have been signed out.');
  response.redirect('/shipper/login');
});

shipperRouter.use('/shipper', requireRole('shipper'));

shipperRouter.get('/shipper', async (request, response) => {
  const shipper = await getUserById(request.session.userId!);
  if (!shipper || shipper.role !== 'shipper') {
    logout(request);
    addFlash(request, 'error', 'Unable to load your account. Please sign in again.');
    return response.redirect('/shipper/login');
  }
  const [orders, metrics] = await Promise.all([
    listOrdersForShipper(shipper.id),
    getOrderMetrics(shipper.id)
  ]);

  response.render('shipper/dashboard', {
    title: 'Shipper Dashboard',
    shipper,
    orders,
    metrics
  });
});

shipperRouter.get('/shipper/orders/new', async (request, response) => {
  const shipper = await getUserById(request.session.userId!);
  if (!shipper || shipper.role !== 'shipper') {
    logout(request);
    addFlash(request, 'error', 'Please sign in again to create orders.');
    return response.redirect('/shipper/login');
  }
  response.render('shipper/order-form', {
    title: 'Create Order',
    shipper
  });
});

shipperRouter.post('/shipper/orders/new', async (request, response) => {
  const result = createOrderSchema.safeParse({
    reference: request.body.reference,
    recipientName: request.body.recipientName,
    recipientEmail: request.body.recipientEmail,
    recipientPhone: request.body.recipientPhone,
    destinationAddress1: request.body.destinationAddress1,
    destinationAddress2: request.body.destinationAddress2,
    destinationCity: request.body.destinationCity,
    destinationState: request.body.destinationState,
    destinationPostalCode: request.body.destinationPostalCode,
    destinationCountry: request.body.destinationCountry,
    packageWeight: request.body.packageWeight,
    packageLength: request.body.packageLength,
    packageWidth: request.body.packageWidth,
    packageHeight: request.body.packageHeight,
    serviceLevel: request.body.serviceLevel
  });

  if (!result.success) {
    addFlash(request, 'error', 'Please ensure all required fields are provided and numeric values are valid.');
    return response.redirect('/shipper/orders/new');
  }

  try {
    const order = await createOrder(request.session.userId!, {
      reference: result.data.reference,
      recipientName: result.data.recipientName,
      recipientEmail: result.data.recipientEmail,
      recipientPhone: result.data.recipientPhone,
      destinationAddress1: result.data.destinationAddress1,
      destinationAddress2: result.data.destinationAddress2,
      destinationCity: result.data.destinationCity,
      destinationState: result.data.destinationState,
      destinationPostalCode: result.data.destinationPostalCode,
      destinationCountry: result.data.destinationCountry,
      packageWeight: result.data.packageWeight,
      packageLength: result.data.packageLength,
      packageWidth: result.data.packageWidth,
      packageHeight: result.data.packageHeight,
      serviceLevel: result.data.serviceLevel
    });
    addFlash(request, 'success', 'Order created successfully.');
    response.redirect(`/shipper/orders/${order.id}`);
  } catch (error) {
    addFlash(request, 'error', (error as Error).message);
    response.redirect('/shipper/orders/new');
  }
});

shipperRouter.get('/shipper/orders/:id', async (request, response) => {
  const order = await getOrderForShipper(request.params.id, request.session.userId!);
  if (!order) {
    addFlash(request, 'error', 'Order not found.');
    return response.redirect('/shipper');
  }

  const events = await getTrackingEvents(order.id);

  response.render('shipper/order-detail', {
    title: `Order ${order.reference}`,
    order,
    events
  });
});

shipperRouter.post('/shipper/orders/:id/events', async (request, response) => {
  const order = await getOrderForShipper(request.params.id, request.session.userId!);
  if (!order) {
    addFlash(request, 'error', 'Order not found.');
    return response.redirect('/shipper');
  }

  const result = trackingEventSchema.safeParse({
    status: request.body.status,
    description: request.body.description,
    occurredAt: request.body.occurredAt
  });

  if (!result.success) {
    addFlash(request, 'error', 'Please provide a status and valid event time.');
    return response.redirect(`/shipper/orders/${order.id}`);
  }

  const occurredDate = new Date(result.data.occurredAt);
  if (Number.isNaN(occurredDate.getTime())) {
    addFlash(request, 'error', 'Invalid event timestamp.');
    return response.redirect(`/shipper/orders/${order.id}`);
  }

  try {
    await addTrackingEvent(order.id, {
      status: result.data.status,
      description: result.data.description,
      occurredAt: occurredDate.toISOString()
    });
    addFlash(request, 'success', 'Tracking event recorded.');
  } catch (error) {
    addFlash(request, 'error', (error as Error).message);
  }
  response.redirect(`/shipper/orders/${order.id}`);
});

shipperRouter.get('/shipper/orders/:id/label', async (request, response) => {
  const order = await getOrderForShipper(request.params.id, request.session.userId!);
  if (!order) {
    addFlash(request, 'error', 'Order not found.');
    return response.redirect('/shipper');
  }

  await markLabelGenerated(order.id);
  const doc = createLabelDocument(order);
  response.setHeader('Content-Type', 'application/pdf');
  response.setHeader('Content-Disposition', `inline; filename="label-${order.reference}.pdf"`);
  doc.pipe(response);
  doc.end();
});

shipperRouter.get('/shipper/reports/orders.csv', async (request, response) => {
  const orders = await listOrdersForShipper(request.session.userId!);
  const csv = buildOrdersCsv(orders);
  response.setHeader('Content-Type', 'text/csv');
  response.setHeader('Content-Disposition', 'attachment; filename="orders.csv"');
  response.send(csv);
});
