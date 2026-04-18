import 'react-native-gesture-handler';
import React, { useState, useRef, useEffect } from 'react';
import { NavigationContainer, CommonActions } from '@react-navigation/native';
import {
  useColorScheme,
  View,
  ActivityIndicator,
  Platform,
  PermissionsAndroid,
  AppState,
} from 'react-native';
import { DefaultTheme, MD3DarkTheme, PaperProvider } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ReactNativeBiometrics from 'react-native-biometrics';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import SystemNavigationBar from 'react-native-system-navigation-bar';
import AuthContext from './src/auth/user/UserContext';
import NavigationTheme from './src/navigation/main/NavigationTheme';
import AuthNavigator from './src/navigation/main/AuthNavigator';
import { user } from './src/screens/user/models/UserLoginResponse';
import UserStorage from './src/auth/user/UserStorage';
import apiClient, { setSecretKey } from './src/auth/api-client/api_client';
import { navigationRef, resetToLogin } from './src/navigation/main/RootNavigation';

const App = () => {
  const [User, setUser] = useState<user | undefined>();

  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const theme = isDarkMode ? MD3DarkTheme : DefaultTheme;

  const [isBiometricVerified, setIsBiometricVerified] = useState(false);
  const [isCheckingBiometric, setIsCheckingBiometric] = useState(true);

  const secretKeySetRef = useRef(false);

  useEffect(() => {
  if (Platform.OS === 'android') {
    SystemNavigationBar.navigationHide();
    SystemNavigationBar.stickyImmersive();
  }
}, []);


  useEffect(() => {
    if (!secretKeySetRef.current) {
      setSecretKey();
      secretKeySetRef.current = true;
    }
  }, []);

  useEffect(() => {
    const checkBiometric = async () => {
      try {
        const biometricEnabled = await AsyncStorage.getItem('biometricEnabled');
        const savedUser = await UserStorage.getUser();

        if (biometricEnabled === 'true' && savedUser) {
          const rnBiometrics = new ReactNativeBiometrics();
          const { success } = await rnBiometrics.simplePrompt({
            promptMessage: 'Unlock with Face ID / Fingerprint',
          });

          if (success) {
            setIsBiometricVerified(true);
          } else {
            setIsBiometricVerified(false);
            await UserStorage.deleteUser();
            await UserStorage.clearTokens?.();
            resetToLogin();
          }
        } else {
          setIsBiometricVerified(true);
        }
      } catch (e) {
        console.log('Biometric check failed:', e);
        setIsBiometricVerified(false);
        await UserStorage.deleteUser();
        await UserStorage.clearTokens?.();
        navigationRef.current?.dispatch(
          CommonActions.reset({ index: 0, routes: [{ name: 'Login' }] }),
        );
      } finally {
        setIsCheckingBiometric(false);
      }
    };

    checkBiometric();
  }, []);

  if (isCheckingBiometric) {
    return (
      <PaperProvider theme={theme} settings={{ icon: ({ name, size, color }) => <MaterialCommunityIcons name={name as string} size={size} color={color} /> }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#020617' }}>
          <ActivityIndicator size="large" color="#A855F7" />
        </View>
      </PaperProvider>
    );
  }

  return (
     <GestureHandlerRootView style={{ flex: 1 }}>
    <PaperProvider theme={theme} settings={{ icon: ({ name, size, color }) => <MaterialCommunityIcons name={name as string} size={size} color={color} /> }}>
      <AuthContext.Provider value={{ User, setUser }}>
          {isBiometricVerified ? (
            <NavigationContainer theme={NavigationTheme} ref={navigationRef}>
              <AuthNavigator />
            </NavigationContainer>
          ) : null}
      </AuthContext.Provider>
    </PaperProvider>
    </GestureHandlerRootView>
  );
};

export default App;