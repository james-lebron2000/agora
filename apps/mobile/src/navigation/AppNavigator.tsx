import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { View, ActivityIndicator } from 'react-native';

// Screens
import HomeScreen from '../screens/HomeScreen';
import AgentsScreen from '../screens/AgentsScreen';
import AgentDetailScreen from '../screens/AgentDetailScreen';
import ProfileScreen from '../screens/ProfileScreen';
import WalletScreen from '../screens/WalletScreen';
import BridgeScreen from '../screens/BridgeScreen';
import TaskPostScreen from '../screens/TaskPostScreen';
import TaskDetailScreen from '../screens/TaskDetailScreen';
import ConnectWalletScreen from '../screens/ConnectWalletScreen';
import EchoScreen from '../screens/EchoScreen';
import PerformanceScreen from '../screens/PerformanceScreen';

// Hooks
import { useWalletStore } from '../store/walletStore';

// Types
import type { RootStackParamList, MainTabParamList } from '../types/navigation';

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Agents') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else if (route.name === 'Wallet') {
            iconName = focused ? 'wallet' : 'wallet-outline';
          } else if (route.name === 'Bridge') {
            iconName = focused ? 'swap-horizontal' : 'swap-horizontal-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: 'gray',
        headerShown: true,
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{ title: 'Agora' }}
      />
      <Tab.Screen 
        name="Agents" 
        component={AgentsScreen}
        options={{ title: 'Agents' }}
      />
      <Tab.Screen 
        name="Bridge" 
        component={BridgeScreen}
        options={{ title: 'Bridge' }}
      />
      <Tab.Screen 
        name="Wallet" 
        component={WalletScreen}
        options={{ title: 'My Wallet' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { isConnected, isLoading } = useWalletStore();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        {!isConnected ? (
          <Stack.Screen 
            name="ConnectWallet" 
            component={ConnectWalletScreen}
            options={{ headerShown: false }}
          />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen 
              name="AgentDetail" 
              component={AgentDetailScreen}
              options={{ 
                headerShown: true,
                title: 'Agent Details',
                presentation: 'modal'
              }}
            />
            <Stack.Screen 
              name="TaskPost" 
              component={TaskPostScreen}
              options={{ 
                headerShown: true,
                title: 'Post Task',
                presentation: 'modal'
              }}
            />
            <Stack.Screen 
              name="TaskDetail" 
              component={TaskDetailScreen}
              options={{ 
                headerShown: true,
                title: 'Task Details',
                presentation: 'modal'
              }}
            />
            <Stack.Screen 
              name="Bridge" 
              component={BridgeScreen}
              options={{ 
                headerShown: true,
                title: 'Bridge',
                presentation: 'modal'
              }}
            />
            <Stack.Screen 
              name="Echo" 
              component={EchoScreen}
              options={{ 
                headerShown: true,
                title: 'Echo Survival',
                presentation: 'modal'
              }}
            />
            <Stack.Screen 
              name="Performance" 
              component={PerformanceScreen}
              options={{ 
                headerShown: true,
                title: 'Performance',
                presentation: 'modal'
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
