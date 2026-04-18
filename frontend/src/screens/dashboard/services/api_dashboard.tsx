import client from "../../../auth/api-client/api_client";

// Portal-style single endpoint (matches your latest Dashboard.tsx):
const GetDashboardCached = () => client.get("/me"); // e.g. returns DB-cached or fast local data
const GetDashboardSummary = () => client.get("/profile");
const Logout = () => client.get("/logout");
// Example for force sync (if server provides it, not required for display!)
// const SyncDashboard = () => client.get("/dashboard/sync");

export default {
  GetDashboardCached,
  GetDashboardSummary,
  Logout
};