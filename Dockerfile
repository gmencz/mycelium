# base node image
FROM node:16-bullseye-slim as base

# set for base and all layer that inherit from it
ENV NODE_ENV production

# Install openssl for Prisma
RUN apt-get update && apt-get install -y openssl

# Install all node_modules, including dev dependencies
FROM base as deps

WORKDIR /mycelium

ADD package.json package-lock.json ./
RUN npm install --production=false

# Setup production node_modules
FROM base as production-deps

WORKDIR /mycelium

COPY --from=deps /mycelium/node_modules /mycelium/node_modules
ADD package.json package-lock.json ./
RUN npm prune --production

# Build the app
FROM base as build

WORKDIR /mycelium

COPY --from=deps /mycelium/node_modules /mycelium/node_modules

ADD prisma .
RUN npx prisma generate

ADD . .
RUN npm run build

# Finally, build the production image with minimal footprint
FROM base

WORKDIR /mycelium

COPY --from=production-deps /mycelium/node_modules /mycelium/node_modules
COPY --from=build /mycelium/node_modules/.prisma /mycelium/node_modules/.prisma

COPY --from=build /mycelium/dist /mycelium/dist
ADD . .

CMD ["npm", "start"]