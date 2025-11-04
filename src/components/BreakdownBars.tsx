import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';

interface BreakdownBarProps {
  label: string;
  value: number;
  index: number;
}

const BreakdownBar: React.FC<BreakdownBarProps> = ({ label, value, index }) => {
  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: withSpring(`${value}%`, {
        mass: 1,
        damping: 15,
        stiffness: 100,
      }),
      opacity: withTiming(1, {
        duration: 500 + index * 100,
      }),
      transform: [
        {
          translateY: withSpring(0, {
            mass: 1,
            damping: 15,
            stiffness: 100,
          }),
        },
      ],
    };
  });

  return (
    <View style={styles.barContainer}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.barBackground}>
        <Animated.View
          style={[
            styles.barFill,
            animatedStyle,
            { backgroundColor: getBarColor(value) },
          ]}
        />
        <Text style={styles.barValue}>{value}%</Text>
      </View>
    </View>
  );
};

interface Props {
  breakdown: {
    materials: number;
    packaging: number;
    certifications: number;
    category_baseline: number;
  };
}

const BreakdownBarsComponent: React.FC<Props> = ({ breakdown }) => {
  const items = [
    { label: 'Materials', value: breakdown.materials },
    { label: 'Packaging', value: breakdown.packaging },
    { label: 'Certifications', value: breakdown.certifications },
    { label: 'Category Baseline', value: breakdown.category_baseline },
  ];

  return (
    <View style={styles.container}>
      {items.map((item, index) => (
        <BreakdownBar
          key={item.label}
          label={item.label}
          value={item.value}
          index={index}
        />
      ))}
    </View>
  );
};

export const BreakdownBars = React.memo(BreakdownBarsComponent);
BreakdownBars.displayName = 'BreakdownBars';

const getBarColor = (value: number) => {
  if (value >= 80) return '#4CAF50';
  if (value >= 60) return '#8BC34A';
  if (value >= 40) return '#FFC107';
  return '#F44336';
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 16,
    gap: 12,
  },
  barContainer: {
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  barBackground: {
    height: 24,
    backgroundColor: '#E0E0E0',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  barFill: {
    height: '100%',
    borderRadius: 12,
    position: 'absolute',
    left: 0,
    top: 0,
  },
  barValue: {
    position: 'absolute',
    right: 8,
    top: 0,
    bottom: 0,
    textAlignVertical: 'center',
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
  },
});