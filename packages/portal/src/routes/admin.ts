import { Router } from 'express';
import { z } from 'zod';
import { addFlash } from '../lib/flash';
import { requireRole, logout } from '../middleware/auth';
import {
  authenticateUser,
  createShipper,
  getUserById,
  listShippers,
  updateShipper,
  setShipperStatus
} from '../services/user-service';
import { getOrderCountForShipper, listOrdersForShipper } from '../services/order-service';

export const adminRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const createShipperSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  companyName: z.string().min(1),
  phone: z.string().min(1),
  password: z.string().min(8)
});

const updateShipperSchema = createShipperSchema.extend({
  password: z.string().optional(),
  isActive: z.boolean().optional()
});

adminRouter.get('/admin/login', (request, response) => {
  if (request.session.userId && request.session.role === 'admin') {
    return response.redirect('/admin');
  }
  response.render('admin/login', {
    title: 'Admin Login'
  });
});

adminRouter.post('/admin/login', async (request, response) => {
  const result = loginSchema.safeParse({
    email: request.body.email,
    password: request.body.password
  });

  if (!result.success) {
    addFlash(request, 'error', 'Please provide a valid email and password.');
    return response.redirect('/admin/login');
  }

  const user = await authenticateUser(result.data.email, result.data.password);
  if (!user || user.role !== 'admin') {
    addFlash(request, 'error', 'Invalid credentials.');
    return response.redirect('/admin/login');
  }

  request.session.userId = user.id;
  request.session.role = user.role;
  addFlash(request, 'success', 'Welcome back!');
  response.redirect('/admin');
});

adminRouter.post('/admin/logout', requireRole('admin'), (request, response) => {
  logout(request);
  addFlash(request, 'success', 'You have been signed out.');
  response.redirect('/admin/login');
});

adminRouter.use('/admin', requireRole('admin'));

adminRouter.get('/admin', async (_request, response) => {
  const shippers = await listShippers();
  const shipperSummaries = await Promise.all(
    shippers.map(async (shipper) => ({
      shipper,
      orderCount: await getOrderCountForShipper(shipper.id)
    }))
  );
  response.render('admin/dashboard', {
    title: 'Admin Dashboard',
    shipperSummaries
  });
});

adminRouter.get('/admin/shippers/new', (_request, response) => {
  response.render('admin/shipper-form', {
    title: 'Create Shipper',
    action: '/admin/shippers/new',
    values: {},
    isEdit: false
  });
});

adminRouter.post('/admin/shippers/new', async (request, response) => {
  const result = createShipperSchema.safeParse({
    email: request.body.email,
    name: request.body.name,
    companyName: request.body.companyName,
    phone: request.body.phone,
    password: request.body.password
  });

  if (!result.success) {
    addFlash(request, 'error', 'Please ensure all shipper details are valid and the password has at least 8 characters.');
    return response.redirect('/admin/shippers/new');
  }

  try {
    const shipper = await createShipper(result.data);
    addFlash(request, 'success', 'Shipper account created successfully.');
    response.redirect(`/admin/shippers/${shipper.id}`);
  } catch (error) {
    const message =
      error instanceof Error && error.message.includes('SQLITE_CONSTRAINT')
        ? 'A shipper with this email already exists.'
        : (error as Error).message;
    addFlash(request, 'error', message);
    response.redirect('/admin/shippers/new');
  }
});

adminRouter.get('/admin/shippers/:id', async (request, response) => {
  const shipper = await getUserById(request.params.id);
  if (!shipper || shipper.role !== 'shipper') {
    addFlash(request, 'error', 'Shipper not found.');
    return response.redirect('/admin');
  }

  const orders = await listOrdersForShipper(shipper.id);

  response.render('admin/shipper-detail', {
    title: `Manage ${shipper.companyName ?? shipper.email}`,
    shipper,
    orders
  });
});

adminRouter.post('/admin/shippers/:id', async (request, response) => {
  const shipper = await getUserById(request.params.id);
  if (!shipper || shipper.role !== 'shipper') {
    addFlash(request, 'error', 'Shipper not found.');
    return response.redirect('/admin');
  }

  const result = updateShipperSchema.safeParse({
    email: request.body.email,
    name: request.body.name,
    companyName: request.body.companyName,
    phone: request.body.phone,
    password: request.body.password ? String(request.body.password) : undefined,
    isActive: request.body.isActive === 'on'
  });

  if (!result.success) {
    addFlash(request, 'error', 'Unable to update shipper. Please review the submitted details.');
    return response.redirect(`/admin/shippers/${shipper.id}`);
  }

  try {
    await updateShipper(shipper.id, result.data);
    addFlash(request, 'success', 'Shipper updated successfully.');
  } catch (error) {
    const message =
      error instanceof Error && error.message.includes('SQLITE_CONSTRAINT')
        ? 'Another user already uses this email address.'
        : (error as Error).message;
    addFlash(request, 'error', message);
  }

  response.redirect(`/admin/shippers/${shipper.id}`);
});

adminRouter.post('/admin/shippers/:id/toggle', async (request, response) => {
  const shipper = await getUserById(request.params.id);
  if (!shipper || shipper.role !== 'shipper') {
    addFlash(request, 'error', 'Shipper not found.');
    return response.redirect('/admin');
  }

  try {
    await setShipperStatus(shipper.id, !shipper.isActive);
    addFlash(request, 'success', `Shipper ${shipper.isActive ? 'deactivated' : 'activated'} successfully.`);
  } catch (error) {
    addFlash(request, 'error', (error as Error).message);
  }

  response.redirect(`/admin/shippers/${shipper.id}`);
});
