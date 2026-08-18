'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field, FieldLabel, FieldError, FieldGroup } from '@/components/ui/field';
import { Loader2 } from 'lucide-react';
import { useCheckout } from '../checkout-provider';
import { setPurchaseOrderDetails } from '../actions';
import { poFields } from '@/platform/vendure/order-custom-fields';
import { useTranslations } from 'next-intl';

// This step used to be a payment-method selector. This is a purchase-order
// portal, not a storefront that takes card payments — there's nothing to pay
// here. It collects the PO number (required) and optional notes instead,
// then a single "standard-payment" method is applied silently (see
// checkout-provider) purely to complete the order in Vendure's native flow.
// The step key stays "payment" internally (see checkout-flow.tsx / types.ts)
// to keep this change small — only the label and content changed.
//
// A "requested delivery date" field was deliberately removed (2026-08-18) —
// the user didn't want to imply VSG commits to hitting customer-requested
// dates at this stage.
interface PaymentStepProps {
    onComplete: () => void;
}

export default function PaymentStep({ onComplete }: PaymentStepProps) {
    const t = useTranslations('Checkout');
    const { order, paymentMethods, selectedPaymentMethodCode } = useCheckout();
    const existing = poFields(order.customFields);
    const [poNumber, setPoNumber] = useState(existing?.purchaseOrderNumber ?? '');
    const [notes, setNotes] = useState(existing?.customerNotes ?? '');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleContinue = async () => {
        if (!poNumber.trim()) {
            setError(t('poNumberRequired'));
            return;
        }
        if (!selectedPaymentMethodCode) {
            setError(t('noPaymentMethods'));
            return;
        }
        setError(null);
        setLoading(true);
        try {
            await setPurchaseOrderDetails({
                purchaseOrderNumber: poNumber.trim(),
                customerNotes: notes.trim() || undefined,
            });
            onComplete();
        } catch (err) {
            // Only show our own thrown message (e.g. an ErrorResult from the
            // mutation) to the customer — anything else is a framework/network
            // failure whose message is either unhelpful or, in production
            // builds, a cryptic minified React error code.
            const message = err instanceof Error ? err.message : '';
            setError(
                message.startsWith('Failed to set purchase order details')
                    ? message
                    : t('unexpectedError')
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <h3 className="font-semibold">{t('purchaseOrderDetails')}</h3>

            <FieldGroup>
                <Field>
                    <FieldLabel htmlFor="poNumber">{t('poNumber')} *</FieldLabel>
                    <Input
                        id="poNumber"
                        value={poNumber}
                        onChange={(e) => setPoNumber(e.target.value)}
                        placeholder={t('poNumberPlaceholder')}
                        required
                    />
                </Field>
                <Field>
                    <FieldLabel htmlFor="notes">{t('customerNotes')}</FieldLabel>
                    <Textarea
                        id="notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder={t('customerNotesPlaceholder')}
                        rows={3}
                    />
                </Field>
                {error && <FieldError>{error}</FieldError>}
            </FieldGroup>

            <Button onClick={handleContinue} disabled={loading} className="w-full">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('continueToReview')}
            </Button>
        </div>
    );
}
