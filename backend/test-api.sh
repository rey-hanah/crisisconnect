#!/bin/bash

BASE_URL="http://localhost:3001"

echo "=== Testing Auth Endpoints ==="

echo -e "\n1. Testing /auth/signup..."
SIGNUP_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@test.com","password":"demo123","displayName":"Demo User"}')

echo "Response: $SIGNUP_RESPONSE"

echo -e "\n2. Testing /auth/login..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@test.com","password":"demo123"}')

echo "Response: $LOGIN_RESPONSE"

# Extract token
TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

if [ -n "$TOKEN" ]; then
  echo -e "\n3. Testing /posts (with auth)..."
  curl -s "$BASE_URL/posts?lat=49.2827&lng=-123.1207" \
    -H "Authorization: Bearer $TOKEN"
  echo ""
else
  echo -e "\nNo token received, skipping /posts test"
fi

echo -e "\n=== Tests Complete ==="
