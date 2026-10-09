import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { EventBus, Logger, OrderPlacedEvent, OrderService, PluginCommonModule, VendurePlugin } from '@vendure/core';

const loggerCtx = 'OrderNotificationPlugin';

// Fires an HTTP POST to an n8n webhook whenever a PO is placed, so Jacques
// (and eventually the distributor) get notified without logging into the
// admin UI. The webhook URL is read from env so it can point at a stand-in
// n8n workflow now and swap to the real one later without a code change.
@Injectable()
class OrderNotificationService implements OnApplicationBootstrap {
    constructor(
        private eventBus: EventBus,
        private orderService: OrderService,
    ) {}

    onApplicationBootstrap() {
        this.eventBus.ofType(OrderPlacedEvent).subscribe(async event => {
            const webhookUrl = process.env.N8N_ORDER_WEBHOOK_URL;
            if (!webhookUrl) {
                return;
            }

            const order = await this.orderService.findOne(event.ctx, event.order.id, [
                'lines.productVariant',
                'customer',
            ]);
            if (!order) {
                return;
            }

            const payload = {
                orderCode: order.code,
                poNumber: order.customFields?.purchaseOrderNumber ?? null,
                customerNotes: order.customFields?.customerNotes ?? null,
                customerEmail: order.customer?.emailAddress ?? null,
                customerName: order.customer ? `${order.customer.firstName} ${order.customer.lastName}` : null,
                totalWithTax: order.totalWithTax,
                currencyCode: order.currencyCode,
                lines: order.lines.map(line => ({
                    name: line.productVariant.name,
                    sku: line.productVariant.sku,
                    quantity: line.quantity,
                    linePriceWithTax: line.linePriceWithTax,
                })),
                placedAt: new Date().toISOString(),
            };

            try {
                const res = await fetch(webhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
                if (!res.ok) {
                    Logger.error(`n8n webhook responded ${res.status}`, loggerCtx);
                }
            } catch (err) {
                // A failed notification must never block order completion.
                Logger.error(`Failed to reach n8n webhook: ${err}`, loggerCtx);
            }
        });
    }
}

@VendurePlugin({
    imports: [PluginCommonModule],
    providers: [OrderNotificationService],
})
export class OrderNotificationPlugin {}
