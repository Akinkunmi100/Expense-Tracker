import { Tabs } from 'expo-router';
import { Text, View, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';

interface TabIconProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  focused: boolean;
}

function TabIcon({ icon, label, focused }: TabIconProps) {
  return (
    <View style={styles.tabItem}>
      <Ionicons 
        name={icon} 
        size={22} 
        color={focused ? Colors.primary : Colors.textMuted} 
      />
      <Text
        style={[styles.tabLabel, focused && styles.tabLabelActive]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.background,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 0,
        },
        headerTintColor: Colors.textPrimary,
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 20,
          letterSpacing: -0.5,
        },
        tabBarStyle: {
          position: 'absolute',
          borderTopWidth: 1,
          borderTopColor: Colors.border,
          elevation: 0,
          height: Platform.OS === 'ios' ? 88 : 70,
          backgroundColor: 'transparent',
        },
        tabBarBackground: () => (
          <BlurView
            tint="dark"
            intensity={60}
            style={StyleSheet.absoluteFill}
          />
        ),
        tabBarShowLabel: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={focused ? "home" : "home-outline"} label="Home" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'Transactions',
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={focused ? "swap-vertical" : "swap-vertical-outline"} label="Tx" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Analytics',
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={focused ? "pie-chart" : "pie-chart-outline"} label="Data" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: 'Add Expense',
          tabBarIcon: ({ focused }) => (
            <View style={styles.addButtonContainer}>
              <View style={styles.addButton}>
                <Ionicons name="add" size={28} color={Colors.white} />
              </View>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="budgets"
        options={{
          title: 'Budgets',
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={focused ? "wallet" : "wallet-outline"} label="Budget" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={focused ? "grid" : "grid-outline"} label="More" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingTop: Platform.OS === 'ios' ? 12 : 8,
  },
  tabLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  tabLabelActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  addButtonContainer: {
    top: -15, // Lift the button up out of the glass bar
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 4,
    borderColor: '#0A0A0B', // Cuts into the tab bar like the obsidian background
  },
});
