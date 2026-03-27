#!/bin/bash
# Deploy debbie-recipes to Netlify (one-command deploy)
SITE_ID="eadb0dfe-d516-4e23-bfd5-507188af4dfd"
TOKEN="${NETLIFY_TOKEN:-nfp_Czy9Ei4CN3jmGXGxQ8EjHEbTSAnGZQnn1a0d}"
FILE="/Users/YossiBen_Y/debbie-recipes/index.html"

SHA=$(shasum -a 1 "$FILE" | cut -d' ' -f1)

DEPLOY_ID=$(curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"files\":{\"/index.html\":\"$SHA\"}}" \
  "https://api.netlify.com/api/v1/sites/$SITE_ID/deploys" | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); console.log(d.id)")

curl -s -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/octet-stream" \
  --data-binary "@$FILE" \
  "https://api.netlify.com/api/v1/deploys/$DEPLOY_ID/files/index.html" > /dev/null

echo "Deployed to https://debbie-recipes.netlify.app"
