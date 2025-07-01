import express, { Router } from "express";
import {
  getValues,
  saveValues,
  getValueById,
  updateValueById,
  deleteValueById,
} from "../controllers/valuesController";

const router: Router = express.Router();

// Routes cho /api/values
router.get("/", getValues as unknown as express.RequestHandler);
router.post("/", saveValues as unknown as express.RequestHandler);

// Routes cho /api/values/:id
router.get("/:id", getValueById as unknown as express.RequestHandler);
router.put("/:id", updateValueById as unknown as express.RequestHandler);
router.delete("/:id", deleteValueById as unknown as express.RequestHandler);

export default router; 