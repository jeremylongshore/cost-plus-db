#!/bin/bash
# Quick authentication test script
# Tests login, protected routes, and token validation

BASE_URL="http://localhost:3000/api"

echo "========================================="
echo "Authentication System Test"
echo "========================================="
echo ""

# Test 1: Login with admin credentials
echo "1. Testing login..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@costplusdb.com",
    "password": "Admin123!ChangeMe"
  }')

echo "Login Response:"
echo "$LOGIN_RESPONSE" | jq '.'
echo ""

# Extract token
TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Login failed - no token received"
  exit 1
fi

echo "✅ Login successful - token received"
echo ""

# Test 2: Access protected /me endpoint
echo "2. Testing /auth/me endpoint (requires authentication)..."
ME_RESPONSE=$(curl -s -X GET "$BASE_URL/auth/me" \
  -H "Authorization: Bearer $TOKEN")

echo "User Info Response:"
echo "$ME_RESPONSE" | jq '.'
echo ""

# Test 3: Access admin dashboard (requires admin role)
echo "3. Testing /admin/dashboard endpoint (requires admin role)..."
DASHBOARD_RESPONSE=$(curl -s -X GET "$BASE_URL/admin/dashboard" \
  -H "Authorization: Bearer $TOKEN")

echo "Dashboard Response:"
echo "$DASHBOARD_RESPONSE" | jq '.'
echo ""

# Test 4: Try accessing admin endpoint without token
echo "4. Testing admin endpoint without authentication (should fail)..."
UNAUTH_RESPONSE=$(curl -s -X GET "$BASE_URL/admin/dashboard")

echo "Unauthorized Response:"
echo "$UNAUTH_RESPONSE" | jq '.'
echo ""

# Test 5: Invalid credentials
echo "5. Testing login with invalid password (should fail)..."
INVALID_LOGIN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@costplusdb.com",
    "password": "WrongPassword123!"
  }')

echo "Invalid Login Response:"
echo "$INVALID_LOGIN" | jq '.'
echo ""

echo "========================================="
echo "Authentication Test Complete"
echo "========================================="
