# WarungChain Backend API

Backend API untuk sistem POS Web3 WarungChain yang terintegrasi dengan blockchain Miden dan DeFi.

## 🚀 Fitur Utama

- **Authentication & Authorization** - JWT-based auth dengan wallet address
- **Store Management** - Multi-store support dengan wallet-based ownership
- **Product Management** - CRUD operations untuk produk dengan kategori dan stok
- **Transaction Processing** - Support untuk cash, card, dan crypto payments
- **Cart Management** - Shopping cart dengan real-time updates
- **DeFi Integration** - Lending pools dan position management
- **Marketplace** - Multi-store marketplace dengan analytics
- **Customer Management** - Customer tracking dan analytics
- **Real-time Analytics** - Dashboard statistics dan reporting

## 🛠️ Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT
- **Validation**: Express-validator
- **Security**: Helmet, CORS, Rate limiting

## 📋 Prerequisites

- Node.js 18+ 
- PostgreSQL 12+
- npm atau yarn

## 🔧 Setup & Installation

### 1. Clone Repository
```bash
git clone <repository-url>
cd backend
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Copy file environment example:
```bash
cp env.example .env
```

Edit `.env` file dengan konfigurasi database dan aplikasi:
```env
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/warungchain_db"

# Server Configuration
PORT=3001
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# Miden Configuration
MIDEN_NETWORK=testnet
MIDEN_RPC_URL=https://testnet.miden.io
MIDEN_EXPLORER_URL=https://explorer.testnet.miden.io
MIDEN_FAUCET_URL=https://faucet.testnet.miden.io
USDC_ASSET_ID=31566704

# CORS Configuration
CORS_ORIGIN=http://localhost:5173
```

### 4. Database Setup
```bash
# Generate Prisma client
npm run db:generate

# Push schema ke database
npm run db:push

# Atau gunakan migration (recommended untuk production)
npm run db:migrate
```

### 5. Seed Database (Optional)
```bash
npm run db:seed
```

### 6. Start Development Server
```bash
npm run dev
```

Server akan berjalan di `http://localhost:3001`

## 📊 Database Schema

### Core Tables
- **users** - User accounts dengan wallet addresses
- **stores** - Store/business information
- **products** - Product catalog dengan kategori
- **transactions** - Sales transactions dengan payment methods
- **transaction_items** - Individual items dalam transaksi
- **customers** - Customer information
- **carts** - Shopping cart sessions
- **cart_items** - Items dalam cart

### DeFi Tables
- **defi_positions** - User DeFi positions
- **defi_pools** - Available DeFi pools

### Analytics Tables
- **marketplace_stats** - Cached marketplace statistics

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register user dengan wallet address
- `POST /api/auth/login` - Login dengan wallet address
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile
- `POST /api/auth/verify-wallet` - Verify wallet address

### Stores
- `GET /api/stores` - Get user's stores
- `GET /api/stores/:id` - Get store details
- `POST /api/stores` - Create new store
- `PUT /api/stores/:id` - Update store
- `DELETE /api/stores/:id` - Delete store
- `GET /api/stores/:id/stats` - Get store statistics

### Products
- `GET /api/products/store/:storeId` - Get store products
- `GET /api/products/:id` - Get product details
- `POST /api/products/store/:storeId` - Create product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product
- `GET /api/products/store/:storeId/categories` - Get product categories
- `PATCH /api/products/store/:storeId/bulk-stock` - Bulk update stock

### Transactions
- `GET /api/transactions/store/:storeId` - Get store transactions
- `GET /api/transactions/:id` - Get transaction details
- `POST /api/transactions/store/:storeId` - Create transaction
- `PATCH /api/transactions/:id/status` - Update transaction status
- `PATCH /api/transactions/:id/receipt` - Update receipt status
- `GET /api/transactions/store/:storeId/stats` - Get transaction statistics

### Cart
- `GET /api/cart/store/:storeId` - Get active cart
- `POST /api/cart/store/:storeId/items` - Add item to cart
- `PUT /api/cart/store/:storeId/items/:itemId` - Update cart item
- `DELETE /api/cart/store/:storeId/items/:itemId` - Remove item from cart
- `DELETE /api/cart/store/:storeId` - Clear cart

### DeFi
- `GET /api/defi/pools` - Get DeFi pools
- `GET /api/defi/store/:storeId/positions` - Get store DeFi positions
- `GET /api/defi/positions/:id` - Get position details
- `POST /api/defi/store/:storeId/deposit` - Create DeFi position
- `PATCH /api/defi/positions/:id` - Update position
- `DELETE /api/defi/positions/:id` - Remove position
- `GET /api/defi/store/:storeId/stats` - Get DeFi statistics
- `POST /api/defi/positions/:id/claim-rewards` - Claim rewards

### Marketplace
- `GET /api/marketplace/stores` - Get marketplace stores
- `GET /api/marketplace/stats` - Get marketplace statistics
- `GET /api/marketplace/stores/:id` - Get store details
- `GET /api/marketplace/stores/:id/products` - Get store products
- `GET /api/marketplace/categories` - Get product categories
- `GET /api/marketplace/search` - Search stores/products
- `GET /api/marketplace/trending` - Get trending stores

### Customers
- `GET /api/customers/store/:storeId` - Get store customers
- `GET /api/customers/:id` - Get customer details
- `POST /api/customers/store/:storeId` - Create customer
- `PUT /api/customers/:id` - Update customer
- `GET /api/customers/store/:storeId/stats` - Get customer statistics
- `GET /api/customers/store/:storeId/search` - Search customers

## 🔐 Authentication

API menggunakan JWT authentication. Include token di header:
```
Authorization: Bearer <jwt-token>
```

### Wallet-based Authentication
- Register/login menggunakan Miden wallet address
- Automatic store creation berdasarkan wallet address
- Multi-store support untuk single wallet

## 💰 Payment Methods

### Supported Payment Methods
- **Cash** - Traditional cash payments dengan change calculation
- **Card** - Credit/debit card payments
- **Crypto** - MIDEN payments via Miden blockchain

### Crypto Payment Flow
1. Generate payment QR code
2. Customer scan dengan Miden Wallet
3. Transaction signed dan broadcasted
4. Payment confirmation via blockchain
5. Update transaction status

## 🏦 DeFi Integration

### Lending Pools
- MIDEN Lending Pool (6.5% APY)

### Position Management
- Deposit funds ke lending pools
- Track position value dan rewards
- Claim rewards
- Withdraw funds

## 📈 Analytics & Reporting

### Store Analytics
- Total earnings dan transactions
- Product performance
- Customer analytics
- Payment method distribution

### Marketplace Analytics
- Total stores dan volume
- Trending stores
- Category performance
- Search analytics

## 🚀 Production Deployment

### Environment Variables
```env
NODE_ENV=production
DATABASE_URL=your-production-database-url
JWT_SECRET=your-production-jwt-secret
CORS_ORIGIN=your-frontend-domain
```

### Database Migration
```bash
npm run db:migrate
```

### Start Production Server
```bash
npm start
```

## 🧪 Testing

### Health Check
```bash
curl http://localhost:3001/health
```

### API Testing
Gunakan tools seperti Postman atau curl untuk test endpoints.

## 📝 API Documentation

### Request/Response Format
```json
{
  "success": true,
  "data": {},
  "message": "Success message"
}
```

### Error Response
```json
{
  "error": "Error type",
  "message": "Error description",
  "details": []
}
```

## 🔧 Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema changes
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Prisma Studio
- `npm run db:seed` - Seed database with sample data

### Code Structure
```
src/
├── index.js          # Main server file
├── middleware/       # Authentication & validation
├── routes/          # API route handlers
└── utils/           # Utility functions
```

## 🤝 Contributing

1. Fork repository
2. Create feature branch
3. Make changes
4. Add tests
5. Submit pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

Untuk support dan pertanyaan:
- Create issue di repository
- Email: support@warungchain.com
- Documentation: https://docs.warungchain.com