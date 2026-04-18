import React, { useEffect, useState } from "react";
import { View, StyleSheet, ScrollView, Dimensions, ActivityIndicator, Alert } from "react-native";
import { Text, Tab, TabView } from "@rneui/themed";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useNavigation } from "@react-navigation/native";
import DashboardService from "../services/api_attendance";
import MainLayout from "../../../shared/components/MainLayout";

// Helper to prettify ISO date
const formatDate = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return isNaN(d)
    ? dateStr
    : d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
};

const CourseAttendanceDetailScreen = ({ route }) => {
  const navigation = useNavigation();
  const { course_code, academic_term, course_name } = route.params;
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabIndex, setTabIndex] = useState(0);
  const [syncing, setSyncing] = useState(true);

  useEffect(() => {
    const syncAndFetch = async () => {
      setSyncing(true);
      try {
        await DashboardService.SyncAttendance();
      } catch (e) {
        Alert.alert("Sync failed", "Could not sync latest attendance. Showing cached data.");
      }
      setSyncing(false);
      setLoading(true);
      try {
        const res = await DashboardService.GetAttendance();
        const all = Array.isArray(res.data.attendance) ? res.data.attendance : [];
        setAttendance(
          all.filter(
            a =>
              (
                a.course_code === course_code ||
                (a.course_code && a.course_code.startsWith(course_code + "-"))
              ) &&
              (a.academic_term === academic_term ||
                a.semester === academic_term)
          )
        );
      } finally {
        setLoading(false);
      }
    };
    syncAndFetch();
  }, [course_code, academic_term]);

  // Separate lecture/lab records
  const lectureArr = attendance.filter(
    a => a.type && a.type.toLowerCase().includes("lecture")
  );
  const labArr = attendance.filter(
    a => a.type && a.type.toLowerCase().includes("lab")
  );
  // fallback for "DEFAULT"
  const fallbackArr =
    attendance.length === 1 ? attendance : [];

  // Helper to show stats summary
  const AttendanceSummary = ({ entry }) => (
    <View style={detailStyles.tabSummary}>
      <Text style={detailStyles.statText}>
        Percentage: {entry.attendance_percentage ?? "-"}%
      </Text>
      <Text style={detailStyles.statText}>
        Attended: {entry.classes_attended ?? "-"} / {entry.classes_conducted ?? "-"}
      </Text>
    </View>
  );

  // Helper to render attendance records
  const AttendanceRecords = ({ entries }) => {
    if (!entries || entries.length === 0)
      return <Text style={detailStyles.emptyText}>No records found.</Text>;

    // Flatten all records from all entries
    const allRecs = entries.flatMap(entry => entry.records || []);
    if (!allRecs.length)
      return <Text style={detailStyles.emptyText}>No records found.</Text>;

    return allRecs.map((rec, i) => (
      <View key={i} style={detailStyles.recordRow}>
        <Text style={detailStyles.recordDate}>{formatDate(rec.date)}</Text>
        <Text
          style={[
            detailStyles.recordStatus,
            rec.status === "Present"
              ? detailStyles.statusPresent
              : detailStyles.statusAbsent,
          ]}
        >
          {rec.status}
        </Text>
        {!!rec.fine && rec.fine !== "0" && (
          <Text style={detailStyles.recordFine}>Fine: {rec.fine}</Text>
        )}
      </View>
    ));
  };

  return (
    <MainLayout>
      <View style={detailStyles.root}>
        <View style={detailStyles.headerBar}>
          <Icon
            name="arrow-left"
            size={24}
            color="#F8FAFC"
            style={{ marginRight: 8 }}
            onPress={() => navigation.navigate("Attendance")}
          />
          <Icon name="book-open" size={24} color="#F8FAFC" style={{ marginRight: 7 }} />
          <Text style={detailStyles.headerTitle}>
            {course_name} ({course_code})
          </Text>
        </View>
        <Tab
          value={tabIndex}
          onChange={setTabIndex}
          indicatorStyle={detailStyles.tabIndicator}
        >
          <Tab.Item title="Lecture" />
          <Tab.Item title="Lab" />
        </Tab>
        {syncing || loading ? (
          <View
            style={[
              detailStyles.tabContent,
              { justifyContent: "center", alignItems: "center" },
            ]}
          >
            <ActivityIndicator size="large" color="#60a5fa" />
            <Text style={{ color: "#60a5fa", marginTop: 11 }}>
              {syncing
                ? "Syncing latest attendance..."
                : "Loading attendance..."}
            </Text>
          </View>
        ) : (
          <TabView
            value={tabIndex}
            onChange={setTabIndex}
            animationType="spring"
            style={{ flex: 1 }}
          >
            <TabView.Item style={detailStyles.tabContent}>
              <ScrollView>
                {(lectureArr.length > 0 ? lectureArr : fallbackArr).length > 0 && (
                  <AttendanceSummary entry={(lectureArr.length > 0 ? lectureArr : fallbackArr)[0]} />
                )}
                {lectureArr.length === 0 && fallbackArr.length === 0 ? (
                  <Text style={detailStyles.emptyText}>No lecture attendance.</Text>
                ) : (
                  <AttendanceRecords entries={lectureArr.length > 0 ? lectureArr : fallbackArr} />
                )}
              </ScrollView>
            </TabView.Item>
            <TabView.Item style={detailStyles.tabContent1}>
              <ScrollView>
                {labArr.length > 0 && (
                  <AttendanceSummary entry={labArr[0]} />
                )}
                {labArr.length === 0 ? (
                  <Text style={detailStyles.emptyText}>No lab attendance.</Text>
                ) : (
                  <AttendanceRecords entries={labArr} />
                )}
              </ScrollView>
            </TabView.Item>
          </TabView>
        )}
      </View>
    </MainLayout>
  );
};

const detailStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#090a12", padding: 12 },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 0,
    marginBottom: 10,
  },
  headerTitle: { color: "#F8FAFC", fontSize: 20, fontWeight: "800" },
  tabIndicator: { backgroundColor: "#60a5fa", height: 3 },
  tabContent: {
    width: Dimensions.get("window").width,
    flex: 1,
    marginRight: 12,
    marginLeft: 12,
    minHeight: 140,
    paddingBottom: 8,
  },
    tabContent1: {
    width: Dimensions.get("window").width,
    marginLeft: 12,
    marginRight: 12,
    flex: 1,
    minHeight: 140,
    paddingBottom: 8,
  },
  tabSummary: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#20232d",
    borderRadius: 8,
    margin: 5,
    marginBottom: 13,
    padding: 10,
  },
  statText: {
    color: "#93c5fd",
    fontWeight: "700",
    fontSize: 13,
    marginRight: 8,
  },
  recordRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    backgroundColor: "#232832",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 9,
    marginTop: 3,
  },
  recordDate: { color: "#E2E8F0", fontSize: 13, width: 110 },
  recordStatus: { marginLeft: 0, marginRight: 10, fontWeight: "700", fontSize: 12 },
  statusPresent: { color: "#4ade80" },
  statusAbsent: { color: "#f87171" },
  recordFine: { color: "#fde68a", marginLeft: 7, fontSize: 11, fontWeight: "700" },
  emptyText: {
    color: "#94A3B8",
    fontSize: 13,
    textAlign: "center",
    marginTop: 24,
  },
});

export default CourseAttendanceDetailScreen;