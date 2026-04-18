import client from "../../../auth/api-client/api_client";

// Portal-style single endpoint (matches your latest Dashboard.tsx):
const GetStudentProfile = () => client.get("/me");
const GetAttendance = () => client.get("/attendance");
const SyncAttendance = () => client.get("/qalam/sync/attendance");
// Example for force sync (if server provides it, not required for display!)
// const SyncDashboard = () => client.get("/dashboard/sync");

export default {
  GetAttendance,
  GetStudentProfile,
  SyncAttendance
};