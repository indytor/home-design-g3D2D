// API controller: พร็อกซี AI
import * as aiService from "../business/ai.service.js";

export async function analyze(req, res, next) {
  try { res.json(await aiService.analyze(req.body || {})); }
  catch (e) { next(e); }
}

export async function generateImage(req, res, next) {
  try { res.json(await aiService.generateImage(req.body || {})); }
  catch (e) { next(e); }
}
