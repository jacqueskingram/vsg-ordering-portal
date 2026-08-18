FROM node:22

WORKDIR /usr/src/app

COPY package.json package-lock.json ./
COPY apps/server/package.json apps/server/package.json
COPY apps/storefront/package.json apps/storefront/package.json
RUN npm ci

COPY apps/server/src apps/server/src
COPY apps/server/static apps/server/static
COPY apps/server/tsconfig.json apps/server/tsconfig.json
COPY apps/server/tsconfig.dashboard.json apps/server/tsconfig.dashboard.json
COPY apps/server/vite.config.mts apps/server/vite.config.mts
RUN npm run build -w server

WORKDIR /usr/src/app/apps/server
