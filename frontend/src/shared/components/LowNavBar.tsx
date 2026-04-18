import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import styles from '../styling/styles';
import { BottomNavigation } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import colors from '../styling/colors';

const LowNavBar = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute();

  // Only 3 routes (Dashboard, Attendance, Results)
  const routes = [
    {
      key: 'dashboard',
      title: 'Dashboard',
      icon: { active: 'home', inactive: 'home-outline' },
    },
    {
      key: 'attendance',
      title: 'Attendance',
      icon: { active: 'calendar-check', inactive: 'calendar-check-outline' },
    },
    {
      key: 'results',
      title: 'Results',
      icon: { active: 'chart-box', inactive: 'chart-box-outline' },
    },
  ];

  // Finds tab index by current screen name
  const getIndexFromRoute = () => {
    switch (route.name) {
      case 'Dashboard': return 0;
      case 'Attendance': return 1;
      case 'Result': return 2;
      default: return 0;
    }
  };

  const [index, setIndex] = useState(getIndexFromRoute());

  useEffect(() => {
    setIndex(getIndexFromRoute());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.name]);

  const handleNavigation = (i: number) => {
    switch (routes[i].key) {
      case 'dashboard':
        navigation.navigate('Dashboard');
        break;
      case 'attendance':
        navigation.navigate('Attendance');
        break;
      case 'results':
        navigation.navigate('Result');
        break;
      default:
        navigation.navigate('Dashboard');
    }
  };

  return (
    <BottomNavigation
      navigationState={{ index, routes }}
      onIndexChange={handleNavigation}
      renderScene={() => null}
      renderIcon={({ route, color, focused }) => {
        const r = route as any;
        const iconConfig = r.icon as { active: string; inactive: string };
        const iconName = focused ? iconConfig.active : iconConfig.inactive;
        return (
          <View style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}>
            <MaterialCommunityIcons
              name={iconName}
              size={26}
              color={colors.white}
            />
          </View>
        );
      }}
      activeIndicatorStyle={{ backgroundColor: 'transparent' }}
      labeled={false}
      shifting={false}
      barStyle={styles.bottomBar}
      safeAreaInsets={{ bottom: 0 }}
      keyboardHidesNavigationBar={true}
    />
  );
};

export default LowNavBar;