import React, { useEffect, useState } from "react";
import { View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";
import DashboardService from "../services/api_results"; // you must write this!
import MainLayout from "../../../shared/components/MainLayout";

const CourseResultsListScreen = () => {
  const navigation = useNavigation();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClasses = async () => {
      setLoading(true);
      try {
        const res = await DashboardService.GetStudentProfile();
        setClasses(res.data.student.dashboard.classes || []);
      } finally {
        setLoading(false);
      }
    };
    fetchClasses();
  }, []);

  return (
    <MainLayout>
      <View style={styles.root}>
        <Text style={styles.header}>Results</Text>
        {loading ? (
          <ActivityIndicator color="#60a5fa" size="large" />
        ) : (
          <FlatList
            data={classes}
            keyExtractor={item => item.course_code}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.card}
                onPress={() =>
                  navigation.navigate("CourseResultDetailScreen", {
                    course_code: item.course_code,
                    course_name: item.course_name,
                    academic_term: item.semester,
                  })
                }
              >
                <Text style={styles.name}>{item.course_name}</Text>
                <Text style={styles.code}>{item.course_code}</Text>
                <Text style={styles.semester}>{item.semester}</Text>
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </MainLayout>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#090a12", padding: 16 },
  header: { color: "#fff", fontSize: 22, fontWeight: "bold", marginVertical: 16 },
  card: {
    backgroundColor: "#232832",
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
  },
  name: { color: "#fff", fontSize: 17, fontWeight: "bold" },
  code: { color: "#a3a3a3", fontSize: 14 },
  semester: { color: "#60a5fa", fontSize: 13, marginTop: 5 },
});

export default CourseResultsListScreen;