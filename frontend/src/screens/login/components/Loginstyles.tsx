import { StyleSheet } from 'react-native';

export const loginStyles = () =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: '#07111F',
    },
    root: {
      flex: 1,
      backgroundColor: '#07111F',
    },
    scrollContent: {
      flexGrow: 0.8,
      justifyContent: 'center',
      paddingHorizontal: 10,
      paddingTop: 1,
      paddingBottom: 12,
    },
    logoSection: {
      alignItems: 'center',
      marginBottom: 18,
    },
    nustLogo: {
      width: 120,
      height: 120,
      marginBottom: 10,
    },
    qalamLogo: {
      width: 170,
      height: 42,
      marginBottom: 10,
    },
    portalTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: '#DCE7F9',
      letterSpacing: 0.2,
    },
    portalSubtitle: {
      marginTop: 6,
      fontSize: 12,
      color: '#93A7C3',
      textAlign: 'center',
    },
    kbWrapper: {
      width: '100%',
    },
    card: {
      backgroundColor: '#0E1726',
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: '#1F2E45',
    },
    cardTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: '#F2F7FF',
      marginBottom: 14,
      textAlign: "center"
    },
    input: {
      backgroundColor: '#111C2E',
      marginBottom: 12,
    },
    primaryButton: {
      marginTop: 4,
      backgroundColor: '#1F6FEB',
      borderRadius: 12,
      height: 48,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryButtonText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '700',
      letterSpacing: 0.2,
    },
    loadingContainer: {
      marginTop: 4,
      height: 48,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#2A3A52',
      backgroundColor: '#132238',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    loadingText: {
      color: '#C6DAFF',
      fontSize: 14,
      fontWeight: '600',
    },
    link: {
      marginTop: 14,
      fontSize: 13,
      fontWeight: '600',
      color: '#8FB8FF',
      textAlign: 'right',
    },
    registerRow: {
      marginTop: 12,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
    },
    registerText: {
      fontSize: 13,
      color: '#9CB0CB',
    },
    registerLink: {
      fontSize: 13,
      fontWeight: '700',
      color: '#8FB8FF',
    },
    footerText: {
      textAlign: 'center',
      fontSize: 11,
      color: '#7087A7',
      paddingHorizontal: 24,
      paddingBottom: 10,
    },
  });