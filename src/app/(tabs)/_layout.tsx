import {
  TAB_BAR_HEIGHT,
  TAB_BAR_SIDE_MARGIN,
  useKeyboardOpen,
  useTabBarOffset,
} from '@/constants/tab-bar';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { ColorValue } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
type IconName = React.ComponentProps<typeof Ionicons>['name'];

function tabIcon(filled: IconName, outline: IconName) {
  return ({ color, size, focused }: { color: ColorValue; size: number; focused: boolean }) => (
    <Ionicons name={focused ? filled : outline} size={size} color={color} />
  );
}

export default function TabsLayout() {
  //const { palette } = useTheme();
  const offset = useTabBarOffset();
  const kbOpen = useKeyboardOpen();

  return (
    <Tabs
      screenOptions={{
        headerShadowVisible: false,

        tabBarLabelStyle: {
          fontSize: 0,
          fontWeight: '600',
          marginBottom: 6,
        },

        tabBarItemStyle: {
          paddingTop: 12,
        },

        tabBarStyle: {
          display: kbOpen ? 'none' : 'flex',

          position: 'absolute',
          left: TAB_BAR_SIDE_MARGIN,
          right: TAB_BAR_SIDE_MARGIN,
          marginHorizontal: TAB_BAR_SIDE_MARGIN,
          bottom: offset - 15,

          height: TAB_BAR_HEIGHT,
          paddingTop: 0,
          paddingBottom: 0,

          backgroundColor: 'transparent',
          borderRadius: 32,
          borderTopWidth: 0,
          overflow: 'visible',

          shadowColor: '#000',
          shadowOpacity: 0.28,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: 8 },
          elevation: 14,
        },

        tabBarBackground: () => (
          <View
            pointerEvents="none"
            style={{
              flex: 1,
              borderRadius: 32,
              overflow: 'hidden',
              backgroundColor: 'rgba(18,18,23,0.28)',
              borderWidth: 0.3,
              borderColor: 'rgba(255,255,255,0.20)',
            }}
          >
            {/* Stronger glass blur */}
            <BlurView
              intensity={30}
              
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
              }}
            />

            {/* Reflective glass surface */}
            <LinearGradient
              colors={[
                'rgba(255, 255, 255, 0.09)',
                'rgba(255,255,255,0.07)',
                'rgba(255,255,255,0.015)',
                'rgba(0,0,0,0.12)',
              ]}
              locations={[0, 0.22, 0.62, 1]}
              start={{ x: 0.15, y: 0 }}
              end={{ x: 0.85, y: 1 }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
              }}
            />

            {/* Fine highlight around the upper edge */}
            <LinearGradient
              colors={[
                'rgba(255, 255, 255, 0.07)',
                'rgba(255, 255, 255, 0.02)',
                'rgba(255,255,255,0.00)',
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={{
                position: 'absolute',
                top: 0,
                left: 1,
                right: 1,
                height: 24,
                borderTopLeftRadius: 31,
                borderTopRightRadius: 31,
              }}
            />

            {/* Subtle lower rim */}
            <View
              style={{
                position: 'absolute',
                bottom: 0,
                left: 16,
                right: 16,
                height: 1,
                backgroundColor: 'rgba(255, 255, 255, 0.01)',
              }}
            />
          </View>
        ),
      }}
    >
      <Tabs.Screen
        name="plan"
        options={{ title: 'Plan', tabBarIcon: tabIcon('calendar', 'calendar-outline') }}
      />
      <Tabs.Screen
        name="progress"
        options={{ title: 'Progess', tabBarIcon: tabIcon('stats-chart', 'stats-chart-outline') }}
      />
      <Tabs.Screen
        name="index"
        options={{ title: '', headerShown: false, tabBarIcon: tabIcon('home', 'home-outline') }}
      />
      <Tabs.Screen
        name="coach"
        options={{ title: 'Coach', tabBarIcon: tabIcon('chatbubble-ellipses', 'chatbubble-ellipses-outline') }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: 'Settings', tabBarIcon: tabIcon('settings', 'settings-outline') }}
      />
    </Tabs>
  );
}