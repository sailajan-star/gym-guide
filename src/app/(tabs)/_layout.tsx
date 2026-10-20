import {
  TAB_BAR_HEIGHT,
  TAB_BAR_SIDE_MARGIN,
  useKeyboardOpen,
  useTabBarOffset,
} from '@/constants/tab-bar';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { ColorValue } from 'react-native';
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
          fontSize: 11,
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

          borderRadius: 32,
          borderTopWidth: 0,

          shadowColor: '#000',
          shadowOpacity: 0.3,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 6 },
          elevation: 12,
        },

        tabBarBackground: () => (
          <BlurView
            intensity={30}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              borderRadius: 32,
              overflow: 'hidden',
            }}
          />
        ),
      }}
    >
      <Tabs.Screen
        name="plan"
        options={{ title: '', tabBarIcon: tabIcon('calendar', 'calendar-outline') }}
      />
      <Tabs.Screen
        name="progress"
        options={{ title: '', tabBarIcon: tabIcon('stats-chart', 'stats-chart-outline') }}
      />
      <Tabs.Screen
        name="index"
        options={{ title: '', headerShown: false, tabBarIcon: tabIcon('home', 'home-outline') }}
      />
      <Tabs.Screen
        name="coach"
        options={{ title: '', headerShown: false, tabBarIcon: tabIcon('chatbubble-ellipses', 'chatbubble-ellipses-outline') }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: '', tabBarIcon: tabIcon('settings', 'settings-outline') }}
      />
    </Tabs>
  );
}