# build context = ./services (เพื่อเข้าถึง shared/)
FROM node:20-slim
WORKDIR /app
COPY reports/package.json ./package.json
RUN npm install --omit=dev
COPY shared ./shared
COPY reports ./
ENV NODE_ENV=production PORT=8082 DATA_DIR=/data
VOLUME ["/data"]
EXPOSE 8082
CMD ["node", "server.js"]
