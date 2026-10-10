import { Router } from "express";
import { requireRole } from "../middleware/requireRole.js";
import { asyncRoute } from "../utils/api.js";
import { loadReport, publicReport } from "../services/reporting.js";
import { salesCsv } from "../utils/reportsCsv.js";
import { streamReportPdf } from "../utils/reportsPdf.js";

const router = Router();
router.use(requireRole("admin"));

router.get("/summary", asyncRoute(async (req, res) => {
  const report = await loadReport(req);
  res.setHeader("Cache-Control", "no-store");
  res.json(publicReport(report));
}));

router.get("/sales.csv", asyncRoute(async (req, res) => {
  const report = await loadReport(req);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Disposition", `attachment; filename="ayvar-pos-ventas-${report.period.from}-${report.period.to}.csv"`);
  res.send(salesCsv(report));
}));

router.get("/summary.pdf", asyncRoute(async (req, res) => {
  const report = await loadReport(req);
  res.setHeader("Cache-Control", "no-store");
  streamReportPdf(res, report, report.businessName);
}));

export default router;
