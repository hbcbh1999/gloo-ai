FROM node:18-alpine as base

# RUN curl -sL https://unpkg.com/@pnpm/self-installer | node
RUN npm install --global turbo pnpm


ARG PROJECT_ROOT="/code/apps/backend"
RUN mkdir /code
WORKDIR /code
# Copy entire monorepo
COPY . .

# Install deps for whole monorepo
RUN pnpm i --frozen-lockfile

WORKDIR ${PROJECT_ROOT}
RUN turbo build --filter=@gloo/backend

# Start production image build
FROM node:18-alpine

RUN apk add --no-cache bash curl && curl -1sLf \
'https://dl.cloudsmith.io/public/infisical/infisical-cli/setup.alpine.sh' | bash \
&& apk add infisical

ARG PROJECT_ROOT="apps/backend"

# Copy node modules and build directory
COPY --from=base /code ./
# COPY --from=base /code/node_modules ./node_modules
# COPY --from=base /code/packages/database ./node_modules
# COPY --from=base /code/${PROJECT_ROOT}/node_modules ${PROJECT_ROOT}/node_modules
# COPY --from=base /code/${PROJECT_ROOT}/dist ${PROJECT_ROOT}/dist

# # Copy static files
# COPY src/public dist/src/public

# Expose port 8080
EXPOSE 8080
CMD ["infisical", "run", "--", "node", "apps/backend/dist/server.js"]

# FROM node:18-alpine AS base
 
# FROM base AS builder
# RUN apk add --no-cache libc6-compat
# RUN apk update
# # Set working directory
# WORKDIR /app
# RUN yarn global add turbo
# COPY . .
# RUN turbo prune --scope=@gloo/backend --docker
 
# # Add lockfile and package.json's of isolated subworkspace
# FROM base AS installer
# RUN apk add --no-cache libc6-compat
# RUN apk update
# WORKDIR /app
 
# # First install the dependencies (as they change less often)
# COPY .gitignore .gitignore
# COPY --from=builder /app/out/json/ .
# COPY --from=builder /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
# RUN yarn global add pnpm
# RUN pnpm install
 
# # Build the project
# COPY --from=builder /app/out/full/ ./
# RUN turbo run build --filter=@gloo/backend...
 
# FROM base AS runner
# WORKDIR /app
 
# # Don't run production as root
# RUN addgroup --system --gid 1001 nodejs
# RUN adduser --system --uid 1001 nextjs
# USER nextjs
 
# COPY --from=installer /app/apps/backend/next.config.js .
# COPY --from=installer /app/apps/backend/package.json .
 
# CMD node apps/backend/dist/server.js