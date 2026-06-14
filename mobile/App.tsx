import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from './lib/supabase';
import AuthScreen from './screens/AuthScreen';
import PetScreen from './screens/PetScreen';
import StatsScreen from './screens/StatsScreen';
import SocialScreen from './screens/SocialScreen';
import ShopScreen from './screens/ShopScreen';
import { Profile } from './lib/petEngine';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: any;
          if (route.name === 'Pet') iconName = focused ? 'bug' : 'bug-outline';
          else if (route.name === 'Stats') iconName = focused ? 'stats-chart' : 'stats-chart-outline';
          else if (route.name === 'Social') iconName = focused ? 'people' : 'people-outline';
          else if (route.name === 'Shop') iconName = focused ? 'cart' : 'cart-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#7c3aed',
        tabBarInactiveTintColor: '#64748b',
        tabBarStyle: { backgroundColor: '#0f0f1a', borderTopColor: 'rgba(255,255,255,0.1)' },
        headerStyle: { backgroundColor: '#0f0f1a' },
        headerTintColor: '#f8fafc',
      })}
    >
      <Tab.Screen name="Pet" component={PetScreen} options={{ title: 'My Pet' }} />
      <Tab.Screen name="Stats" component={StatsScreen} />
      <Tab.Screen name="Social" component={SocialScreen} />
      <Tab.Screen name="Shop" component={ShopScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f0f1a' }}>
        <ActivityIndicator size="large" color="#7c3aed" />
        <Text style={{ color: '#94a3b8', marginTop: 12 }}>Loading DevPet...</Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {user ? (
            <Stack.Screen name="Main" component={MainTabs} />
          ) : (
            <Stack.Screen name="Auth" component={AuthScreen} />
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}
