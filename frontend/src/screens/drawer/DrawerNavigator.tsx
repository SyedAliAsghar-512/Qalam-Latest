import React, {useState, useContext, useRef} from 'react';
import {createDrawerNavigator} from '@react-navigation/drawer';
import {
  Image,
  Pressable,
  View,
  ScrollView,
  Alert,
} from 'react-native';
import {Card} from '@rneui/base';
import AppText from '../../components/Layout/AppText/AppText';
import AuthContext from '../../auth/user/UserContext';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import colors from '../../shared/styling/lightModeColors';
import Dashboard from '../dashboard/components/dashboard/Dashboard';
import AttendanceScreen from '../Attendance/components/AttendanceScreen';
import CourseAttendanceDetailScreen from '../Attendance/components/CourseAttendanceDetailScreen';
import CourseResultsListScreen from '../Result/components/ResultScreen';
import CourseResultDetailScreen from '../Result/components/ResultDetailScreen';



const Drawer = createDrawerNavigator();



// ✅ DrawerNavigator main
const DrawerNavigator = () => (
  <Drawer.Navigator
  screenOptions={{
      headerShown: false,
      swipeEnabled: false,
    }}>
    <Drawer.Screen name="Dashboard" component={Dashboard} options={{headerShown: false}} />
    <Drawer.Screen name="Attendance" component={AttendanceScreen} options={{headerShown: false}} />
    <Drawer.Screen name="CourseAttendanceDetail" component={CourseAttendanceDetailScreen} options={{headerShown: false}} />
    <Drawer.Screen name="Result" component={CourseResultsListScreen} options={{headerShown: false}} />
    <Drawer.Screen name="CourseResultDetailScreen" component={CourseResultDetailScreen} options={{headerShown: false}} />
  </Drawer.Navigator>
);

export default DrawerNavigator;
