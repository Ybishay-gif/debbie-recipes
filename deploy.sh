#!/bin/bash
# Deploy debbie-recipes to Netlify
SITE_ID="eadb0dfe-d516-4e23-bfd5-507188af4dfd"
TOKEN="${NETLIFY_TOKEN:?Set NETLIFY_TOKEN env var}"
DIR="/Users/YossiBen_Y/debbie-recipes"

# Create zip of index.html
cd "$DIR"
zip -j /tmp/debbie-deploy.zip index.html

# Deploy via API
curl -s -H "Content-Type: application/zip" \
  -H "Authorization: Bearer $TOKEN" \
  --data-binary "@/tmp/debbie-deploy.zip" \
  "https://api.netlify.com/api/v1/sites/$SITE_ID/deploys" | \
  node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); console.log('Deployed:', d.ssl_url || d.url || d.message)"

rm /tmp/debbie-deploy.zip
