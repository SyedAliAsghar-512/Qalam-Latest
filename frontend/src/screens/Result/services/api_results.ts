import client from "../../../auth/api-client/api_client";

const GetStudentProfile = () => client.get("/me");
const GetResults = () => client.get("/qalam/sync/results");
// Optionally, add SyncResults if applicable

export default {
  GetStudentProfile,
  GetResults,
};