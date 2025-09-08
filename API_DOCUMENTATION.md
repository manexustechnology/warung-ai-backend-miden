# WarungChain Backend API Documentation

## Overview

WarungChain Backend API is a RESTful API for Web3 POS system integrated with Miden blockchain and DeFi. This API supports multi-store, multi-currency payments, and DeFi integrations.

## Base URL

```
Development: http://localhost:3001
Production: https://api.warungchain.com
```

## Authentication

API uses JWT (JSON Web Token) for authentication. Include token in request header:

```
Authorization: Bearer <your-jwt-token>
```

### Wallet-based Authentication

- Register/login using Miden wallet address
- Automatic store creation based on wallet address
- Multi-store support for single wallet

## Response Format

### Success Response
```json
{
  "message": "Success message",
  "data": {},
  "success": true
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

## API Endpoints

### Authentication

#### Register User
```http
POST /api/auth/register
```

**Request Body:**
```json
{
  "walletAddress": "mtst1qpkgxp982yprkypyz9pqt2glnc55dzxw",
  "email": "user@example.com",
  "phone": "+62812345678",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "user_id",
    "walletAddress": "mtst1qpkgxp982yprkypyz9pqt2glnc55dzxw",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "token": "jwt_token_here"
}
```

#### Login User
```http
POST /api/auth/login
```

**Request Body:**
```json
{
  "walletAddress": "mtst1qpkgxp982yprkypyz9pqt2glnc55dzxw"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "user": {
    "id": "user_id",
    "walletAddress": "mtst1qpkgxp982yprkypyz9pqt2glnc55dzxw",
    "email": "user@example.com",
    "name": "John Doe",
    "stores": []
  },
  "token": "jwt_token_here"
}
```

#### Get User Profile
```http
GET /api/auth/profile
```

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "user": {
    "id": "user_id",
    "walletAddress": "mtst1qpkgxp982yprkypyz9pqt2glnc55dzxw",
    "email": "user@example.com",
    "name": "John Doe",
    "stores": [
      {
        "id": "store_id",
        "name": "Warung Pak John",
        "walletAddress": "mtst1qpkgxp982yprkypyz9pqt2glnc55dzxw",
        "products": [],
        "transactions": [],
        "defiPositions": []
      }
    ]
  }
}
```

#### Update User Profile
```http
PUT /api/auth/profile
```

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "email": "newemail@example.com",
  "phone": "+62887654321",
  "name": "John Updated"
}
```

#### Verify Wallet Address
```http
POST /api/auth/verify-wallet
```

**Request Body:**
```json
{
  "walletAddress": "mtst1qpkgxp982yprkypyz9pqt2glnc55dzxw"
}
```

**Response:**
```json
{
  "isValid": true,
  "exists": false,
  "message": "Wallet address is available"
}
```

### Stores

#### Get User Stores
```http
GET /api/stores
```

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "stores": [
    {
      "id": "store_id",
      "storeId": "mtst1qpkgxp982yprkypyz9pqt2glnc55dzxw",
      "name": "Warung Pak John",
      "address": "Jl. Merdeka No. 123, Jakarta",
      "phone": "+62812345678",
      "whatsappNumber": "+62812345678",
      "currency": "IDR",
      "language": "INDONESIAN",
      "isActive": true,
      "products": [],
      "transactions": [],
      "defiPositions": [],
      "_count": {
        "products": 5,
        "transactions": 10,
        "defiPositions": 2
      }
    }
  ]
}
```

#### Get Store Details
```http
GET /api/stores/:storeId
```

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "store": {
    "id": "store_id",
    "name": "Warung Pak John",
    "address": "Jl. Merdeka No. 123, Jakarta",
    "phone": "+62812345678",
    "whatsappNumber": "+62812345678",
    "currency": "IDR",
    "language": "INDONESIAN",
    "isActive": true,
    "products": [
      {
        "id": "product_id",
        "name": "Beras 5kg",
        "price": 65000,
        "category": "Sembako",
        "stock": 50,
        "isActive": true
      }
    ],
    "transactions": [],
    "defiPositions": [],
    "_count": {
      "products": 5,
      "transactions": 10,
      "defiPositions": 2
    }
  }
}
```

#### Create Store
```http
POST /api/stores
```

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "name": "Warung Pak John",
  "walletAddress": "mtst1qpkgxp982yprkypyz9pqt2glnc55dzxw",
  "address": "Jl. Merdeka No. 123, Jakarta",
  "phone": "+62812345678",
  "whatsappNumber": "+62812345678",
  "telegramBotToken": "bot_token_here",
  "currency": "IDR",
  "language": "INDONESIAN"
}
```

#### Update Store
```http
PUT /api/stores/:storeId
```

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "name": "Updated Store Name",
  "address": "New Address",
  "phone": "+62887654321",
  "isActive": true
}
```

#### Get Store Statistics
```http
GET /api/stores/:storeId/stats
```

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "stats": {
    "totalProducts": 5,
    "totalTransactions": 10,
    "totalDefiPositions": 2,
    "totalEarnings": 500000,
    "totalDefiValue": 1000,
    "totalRewards": 50,
    "recentTransactions": 3,
    "averageTransactionValue": 50000
  }
}
```

### Products

#### Get Store Products
```http
GET /api/products/store/:storeId
```

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Query Parameters:**
- `category` - Filter by category
- `search` - Search by name or barcode
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)

**Response:**
```json
{
  "products": [
    {
      "id": "product_id",
      "name": "Beras 5kg",
      "nameEn": "Rice 5kg",
      "price": 65000,
      "category": "Sembako",
      "stock": 50,
      "image": "image_url",
      "barcode": "1234567890123",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  }
}
```

#### Get Product Details
```http
GET /api/products/:productId
```

**Headers:**
```
Authorization: Bearer <jwt-token>
```

#### Create Product
```http
POST /api/products/store/:storeId
```

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "name": "Beras 5kg",
  "nameEn": "Rice 5kg",
  "price": 65000,
  "category": "Sembako",
  "stock": 50,
  "image": "image_url",
  "barcode": "1234567890123"
}
```

#### Update Product
```http
PUT /api/products/:productId
```

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "name": "Updated Product Name",
  "price": 70000,
  "stock": 45,
  "isActive": true
}
```

#### Delete Product
```http
DELETE /api/products/:productId
```

**Headers:**
```
Authorization: Bearer <jwt-token>
```

#### Get Product Categories
```http
GET /api/products/store/:storeId/categories
```

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "categories": ["Sembako", "Makanan", "Minuman", "Rokok"]
}
```

#### Bulk Update Stock
```http
PATCH /api/products/store/:storeId/bulk-stock
```

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "products": [
    {
      "id": "product_id_1",
      "stock": 45
    },
    {
      "id": "product_id_2",
      "stock": 30
    }
  ]
}
```

#### Search Product by Barcode
```http
GET /api/products/store/:storeId/barcode/:barcode
```

**Headers:**
```
Authorization: Bearer <jwt-token>
```

### Transactions

#### Get Store Transactions
```http
GET /api/transactions/store/:storeId
```

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Query Parameters:**
- `status` - Filter by payment status
- `paymentMethod` - Filter by payment method
- `startDate` - Start date filter
- `endDate` - End date filter
- `search` - Search by transaction ID or customer
- `page` - Page number
- `limit` - Items per page

**Response:**
```json
{
  "transactions": [
    {
      "id": "transaction_id",
      "total": 83000,
      "paymentMethod": "CASH",
      "paymentStatus": "COMPLETED",
      "change": 17000,
      "cryptoCurrency": null,
      "cryptoAmount": null,
      "txHash": null,
      "receiptSent": false,
      "createdAt": "2024-01-01T00:00:00Z",
      "customer": {
        "id": "customer_id",
        "name": "Ahmad",
        "phone": "+62811111111"
      },
      "items": [
        {
          "id": "item_id",
          "quantity": 1,
          "price": 65000,
          "subtotal": 65000,
          "product": {
            "id": "product_id",
            "name": "Beras 5kg",
            "price": 65000
          }
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 10,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  }
}
```

#### Get Transaction Details
```http
GET /api/transactions/:transactionId
```

**Headers:**
```
Authorization: Bearer <jwt-token>
```

#### Create Transaction
```http
POST /api/transactions/store/:storeId
```

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "total": 83000,
  "paymentMethod": "CASH",
  "paymentStatus": "COMPLETED",
  "change": 17000,
  "cryptoCurrency": null,
  "cryptoAmount": null,
  "txHash": null,
  "items": [
    {
      "productId": "product_id",
      "quantity": 1,
      "price": 65000,
      "subtotal": 65000
    }
  ],
  "customer": {
    "name": "Ahmad",
    "phone": "+62811111111",
    "email": "ahmad@example.com",
    "preferredNotification": "WHATSAPP"
  }
}
```

#### Update Transaction Status
```http
PATCH /api/transactions/:transactionId/status
```

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "paymentStatus": "COMPLETED",
  "txHash": "ABC123DEF456"
}
```

#### Mark Receipt as Sent
```http
PATCH /api/transactions/:transactionId/receipt
```

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "receiptSent": true
}
```

#### Get Transaction Statistics
```http
GET /api/transactions/store/:storeId/stats
```

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Query Parameters:**
- `period` - Period in days (default: 30)

**Response:**
```json
{
  "stats": {
    "totalEarnings": 500000,
    "totalTransactions": 10,
    "recentEarnings": 150000,
    "recentTransactions": 3,
    "averageTransactionValue": 50000,
    "paymentMethodStats": {
      "CASH": 5,
      "CARD": 3,
      "CRYPTO": 2
    },
    "dailyStats": {
      "2024-01-01": {
        "count": 2,
        "total": 100000
      }
    }
  }
}
```

### Cart

#### Get Active Cart
```http
GET /api/cart/store/:storeId
```

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "cart": {
    "id": "cart_id",
    "total": 83000,
    "isActive": true,
    "items": [
      {
        "id": "item_id",
        "quantity": 1,
        "subtotal": 65000,
        "product": {
          "id": "product_id",
          "name": "Beras 5kg",
          "price": 65000,
          "stock": 50
        }
      }
    ]
  },
  "total": 83000,
  "itemCount": 1
}
```

#### Add Item to Cart
```http
POST /api/cart/store/:storeId/items
```

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "productId": "product_id",
  "quantity": 1
}
```

#### Update Cart Item
```http
PUT /api/cart/store/:storeId/items/:itemId
```

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "quantity": 2
}
```

#### Remove Item from Cart
```http
DELETE /api/cart/store/:storeId/items/:itemId
```

**Headers:**
```
Authorization: Bearer <jwt-token>
```

#### Clear Cart
```http
DELETE /api/cart/store/:storeId
```

**Headers:**
```
Authorization: Bearer <jwt-token>
```

### DeFi

#### Get DeFi Pools
```http
GET /api/defi/pools
```

**Response:**
```json
{
  "pools": [
    {
      "id": "pool_id",
      "poolId": "miden-pool",
      "name": "MIDEN Lending Pool",
      "asset": "MIDEN",
      "apy": 5.2,
      "totalDeposited": 1000000,
      "isActive": true,
      "appId": 123456789
    }
  ]
}
```

#### Get Store DeFi Positions
```http
GET /api/defi/store/:storeId/positions
```

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "positions": [
    {
      "id": "position_id",
      "poolId": "miden-pool",
      "amount": 100,
      "value": 25,
      "rewards": 1.2,
      "txHash": "DEF456GHI789",
      "createdAt": "2024-01-01T00:00:00Z",
      "user": {
        "id": "user_id",
        "walletAddress": "mtst1qpkgxp982yprkypyz9pqt2glnc55dzxw"
      }
    }
  ],
  "summary": {
    "totalValue": 25,
    "totalRewards": 1.2,
    "positionCount": 1
  }
}
```

#### Get DeFi Position Details
```http
GET /api/defi/positions/:positionId
```

**Headers:**
```
Authorization: Bearer <jwt-token>
```

#### Create DeFi Position (Deposit)
```http
POST /api/defi/store/:storeId/deposit
```

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "poolId": "miden-pool",
  "amount": 100,
  "value": 25,
  "txHash": "DEF456GHI789"
}
```

#### Update DeFi Position
```http
PATCH /api/defi/positions/:positionId
```

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "amount": 150,
  "value": 37.5,
  "rewards": 2.5,
  "txHash": "NEW_TX_HASH"
}
```

#### Remove DeFi Position (Withdraw)
```http
DELETE /api/defi/positions/:positionId
```

**Headers:**
```
Authorization: Bearer <jwt-token>
```

#### Get DeFi Statistics
```http
GET /api/defi/store/:storeId/stats
```

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "stats": {
    "totalValue": 525,
    "totalRewards": 9.9,
    "totalAmount": 600,
    "positionCount": 2,
    "poolStats": [
      {
        "poolId": "miden-pool",
        "totalAmount": 100,
        "totalValue": 25,
        "totalRewards": 1.2,
        "positionCount": 1
      }
    ],
    "averagePositionValue": 262.5
  }
}
```

#### Claim Rewards
```http
POST /api/defi/positions/:positionId/claim-rewards
```

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "txHash": "REWARD_CLAIM_TX_HASH"
}
```

#### Get DeFi Pool Details
```http
GET /api/defi/pools/:poolId
```

### Marketplace

#### Get Marketplace Stores
```http
GET /api/marketplace/stores
```

**Query Parameters:**
- `search` - Search stores
- `category` - Filter by product category
- `sortBy` - Sort by field (name, lastActive, createdAt)
- `sortOrder` - Sort order (asc, desc)
- `page` - Page number
- `limit` - Items per page

**Response:**
```json
{
  "stores": [
    {
      "id": "store_id",
      "name": "Warung Pak John",
      "walletAddress": "mtst1qpkgxp982yprkypyz9pqt2glnc55dzxw",
      "address": "Jl. Merdeka No. 123, Jakarta",
      "currency": "IDR",
      "isActive": true,
      "lastActive": "2024-01-01T00:00:00Z",
      "totalEarnings": 500000,
      "totalDefiValue": 1000,
      "averageTransactionValue": 50000,
      "_count": {
        "products": 5,
        "transactions": 10,
        "defiPositions": 2
      },
      "products": [],
      "transactions": []
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 10,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  }
}
```

#### Get Marketplace Statistics
```http
GET /api/marketplace/stats
```

**Response:**
```json
{
  "stats": {
    "totalStores": 10,
    "totalTransactions": 100,
    "totalVolume": 5000000,
    "totalDefiValue": 10000,
    "activeStores": 8,
    "lastUpdated": "2024-01-01T00:00:00Z"
  }
}
```

#### Get Store Details (Marketplace)
```http
GET /api/marketplace/stores/:storeId
```

#### Get Store Products (Marketplace)
```http
GET /api/marketplace/stores/:storeId/products
```

**Query Parameters:**
- `category` - Filter by category
- `search` - Search products
- `sortBy` - Sort by field (name, price, category)
- `sortOrder` - Sort order (asc, desc)
- `page` - Page number
- `limit` - Items per page

#### Get Product Categories
```http
GET /api/marketplace/categories
```

**Response:**
```json
{
  "categories": ["Sembako", "Makanan", "Minuman", "Rokok"]
}
```

#### Search Stores and Products
```http
GET /api/marketplace/search
```

**Query Parameters:**
- `q` - Search query (required)
- `type` - Search type (all, stores, products)
- `page` - Page number
- `limit` - Items per page

**Response:**
```json
{
  "results": {
    "stores": [],
    "products": []
  },
  "query": "search term",
  "type": "all"
}
```

#### Get Trending Stores
```http
GET /api/marketplace/trending
```

**Response:**
```json
{
  "trendingStores": [
    {
      "id": "store_id",
      "name": "Warung Pak John",
      "walletAddress": "mtst1qpkgxp982yprkypyz9pqt2glnc55dzxw",
      "recentEarnings": 150000,
      "averageTransactionValue": 50000,
      "_count": {
        "transactions": 3,
        "products": 5
      }
    }
  ]
}
```

### Customers

#### Get Store Customers
```http
GET /api/customers/store/:storeId
```

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Query Parameters:**
- `search` - Search customers
- `page` - Page number
- `limit` - Items per page

**Response:**
```json
{
  "customers": [
    {
      "id": "customer_id",
      "name": "Ahmad",
      "phone": "+62811111111",
      "email": "ahmad@example.com",
      "preferredNotification": "WHATSAPP",
      "totalSpent": 150000,
      "averageOrderValue": 50000,
      "transactionCount": 3,
      "transactions": []
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  }
}
```

#### Get Customer Details
```http
GET /api/customers/:customerId
```

**Headers:**
```
Authorization: Bearer <jwt-token>
```

#### Create Customer
```http
POST /api/customers/store/:storeId
```

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "name": "Ahmad",
  "phone": "+62811111111",
  "email": "ahmad@example.com",
  "preferredNotification": "WHATSAPP"
}
```

#### Update Customer
```http
PUT /api/customers/:customerId
```

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "name": "Ahmad Updated",
  "phone": "+62811111111",
  "email": "ahmad.updated@example.com"
}
```

#### Get Customer Statistics
```http
GET /api/customers/store/:storeId/stats
```

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "stats": {
    "totalCustomers": 5,
    "totalSpent": 500000,
    "averageCustomerValue": 100000,
    "topCustomers": [
      {
        "id": "customer_id",
        "name": "Ahmad",
        "phone": "+62811111111",
        "totalSpent": 150000,
        "transactionCount": 3
      }
    ],
    "customerAcquisition": {
      "2024-01": 2,
      "2024-02": 3
    }
  }
}
```

#### Search Customers
```http
GET /api/customers/store/:storeId/search
```

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Query Parameters:**
- `q` - Search query (required)

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid input data |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Access denied |
| 404 | Not Found - Resource not found |
| 409 | Conflict - Resource already exists |
| 422 | Validation Error - Invalid data format |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error - Server error |

## Rate Limiting

API implements rate limiting to prevent abuse:
- 100 requests per 15 minutes per IP address
- Rate limit headers included in responses:
  - `X-RateLimit-Limit`
  - `X-RateLimit-Remaining`
  - `X-RateLimit-Reset`

## Webhooks (Future)

Planned webhook endpoints for real-time notifications:
- Transaction completed
- Payment received
- DeFi position updated
- Stock low alerts

## SDKs and Libraries

### JavaScript/TypeScript
```javascript
// Example usage with fetch
const response = await fetch('http://localhost:3001/api/stores', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
```

### cURL Examples
```bash
# Get stores
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3001/api/stores

# Create product
curl -X POST \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"name":"Product","price":10000,"category":"Food","stock":10}' \
     http://localhost:3001/api/products/store/STORE_ID

# Create transaction
curl -X POST \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"total":10000,"paymentMethod":"CASH","items":[{"productId":"PROD_ID","quantity":1,"price":10000,"subtotal":10000}]}' \
     http://localhost:3001/api/transactions/store/STORE_ID
```

## Testing

### Health Check
```bash
curl http://localhost:3001/health
```

### Test with Sample Data
After running the seed script, you can test with sample data:
- Sample users with wallet addresses
- Sample stores and products
- Sample transactions and customers
- Sample DeFi positions

## Support

For API support and questions:
- Create issue in repository
- Email: api-support@warungchain.com
- Documentation: https://docs.warungchain.com/api