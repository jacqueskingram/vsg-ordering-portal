# The storefront is built on the host before this image is built (see
# DEPLOYMENT.md): `next build` performs static prerendering that needs a
# live Vendure Shop API, and this Docker build has no route to a sibling
# container at build time. So this Dockerfile only packages the already-built
# output — it does not run `npm ci` or `next build` itself.

FROM node:22

WORKDIR /usr/src/app

COPY package.json package-lock.json ./
COPY node_modules ./node_modules
COPY apps/storefront ./apps/storefront

WORKDIR /usr/src/app/apps/storefront

CMD ["npx", "next", "start", "-p", "3002"]
