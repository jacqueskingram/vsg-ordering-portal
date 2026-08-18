import {NextConfig} from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/site/i18n/request.ts');

const nextConfig: NextConfig = {
    cacheComponents: true,
    images: {
        // This is necessary to display images from your local Vendure instance
        dangerouslyAllowLocalIP: true,
        remotePatterns: [
            {
                hostname: 'readonlydemo.vendure.io',
            },
            {
                hostname: 'demo.vendure.io'
            },
            {
                hostname: 'localhost'
            },
            {
                // Internal Docker hostname for vendure-server — see DEPLOYMENT.md.
                // Next's image optimizer runs server-side inside this container and
                // fetches asset images from Vendure over the compose network, so this
                // hostname (not a public one) is what actually needs to be allowed.
                hostname: 'vendure-server'
            }
        ],
    }
};

export default withNextIntl(nextConfig);
