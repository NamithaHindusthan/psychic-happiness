import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

type IconName = keyof typeof Ionicons.glyphMap;

function TabIcon({ active, inactive, focused, color, size }: {
  active: IconName;
  inactive: IconName;
  focused: boolean;
  color: ColorValue;
  size: number;
}) {
  return <Ionicons name={focused ? active : inactive} size={size} color={color as string} />;
}

export default function AppLayout() {
  const { colors } = useTheme();
  const { isAdmin } = useAuth();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: (p) => <TabIcon active="home" inactive="home-outline" {...p} /> }} />
      <Tabs.Screen
        name="people"
        options={{
          title: 'People',
          tabBarIcon: (p) => <TabIcon active="people" inactive="people-outline" {...p} />,
          href: isAdmin ? undefined : null,
        }}
      />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: (p) => <TabIcon active="person" inactive="person-outline" {...p} /> }} />
    </Tabs>
  );
}
