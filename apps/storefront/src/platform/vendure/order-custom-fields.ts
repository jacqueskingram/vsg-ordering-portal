// gql.tada's generated types treat Vendure's `customFields` fields as a
// generic JSON scalar rather than the actual OrderCustomFields object type
// (the real GraphQL schema does return typed fields — verified directly
// against the server — this is a gql.tada/codegen limitation with Vendure's
// per-deployment custom field types, not a schema issue). Cast query results
// through this type at the point of use instead of loosening it everywhere.
export interface OrderPurchaseOrderFields {
    purchaseOrderNumber?: string | null;
    customerNotes?: string | null;
}

export function poFields(customFields: unknown): OrderPurchaseOrderFields | null {
    return (customFields as OrderPurchaseOrderFields | null) ?? null;
}
