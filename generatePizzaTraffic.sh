#!/bin/bash

host=${1:-https://pizza-service.shayla.click}

echo "Simulating traffic against $host"

cleanup() {
  echo "Stopping traffic simulation..."
  kill 0
  exit 0
}
trap cleanup SIGINT

# Hit menu every 3 seconds
while true; do
  status=$(curl -s -o /dev/null -w "%{http_code}" $host/api/order/menu)
  echo "Requesting menu... $status"
  sleep 3
done &

# Invalid login every 25 seconds
while true; do
  status=$(curl -s -o /dev/null -w "%{http_code}" -X PUT $host/api/auth \
    -d '{"email":"unknown@jwt.com", "password":"bad"}' \
    -H 'Content-Type: application/json')
  echo "Logging in with invalid credentials... $status"
  sleep 25
done &

# Login, buy a pizza, wait 20 seconds, logout, wait 30 seconds
while true; do
  response=$(curl -s -X PUT $host/api/auth \
    -d '{"email":"d@jwt.com", "password":"diner"}' \
    -H 'Content-Type: application/json')
  token=$(echo $response | jq -r '.token')
  echo "Login diner... $(echo $response | jq -r '.user.email // "failed"')"

  status=$(curl -s -o /dev/null -w "%{http_code}" -X POST $host/api/order \
    -H 'Content-Type: application/json' \
    -d '{"franchiseId": 1, "storeId":1, "items":[{ "menuId": 1, "description": "Veggie", "price": 0.05 }]}' \
    -H "Authorization: Bearer $token")
  echo "Bought a pizza... $status"

  sleep 20
  curl -s -X DELETE $host/api/auth -H "Authorization: Bearer $token" > /dev/null
  echo "Logged out diner"
  sleep 30
done &

# Login franchisee, wait 110 seconds, logout, wait 10 seconds
while true; do
  response=$(curl -s -X PUT $host/api/auth \
    -d '{"email":"f@jwt.com", "password":"franchisee"}' \
    -H 'Content-Type: application/json')
  token=$(echo $response | jq -r '.token')
  echo "Login franchisee... $(echo $response | jq -r '.user.email // "failed"')"
  sleep 110
  curl -s -X DELETE $host/api/auth -H "Authorization: Bearer $token" > /dev/null
  echo "Logged out franchisee"
  sleep 10
done &

# Buy too many pizzas to cause a failure every 5 minutes
while true; do
  response=$(curl -s -X PUT $host/api/auth \
    -d '{"email":"d@jwt.com", "password":"diner"}' \
    -H 'Content-Type: application/json')
  token=$(echo $response | jq -r '.token')
  echo "Login hungry diner..."

  items='{ "menuId": 1, "description": "Veggie", "price": 0.05 }'
  for (( i=0; i < 21; i++ ))
  do items+=', { "menuId": 1, "description": "Veggie", "price": 0.05 }'
  done

  status=$(curl -s -o /dev/null -w "%{http_code}" -X POST $host/api/order \
    -H 'Content-Type: application/json' \
    -d "{\"franchiseId\": 1, \"storeId\":1, \"items\":[$items]}" \
    -H "Authorization: Bearer $token")
  echo "Bought too many pizzas... $status"

  sleep 5
  curl -s -X DELETE $host/api/auth -H "Authorization: Bearer $token" > /dev/null
  echo "Logging out hungry diner..."
  sleep 295
done &

wait
