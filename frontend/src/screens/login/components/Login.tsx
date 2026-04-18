import React, { useContext, useEffect, useState } from 'react';
import {
  View,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  Image,
} from 'react-native';
import { TextInput, Text } from 'react-native-paper';
import NetInfo from '@react-native-community/netinfo';
import { CommonActions } from '@react-navigation/native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

import AuthContext from '../../../auth/user/UserContext';
import UserStorage from '../../../auth/user/UserStorage';
import { UserLoginResponse } from '../../user/models/UserLoginResponse';
import { setAuthHeaders, setSecretKey, clearAuthHeaders } from '../../../auth/api-client/api_client';
import api_Login from '../services/api_Login';
import LoaderKitView from 'react-native-loader-kit';
import AppText from '../../../components/Layout/AppText/AppText';
import { loginStyles } from './Loginstyles';
import GlassyErrorModal from '../../../shared/components/GlassyErrorModal';

const Login = ({ navigation }: any) => {
  const styles = loginStyles();

  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const authContext = useContext(AuthContext);

  const [errorMessage, setErrorMessage] = useState('');
  const [errorVisible, setErrorVisible] = useState(false);
  const [offline, setOffline] = useState(false);
  const [keyboardSpace, setKeyboardSpace] = useState(0);

  const showError = (message: string) => {
    const finalMessage = message?.trim() || 'Login failed';
    setErrorMessage(finalMessage);
    setErrorVisible(true);
  };

  const hideError = () => {
    setErrorVisible(false);
    setErrorMessage('');
  };

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const isOffline = !state.isConnected || state.isInternetReachable === false;
      setOffline(isOffline);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      e => setKeyboardSpace(e.endCoordinates?.height || 0),
    );

    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardSpace(0),
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const restoreUser = async () => {
    try {
      const creds = await UserStorage.getUser();
      if (!creds || !creds.username) return;

      const storedUser: UserLoginResponse = JSON.parse(creds.username);

      if (storedUser?.UserName) setUsername(storedUser.UserName);
      if (creds?.password) setPassword(creds.password);

      if (storedUser?.accessToken) {
        await setAuthHeaders(storedUser.accessToken);
        authContext?.setUser(storedUser);

        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'Drawer' }],
          }),
        );
      }
    } catch {
      await UserStorage.deleteUser();
    }
  };

  useEffect(() => {
    restoreUser();
  }, []);

  const handleSubmit = async (values: { username: string; password: string }) => {
    Keyboard.dismiss();
    hideError();

    if (offline) {
      showError("You’re offline. Please connect to the internet and try again.");
      return;
    }

    if (!values.username?.trim() || !values.password?.trim()) {
      showError('Username and Password are required!');
      return;
    }

    setLoading(true);

    try {
      setSecretKey();

      const response = await api_Login.getLogin(values.username.trim(), values.password);

      // Debug log - keep for now
      console.log('LOGIN RESPONSE =>', {
        ok: response.ok,
        status: response.status,
        problem: response.problem,
        data: response.data,
      });

      if (!response.ok) {
        // IMPORTANT: do NOT delete user here, it may trigger auth flows/navigation
        // await UserStorage.deleteUser();
        // authContext?.setUser(null);
        clearAuthHeaders();

        const res: any = response.data;
        const msg =
          res?.message ||
          res?.error ||
          res?.msg ||
          res?.detail ||
          (Array.isArray(res?.errors) ? res.errors.join(', ') : null) ||
          (typeof res === 'string' ? res : null) ||
          response.problem ||
          `Login failed (${response.status ?? 'unknown'})`;

        showError(msg);
        return;
      }

      const user = response.data as UserLoginResponse;

      if (!user?.token) {
        showError('Login succeeded but access token is missing.');
        return;
      }

      user.UserName = values.username.trim();
      user.Password = values.password;

      await setAuthHeaders(user.token);
      authContext?.setUser(user);
      await UserStorage.setUser(user);
      await UserStorage.setAccessToken(user.token);


      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Drawer' }],
        }),
      );
    } catch (e: any) {
      console.log('LOGIN EXCEPTION =>', e);

      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.response?.data?.msg ||
        e?.message ||
        'Unexpected error while logging in';

      showError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#07111F" />

      <KeyboardAvoidingView style={{ flex: 1 }}>
        <View style={styles.root}>
          <KeyboardAwareScrollView
            enableOnAndroid
            extraScrollHeight={Platform.OS === 'ios' ? 24 : 20}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: keyboardSpace }]}
          >
            <View style={styles.logoSection}>
              <Image
                source={require('../../../shared/assets/logo.png')}
                style={styles.nustLogo}
                resizeMode="contain"
              />
              <Text style={styles.portalTitle}>Qalam</Text>
              <Text style={styles.portalSubtitle}>
                Sign in with your institutional credentials
              </Text>
            </View>

            <View style={styles.kbWrapper}>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Welcome Back</Text>

                <TextInput
                  label="Username"
                  placeholder="Enter username"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={username}
                  onChangeText={setUsername}
                  style={styles.input}
                  mode="outlined"
                  outlineColor="#2A3A52"
                  activeOutlineColor="#2C7BE5"
                  textColor="#E5EDF8"
                  placeholderTextColor="#8FA1B8"
                  cursorColor="#8FB8FF"
                  returnKeyType="next"
                  theme={{ roundness: 12, colors: { background: '#111C2E' } }}
                />

                <TextInput
                  label="Password"
                  placeholder="Enter password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCorrect={false}
                  autoCapitalize="none"
                  textContentType="password"
                  autoComplete="password"
                  style={styles.input}
                  mode="outlined"
                  outlineColor="#2A3A52"
                  activeOutlineColor="#2C7BE5"
                  textColor="#E5EDF8"
                  placeholderTextColor="#8FA1B8"
                  cursorColor="#8FB8FF"
                  returnKeyType="done"
                  onSubmitEditing={() => handleSubmit({ username, password })}
                  theme={{ roundness: 12, colors: { background: '#111C2E' } }}
                  right={
                    <TextInput.Icon
                      icon={showPassword ? 'eye-off' : 'eye'}
                      iconColor="#AFC2DB"
                      onPress={() => setShowPassword(prev => !prev)}
                    />
                  }
                />

                {loading ? (
                  <View style={styles.loadingContainer}>
                    <LoaderKitView
                      style={{ width: 22, height: 22 }}
                      name={'BallSpinFadeLoader'}
                      animationSpeedMultiplier={1.0}
                      color={'#9EC1FF'}
                    />
                    <AppText style={styles.loadingText}>Signing in...</AppText>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() => handleSubmit({ username, password })}
                    style={styles.primaryButton}
                    activeOpacity={0.85}
                  >
                    <AppText style={styles.primaryButtonText}>Login</AppText>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </KeyboardAwareScrollView>

          <Text style={styles.footerText}>
            Developed By Syed Ali Asghar, Student of BS-AI(24) NUST
          </Text>
        </View>
      </KeyboardAvoidingView>

      <GlassyErrorModal
        visible={errorVisible}
        message={errorMessage}
        onClose={hideError}
      />
    </SafeAreaView>
  );
};

export default Login;