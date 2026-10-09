# Order notification workflow

`order-notification-workflow.json` is an export of the live n8n workflow (via `n8n export:workflow`).
Vendure fires an HTTP POST to it (via `OrderNotificationPlugin`) whenever a PO is placed on the
portal, and it emails both Jacques and a stand-in "distributor" address through SendGrid.

Sends via SendGrid's API (HTTPS), not SMTP — this host's hosting provider blocks outbound SMTP
(465/587) at the network level, confirmed via direct TCP connection tests. SendGrid's API runs over
443, which isn't blocked.

## One-time setup (manual, in each UI)

**SendGrid** (`app.sendgrid.com`):
1. Verify a Single Sender for `jacqueskingram@gmail.com` (Settings → Sender Authentication →
   Verify a Single Sender). Full domain authentication isn't used yet — no domain is purchased
   for this project as of 2026-10-09.
2. Create an API key (Settings → API Keys → Create API Key → Custom → enable only **Mail Send**,
   Full Access). Scoped to mail-sending only, nothing else.

**n8n** (`workflows.jacquesingram.online`):
1. Create a credential of type **SendGrid API**, paste in the Mail-Send-scoped key.
2. Import this workflow (copy the JSON and paste directly onto the canvas — n8n's "Import from
   File" reads from the browser's own machine, not the server, so a file living on the server has
   to go in via clipboard paste or a file already present on whatever machine the browser is on).
3. On both SendGrid nodes, select the credential from step 1, and confirm the To/From/Subject/Body
   fields actually have content (empty-body silently importing was a real failure mode here once —
   check, don't assume).
4. Publish.

## Swapping in Regal's real email later

Once you have Regal's actual order-intake address, open the "notify sender" node and change
`toEmail` from `jacques@jacquesingram.online` to their real address. Nothing else needs to change.

## Upgrading past the stand-in setup later

Once a domain is purchased for this project: switch SendGrid to full Domain Authentication and
change `fromEmail` on both nodes to a real address on that domain (e.g. `orders@<domain>`) instead
of a personal Gmail address — better deliverability, more credible to the distributor/customer.

## Webhook URL

`https://workflows.jacquesingram.online/webhook/vsg-order-placed` — must match
`N8N_ORDER_WEBHOOK_URL` in `apps/server/.env`.
