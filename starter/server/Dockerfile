FROM node:22-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY src ./src
COPY schema.sql ./schema.sql
COPY scripts ./scripts
USER node
EXPOSE 3000
CMD ["node", "src/server.mjs"]
