import React, { useEffect, useState } from "react";
import {
  ScrollView,
  View,
  StyleSheet,
  StatusBar,
  Platform,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { Text } from "@rneui/themed";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import NetInfo from "@react-native-community/netinfo";
import ProfileService from "../services/api_attendance"; // (your new file)
import MainLayout from "../../../shared/components/MainLayout";
import { useNavigation } from '@react-navigation/native';

const AttendanceScreen = () => {
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);

    const navigation = useNavigation();

  const fetchClasses = async () => {
    try {
      setError(null);
      setLoading(true);
      const res = await ProfileService.GetStudentProfile();
      setClasses(res.data.student?.dashboard?.classes || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load classes");
    } finally {
      setLoading(false);
    }
  };

  const refreshClasses = async () => {
    if (offline) {
      setRefreshing(false);
      setError("No internet connection.");
      return;
    }
    try {
      setRefreshing(true);
      setError(null);
      await fetchClasses();
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchClasses();
    const unsubscribe = NetInfo.addEventListener((state) => {
      const isOffline = !state.isConnected || state.isInternetReachable === false;
      setOffline(isOffline);
    });
    return () => unsubscribe();
  }, []);

  return (
    <MainLayout>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <View style={styles.overlay}>
        {/* Header */}
        <View style={styles.headerBar}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Icon name="calendar-check" size={24} color="#F8FAFC" style={{ marginRight: 8 }} />
            <Text style={styles.headerTitle}>Attendance / Courses</Text>
          </View>
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
                ? "You are offline. Showing cached data."
                : error}
            </Text>
          </View>
        )}
 <ScrollView
          style={{ flex: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refreshClasses}
              tintColor="#93C5FD"
            />
          }
        >
          {loading ? (
            <AttendanceSkeleton />
          ) : classes.length === 0 ? (
            <Text style={styles.emptyText}>No courses found.</Text>
          ) : (
            classes.map((course, idx) => (
              <TouchableOpacity
                key={course.course_code + idx}
                style={styles.card}
                activeOpacity={0.90}
                onPress={() =>
                  navigation.navigate("CourseAttendanceDetail", {
                    course_code: course.course_code,
                    academic_term: course.semester,
                    course_name: course.course_name
                  })
                }
              >
                <View style={styles.courseHeader}>
                  <View>
                    <Text style={styles.cardTitle}>{course.course_name}</Text>
                    <Text style={styles.courseMeta}>
                      {course.course_code}
                      {course.instructor ? ` • ${course.instructor}` : ""}
                    </Text>
                  </View>
                </View>
                <View style={styles.attMetaRow}>
                  <Text style={styles.metaLabel}>
                    Attendance:
                    <Text style={styles.metaVal}>{course.attendance ?? "N/A"}</Text>
                  </Text>
                  <Text style={styles.metaLabel}>
                    Semester: <Text style={styles.metaVal}>{course.semester}</Text>
                  </Text>
                <View style={styles.metaRight}>
                    <Text style={styles.creditsBadge}>
                      {course.credits ? `${course.credits} Cr.` : ""}
                    </Text>
                  </View>
                           </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>
    </MainLayout>
  );
};

const AttendanceSkeleton = () => (
  <View style={{ flex: 1, paddingTop: 6 }}>
    {[1, 2, 3].map((_, i) => (
      <View key={i} style={[styles.skelCard, { height: 80 + i * 20, marginBottom: 14 }]} />
    ))}
  </View>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? 20 : 34,
    paddingHorizontal: 14,
    backgroundColor: "#090a12",
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 45,
    marginBottom: 8,
    marginTop: 0,
    justifyContent: "flex-start",
  },
  headerTitle: {
    color: "#F8FAFC",
    fontSize: 20,
    fontWeight: "800",
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
    backgroundColor: "rgba(18, 28, 44, 0.92)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(93, 145, 203, 0.2)",
    padding: 14,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.09,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  skelCard: {
    width: "100%",
    backgroundColor: "rgba(32,34,48,0.85)",
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardTitle: {
    color: "#F8FAFC",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 2,
  },
  courseMeta: {
    color: "#60a5fa",
    fontSize: 12,
    marginBottom: 2,
  },
  courseHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  metaRight: { alignItems: "flex-end" },
  creditsBadge: {
    marginTop: 5,
    backgroundColor: "#1e293b",
    color: "#facc15",
    paddingHorizontal: 7,
    borderRadius: 10,
    fontWeight: "800",
    fontSize: 12,
    marginLeft: 8,
  },
  attMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginTop: 7,
    marginBottom: 2,
  },
  metaLabel: { color: "#cbd5e1", fontSize: 13 },
  metaVal: { color: "#F8FAFC", fontWeight: "600" },
  emptyText: { color: "#94A3B8", fontSize: 13, textAlign: "center", marginTop: 60 },
});

export default AttendanceScreen;