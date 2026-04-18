import React, { useEffect, useState, useCallback } from "react";
import {
  ScrollView,
  View,
  TouchableOpacity,
  StatusBar,
  Platform,
  RefreshControl,
  StyleSheet,
  Alert,
} from "react-native";
import { Text } from "@rneui/themed";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import NetInfo from "@react-native-community/netinfo";
import AsyncStorage from "@react-native-async-storage/async-storage";

import MainLayout from "../../../../shared/components/MainLayout";
import AppScreen from "../../../../components/Layout/AppScreen/AppScreen";
import DashboardService from "../../services/api_dashboard";
import GlassyCard from "../../../../shared/components/GlassyCard";
import UserStorage from "../../../../auth/user/UserStorage";

const DASHBOARD_CACHE_KEY = "qalam:dashboard:v1";

function trimStudentId(id: string = "") {
  return id.replace(/^0+/, "") || "—";
}

const Dashboard = ({ navigation }: any) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);
const [showLogout, setShowLogout] = useState(false);
  const [student, setStudent] = useState<any>(null);
  const [academic, setAcademic] = useState<any>(null);
  const [todayClasses, setTodayClasses] = useState<any[]>([]);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  // Save dashboard cache
  const saveCache = async (value: any) => {
    try {
      await AsyncStorage.setItem(
        DASHBOARD_CACHE_KEY,
        JSON.stringify({ ts: Date.now(), value })
      );
    } catch {}
  };

  // Load dashboard cache
  const loadCache = async () => {
    try {
      const raw = await AsyncStorage.getItem(DASHBOARD_CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed?.value ?? null;
    } catch {
      return null;
    }
  };

  // Extract info from payload
  const hydrateFromPayload = (payload: any) => {
    const studentInfo = payload?.student_info || payload?.studentInfo || payload;
    const dashboard = payload?.dashboard || {};
    const standings = dashboard?.academic_standings || {};
    const tClasses = dashboard?.today_classes || dashboard?.todayClasses || [];

    setStudent(studentInfo);
    setAcademic(standings);
    setTodayClasses(Array.isArray(tClasses) ? tClasses : []);
    setLastSyncedAt(payload?.last_synced_at || payload?.lastSyncedAt || null);
  };

  // Initial load: cached
  const fetchDashboardCached = useCallback(
    async () => {
      try {
        setError(null);
        const res = await DashboardService.GetDashboardCached();
        const body = (res as any)?.data ?? res;
        const payload = body?.student || body?.data || body;

        if (!payload) throw new Error("Invalid dashboard response");

        hydrateFromPayload(payload);
        await saveCache(payload);
      } catch (e: any) {
        setError(
          e?.response?.data?.message || e?.message || "Failed to load dashboard"
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // On refresh: force-latest
  const refreshDashboard = useCallback(
    async () => {
      try {
        setRefreshing(true);
        setError(null);

        if (offline) {
          setError("No internet connection. Pull to refresh unavailable.");
          setRefreshing(false);
          return;
        }

        const res = await DashboardService.GetDashboardSummary();
        const body = (res as any)?.data ?? res;
        const payload = body?.student || body?.data || body;

        if (!payload) throw new Error("Invalid dashboard response");

        hydrateFromPayload(payload);
        await saveCache(payload);
      } catch (e: any) {
        setError(
          e?.response?.data?.message || e?.message || "Failed to refresh dashboard"
        );
      } finally {
        setRefreshing(false);
      }
    },
    [offline]
  );

  useEffect(() => {
    (async () => {
      // Load cache immediately for instant view
      const cached = await loadCache();
      if (cached) {
        hydrateFromPayload(cached);
        setLoading(false);
      }
      // Now load (possibly updated) from API
      await fetchDashboardCached();
    })();
  }, [fetchDashboardCached]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const isOffline =
        !state.isConnected || state.isInternetReachable === false;
      setOffline(isOffline);
    });
    return () => unsubscribe();
  }, []);

  const formatDateTime = (iso?: string | null) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString();
  };

const handleLogout = () => setShowLogout(true);

  if (loading) {
    return (
      <MainLayout>
        <AppScreen style={styles.root}>
          <DashboardSkeleton />
        </AppScreen>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <AppScreen style={styles.root}>
        <StatusBar
          barStyle="light-content"
          translucent
          backgroundColor="transparent"
        />

        <View style={styles.overlay}>
          {/* Mini Header */}
          <View style={styles.headerBar}>
            <View>
              <Text style={styles.headerTitle}>Qalam Portal</Text>
              <Text style={styles.headerSubtitle}>NUST Student</Text>
            </View>
            <TouchableOpacity
  style={styles.logoutBtn}
  onPress={handleLogout}
  activeOpacity={0.8}
>
  <Icon name="logout" size={22} color="#e5e7eb" />
</TouchableOpacity>
          </View>

          {(offline || error) && (
            <View style={styles.errorCard}>
              <Icon
                name={offline ? "wifi-off" : "alert-circle-outline"}
                size={18}
                color="#FCA5A5"
              />
              <Text style={styles.errorText}>
                {offline
                  ? "You are offline. Showing cached dashboard data."
                  : error}
              </Text>
            </View>
          )}

          <ScrollView
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={refreshDashboard}
                tintColor="#93C5FD"
              />
            }
            contentContainerStyle={{ paddingBottom: 18 }}
            style={{ flex: 1 }}
          >
            {/* 1) STUDENT INFO */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Student Information</Text>

              <InfoRow label="Name" value={student?.name || "—"} />
              <InfoRow label="Student ID" value={trimStudentId(student?.student_id)} />
              <InfoRow label="Campus" value={student?.campus || "—"} />
              <InfoRow label="Status" value={student?.status || "—"} />
              <InfoRow
                label="Last Synced"
                value={formatDateTime(lastSyncedAt)}
                isLast
              />
            </View>

            {/* 2) ACADEMIC STANDING */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Academic Standing</Text>

              <View style={styles.grid}>
                <MetricBox label="CGPA" value={`${academic?.cgpa ?? 0}`} />
                <MetricBox
                  label="Earned Credits"
                  value={`${academic?.earned_credits ?? 0}`}
                />
              </View>
              <View style={styles.grid}>
                <MetricBox
                  label="Total Credits"
                  value={`${academic?.total_credits ?? 0}`}
                />
                <MetricBox
                  label="In Progress"
                  value={`${academic?.inprogress_credits ?? 0}`}
                />
              </View>
            </View>

            {/* 3) TODAY CLASSES */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Today Classes</Text>

              {todayClasses.length === 0 ? (
                <Text style={styles.emptyText}>No classes scheduled for today.</Text>
              ) : (
                todayClasses.map((c, idx) => (
                  <View
                    key={c?._id?.$oid || c?._id || `${c?.subject}-${idx}`}
                    style={[
                      styles.classItem,
                      idx === todayClasses.length - 1 && { marginBottom: 0 },
                    ]}
                  >
                    <View style={styles.classIconWrap}>
                      <Icon name="book-open-page-variant-outline" size={18} color="#BFDBFE" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.classTitle}>{c?.subject || "Untitled Course"}</Text>
                      <Text style={styles.classTime}>
                        {c?.start_time || "--"} - {c?.end_time || "--"}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </ScrollView>
        </View>
        {showLogout && (
  <View style={modalStyles.overlay}>
    <View style={modalStyles.centered}>
      <GlassyCard
        title="Logout"
        message="Are you sure you want to logout?"
        actionText="Logout"
        type="error"
        onPressAction={async () => {
          setShowLogout(false);
          try {
            await DashboardService.Logout();
            await UserStorage?.deleteUser?.(); // delete user credentials
            await UserStorage?.clearTokens?.(); // clear tokens if implemented
            navigation.reset({ index: 0, routes: [{ name: "Login" }] });
          } catch (e) {}
        }}
        onClose={() => setShowLogout(false)}
      />
    </View>
  </View>
)}
      </AppScreen>
    </MainLayout>
  );
};

const modalStyles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(9,10,18,0.88)", // almost solid, you can use 1.0 for pure black-out
    zIndex: 9999,
    justifyContent: "center",
    alignItems: "center",
  },
  centered: {
    width: "85%",
    maxWidth: 380,
    alignSelf: "center",
  },
});

const InfoRow = ({
  label,
  value,
  isLast = false,
}: {
  label: string;
  value: string;
  isLast?: boolean;
}) => (
  <View
    style={[
      styles.infoRow,
      isLast && { borderBottomWidth: 0, marginBottom: 0, paddingBottom: 0 },
    ]}
  >
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

const MetricBox = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.metricBox}>
    <Text style={styles.metricLabel}>{label}</Text>
    <Text style={styles.metricValue}>{value}</Text>
  </View>
);

const DashboardSkeleton = () => (
  <View style={{ flex: 1, paddingTop: 14 }}>
    <View style={[styles.skelCard, { height: 124, marginBottom: 14 }]} />
    <View style={[styles.skelCard, { height: 110, marginBottom: 14 }]} />
    <View style={[styles.skelCard, { height: 140 }]} />
  </View>
);


const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#090a12" },

  overlay: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? 20 : 34,
    paddingHorizontal: 14,
    backgroundColor: "#090a12",
  },

  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 45,
    marginBottom: 8,
    marginTop: 0,
  },
  headerTitle: {
    color: "#E2E8F0",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 0,
  },
  headerSubtitle: {
    color: "#6B7280",
    fontSize: 12,
    fontWeight: "500",
    marginTop: 0,
  },
  logoutBtn: {
    backgroundColor: "rgba(18,28,44,0.7)",
    borderRadius: 8,
    padding: 6,
  },

  errorCard: {
    marginBottom: 10,
    borderRadius: 12,
    padding: 10,
    backgroundColor: "rgba(127, 29, 29, 0.50)",
    borderWidth: 1,
    borderColor: "rgba(248, 113, 113, 0.4)",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  errorText: { color: "#FEE2E2", fontSize: 12, flex: 1 },

  card: {
    backgroundColor: "rgba(18, 28, 44, 0.92)", // glassy, high contrast
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(93, 145, 203, 0.2)",
    padding: 14,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  cardTitle: {
    color: "#F8FAFC",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },

  infoRow: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148, 163, 184, 0.12)",
    paddingBottom: 8,
    marginBottom: 8,
  },
  infoLabel: { color: "#94A3B8", fontSize: 12, marginBottom: 2 },
  infoValue: { color: "#E2E8F0", fontSize: 14, fontWeight: "600" },

  grid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  metricBox: {
    flex: 1,
    backgroundColor: "rgba(16, 17, 23, 0.72)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.16)",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  metricLabel: {
    color: "#93C5FD",
    fontSize: 12,
    marginBottom: 4,
  },
  metricValue: {
    color: "#F8FAFC",
    fontSize: 20,
    fontWeight: "800",
  },

  classItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    backgroundColor: "rgba(9, 10, 18, 0.78)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.10)",
    borderRadius: 12,
    padding: 10,
  },
  classIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(30, 64, 175, 0.21)",
    marginRight: 10,
  },
  classTitle: {
    color: "#E2E8F0",
    fontSize: 14,
    fontWeight: "700",
  },
  classTime: {
    color: "#93C5FD",
    fontSize: 12,
    marginTop: 2,
  },

  emptyText: {
    color: "#94A3B8",
    fontSize: 12,
    fontStyle: "italic",
  },

  centerWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: "#E2E8F0",
    fontSize: 14,
  },
  skelCard: {
    width: '100%',
    backgroundColor: "rgba(32,34,48,0.85)",
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  }
});

export default Dashboard;