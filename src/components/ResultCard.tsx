import React from 'react';
import { StyleSheet, View, Text, Dimensions } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { ScoreGauge } from './ScoreGauge';
import { BreakdownBars } from './BreakdownBars';
import { SustainabilityScore, ScanContext } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const THRESHOLD = SCREEN_WIDTH * 0.3;

interface Props {
  score: SustainabilityScore;
  context: ScanContext;
  onAction: (action: 'consume' | 'reject') => void;
  disabled?: boolean;
}

const ResultCardComponent: React.FC<Props> = ({ 
  score, 
  context, 
  onAction,
  disabled = false 
}) => {
  const translateX = useSharedValue(0);
  const cardContext = useSharedValue({ height: 0 });

  const handleComplete = (action: 'consume' | 'reject') => {
    'worklet';
    runOnJS(onAction)(action);
  };

  const gesture = Gesture.Pan()
    .enabled(!disabled)
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

  const rStyle = useAnimatedStyle(() => {
    const rotate = `${(translateX.value / SCREEN_WIDTH) * 20}deg`;
    return {
      transform: [
        { translateX: translateX.value },
        { rotate },
      ],
    };
  });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.card, rStyle]}>
        <View style={styles.scoreContainer}>
          <ScoreGauge score={score.score} />
        </View>

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

        <View style={styles.swipeHint}>
          <Text style={styles.swipeText}>← Swipe left to reject</Text>
          <Text style={styles.swipeText}>Swipe right to consume →</Text>
        </View>
      </Animated.View>
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
  },
  scoreContainer: {
    alignItems: 'center',
    marginBottom: 20,
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
    marginTop: 20,
    paddingHorizontal: 10,
  },
  swipeText: {
    fontSize: 12,
    color: '#999',
  },
});