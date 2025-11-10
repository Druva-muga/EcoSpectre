import React, { useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Dimensions, Text, Animated } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { ResultCard } from '../components/ResultCard';
import { useAuth } from '../store/auth';
import { api } from '../services/api';
import { localScans } from '../services/localScans';

type Props = NativeStackScreenProps<RootStackParamList, 'Result'>;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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
    } catch (e) {
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

  const getScoreColor = (score: number) => {
    if (score >= 70) return '#4CAF50';
    if (score >= 40) return '#FF9800';
    return '#F44336';
  };

  const scoreColor = getScoreColor(scanRecord.score.score);

  return (
    <View style={styles.container}>
      <View style={styles.cardContainer}>
        <ResultCard
          score={scanRecord.score}
          context={scanRecord.context}
          onAction={handleAction}
          disabled={isProcessing}
        />
      </View>

      {isProcessing && (
        <View style={styles.processingOverlay}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.processingText}>Saving your decision...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  processingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});