import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { COLORS } from "@viking/shared";
import { View, Text, StyleSheet } from "react-native";

// Placeholder screens
const PlaceholderScreen = ({ title }: { title: string }) => (
  <View style={styles.placeholder}>
    <Text style={styles.placeholderText}>{title}</Text>
  </View>
);

const WorkoutListScreen = () => <PlaceholderScreen title="Workouts" />;
const NutritionScreen = () => <PlaceholderScreen title="Nutrition" />;
const ProgressScreen = () => <PlaceholderScreen title="Progress" />;
const DiscoverScreen = () => <PlaceholderScreen title="Discover" />;
const ProfileScreen = () => <PlaceholderScreen title="Profile" />;

const LoginScreen = () => <PlaceholderScreen title="Login" />;
const OnboardingScreen = () => <PlaceholderScreen title="Onboarding" />;

// Tab icon component
const TabIcon = ({ name, focused }: { name: string; focused: boolean }) => (
  <View
    style={[
      styles.tabIcon,
      focused && styles.tabIconActive,
    ]}
  >
    <Text style={[styles.tabIconText, focused && styles.tabIconTextActive]}>
      {name === "workouts"
        ? "💪"
        : name === "nutrition"
          ? "🥗"
          : name === "progress"
            ? "📈"
            : name === "discover"
              ? "🔍"
              : "👤"}
    </Text>
  </View>
);

// ─── Auth Stack ────────────────────────────────────────────
export type AuthStackParamList = {
  Login: undefined;
  Onboarding: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.bg.primary },
        animation: "slide_from_right",
      }}
    >
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Onboarding" component={OnboardingScreen} />
    </AuthStack.Navigator>
  );
}

// ─── Main Tabs ─────────────────────────────────────────────
export type MainTabParamList = {
  Workouts: undefined;
  Nutrition: undefined;
  Progress: undefined;
  Discover: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "rgba(18, 18, 20, 0.95)",
          borderTopColor: "rgba(255, 255, 255, 0.06)",
          borderTopWidth: 1,
          height: 85,
          paddingBottom: 20,
          paddingTop: 8,
        },
        tabBarActiveTintColor: COLORS.accent.primary,
        tabBarInactiveTintColor: COLORS.text.tertiary,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "500",
          letterSpacing: 0.3,
        },
        tabBarIcon: ({ focused }) => (
          <TabIcon name={route.name.toLowerCase()} focused={focused} />
        ),
      })}
    >
      <Tab.Screen
        name="Workouts"
        component={WorkoutListScreen}
        options={{ tabBarLabel: "Workouts" }}
      />
      <Tab.Screen
        name="Nutrition"
        component={NutritionScreen}
        options={{ tabBarLabel: "Nutrition" }}
      />
      <Tab.Screen
        name="Progress"
        component={ProgressScreen}
        options={{ tabBarLabel: "Progress" }}
      />
      <Tab.Screen
        name="Discover"
        component={DiscoverScreen}
        options={{ tabBarLabel: "Discover" }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: "Profile" }}
      />
    </Tab.Navigator>
  );
}

// ─── Root ──────────────────────────────────────────────────
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

const RootStack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  // TODO: Replace with actual auth state check
  const isAuthenticated = false;

  return (
    <RootStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.bg.primary },
      }}
    >
      {isAuthenticated ? (
        <RootStack.Screen name="Main" component={MainTabs} />
      ) : (
        <RootStack.Screen name="Auth" component={AuthNavigator} />
      )}
    </RootStack.Navigator>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    flex: 1,
    backgroundColor: COLORS.bg.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    color: COLORS.text.secondary,
    fontSize: 18,
    fontWeight: "600",
  },
  tabIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  tabIconActive: {
    backgroundColor: "rgba(0, 212, 170, 0.15)",
  },
  tabIconText: {
    fontSize: 16,
    opacity: 0.5,
  },
  tabIconTextActive: {
    opacity: 1,
  },
});
