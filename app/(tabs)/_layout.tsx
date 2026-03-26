import { Tabs } from 'expo-router';
import { Text, View, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { useAuthStore } from '../../store/authStore';

interface TabIconProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  focused: boolean;
  isBusiness?: boolean;
}

function TabIcon({ icon, label, focused, isBusiness }: TabIconProps) {
  const activeColor = isBusiness ? Colors.business : Colors.primary;
  return (
    <View style={styles.tabItem}>
      <Ionicons 
        name={icon} 
        size={22} 
        color={focused ? activeColor : Colors.textMuted} 
      />
      <Text
        style={[
          styles.tabLabel, 
          focused && { color: activeColor, fontWeight: '700' }
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

export default function TabLayout() {
  const { profile } = useAuthStore();
  const isBusinessMode = profile?.app_mode === 'business';

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
        tabBarActiveTintColor: isBusinessMode ? Colors.business : Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: isBusinessMode ? 'Business Overview' : 'Dashboard',
          tabBarIcon: ({ focused }) => (
            <TabIcon
              icon={focused ? (isBusinessMode ? 'bar-chart' : 'home') : (isBusinessMode ? 'bar-chart-outline' : 'home-outline')}
              label={isBusinessMode ? 'Overview' : 'Home'}
              focused={focused}
              isBusiness={isBusinessMode}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: isBusinessMode ? 'Business Ledger' : 'Transactions',
          tabBarIcon: ({ focused }) => (
            <TabIcon
              icon={focused ? (isBusinessMode ? 'receipt' : 'swap-vertical') : (isBusinessMode ? 'receipt-outline' : 'swap-vertical-outline')}
              label={isBusinessMode ? 'Ledger' : 'Tx'}
              focused={focused}
              isBusiness={isBusinessMode}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: isBusinessMode ? 'Business Reports' : 'Analytics',
          href: isBusinessMode ? '/(tabs)/analytics' : '/(tabs)/analytics',
          tabBarIcon: ({ focused }) => (
            <TabIcon
              icon={focused ? (isBusinessMode ? 'trending-up' : 'pie-chart') : (isBusinessMode ? 'trending-up-outline' : 'pie-chart-outline')}
              label={isBusinessMode ? 'Reports' : 'Data'}
              focused={focused}
              isBusiness={isBusinessMode}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="customers"
        options={{
          title: 'Customers',
          href: isBusinessMode ? '/(tabs)/customers' : null,
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={focused ? 'people' : 'people-outline'} label="Clients" focused={focused} isBusiness={isBusinessMode} />
          ),
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: isBusinessMode ? 'Record Transaction' : 'Add Expense',
          tabBarIcon: ({ focused }) => (
            <View style={styles.addButtonContainer}>
              <View style={[
                styles.addButton,
                isBusinessMode && { backgroundColor: Colors.business, shadowColor: Colors.business }
              ]}>
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
          href: !isBusinessMode ? '/(tabs)/budgets' : null,
          tabBarIcon: ({ focused }) => (
            <TabIcon
              icon={focused ? 'wallet' : 'wallet-outline'}
              label="Budget"
              focused={focused}
              isBusiness={false}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="invoices"
        options={{
          title: 'Invoices',
          href: isBusinessMode ? '/(tabs)/invoices' : null,
          tabBarIcon: ({ focused }) => (
            <TabIcon
              icon={focused ? 'briefcase' : 'briefcase-outline'}
              label="Invoices"
              focused={focused}
              isBusiness={true}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={focused ? 'grid' : 'grid-outline'} label="More" focused={focused} isBusiness={isBusinessMode} />
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
