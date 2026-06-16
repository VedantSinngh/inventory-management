# API Documentation - Advanced Features

## Table of Contents
1. [Optimal Route Planner](#1-optimal-route-planner-api)
2. [Priority Reorder Queue](#2-priority-reorder-queue-api)
3. [Product Search & Autocomplete](#3-product-search--autocomplete-api)
4. [LLM Alert Descriptions](#4-llm-alert-descriptions-api)

---

## 1. Optimal Route Planner API

### Overview
Uses Dijkstra's algorithm to find the most cost-effective or fastest delivery route between warehouses and suppliers.

### Base URL
```
POST /api/routes
GET /api/routes
PUT /api/routes/:id
DELETE /api/routes/:id
```

### Endpoints

#### 1.1 Find Optimal Route
**POST** `/api/routes/optimal`

Find the best route between two locations.

**Request**:
```json
{
  "fromNodeId": "warehouse_id_or_supplier_id",
  "toNodeId": "destination_id",
  "criterion": "COST" | "DISTANCE" | "TIME"
}
```

**Response** (200 OK):
```json
{
  "data": {
    "startNode": {
      "id": "...",
      "name": "Main Warehouse",
      "type": "WAREHOUSE",
      "latitude": 40.7128,
      "longitude": -74.0060
    },
    "endNode": {
      "id": "...",
      "name": "Supplier A",
      "type": "SUPPLIER",
      "latitude": 40.7489,
      "longitude": -73.9680
    },
    "path": [
      {
        "from": "warehouse_id",
        "to": "supplier_id",
        "distance": 12.5,
        "cost": 62.5,
        "time": 15,
        "carrier": "FEDEX"
      }
    ],
    "totalDistance": 12.5,
    "totalCost": 62.5,
    "totalTime": 15,
    "steps": 1,
    "criterion": "COST",
    "timestamp": "2026-05-01T12:00:00Z"
  }
}
```

**Error** (400/404):
```json
{
  "message": "Invalid start or end node",
  "status": 400
}
```

---

#### 1.2 Create Manual Route
**POST** `/api/routes/manual`

Manually define a route between two locations.

**Request** (Admin/Manager):
```json
{
  "name": "Main to Supplier A",
  "fromNodeId": "warehouse_id",
  "toNodeId": "supplier_id",
  "fromNodeType": "WAREHOUSE",
  "toNodeType": "SUPPLIER",
  "distance": 12.5,
  "estimatedTime": 15,
  "cost": 62.5,
  "carriers": ["FEDEX", "UPS"],
  "maxWeight": 1000,
  "maxVolume": 50,
  "notes": "Direct route via Highway 95"
}
```

**Response** (201 Created):
```json
{
  "data": {
    "_id": "...",
    "name": "Main to Supplier A",
    "distance": 12.5,
    "estimatedTime": 15,
    "cost": 62.5,
    "carriers": ["FEDEX", "UPS"],
    "active": true,
    "createdAt": "2026-05-01T12:00:00Z"
  }
}
```

---

#### 1.3 List Routes
**GET** `/api/routes?active=true&page=1&limit=20`

Get all defined routes.

**Response**:
```json
{
  "data": [
    {
      "_id": "...",
      "name": "Route 1",
      "distance": 100,
      "cost": 500,
      "estimatedTime": 120,
      "active": true,
      "lastUsed": "2026-05-01T10:00:00Z",
      "usageCount": 42
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 47,
    "pages": 3
  }
}
```

---

#### 1.4 Optimize Shipment Route
**POST** `/api/routes/shipment/:shipmentId/optimize`

Find the optimal route for a specific shipment.

**Request**:
```json
{
  "criterion": "COST" | "TIME"
}
```

**Response**: Same as 1.1

---

## 2. Priority Reorder Queue API

### Overview
Uses a Min-Heap priority queue to rank products by reorder urgency.

### Base URL
```
GET /api/reorders/priority
POST /api/reorders/priority/auto-order
```

### Endpoints

#### 2.1 Get Priority Reorder Queue
**GET** `/api/reorders/priority?page=1&limit=20`

Get products ranked by reorder urgency.

**Response** (200 OK):
```json
{
  "data": [
    {
      "productId": "...",
      "sku": "SKU-001",
      "name": "Laptop Pro 15",
      "category": "Electronics",
      "currentStock": 5,
      "lowStockThreshold": 10,
      "reorderQuantity": 50,
      "priority": 87.3,
      "urgencyMetrics": {
        "score": 87.3,
        "daysToStockout": 2.27,
        "demandVelocity": 2.2,
        "leadTime": 7,
        "stockPercentage": 50,
        "recommendation": {
          "priority": "CRITICAL",
          "action": "IMMEDIATE_REORDER",
          "reason": "Stock critically low - risk of stockout"
        }
      },
      "supplier": {
        "_id": "...",
        "name": "TechCorp Supplies"
      }
    },
    {
      "productId": "...",
      "sku": "SKU-002",
      "name": "USB Cable",
      "currentStock": 15,
      "priority": 62.1,
      "urgencyMetrics": {
        "priority": "HIGH",
        "action": "URGENT_REORDER",
        "reason": "Stock approaching minimum level"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 47,
    "pages": 3
  }
}
```

---

#### 2.2 Get Reorder Summary
**GET** `/api/reorders/priority/summary`

Get summary counts by urgency level.

**Response**:
```json
{
  "data": {
    "totalItems": 47,
    "critical": {
      "count": 3,
      "totalReorderQuantity": 450,
      "estimatedCost": 22500
    },
    "high": {
      "count": 8,
      "totalReorderQuantity": 1200,
      "estimatedCost": 60000
    },
    "medium": {
      "count": 15,
      "totalReorderQuantity": 1850,
      "estimatedCost": 92500
    }
  }
}
```

---

#### 2.3 Get Product Urgency Score
**GET** `/api/reorders/priority/product/:productId`

Get detailed urgency metrics for a specific product.

**Response**:
```json
{
  "data": {
    "productId": "...",
    "sku": "SKU-001",
    "name": "Laptop Pro 15",
    "currentStock": 5,
    "lowStockThreshold": 10,
    "score": 87.3,
    "daysToStockout": 2.27,
    "demandVelocity": 2.2,
    "leadTime": 7,
    "stockPercentage": 50,
    "recommendation": {
      "priority": "CRITICAL",
      "action": "IMMEDIATE_REORDER",
      "reason": "Stock critically low - risk of stockout"
    }
  }
}
```

---

#### 2.4 Auto-Create Purchase Orders
**POST** `/api/reorders/priority/auto-order`

Auto-create purchase orders for all CRITICAL items (Admin only).

**Response** (201 Created):
```json
{
  "data": [
    {
      "_id": "...",
      "type": "PURCHASE",
      "status": "PENDING",
      "items": [
        {
          "product": "...",
          "quantity": 150,
          "priceAtTime": 800
        }
      ],
      "totalAmount": 120000
    }
  ],
  "pagination": {
    "total": 5
  }
}
```

---

#### 2.5 Reorder Analytics
**GET** `/api/reorders/analytics`

Get analytics on reorder performance.

**Response**:
```json
{
  "data": {
    "totalProducts": 250,
    "productsNeedingReorder": 47,
    "averageTurnover": 4.2,
    "stockoutRiskProducts": 3
  }
}
```

---

## 3. Product Search & Autocomplete API

### Overview
Lightning-fast Trie-based product search with autocomplete.

### Base URL
```
GET /api/search/products
GET /api/search/autocomplete
POST /api/search/rebuild-index
GET /api/search/stats
```

### Endpoints

#### 3.1 Product Search
**GET** `/api/search/products?q=laptop&limit=10&exact=true`

Fast prefix search for products.

**Parameters**:
- `q` (required): Search query (min 1 character)
- `limit` (optional): Max results (default 10)
- `exact` (optional): Exact match or fuzzy search (default false)

**Response** (200 OK):
```json
{
  "data": [
    {
      "_id": "...",
      "sku": "LAP-001",
      "name": "Laptop Pro 15",
      "category": "Electronics",
      "stock": 25,
      "price": 1200,
      "lowStockThreshold": 5,
      "warehouse": "..."
    },
    {
      "_id": "...",
      "sku": "LAP-002",
      "name": "Laptop Business 13",
      "category": "Electronics",
      "stock": 0,
      "price": 800
    }
  ],
  "pagination": {
    "total": 2,
    "limit": 10
  }
}
```

---

#### 3.2 Autocomplete
**GET** `/api/search/autocomplete?q=lap&limit=5`

Get autocomplete suggestions while typing.

**Parameters**:
- `q`: Partial search term (min 2 characters)
- `limit`: Max suggestions (default 5)

**Response**:
```json
{
  "data": [
    {
      "id": "...",
      "text": "LAP-001 - Laptop Pro 15",
      "sku": "LAP-001",
      "name": "Laptop Pro 15",
      "stock": 25
    },
    {
      "id": "...",
      "text": "LAP-002 - Laptop Business 13",
      "sku": "LAP-002",
      "name": "Laptop Business 13",
      "stock": 0
    }
  ]
}
```

---

#### 3.3 Rebuild Search Index
**POST** `/api/search/rebuild-index`

Manually rebuild the Trie index (Admin only).

**Response** (200 OK):
```json
{
  "message": "Search index rebuilt successfully",
  "data": {
    "buildTime": "2026-05-01T12:00:00Z",
    "stats": {
      "nodeCount": 15847,
      "uniqueProducts": 250,
      "endWords": 3421,
      "productReferences": 18924
    }
  }
}
```

---

#### 3.4 Search Statistics
**GET** `/api/search/stats`

Get Trie performance statistics.

**Response**:
```json
{
  "data": {
    "nodeCount": 15847,
    "uniqueProducts": 250,
    "endWords": 3421,
    "productReferences": 18924,
    "lastBuilt": "2026-05-01T12:00:00Z"
  }
}
```

---

## 4. LLM Alert Descriptions API

### Overview
Generate human-readable alert descriptions using LLM (Local, OpenAI, or HuggingFace).

### Base URL
```
POST /api/llm-alerts/generate-description/:alertId
POST /api/llm-alerts/generate-batch-descriptions
GET /api/llm-alerts/llm/health
PUT /api/alerts/:id/update-description
POST /api/llm-alerts/configure-llm
```

### Endpoints

#### 4.1 Generate Alert Description
**POST** `/api/llm-alerts/generate-description/:alertId`

Generate description for a single alert.

**Response** (200 OK):
```json
{
  "data": {
    "alertId": "...",
    "description": "Laptop Pro 15 stock (5 units) is below minimum threshold (10 units). At current demand velocity, will stockout in 2 days. Immediate reorder recommended.",
    "provider": "OPENAI",
    "success": true
  }
}
```

---

#### 4.2 Batch Generate Descriptions
**POST** `/api/llm-alerts/generate-batch-descriptions`

Generate descriptions for multiple alerts.

**Request** (Admin only):
```json
{
  "alertIds": ["id1", "id2", "id3"],
  "limit": 50
}
```

**Response**:
```json
{
  "data": [
    {
      "alertId": "...",
      "description": "Laptop Pro 15 stock (5 units)...",
      "success": true
    },
    {
      "alertId": "...",
      "description": "USB Cable stock critically low...",
      "success": true
    }
  ],
  "pagination": {
    "total": 3,
    "successful": 3,
    "failed": 0
  }
}
```

---

#### 4.3 Check LLM Health
**GET** `/api/llm-alerts/llm/health`

Check if LLM service is available.

**Response**:
```json
{
  "data": {
    "provider": "OPENAI",
    "healthy": true,
    "status": "OK",
    "error": null
  }
}
```

---

#### 4.4 Update Alert Description
**PUT** `/api/alerts/:id/update-description`

Manually update alert description.

**Request**:
```json
{
  "description": "Custom alert description here"
}
```

**Response**:
```json
{
  "data": {
    "_id": "...",
    "type": "STOCK_LOW",
    "description": "Custom alert description here",
    "severity": "HIGH",
    "updatedAt": "2026-05-01T12:00:00Z"
  }
}
```

---

#### 4.5 Configure LLM Provider
**POST** `/api/llm-alerts/configure-llm`

Change LLM provider settings (Admin only).

**Request**:
```json
{
  "provider": "OPENAI" | "HUGGINGFACE" | "LOCAL",
  "apiKey": "sk-xxx...",
  "endpoint": "http://localhost:8000/generate",
  "model": "gpt-3.5-turbo"
}
```

**Response**:
```json
{
  "message": "LLM configuration updated",
  "data": {
    "provider": "OPENAI",
    "model": "gpt-3.5-turbo",
    "endpoint": "configured"
  }
}
```

---

## Environment Variables

### LLM Configuration
```bash
# LLM Provider: LOCAL | OPENAI | HUGGINGFACE
LLM_PROVIDER=LOCAL

# For cloud providers
LLM_API_KEY=sk-xxx...

# For OpenAI
LLM_MODEL=gpt-3.5-turbo

# For local LLM endpoint
LLM_ENDPOINT=http://localhost:8000/generate
```

---

## Error Handling

All endpoints return consistent error responses:

```json
{
  "message": "Error description",
  "status": 400,
  "error": "Additional details if available"
}
```

### Common Status Codes
- **200**: Success
- **201**: Created
- **400**: Bad request
- **401**: Unauthorized
- **403**: Forbidden
- **404**: Not found
- **500**: Server error

---

## Rate Limiting

- Auth endpoints: 5 requests/minute
- Other endpoints: 100 requests/minute
- LLM generation: 10 requests/minute (due to external API calls)

---

## Authentication

All endpoints require JWT token in `Authorization` header:
```
Authorization: Bearer <jwt_token>
```

---

## Examples

### Complete Route Optimization Flow
```bash
# 1. Get all warehouses and suppliers
curl http://localhost:5000/api/warehouses
curl http://localhost:5000/api/suppliers

# 2. Find optimal route
curl -X POST http://localhost:5000/api/routes/optimal \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fromNodeId": "warehouse_id",
    "toNodeId": "supplier_id",
    "criterion": "COST"
  }'

# 3. Check reorder needs
curl http://localhost:5000/api/reorders/priority \
  -H "Authorization: Bearer $TOKEN"

# 4. Search for products
curl "http://localhost:5000/api/search/products?q=laptop" \
  -H "Authorization: Bearer $TOKEN"

# 5. Generate alert descriptions
curl -X POST http://localhost:5000/api/llm-alerts/generate-batch-descriptions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"limit": 10}'
```

---

**Last Updated**: May 1, 2026  
**API Version**: 1.0  
**Status**: Production Ready ✅
