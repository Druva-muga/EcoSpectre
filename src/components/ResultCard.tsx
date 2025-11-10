import React, { useState } from 'react';
import { StyleSheet, View, Text, Dimensions, ScrollView, Pressable } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
  Extrapolate,
  runOnJS,
} from 'react-native-reanimated';
import { ScoreGauge } from './ScoreGauge';
import { BreakdownBars } from './BreakdownBars';
import { SustainabilityScore, ScanContext } from '../types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const THRESHOLD = SCREEN_WIDTH * 0.3;

interface Props {
  score: SustainabilityScore;
  context: ScanContext;
  onAction: (action: 'consume' | 'reject') => void;
  disabled?: boolean;
  action?: 'rejected' | 'consumed';
}

const ResultCardComponent: React.FC<Props> = ({ 
  score, 
  context, 
  onAction,
  disabled = false,
  action
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const translateX = useSharedValue(0);
  const scale = useSharedValue(1);
  const expandProgress = useSharedValue(0);

  const handleComplete = (action: 'consume' | 'reject') => {
    'worklet';
    runOnJS(onAction)(action);
  };

  const toggleExpand = () => {
    const newValue = !isExpanded;
    setIsExpanded(newValue);
    expandProgress.value = withTiming(newValue ? 1 : 0, { duration: 300 });
    scale.value = withSpring(newValue ? 1.02 : 1);
  };

  const pan = Gesture.Pan()
    .enabled(!disabled)
    .activeOffsetX([-20, 20])
    .onUpdate((event) => {
      translateX.value = event.translationX;
    })
    .onEnd((event) => {
      if (event.velocityX > 500 || translateX.value > THRESHOLD) {
        translateX.value = withSpring(SCREEN_WIDTH, {}, () => {
          handleComplete('consume');
        });
      } else if (event.velocityX < -500 || translateX.value < -THRESHOLD) {
        translateX.value = withSpring(-SCREEN_WIDTH, {}, () => {
          handleComplete('reject');
        });
      } else {
        translateX.value = withSpring(0);
      }
    });

  const vertical = Gesture.Pan()
    .enabled(!disabled)
    .activeOffsetY([-5, 5]);

  const rStyle = useAnimatedStyle(() => {
    const rotate = `${(translateX.value / SCREEN_WIDTH) * 20}deg`;
    const borderRadius = interpolate(
      expandProgress.value,
      [0, 1],
      [20, 0],
      Extrapolate.CLAMP
    );
    const marginHorizontal = interpolate(
      expandProgress.value,
      [0, 1],
      [20, 0],
      Extrapolate.CLAMP
    );
    const marginVertical = interpolate(
      expandProgress.value,
      [0, 1],
      [10, 0],
      Extrapolate.CLAMP
    );
    const height = interpolate(
      expandProgress.value,
      [0, 1],
      [SCREEN_HEIGHT * 0.75, SCREEN_HEIGHT],
      Extrapolate.CLAMP
    );

    return {
      transform: [
        { translateX: translateX.value },
        { rotate },
        { scale: scale.value }
      ],
      borderRadius,
      marginHorizontal,
      marginVertical,
      height,
    };
  });

  const gesture = Gesture.Race(pan, vertical);

  return (
    <GestureDetector gesture={gesture}>
      <Pressable onPress={toggleExpand}>
        <Animated.View style={[styles.card, rStyle]}>
          {action && (
            <View style={[
              styles.actionBadge,
              { backgroundColor: action === 'consumed' ? '#4CAF50' : '#F44336' }
            ]}>
              <Text style={styles.actionText}>
                {action === 'consumed' ? 'Accepted' : 'Rejected'}
              </Text>
            </View>
          )}

          <View style={styles.scoreContainer}>
            <ScoreGauge score={score ? score.score : 0} />
          </View>

          <ScrollView 
            style={styles.content}
            showsVerticalScrollIndicator={false}
            bounces={isExpanded}
            scrollEnabled={isExpanded}
          >
            <View style={styles.breakdownContainer}>
              <Text style={styles.sectionTitle}>Score Breakdown</Text>
              <BreakdownBars breakdown={score.breakdown} />
            </View>

            <View style={styles.contextContainer}>
              <Text style={styles.sectionTitle}>Product Analysis</Text>
              <Text style={styles.contextText}>
                <Text style={styles.label}>Brand: </Text>
                {context.brand_text || 'Unknown'}
              </Text>
              <Text style={styles.contextText}>
                <Text style={styles.label}>Type: </Text>
                {context.packaging_type}
              </Text>
              <Text style={styles.contextText}>
                <Text style={styles.label}>Material: </Text>
                {context.material_hints}
              </Text>
            </View>

            <View style={styles.factorsContainer}>
              <Text style={styles.sectionTitle}>Key Factors</Text>
              {score.top_factors.map((factor, index) => (
                <View
                  key={index}
                  style={[
                    styles.factor,
                    { borderColor: factor.impact === 'positive' ? '#4CAF50' : '#F44336' },
                  ]}
                >
                  <Text style={styles.factorTitle}>{factor.factor}</Text>
                  <Text style={styles.factorExplanation}>{factor.explanation}</Text>
                </View>
              ))}
            </View>

            <View style={styles.footer}>
              <Text style={styles.suggestion}>{score.suggestion}</Text>
              <Text style={styles.disposal}>{score.disposal}</Text>
            </View>
          </ScrollView>

          {!disabled && !action && (
            <View style={styles.swipeHint}>
              <Text style={styles.swipeText}>← Reject</Text>
              <Text style={styles.swipeText}>Accept →</Text>
            </View>
          )}
        </Animated.View>
      </Pressable>
    </GestureDetector>
  );
};

export const ResultCard = React.memo(ResultCardComponent);
ResultCard.displayName = 'ResultCard';

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 20,
    marginVertical: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    height: 500,
    overflow: 'hidden',
  },
  actionBadge: {
    position: 'absolute',
    top: 15,
    right: 15,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    zIndex: 1,
  },
  actionText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 13,
  },
  scoreContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  content: {
    flex: 1,
  },
  breakdownContainer: {
    marginBottom: 20,
  },
  contextContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  contextText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  label: {
    fontWeight: 'bold',
    color: '#333',
  },
  factorsContainer: {
    marginBottom: 20,
  },
  factor: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  factorTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  factorExplanation: {
    fontSize: 14,
    color: '#666',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 15,
    marginTop: 10,
  },
  suggestion: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  disposal: {
    fontSize: 14,
    color: '#666',
  },
  swipeHint: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 12,
    paddingHorizontal: 5,
    marginTop: 15,
  },
  swipeText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
});