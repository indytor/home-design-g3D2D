# build context = ./services (เพื่อเข้าถึง shared/)
FROM node:20-slim
WORKDIR /app
COPY auth/package.json ./package.json
RUN npm install --omit=dev
COPY shared ./shared
COPY auth ./
ENV NODE_ENV=production PORT=8081 DATA_DIR=/data
VOLUME ["/data"]
EXPOSE 8081
CMD ["node", "server.js"]
