// Seeds the placeholder VSG demo catalog (Phase 2): replaces the @vendure/create
// scaffold's generic sample products with the real 25 janitorial items from the
// Excelsior Springs bid sheet, grouped into 8 categories via a native Vendure
// Facet + Collection filter (no custom plugin needed).
//
// Prices are placeholders (real bid pricing isn't finalized with Hillyard yet) and
// images are generated placeholders, not real product photos — see
// vsg-catalog-data.json and DECISIONS.md.
//
// Usage: node apps/server/scripts/seed-vsg-catalog.mjs
// Requires the Vendure server reachable at ADMIN_API_URL (defaults to the
// Phase-1 host-published port) and superadmin credentials from apps/server/.env.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import 'dotenv/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ADMIN_API_URL = process.env.ADMIN_API_URL || 'http://127.0.0.1:3001/admin-api';
const IMAGE_DIR = process.env.IMAGE_DIR || '/home/jacques/.claude/jobs/e3728744/tmp/product-images';

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
    if (json.errors) {
        throw new Error(`GraphQL error: ${JSON.stringify(json.errors, null, 2)}`);
    }
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
    const map = { '0': ['variables.input.0.file'] };
    const operations = {
        query,
        variables: { input: [{ file: null }] },
    };
    const form = new FormData();
    form.append('operations', JSON.stringify(operations));
    form.append('map', JSON.stringify(map));
    const fileBuffer = readFileSync(filePath);
    form.append('0', new Blob([fileBuffer], { type: 'image/png' }), path.basename(filePath));

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

async function main() {
    console.log(`Connecting to ${ADMIN_API_URL} ...`);
    const loginResult = await gql(
        `mutation Login($u: String!, $p: String!) {
            login(username: $u, password: $p) {
                ... on CurrentUser { id identifier }
                ... on ErrorResult { errorCode message }
            }
        }`,
        { u: process.env.SUPERADMIN_USERNAME, p: process.env.SUPERADMIN_PASSWORD }
    );
    if (loginResult.login.errorCode) {
        throw new Error(`Login failed: ${loginResult.login.message}`);
    }
    console.log(`Logged in as ${loginResult.login.identifier}`);

    // --- 1. Clean up scaffold sample data ---
    console.log('\nFetching existing products to remove...');
    const { products } = await gql(`
        query { products(options: { take: 200 }) { items { id name } totalItems } }
    `);
    if (products.items.length) {
        console.log(`Deleting ${products.items.length} sample products...`);
        await gql(
            `mutation DeleteProducts($ids: [ID!]!) { deleteProducts(ids: $ids) { result message } }`,
            { ids: products.items.map((p) => p.id) }
        );
    }

    console.log('Fetching existing top-level collections to remove...');
    const { collections } = await gql(`
        query { collections(options: { topLevelOnly: true, take: 200 }) { items { id name } } }
    `);
    if (collections.items.length) {
        console.log(`Deleting ${collections.items.length} sample collections...`);
        await gql(
            `mutation DeleteCollections($ids: [ID!]!) { deleteCollections(ids: $ids) { result message } }`,
            { ids: collections.items.map((c) => c.id) }
        );
    }

    const { collection: root } = await gql(
        `query { collection(slug: "__root_collection__") { id } }`
    );
    console.log(`Root collection id: ${root.id}`);

    // --- 2. Create the Category facet ---
    console.log('\nCreating Category facet...');
    const { createFacet } = await gql(
        `mutation CreateFacet($input: CreateFacetInput!) {
            createFacet(input: $input) {
                id
                values { id code name }
            }
        }`,
        {
            input: {
                code: 'category',
                isPrivate: false,
                translations: [{ languageCode: 'en', name: 'Category' }],
                values: catalog.categories.map((c) => ({
                    code: c.code,
                    translations: [{ languageCode: 'en', name: c.name }],
                })),
            },
        }
    );
    const facetValueIdByCode = Object.fromEntries(
        createFacet.values.map((v) => [v.code, v.id])
    );

    // --- 3. Create collections, one per category, filtered by that facet value ---
    console.log('Creating collections...');
    const collectionIdByCode = {};
    for (const cat of catalog.categories) {
        const { createCollection } = await gql(
            `mutation CreateCollection($input: CreateCollectionInput!) {
                createCollection(input: $input) { id name }
            }`,
            {
                input: {
                    parentId: root.id,
                    isPrivate: false,
                    translations: [
                        { languageCode: 'en', name: cat.name, slug: cat.code, description: '' },
                    ],
                    filters: [
                        {
                            code: 'facet-value-filter',
                            arguments: [
                                { name: 'facetValueIds', value: JSON.stringify([facetValueIdByCode[cat.code]]) },
                                { name: 'combineWithAnd', value: 'true' },
                            ],
                        },
                    ],
                },
            }
        );
        collectionIdByCode[cat.code] = createCollection.id;
        console.log(`  - ${createCollection.name} (${createCollection.id})`);
    }

    // --- 4. Create products ---
    console.log('\nCreating products...');
    for (const p of catalog.products) {
        const slug = p.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
        const description = `${p.name} — ${p.packSize}${p.brand ? `, ${p.brand}` : ''}. Approved janitorial supply item for Excelsior Springs Job Corps Center.`;

        const { createProduct } = await gql(
            `mutation CreateProduct($input: CreateProductInput!) {
                createProduct(input: $input) { id }
            }`,
            {
                input: {
                    enabled: true,
                    facetValueIds: [facetValueIdByCode[p.category]],
                    translations: [
                        { languageCode: 'en', name: p.name, slug, description },
                    ],
                },
            }
        );

        const imagePath = path.join(IMAGE_DIR, `${p.sku}.png`);
        const assetId = await uploadAsset(imagePath);

        await gql(
            `mutation UpdateProduct($input: UpdateProductInput!) {
                updateProduct(input: $input) { id }
            }`,
            { input: { id: createProduct.id, featuredAssetId: assetId, assetIds: [assetId] } }
        );

        await gql(
            `mutation CreateVariants($input: [CreateProductVariantInput!]!) {
                createProductVariants(input: $input) { id }
            }`,
            {
                input: [
                    {
                        productId: createProduct.id,
                        sku: p.sku,
                        price: Math.round(p.priceUsd * 100),
                        translations: [{ languageCode: 'en', name: `${p.name} (${p.packSize})` }],
                        trackInventory: 'FALSE',
                        featuredAssetId: assetId,
                        assetIds: [assetId],
                    },
                ],
            }
        );

        console.log(`  - ${p.sku}  ${p.name}  [$${p.priceUsd.toFixed(2)}]`);
    }

    console.log('\nDone. Collections are filter-driven, so membership is automatic based on each product\'s Category facet value.');
}

main().catch((err) => {
    console.error('\nSEED FAILED:', err.message);
    process.exit(1);
});
