import {redirect} from 'next/navigation';
import {getRouteLocale} from '@/platform/i18n/server';

// Public self-registration is intentionally disabled for this private ordering
// portal (per project requirements: VSG creates customer accounts, there is
// no public sign-up). This route redirects to sign-in rather than being
// removed outright, so a stale bookmark/link doesn't 404.
export default async function RegisterPage() {
    const locale = await getRouteLocale();
    redirect(`/${locale}/sign-in`);
}
