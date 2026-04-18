import express from "express";
import {
  loginUser,
  logoutUser,
  getUserProfile,
  getResults,
  getAttendance,
  getQalamSessionStatus,
  syncResultsOnly,
  syncAttendanceOnly,
  syncAll,
  getProfileAndRefreshQalam,
} from "../controllers/authControllers.js";
import { isAuthenticatedUser } from "../middlewares/auth.js";

const router = express.Router();

// Qalam auth/session
router.post("/qalam/login", loginUser);
router.get("/qalam/session", isAuthenticatedUser, getQalamSessionStatus);

// Qalam sync routes (course-wise, direct HTTP using stored cookies)
router.get("/qalam/sync/results", isAuthenticatedUser, syncResultsOnly);
router.get("/qalam/sync/attendance", isAuthenticatedUser, syncAttendanceOnly);
router.get("/qalam/sync/all", isAuthenticatedUser, syncAll);
router.get("/profile", isAuthenticatedUser, getProfileAndRefreshQalam);
// Local cached data routes
router.get("/me", isAuthenticatedUser, getUserProfile);
router.get("/results", isAuthenticatedUser, getResults);
router.get("/attendance", isAuthenticatedUser, getAttendance);
router.get("/logout", isAuthenticatedUser, logoutUser);

export default router;