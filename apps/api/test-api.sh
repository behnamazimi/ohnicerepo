#!/bin/bash
# Test script for local API

BASE_URL="http://localhost:8787"

echo "Testing API at $BASE_URL"
echo ""

echo "1. Testing OPTIONS (CORS preflight):"
curl -X OPTIONS -H "Origin: http://localhost:5173" "$BASE_URL/api/repos" -w "\nHTTP Status: %{http_code}\n" -s
echo ""

echo "2. Testing GET /api/repos (basic):"
curl "$BASE_URL/api/repos?days=7&stars=100&page=1&perPage=10&dateType=after" -w "\nHTTP Status: %{http_code}\n" -s | head -20
echo ""

echo "3. Testing GET /api/repos (with language):"
curl "$BASE_URL/api/repos?days=7&stars=100&page=1&perPage=5&dateType=after&language=JavaScript" -w "\nHTTP Status: %{http_code}\n" -s | head -20
echo ""

echo "4. Testing GET /api/repos (date range):"
curl "$BASE_URL/api/repos?days=7&stars=100&page=1&perPage=5&dateType=range&startDate=2024-01-01&endDate=2024-12-31" -w "\nHTTP Status: %{http_code}\n" -s | head -20
echo ""

echo "5. Testing rate limit headers:"
curl -I "$BASE_URL/api/repos?days=7&stars=100&page=1&perPage=10&dateType=after" 2>/dev/null | grep -i "x-ratelimit"
echo ""
