// Uploads/replaces product images by SKU. Looks for <IMAGE_DIR>/<SKU>.(png|jpg|jpeg)
// for every product in vsg-catalog-data.json and, if found, uploads it as a new
// Asset and sets it as that product's (and its variant's) featured image.
// Products/SKUs with no matching file are left untouched — safe to run
// incrementally as more images arrive.
//
// Usage: IMAGE_DIR=/path/to/images node apps/server/scripts/update-product-images.mjs

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import 'dotenv/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ADMIN_API_URL = process.env.ADMIN_API_URL || 'http://127.0.0.1:3001/admin-api';
const IMAGE_DIR = process.env.IMAGE_DIR;

if (!IMAGE_DIR) {
    console.error('Set IMAGE_DIR to the directory containing <SKU>.png/.jpg files.');
    process.exit(1);
}

const catalog = JSON.parse(
    readFileSync(path.join(__dirname, 'vsg-catalog-data.json'), 'utf-8')
);

let authToken = null;

async function gql(query, variables = {}) {
    const res = await fetch(ADMIN_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({ query, variables }),
    });
    const token = res.headers.get('vendure-auth-token');
    if (token) authToken = token;
    const json = await res.json();
    if (json.errors) throw new Error(`GraphQL error: ${JSON.stringify(json.errors, null, 2)}`);
    return json.data;
}

async function uploadAsset(filePath) {
    const query = `
        mutation CreateAssets($input: [CreateAssetInput!]!) {
            createAssets(input: $input) {
                ... on Asset { id }
                ... on ErrorResult { message }
            }
        }
    `;
    const operations = { query, variables: { input: [{ file: null }] } };
    const map = { '0': ['variables.input.0.file'] };
    const form = new FormData();
    form.append('operations', JSON.stringify(operations));
    form.append('map', JSON.stringify(map));
    const ext = path.extname(filePath).toLowerCase();
    const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
    form.append('0', new Blob([readFileSync(filePath)], { type: mimeType }), path.basename(filePath));

    const res = await fetch(ADMIN_API_URL, {
        method: 'POST',
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        body: form,
    });
    const json = await res.json();
    if (json.errors) throw new Error(`Asset upload error: ${JSON.stringify(json.errors)}`);
    const result = json.data.createAssets[0];
    if (result.message) throw new Error(`Asset upload failed: ${result.message}`);
    return result.id;
}

function findImageFile(sku) {
    for (const ext of ['png', 'jpg', 'jpeg']) {
        const p = path.join(IMAGE_DIR, `${sku}.${ext}`);
        if (existsSync(p)) return p;
    }
    return null;
}

async function main() {
    console.log(`Connecting to ${ADMIN_API_URL} ...`);
    const loginResult = await gql(
        `mutation Login($u: String!, $p: String!) {
            login(username: $u, password: $p) {
                ... on CurrentUser { identifier }
                ... on ErrorResult { message }
            }
        }`,
        { u: process.env.SUPERADMIN_USERNAME, p: process.env.SUPERADMIN_PASSWORD }
    );
    if (loginResult.login.errorCode) throw new Error(`Login failed: ${loginResult.login.message}`);
    console.log(`Logged in as ${loginResult.login.identifier}\n`);

    let updated = 0;
    let skipped = 0;

    for (const p of catalog.products) {
        const filePath = findImageFile(p.sku);
        if (!filePath) {
            skipped++;
            continue;
        }

        const { products } = await gql(
            `query($sku: String!) {
                products(options: { filter: { sku: { eq: $sku } } }) {
                    items { id name variants { id sku } }
                }
            }`,
            { sku: p.sku }
        );
        const product = products.items[0];
        if (!product) {
            console.log(`  ! No product found for SKU ${p.sku}, skipping`);
            continue;
        }
        const variant = product.variants.find((v) => v.sku === p.sku);

        const assetId = await uploadAsset(filePath);

        await gql(
            `mutation($input: UpdateProductInput!) { updateProduct(input: $input) { id } }`,
            { input: { id: product.id, featuredAssetId: assetId, assetIds: [assetId] } }
        );
        if (variant) {
            await gql(
                `mutation($input: [UpdateProductVariantInput!]!) { updateProductVariants(input: $input) { id } }`,
                { input: [{ id: variant.id, featuredAssetId: assetId, assetIds: [assetId] }] }
            );
        }

        console.log(`  - ${p.sku}  ${p.name}  -> updated`);
        updated++;
    }

    console.log(`\nDone. Updated ${updated} product(s), ${skipped} had no matching image file yet.`);
}

main().catch((err) => {
    console.error('\nFAILED:', err.message);
    process.exit(1);
});
