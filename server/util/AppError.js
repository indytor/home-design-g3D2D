// Error ที่พก HTTP status — ให้ business layer โยน, ให้ error handler แปลงเป็น response
export class AppError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "AppError";
    this.status = status;
  }
}
