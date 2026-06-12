// Error ที่พก HTTP status — business โยน, error handler แปลงเป็น response
export class AppError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "AppError";
    this.status = status;
  }
}

// error handler กลาง ใช้ซ้ำได้ทุก service
export function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: err.message || "เซิร์ฟเวอร์ผิดพลาด" });
}
