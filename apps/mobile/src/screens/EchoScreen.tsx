import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { SurvivalMonitor } from '../components';
import type { RootStackParamList } from '../types/navigation';

type EchoScreenRouteProp = RouteProp<RootStackParamList, 'Echo'>;

export default function EchoScreen() {
  const route = useRoute<EchoScreenRouteProp>();
  const { agentId } = route.params || {};

  return (
    <View style={styles.container}>
      <SurvivalMonitor 
        agentId={agentId || null}
        showHeader={true}
        compact={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
});
