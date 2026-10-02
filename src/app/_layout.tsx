import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AppThemeProvider, useTheme } from '@/constants/app-theme';

SplashScreen.preventAutoHideAsync();

function ThemedStack() {
  const { mode, palette } = useTheme();
  const base = mode === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: {
      ...base.colors,
      background: palette.background,
      card: palette.background,
      text: palette.text,
      border: palette.border,
      primary: palette.accent,
    },
  };

  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <AnimatedSplashOverlay />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: palette.background },
          headerTintColor: palette.text,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: palette.background },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Home', headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ title: 'Set up', headerBackTitle: 'Back' }} />
        <Stack.Screen name="plan" options={{ title: 'Your plan', headerBackTitle: 'Back' }} />
        <Stack.Screen name="workout" options={{ title: 'Workout', headerBackTitle: 'Back' }} />
        <Stack.Screen name="history" options={{ title: 'History', headerBackTitle: 'Back' }} />
        <Stack.Screen name="coach" options={{ title: 'Coach', headerBackTitle: 'Back' }} />
        <Stack.Screen name="explore" options={{ title: 'Explore' }} />
        <Stack.Screen name="progress" options={{ title: 'Progress', headerBackTitle: 'Back' }} />
        <Stack.Screen name="exercise" options={{ title: 'Exercise', headerBackTitle: 'Back' }} />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <ThemedStack />
    </AppThemeProvider>
  );
}