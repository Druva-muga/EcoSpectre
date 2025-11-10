import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
  Easing,
  useDerivedValue,
  runOnJS,
} from 'react-native-reanimated';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface Props {
  score: number;
  size?: number;
  strokeWidth?: number;
  duration?: number;
}

const ScoreGaugeComponent: React.FC<Props> = ({
  score,
  size = 200,
  strokeWidth = 15,
  duration = 1500,
}) => {
  const progress = useSharedValue(0);
  const [displayScore, setDisplayScore] = React.useState(0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    // Normalize score for the progress animation (0-1)
    const normalizedScore = Math.min(Math.max(score, 0), 100) / 100;
    progress.value = withTiming(normalizedScore, {
      duration,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
  }, [score, duration]);

  // Update display score on the JS thread
  useDerivedValue(() => {
    const currentScore = Math.round(progress.value * 100);
    runOnJS(setDisplayScore)(currentScore);
  });

  const animatedCircleProps = useAnimatedProps(() => {
    const strokeDashoffset = circumference * (1 - progress.value);
    const currentScore = Math.round(progress.value * 100);
    
    // Color transitions based on score ranges
    let color = '#F44336'; // Default red for poor scores
    if (currentScore >= 80) {
      color = '#4CAF50'; // Green for excellent
    } else if (currentScore >= 60) {
      color = '#8BC34A'; // Light green for good
    } else if (currentScore >= 40) {
      color = '#FFC107'; // Yellow/amber for moderate
    } else if (currentScore >= 20) {
      color = '#FF9800'; // Orange for poor
    }
    
    return {
      strokeDashoffset,
      stroke: color,
    };
  });

  return (
    <View style={styles.container}>
      <Svg width={size} height={size} style={styles.svg}>
        {/* Background circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E0E0E0"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Animated progress circle */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeLinecap="round"
          animatedProps={animatedCircleProps}
          transform={`rotate(-90, ${size / 2}, ${size / 2})`}
        />
        {/* Score text */}
        <SvgText
          x={size / 2}
          y={size / 2}
          fontSize="40"
          fontWeight="bold"
          fill="#333"
          textAnchor="middle"
          alignmentBaseline="middle"
        >
          {displayScore}
        </SvgText>
      </Svg>
    </View>
  );
};

export const ScoreGauge = React.memo(ScoreGaugeComponent);
ScoreGauge.displayName = 'ScoreGauge';

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: {
    transform: [{ rotateZ: '0deg' }],
  },
});