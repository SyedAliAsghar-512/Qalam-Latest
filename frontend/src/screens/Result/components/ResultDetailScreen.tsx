import React, { useEffect, useState } from "react";
import { View, StyleSheet, ScrollView, Dimensions, ActivityIndicator, Text, FlatList, TouchableOpacity } from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useNavigation } from "@react-navigation/native";
import DashboardService from "../services/api_results";
import MainLayout from "../../../shared/components/MainLayout";

// Preferred category order for sorting
const PREFERRED_ORDER = ["Quiz", "Assignments", "Mid Term", "Final Term"];
const CARD_WIDTH_FULL = Dimensions.get("window").width - 24;

const sortCategories = (allCategories: string[]) => {
  const cleaned = allCategories.slice().filter(Boolean);
  const ordered =
    PREFERRED_ORDER
      .map(cat => cleaned.find(x => x === cat))
      .filter(Boolean)
      .concat(cleaned.filter(x => !PREFERRED_ORDER.includes(x)));
  return ordered;
};

// This produces an array like:
// [{type: 'LECTURE', key: 'Quiz', data: [...]}, {type: 'LECTURE', key: ...}, ..., {type: 'LAB', key: ...}]
const groupByTypeAndCategory = (lectureArr, labArr) => {
  const out = [];
  const addGrouped = (rs, type, color) => {
    const grouped = {};
    rs.forEach((entry) => {
      if (!grouped[entry.category]) grouped[entry.category] = [];
      grouped[entry.category].push(entry);
    });
    const orderedKs = sortCategories(Object.keys(grouped));
    orderedKs.forEach((key) => {
      out.push({ type, key, data: grouped[key], color });
    });
  };
  addGrouped(lectureArr, "LECTURE", "#172554");
  addGrouped(labArr, "LAB", "#292524");
  return out;
};

const AccordionSection = ({ category, data, expanded, onPress, typeColor = "#1e293b" }) => {
  const [cardIdx, setCardIdx] = useState(0);
  useEffect(() => { if (expanded) setCardIdx(0); }, [expanded]);
  return (
    <View style={styles.accordionSection}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        style={[styles.accordionHeader, { backgroundColor: typeColor }]}
      >
        <Text style={styles.accordionHeaderText}>{category}</Text>
        <Icon
          name={expanded ? "chevron-up" : "chevron-down"}
          size={24}
          color="#ffffff"
        />
      </TouchableOpacity>
      {expanded && (
        <FlatList
          data={data}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.horizontalCardFullWidth}>
              {/* Chips Row */}
              <View style={styles.chipRow}>
                <View style={styles.chip}>
                  <Icon name="file-document" color="#60a5fa" size={18} />
                  <Text style={styles.chipText}>{item.assessment}</Text>
                </View>
                <View style={styles.chip}>
                  <Icon name="star-circle" color="#a3e635" size={18} />
                  <Text style={styles.chipText}>{item.percentage}%</Text>
                </View>
              </View>
              {/* Details */}
              <Text style={styles.cardTitle}>{item.category}</Text>
              <Text style={styles.cardNum}>Obtained: <Text style={{color:'#a3e635',fontWeight:'bold'}}>{item.obtained_marks}</Text> / {item.max_mark}</Text>
              <Text style={styles.cardNum}>Class Avg: <Text style={{color:'#60a5fa'}}>{item.class_average}</Text></Text>
              <Text style={styles.cardNum}>Assessment: <Text style={{color:'#c026d3'}}>{item.assessment}</Text></Text>
            </View>
          )}
          style={{ width: '100%' }}
          snapToInterval={CARD_WIDTH_FULL}
          decelerationRate="fast"
          getItemLayout={(_, idx) => ({
            length: CARD_WIDTH_FULL,
            offset: CARD_WIDTH_FULL * idx,
            index: idx,
          })}
          onMomentumScrollEnd={ev => {
            const idx = Math.round(ev.nativeEvent.contentOffset.x / CARD_WIDTH_FULL);
            setCardIdx(idx);
          }}
          contentContainerStyle={styles.flatListContent}
        />
      )}
      {expanded && data.length > 1 && (
        <View style={styles.swipeIndicatorRow}>
          {data.map((_, idx) => (
            <View
              key={idx}
              style={[
                styles.swipeDot,
                idx === (cardIdx || 0) ? styles.swipeDotActive : undefined,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const CourseResultDetailScreen = ({ route }) => {
  const navigation = useNavigation();
  const { course_code, course_name, academic_term } = route.params;
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedIdx, setExpandedIdx] = useState(0);

  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);
      try {
        const res = await DashboardService.GetResults();
        const all = Array.isArray(res.data.results) ? res.data.results : [];
        setResults(
          all.filter(r =>
            (r.course_code === course_code ||
             (r.course_code && r.course_code.startsWith(course_code + "-"))) &&
            (r.semester === academic_term)
          )
        );
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, [course_code, academic_term]);

  // Compute grouped accordions when results update
  const lectureArr = results.filter(r => r.type === "LECTURE");
  const labArr = results.filter(r => r.type === "LAB");
  const combined = groupByTypeAndCategory(lectureArr, labArr);

  // If no results at all, show "No results."
  // Reset expandedIdx after loading data, set first as default
  useEffect(() => {
    setExpandedIdx(combined.length > 0 ? 0 : -1);
  }, [loading]);

  return (
    <MainLayout>
      <View style={styles.root}>
        <View style={styles.headerRow}>
          <Icon
            name="arrow-left"
            size={24}
            color="#fff"
            style={{ marginRight: 7 }}
            onPress={() => navigation.navigate("Result")}
          />
          <Text style={styles.headerTitle}>{course_name} ({course_code})</Text>
        </View>
        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color="#60a5fa" />
            <Text style={styles.loadingText}>Loading results...</Text>
          </View>
        ) : combined.length === 0 ? (
          <Text style={styles.empty}>No results.</Text>
        ) : (
          <ScrollView>
            {combined.map((catObj, idx) => (
              <AccordionSection
                key={catObj.type + '-' + catObj.key}
                category={catObj.key}
                data={catObj.data}
                expanded={expandedIdx === idx}
                onPress={() => setExpandedIdx(expandedIdx === idx ? -1 : idx)}
                typeColor={catObj.color}
              />
            ))}
          </ScrollView>
        )}
      </View>
    </MainLayout>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#090a12", padding: 12 },
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  headerTitle: { color: "#fff", fontSize: 20, fontWeight: "700" },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { color: "#60a5fa", marginTop: 11 },
  accordionSection: { marginBottom: 14, borderRadius: 8, overflow: "hidden" },
  accordionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1e293b",
    paddingVertical: 12,
    paddingHorizontal: 17,
    borderRadius: 8,
  },
  accordionHeaderText: { color: "#fff", fontWeight: "bold", fontSize: 15 },
  horizontalCardFullWidth: {
    width: CARD_WIDTH_FULL,
    backgroundColor: "#18181b",
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "flex-start",
    padding: 22,
    marginRight: 2,
    marginTop: 6,
    marginBottom: 6,
    shadowColor: "#0ea5e9",
    shadowRadius: 10,
    shadowOpacity: 0.13,
    elevation: 7,
    borderWidth: 0.8,
    borderColor: "#3730a3",
  },
  cardTitle: {
    fontSize: 20,
    color: "#60a5fa",
    fontWeight: "bold",
    marginBottom: 6,
    marginTop: 7,
    letterSpacing: 0.5,
  },
  cardNum: {
    color: "#e5e7eb",
    fontSize: 16,
    marginBottom: 2,
    marginLeft: 5,
  },
  chipRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    marginTop: 2,
  },
  chip: {
    flexDirection: "row",
    backgroundColor: "#232832",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    alignItems: "center",
    marginRight: 9,
  },
  chipText: {
    color: "#60a5fa",
    marginLeft: 6,
    fontWeight: "bold",
  },
  swipeIndicatorRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 10,
  },
  swipeDot: {
    width: 9,
    height: 9,
    borderRadius: 7,
    backgroundColor: "#52525b",
    marginHorizontal: 2,
    borderWidth: 1,
    borderColor: "#3b82f6",
  },
  swipeDotActive: {
    backgroundColor: "#60a5fa",
    borderColor: "#22d3ee",
    width: 13,
    height: 13,
    borderRadius: 10,
  },
  empty: { color: "#94A3B8", fontSize: 13, textAlign: "center", marginTop: 24 },
  flatListContent: { alignItems: "center", flexGrow: 1 },
});

export default CourseResultDetailScreen;