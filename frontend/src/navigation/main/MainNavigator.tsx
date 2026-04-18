import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Dashboard from '../../screens/dashboard/components/dashboard/Dashboard';

import AttendanceScreen from '../../screens/Attendance/components/AttendanceScreen';
import CourseAttendanceDetailScreen from '../../screens/Attendance/components/CourseAttendanceDetailScreen';

const Stack = createNativeStackNavigator();

const MainNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Dashboard" component={Dashboard} />
    <Stack.Screen name="Attendance" component={AttendanceScreen} />
    <Stack.Screen name="CourseAttendanceDetail" component={CourseAttendanceDetailScreen} options={{headerShown: false}} />
  </Stack.Navigator>
);

export default MainNavigator;
