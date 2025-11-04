import React, { useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useDerivedValue } from 'react-native-reanimated';

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
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Note: Avoid capturing non-worklet functions inside animated props

  useEffect(() => {
    progress.value = withTiming(score / 100, {
      duration,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
  }, [score]);

  const displayScore = useDerivedValue(() => {
    return Math.round(progress.value * 100);
  });

  const animatedProps = useAnimatedProps(() => {
    const strokeDashoffset = circumference * (1 - progress.value);
    const value = progress.value * 100;
    // Compute color inline inside the worklet to avoid capturing JS closures
    let color = '#F44336';
    if (value >= 80) {
      color = '#4CAF50';
    } else if (value >= 60) {
      color = '#8BC34A';
    } else if (value >= 40) {
      color = '#FFC107';
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
          animatedProps={animatedProps}
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
          {displayScore.value}
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