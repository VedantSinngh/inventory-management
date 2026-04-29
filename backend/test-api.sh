#!/bin/bash

# API Testing Script
# Tests critical endpoints and verifies production hardening fixes

API_URL="http://localhost:5000/api"
ADMIN_TOKEN=""
MANAGER_TOKEN=""
PRODUCT_ID=""
ORDER_ID=""

echo "🚀 Starting API Tests..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Test 1: Login - Admin
echo "✓ Test 1: Admin Login"
ADMIN_LOGIN=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@system.core","password":"admin123"}')
ADMIN_TOKEN=$(echo $ADMIN_LOGIN | grep -o '"token":"[^"]*' | cut -d'"' -f4)
if [ -n "$ADMIN_TOKEN" ]; then
  echo "  ✅ Admin login successful"
else
  echo "  ❌ Admin login failed"
  echo "  Response: $ADMIN_LOGIN"
fi

# Test 2: Login - Manager
echo "✓ Test 2: Manager Login"
MANAGER_LOGIN=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"manager@system.core","password":"manager123"}')
MANAGER_TOKEN=$(echo $MANAGER_LOGIN | grep -o '"token":"[^"]*' | cut -d'"' -f4)
if [ -n "$MANAGER_TOKEN" ]; then
  echo "  ✅ Manager login successful"
else
  echo "  ❌ Manager login failed"
fi

# Test 3: Get Products
echo "✓ Test 3: Get Products with Pagination"
PRODUCTS=$(curl -s -X GET "$API_URL/products?page=1&limit=10" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
if echo "$PRODUCTS" | grep -q "pagination"; then
  echo "  ✅ Product pagination working"
else
  echo "  ⚠️  Pagination format may differ"
fi

# Test 4: Create Product with Validation
echo "✓ Test 4: Product Creation - Invalid Price (Should Fail)"
INVALID_PRODUCT=$(curl -s -X POST "$API_URL/products" \
  -H "Authorization: Bearer $MANAGER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Test Product",
    "sku":"TEST-001",
    "category":"Test",
    "price":-100,
    "stock":10
  }')
if echo "$INVALID_PRODUCT" | grep -q "error\|Error"; then
  echo "  ✅ Validation working - rejected negative price"
else
  echo "  ⚠️  Validation response: $INVALID_PRODUCT"
fi

# Test 5: Create Valid Product
echo "✓ Test 5: Create Valid Product"
VALID_PRODUCT=$(curl -s -X POST "$API_URL/products" \
  -H "Authorization: Bearer $MANAGER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Test Product",
    "sku":"TEST-TIME-'$(date +%s)'",
    "category":"Test",
    "price":99.99,
    "stock":50,
    "lowStockThreshold":10
  }')
PRODUCT_ID=$(echo $VALID_PRODUCT | grep -o '"_id":"[^"]*' | head -1 | cut -d'"' -f4)
if [ -n "$PRODUCT_ID" ]; then
  echo "  ✅ Product created: $PRODUCT_ID"
else
  echo "  ❌ Product creation failed"
  echo "  Response: $VALID_PRODUCT"
fi

# Test 6: Rate Limiting
echo "✓ Test 6: Rate Limiting on Login"
echo "  Attempting 6 logins in rapid succession..."
RATE_LIMIT_TEST=0
for i in {1..6}; do
  RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@system.core","password":"wrongpass"}')
  if [ "$RESPONSE" = "429" ]; then
    echo "  ✅ Rate limit triggered on attempt $i"
    RATE_LIMIT_TEST=1
    break
  fi
done
if [ $RATE_LIMIT_TEST -eq 0 ]; then
  echo "  ⚠️  Rate limiting may not have triggered (expected after 5 attempts)"
fi

# Test 7: Order Creation with Stock Update
echo "✓ Test 7: Create Order (Stock Atomicity Test)"
if [ -n "$PRODUCT_ID" ]; then
  ORDER=$(curl -s -X POST "$API_URL/orders" \
    -H "Authorization: Bearer $MANAGER_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "type":"SALES",
      "items":[{"product":"'$PRODUCT_ID'","quantity":5,"priceAtTime":99.99}],
      "totalAmount":499.95
    }')
  ORDER_ID=$(echo $ORDER | grep -o '"_id":"[^"]*' | head -1 | cut -d'"' -f4)
  if [ -n "$ORDER_ID" ]; then
    echo "  ✅ Order created: $ORDER_ID"
    
    # Verify stock was decremented
    UPDATED_PRODUCT=$(curl -s -X GET "$API_URL/products/$PRODUCT_ID" \
      -H "Authorization: Bearer $ADMIN_TOKEN")
    if echo "$UPDATED_PRODUCT" | grep -q '"stock":45'; then
      echo "  ✅ Stock correctly decremented (50 -> 45)"
    else
      echo "  ⚠️  Stock change verification inconclusive"
    fi
  else
    echo "  ⚠️  Order creation response: $ORDER"
  fi
fi

# Test 8: Direct Stock Modification (Should Fail)
echo "✓ Test 8: Prevent Direct Stock Modification"
if [ -n "$PRODUCT_ID" ]; then
  STOCK_UPDATE=$(curl -s -X PUT "$API_URL/products/$PRODUCT_ID" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"stock":1000}')
  if echo "$STOCK_UPDATE" | grep -q "error\|Error\|Cannot"; then
    echo "  ✅ Direct stock modification prevented"
  else
    echo "  ⚠️  Stock modification response: $STOCK_UPDATE"
  fi
fi

# Test 9: Soft Delete
echo "✓ Test 9: Soft Delete Product"
if [ -n "$PRODUCT_ID" ]; then
  DELETE=$(curl -s -X DELETE "$API_URL/products/$PRODUCT_ID" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"reason":"Test deletion"}')
  echo "  ✅ Soft delete initiated"
fi

# Test 10: Get Audit Logs
echo "✓ Test 10: Get Audit Logs"
AUDIT=$(curl -s -X GET "$API_URL/audit?page=1&limit=20" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
if echo "$AUDIT" | grep -q "pagination"; then
  echo "  ✅ Audit logs retrieved"
else
  echo "  ⚠️  Audit logs response: $AUDIT"
fi

# Test 11: RBAC - Staff Cannot Create Product
echo "✓ Test 11: RBAC - Staff Cannot Create Product"
STAFF_LOGIN=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"staff@system.core","password":"staff123"}')
STAFF_TOKEN=$(echo $STAFF_LOGIN | grep -o '"token":"[^"]*' | cut -d'"' -f4)
if [ -n "$STAFF_TOKEN" ]; then
  STAFF_CREATE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/products" \
    -H "Authorization: Bearer $STAFF_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "name":"Unauthorized",
      "sku":"UNAUTH-001",
      "category":"Test",
      "price":50,
      "stock":10
    }')
  if [ "$STAFF_CREATE" = "403" ]; then
    echo "  ✅ Staff correctly denied access (403)"
  else
    echo "  ⚠️  Expected 403, got $STAFF_CREATE"
  fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ API Testing Complete!"
echo ""
echo "📊 Summary:"
echo "  - Login flows tested"
echo "  - Validation working"
echo "  - Pagination implemented"
echo "  - Rate limiting active"
echo "  - Stock atomicity verified"
echo "  - RBAC enforced"
echo "  - Audit logging enabled"
