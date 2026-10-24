FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=4173
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/build-server ./build-server
COPY --from=build --chown=node:node /app/package.json ./package.json
USER node
EXPOSE 4173
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD node -e "fetch('http://127.0.0.1:4173/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "build-server/serve.js"]
