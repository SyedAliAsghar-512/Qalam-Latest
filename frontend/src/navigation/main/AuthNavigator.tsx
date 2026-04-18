import React, { useContext, useEffect, useState, useRef } from 'react';
import { View, ActivityIndicator, Text, Animated, Dimensions } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import Login from '../../screens/login/components/Login';
import DrawerNavigator from '../../screens/drawer/DrawerNavigator';
import UserStorage from '../../auth/user/UserStorage';
import { UserLoginResponse } from '../../screens/user/models/UserLoginResponse';
import AuthContext from '../../auth/user/UserContext';
import { setAuthHeaders, setSecretKey } from '../../auth/api-client/api_client';
import { Image } from 'react-native-svg';


const Stack = createNativeStackNavigator();
const { width, height } = Dimensions.get('window');

// Simple splash screen with dashboard-like background
const SplashScreen = () => {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#020617', // same as your login background
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Image
        source={require('../../shared/assets/logo.png')} // Adjust the path if needed
        style={{ width: 80, height: 80, marginBottom: 16 }}
        resizeMode="contain"
      />
      <Text style={{
        fontSize: 30,
        fontWeight: '800',
        color: '#F9FAFB',
        letterSpacing: 0.8,
        marginBottom: 8
      }}>
        Qalam
      </Text>
    </View>
  );
};

  const AuthNavigator = () => {
    const [initialRoute, setInitialRoute] = useState<'Login' | 'Drawer' | 'SavedAccounts' | null>(null);
    const authContext = useContext(AuthContext);

    useEffect(() => {
      const bootstrap = async () => {
        try {
          setSecretKey();
    
          // 1) Try restore session first
          const creds = await UserStorage.getUser();
          if (creds?.username) {
            const storedUser: UserLoginResponse = JSON.parse(creds.username);
            const accessToken =
              (await UserStorage.getAccessToken()) || storedUser.accessToken;
    
            if (accessToken) {
              await setAuthHeaders(accessToken);
              authContext?.setUser?.(storedUser);
              setInitialRoute("Drawer");
              return;
            }
          }
    
          // 3) Otherwise Login
          await UserStorage.deleteUser();
          await UserStorage.clearTokens?.();
          setInitialRoute("Login");
        } catch (e) {
          await UserStorage.deleteUser();
          await UserStorage.clearTokens?.();
          setInitialRoute("Login");
        }
      };
    
      bootstrap();
    }, [authContext]);

  // Show splash while deciding where to go
  if (!initialRoute) {
    return <SplashScreen />;
  }

  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName={initialRoute}
    >
      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen name="Drawer" component={DrawerNavigator} />
    </Stack.Navigator>
  );
};

export default AuthNavigator;