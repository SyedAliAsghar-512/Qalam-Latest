// navigation/MainTabs.tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Dashboard from '../../screens/dashboard/components/dashboard/Dashboard';
import CustomBottomNav from '../../shared/components/LowNavBar';
import AttendanceScreen from '../../screens/Attendance/components/AttendanceScreen';
import CourseAttendanceDetailScreen from '../../screens/Attendance/components/CourseAttendanceDetailScreen';

const Tab = createBottomTabNavigator();

const MainTabs = () => {
  return (
    <Tab.Navigator
    screenOptions={{ headerShown: false }}
    tabBar={(props) => <CustomBottomNav {...props} />}
  >
    <Tab.Screen name="Dashboard" component={Dashboard} />
    <Tab.Screen name="Add" component={() => null} />
    <Tab.Screen name="Attendance" component={AttendanceScreen} />
    <Tab.Screen name="CourseAttendanceDetail" component={CourseAttendanceDetailScreen} />
  </Tab.Navigator>
  );
};

export default MainTabs;