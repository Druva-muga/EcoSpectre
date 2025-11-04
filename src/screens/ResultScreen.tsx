import React, { useState } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { ResultCard } from '../components/ResultCard';
import { useAuth } from '../store/auth';
import { api } from '../services/api';
import { localScans } from '../services/localScans';

type Props = NativeStackScreenProps<RootStackParamList, 'Result'>;

export const ResultScreen: React.FC<Props> = ({ route, navigation }) => {
  const { scanRecord } = route.params;
  const [isProcessing, setIsProcessing] = useState(false);
  const userId = useAuth(state => state.user?.id);

  const handleAction = async (action: 'consume' | 'reject') => {
    if (isProcessing) return;

    setIsProcessing(true);
    const decidedAction = action === 'consume' ? 'consumed' : 'rejected';

    // Optimistic local save; never block UI
    try {
      await localScans.add({
        context: scanRecord.context,
        score: scanRecord.score,
        action: decidedAction,
        timestamp: Date.now(),
        pending: true,
        userId: userId || 'local',
      });
    } catch {}

    // Navigate back immediately
    navigation.reset({ index: 0, routes: [{ name: 'Main' }] });

    // Best-effort network save in background
    try {
      await api.createScan(
        scanRecord.context,
        scanRecord.score,
        decidedAction
      );
      // Optionally could mark latest pending as synced; skipping id matching for simplicity
    } catch (e) {
      // Swallow; history still shows from local
      console.warn('[Result] Network save failed, kept locally');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!scanRecord) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ResultCard
        score={scanRecord.score}
        context={scanRecord.context}
        onAction={handleAction}
        disabled={isProcessing}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
  },
  center: {
    alignItems: 'center',
  },
});