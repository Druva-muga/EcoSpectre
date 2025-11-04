import React from 'react';
import { View, StyleSheet, Text, Dimensions } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

interface ContributionDay {
  date: string;
  count: number;
  averageScore: number;
}

interface Props {
  data: ContributionDay[];
  numWeeks?: number;
}

const CELL_SIZE = 12;
const CELL_PADDING = 2;
const DAYS_IN_WEEK = 7;

export const Heatmap: React.FC<Props> = ({ data, numWeeks = 12 }) => {
  const screenWidth = Dimensions.get('window').width;
  const maxWeeks = Math.floor((screenWidth - 40) / (CELL_SIZE + CELL_PADDING));
  const weeks = Math.min(numWeeks, maxWeeks);

  // Generate grid data
  const getGridData = () => {
    const today = new Date();
    const endDate = new Date(today);
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - (weeks * 7));

    const grid: ContributionDay[][] = Array(DAYS_IN_WEEK).fill(0).map(() => []);
    const contributionsMap = new Map(
      data.map(day => [day.date, day])
    );

    for (let week = 0; week < weeks; week++) {
      for (let day = 0; day < DAYS_IN_WEEK; day++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + (week * 7) + day);
        const dateStr = date.toISOString().split('T')[0];
        
        const contribution = contributionsMap.get(dateStr) || {
          date: dateStr,
          count: 0,
          averageScore: 0
        };
        
        grid[day][week] = contribution;
      }
    }

    return grid;
  };

  const getHeatColor = (score: number) => {
    if (score === 0) return '#EBEDF0';
    if (score >= 80) return '#216E39';
    if (score >= 60) return '#30A14E';
    if (score >= 40) return '#40C463';
    return '#9BE9A8';
  };

  const gridData = getGridData();

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <View style={styles.container}>
      <View style={styles.legendContainer}>
        <Text style={styles.legendText}>Less</Text>
        {[0, 40, 60, 80, 100].map((score) => (
          <View
            key={score}
            style={[styles.legendBox, { backgroundColor: getHeatColor(score) }]}
          />
        ))}
        <Text style={styles.legendText}>More</Text>
      </View>

      <View style={styles.gridContainer}>
        <View style={styles.dayLabels}>
          {dayLabels.map((day, index) => (
            <Text key={day} style={[styles.dayLabel, { height: CELL_SIZE }]}>
              {index % 2 === 0 ? day : ''}
            </Text>
          ))}
        </View>

        <Svg
          width={weeks * (CELL_SIZE + CELL_PADDING)}
          height={DAYS_IN_WEEK * (CELL_SIZE + CELL_PADDING)}
        >
          {gridData.map((week, dayIndex) =>
            week.map((day, weekIndex) => (
              <Rect
                key={`${dayIndex}-${weekIndex}`}
                x={weekIndex * (CELL_SIZE + CELL_PADDING)}
                y={dayIndex * (CELL_SIZE + CELL_PADDING)}
                width={CELL_SIZE}
                height={CELL_SIZE}
                fill={getHeatColor(day.averageScore)}
                rx={2}
              />
            ))
          )}
        </Svg>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  gridContainer: {
    flexDirection: 'row',
    marginTop: 8,
  },
  dayLabels: {
    marginRight: 4,
  },
  dayLabel: {
    fontSize: 10,
    color: '#666',
    marginRight: 4,
    textAlign: 'right',
    width: 30,
  },
  legendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  legendBox: {
    width: 12,
    height: 12,
    marginHorizontal: 4,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
    marginHorizontal: 8,
  },
});