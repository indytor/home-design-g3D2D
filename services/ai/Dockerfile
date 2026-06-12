# build context = ./services (เพื่อเข้าถึง shared/)
FROM node:20-slim
WORKDIR /app
COPY ai/package.json ./package.json
RUN npm install --omit=dev
COPY shared ./shared
COPY ai ./
ENV NODE_ENV=production PORT=8083
EXPOSE 8083
CMD ["node", "server.js"]
