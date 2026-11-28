// Security regression tests. Prisma is replaced by an in-memory fake, so no
// database, wallet or network is needed. Run with `npm test`.
import { test, mock, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';

process.env.JWT_SECRET = 'test-only-secret';

const prisma = {};
mock.module('../src/index.js', { namedExports: { prisma } });

const { default: authRoutes } = await import('../src/routes/auth.js');
const { default: storeRoutes } = await import('../src/routes/stores.js');
const { default: productRoutes } = await import('../src/routes/products.js');
const { default: transactionRoutes } = await import('../src/routes/transactions.js');
const { default: marketplaceRoutes } = await import('../src/routes/marketplace.js');
const { default: customerRoutes } = await import('../src/routes/customers.js');

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/products', productRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/customers', customerRoutes);

let server;
let baseUrl;
before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

const call = async (method, path, { body, token } = {}) => {
  const res = await fetch(baseUrl + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json() };
};

// --- fixtures -------------------------------------------------------------

const SENSITIVE_STORE_FIELDS = ['telegramBotToken', 'phone', 'whatsappNumber', 'userId'];

const victimStore = {
  id: 'store-victim',
  storeId: 'VICTIMWALLET',
  walletAddress: 'VICTIMWALLET',
  name: 'Warung Victim',
  address: 'Jl. Contoh 1',
  phone: '+620000000001',
  whatsappNumber: '+620000000002',
  telegramBotToken: '000000:fake-bot-token',
  currency: 'IDR',
  language: 'INDONESIAN',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastActive: new Date(),
  userId: 'user-victim',
};

const victimProduct = {
  id: 'product-victim',
  name: 'Kopi',
  nameEn: 'Coffee',
  price: 5000,
  buyPrice: 3000,
  category: 'drinks',
  stock: 10,
  image: null,
  barcode: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  storeId: 'store-victim',
};

const users = [
  { id: 'user-victim', walletAddress: 'VICTIMWALLET', stores: [victimStore] },
  { id: 'user-attacker', walletAddress: 'ATTACKERWALLET', stores: [] },
];

const tokenFor = (userId) => jwt.sign({ userId }, process.env.JWT_SECRET);

// Applies a Prisma `select` the way the real client would: only selected keys
// come back. Without a select (plain `include`), every scalar comes back.
const project = (row, args = {}) => {
  if (!args.select) {
    return { ...row, products: [victimProduct], transactions: [], defiPositions: [], _count: {} };
  }
  const out = {};
  for (const [key, value] of Object.entries(args.select)) {
    if (!value) continue;
    if (key === 'products') out.products = [project(victimProduct, value)];
    else if (key === 'transactions' || key === 'defiPositions') out[key] = [];
    else if (key === '_count') out._count = {};
    else if (key === 'store') out.store = project(victimStore, value);
    else out[key] = row[key];
  }
  return out;
};

beforeEach(() => {
  delete process.env.ALLOW_INSECURE_WALLET_LOGIN;
  for (const key of Object.keys(prisma)) delete prisma[key];

  prisma.user = {
    findUnique: async ({ where }) =>
      users.find((u) => (where.id ? u.id === where.id : u.walletAddress === where.walletAddress)) || null,
    findFirst: async () => null,
    create: async ({ data }) => ({ id: 'user-new', stores: [], ...data }),
  };
});

// --- E-3: bare-address login is off unless the demo flag is set -------------

const MIDEN_WALLET = '0x' + 'a'.repeat(40);

test('E-3: login and register with only a wallet address are refused by default', async () => {
  const login = await call('POST', '/api/auth/login', { body: { walletAddress: MIDEN_WALLET } });
  assert.equal(login.status, 403);
  assert.equal(login.body.token, undefined);

  const register = await call('POST', '/api/auth/register', { body: { walletAddress: MIDEN_WALLET } });
  assert.equal(register.status, 403);
  assert.equal(register.body.token, undefined);

  process.env.ALLOW_INSECURE_WALLET_LOGIN = '1';
  const notExactlyTrue = await call('POST', '/api/auth/login', { body: { walletAddress: MIDEN_WALLET } });
  assert.equal(notExactlyTrue.status, 403);
});

test('E-3: ALLOW_INSECURE_WALLET_LOGIN=true keeps the local demo login working', async () => {
  process.env.ALLOW_INSECURE_WALLET_LOGIN = 'true';
  const login = await call('POST', '/api/auth/login', { body: { walletAddress: MIDEN_WALLET } });
  assert.equal(login.status, 200);
  assert.ok(login.body.token);
});

// --- E-4: public marketplace responses ------------------------------------

const assertNoSensitiveStoreFields = (store) => {
  for (const field of SENSITIVE_STORE_FIELDS) {
    assert.equal(store[field], undefined, `marketplace leaked store.${field}`);
  }
  for (const product of store.products || []) {
    assert.equal(product.buyPrice, undefined, 'marketplace leaked product.buyPrice');
  }
};

const fakeMarketplacePrisma = () => {
  prisma.store = {
    findMany: async (args) => [project(victimStore, args)],
    findUnique: async (args) => project(victimStore, args),
    count: async () => 1,
  };
  prisma.product = {
    findMany: async (args) => [project(victimProduct, args)],
    count: async () => 1,
  };
};

test('E-4: marketplace store list, details, search and trending hide private store fields', async () => {
  fakeMarketplacePrisma();

  const list = await call('GET', '/api/marketplace/stores');
  assert.equal(list.status, 200);
  list.body.stores.forEach(assertNoSensitiveStoreFields);

  const details = await call('GET', '/api/marketplace/stores/store-victim');
  assert.equal(details.status, 200);
  assertNoSensitiveStoreFields(details.body.store);

  const search = await call('GET', '/api/marketplace/search?q=warung');
  assert.equal(search.status, 200);
  search.body.results.stores.forEach(assertNoSensitiveStoreFields);
  search.body.results.products.forEach((p) => assert.equal(p.buyPrice, undefined));

  const trending = await call('GET', '/api/marketplace/trending');
  assert.equal(trending.status, 200);
  trending.body.trendingStores.forEach(assertNoSensitiveStoreFields);

  const products = await call('GET', '/api/marketplace/stores/store-victim/products');
  assert.equal(products.status, 200);
  products.body.products.forEach((p) => assert.equal(p.buyPrice, undefined));
});

// --- E-5: store, customer and product reads are owner-only ------------------

const ownedBy = (where) => where.userId === 'user-victim' || where.store?.userId === 'user-victim';

test("E-5: another merchant cannot read a store they do not own", async () => {
  prisma.store = {
    findFirst: async ({ where }) => (ownedBy(where) ? victimStore : null),
    findUnique: async () => ({ ...victimStore, transactions: [], products: [], defiPositions: [] }),
  };

  const asAttacker = await call('GET', '/api/stores/store-victim', { token: tokenFor('user-attacker') });
  assert.equal(asAttacker.status, 404);

  const byWallet = await call('GET', '/api/stores/VICTIMWALLET', { token: tokenFor('user-attacker') });
  assert.equal(byWallet.status, 404);

  const asOwner = await call('GET', '/api/stores/VICTIMWALLET', { token: tokenFor('user-victim') });
  assert.equal(asOwner.status, 200);
  assert.equal(asOwner.body.store.id, 'store-victim');
});

test("E-5: another merchant cannot read a customer who only bought elsewhere", async () => {
  const customer = {
    id: 'customer-1',
    name: 'Budi',
    phone: '+620000000003',
    transactions: [{ total: 10, store: { id: 'store-victim', name: 'Warung Victim' }, items: [] }],
  };
  prisma.customer = {
    findFirst: async ({ where }) => (ownedBy(where.transactions.some) ? customer : null),
    findUnique: async () => customer,
  };

  const asAttacker = await call('GET', '/api/customers/customer-1', { token: tokenFor('user-attacker') });
  assert.equal(asAttacker.status, 404);
  assert.equal(asAttacker.body.customer, undefined);

  const asOwner = await call('GET', '/api/customers/customer-1', { token: tokenFor('user-victim') });
  assert.equal(asOwner.status, 200);
});

test("E-5: another merchant cannot read a product (with its buy price) by id", async () => {
  prisma.product = {
    findFirst: async ({ where }) => (ownedBy(where) ? victimProduct : null),
    findUnique: async () => victimProduct,
  };

  const asAttacker = await call('GET', '/api/products/product-victim', { token: tokenFor('user-attacker') });
  assert.equal(asAttacker.status, 404);

  const asOwner = await call('GET', '/api/products/product-victim', { token: tokenFor('user-victim') });
  assert.equal(asOwner.status, 200);
});

// --- E-8: customer data in a new transaction -------------------------------

test('E-8: only known customer fields reach Prisma, and an existing customer is not overwritten', async () => {
  const upserts = [];
  const tx = {
    customer: {
      upsert: async (args) => {
        upserts.push(args);
        return { id: 'customer-1', ...args.create };
      },
      create: async ({ data }) => ({ id: 'customer-2', ...data }),
    },
    transaction: { create: async ({ data }) => ({ id: 'tx-1', ...data }) },
    transactionItem: { create: async ({ data }) => ({ id: 'item-1', ...data }) },
    product: { update: async () => ({}) },
  };
  prisma.store = { findFirst: async ({ where }) => (ownedBy(where) ? victimStore : null) };
  prisma.product = { findMany: async () => [victimProduct] };
  prisma.$transaction = async (fn) => fn(tx);

  const res = await call('POST', '/api/transactions/store/store-victim', {
    token: tokenFor('user-victim'),
    body: {
      total: 5000,
      paymentMethod: 'CASH',
      items: [{ productId: 'product-victim', quantity: 1, price: 5000, subtotal: 5000 }],
      customer: {
        name: 'Budi',
        phone: '+620000000003',
        id: 'someone-elses-customer-id',
        createdAt: '2000-01-01T00:00:00.000Z',
        transactions: { deleteMany: {} },
      },
    },
  });

  assert.equal(res.status, 201);
  assert.equal(upserts.length, 1);
  assert.deepEqual(upserts[0].where, { phone: '+620000000003' });
  assert.deepEqual(upserts[0].update, {});
  assert.deepEqual(
    Object.keys(upserts[0].create).sort(),
    ['email', 'name', 'phone', 'preferredNotification'],
  );
});
