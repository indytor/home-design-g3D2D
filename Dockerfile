# Self-hosted backend + frontend สำหรับระบบรายงานหน้างาน
FROM node:20-slim

WORKDIR /app

# ติดตั้ง dependencies (มีเฉพาะ pure-JS ไม่ต้อง build native)
COPY server/package.json ./server/package.json
RUN cd server && npm install --omit=dev

# คัดลอกซอร์ส: backend + frontend (index.html อยู่ที่ root)
COPY server ./server
COPY index.html ./index.html
COPY api ./api

ENV NODE_ENV=production
ENV PORT=8080
ENV DATA_DIR=/data

VOLUME ["/data"]
EXPOSE 8080

CMD ["node", "server/server.js"]
