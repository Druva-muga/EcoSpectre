import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Text, ActivityIndicator } from 'react-native';
import { api } from '../services/api';
import { ScanRecord } from '../types';
import { ResultCard } from '../components/ResultCard';
import { Heatmap } from '../components/Heatmap';
import { MetricsCard } from '../components/MetricsCard';
import { StatusBar } from 'expo-status-bar';
import { localScans } from '../services/localScans';
import { useAuth } from '../store/auth';

export const HistoryScreen: React.FC = () => {
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const userId = useAuth(state => state.user?.id);

  useEffect(() => {
    loadScans();
  }, []);

  const loadScans = async () => {
    try {
      setIsLoading(true);
      setError(null);
      // Local first (filtered by userId if authenticated)
      const local = await localScans.getAll(userId);
      setScans(local as unknown as ScanRecord[]);
      // Best-effort remote merge
      api.getScans()
        .then(remote => {
          if (!Array.isArray(remote)) return;
          // Merge: prefer local first, append remote not present by timestamp/id
          const existingIds = new Set(local.map(s => s.id));
          const merged = [...local, ...remote.filter(r => !existingIds.has(r.id))];
          setScans(merged);
        })
        .catch(() => {});
    } catch (err) {
      setError('Failed to load scan history. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateMetrics = () => {
    if (scans.length === 0) return {
      totalScans: 0,
      averageScore: 0,
      sustainableChoices: 0,
      improvementRate: 0,
    };

    const totalScans = scans.length;
    const averageScore = scans.reduce((sum, scan) => sum + scan.score.score, 0) / totalScans;
    const sustainableChoices = scans.filter(scan => scan.score.score >= 70).length;
    
    // Calculate improvement rate based on last 5 scans vs previous 5
    const recentScans = scans.slice(0, 5);
    const previousScans = scans.slice(5, 10);
    
    const recentAvg = recentScans.length > 0
      ? recentScans.reduce((sum, scan) => sum + scan.score.score, 0) / recentScans.length
      : 0;
    
    const previousAvg = previousScans.length > 0
      ? previousScans.reduce((sum, scan) => sum + scan.score.score, 0) / previousScans.length
      : recentAvg;

    const improvementRate = previousAvg === 0 
      ? 0 
      : Math.round(((recentAvg - previousAvg) / previousAvg) * 100);

    return {
      totalScans,
      averageScore,
      sustainableChoices,
      improvementRate,
    };
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  const metrics = calculateMetrics();

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <FlatList
        data={scans}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ResultCard
            score={item.score}
            context={item.context}
            onAction={(action) => {}} // No action needed in history view
            disabled={true}
            action={item.action}
          />
        )}
        ListHeaderComponent={() => (
          <>
            <Text style={styles.title}>Scan History</Text>
            <MetricsCard {...metrics} />
            <Heatmap 
              data={scans.map(scan => ({
                date: new Date(scan.timestamp).toISOString().split('T')[0],
                count: 1,
                averageScore: scan.score.score
              }))}
            />
          </>
        )}
        contentContainerStyle={styles.content}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 40,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  errorText: {
    color: '#f44336',
    textAlign: 'center',
    marginHorizontal: 20,
  },
});