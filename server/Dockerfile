FROM node:22-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY index.mjs billing.mjs push.mjs manage-billing.mjs ./
USER node
EXPOSE 3001
CMD ["node", "index.mjs"]
