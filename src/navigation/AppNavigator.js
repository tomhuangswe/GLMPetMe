// src/navigation/AppNavigator.js
import React from 'react';
import { Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import HomeScreen    from '../screens/HomeScreen';
import ChatScreen    from '../screens/ChatScreen';
import MemoryScreen  from '../screens/MemoryScreen';
import SettingsScreen from '../screens/SettingsScreen';
import VIPScreen     from '../screens/VIPScreen';
import { useApp }   from '../store/AppContext';
import { strings }  from '../i18n';

const Tab       = createBottomTabNavigator();
const HomeStack = createStackNavigator();

/**
 * Home 标签页内的嵌套 Stack。
 * Chat 屏幕放在这里，而不是外层 Stack。
 */
function HomeStackNavigator() {
  const { state } = useApp();
  const s = strings[state.language] || strings['en'];

  return (
    <HomeStack.Navigator>
      <HomeStack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <HomeStack.Screen name="Chat" component={ChatScreen} options={{ headerShown: false }} />
    </HomeStack.Navigator>
  );
}

function MainTabs() {
  const insets = useSafeAreaInsets();
  const { state } = useApp();
  const s = strings[state.language] || strings['en'];

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => {
          const icons = {
            HomeTab:  '🏠',
            Settings: '⚙️',
            Memory:   '📖',
            VIP:      '👑',
          };
          return (
            <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>
              {icons[route.name]}
            </Text>
          );
        },
        tabBarActiveTintColor:   '#6B5FE3',
        tabBarInactiveTintColor: '#9B97B8',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#F0EEFF',
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom + 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      })}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStackNavigator}
        options={{ title: s.tab_home }}
        listeners={({ navigation: tabNav }) => ({
          tabPress: (e) => {
            e.preventDefault();
            if (state.hasVisitedChat) {
              tabNav.navigate('HomeTab', { screen: 'Chat' });
            } else {
              tabNav.navigate('HomeTab', { screen: 'Home' });
            }
          },
        })}
      />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: s.tab_settings }} />
      <Tab.Screen name="Memory"   component={MemoryScreen}   options={{ title: s.tab_memory }} />
      <Tab.Screen name="VIP"      component={VIPScreen}      options={{ title: s.tab_vip || 'VIP' }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <MainTabs />
    </NavigationContainer>
  );
}
