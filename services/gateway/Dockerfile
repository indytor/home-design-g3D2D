# build context = repo root (เพื่อ copy index.html ของ frontend ได้)
FROM node:20-slim
WORKDIR /app
COPY services/gateway/package.json ./package.json
RUN npm install --omit=dev
COPY services/gateway ./
COPY index.html /index.html
ENV NODE_ENV=production PORT=8080
EXPOSE 8080
CMD ["node", "server.js"]
