import React, { memo } from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions } from 'react-native';
import Svg, { Rect, Text as SvgText, Line, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_HEIGHT = 200;
const CHART_PADDING = 40;

interface SpendingChartProps {
  chartData: { label: string; amount: number }[];
  maxAmount: number;
  period: string;
}

const SpendingChart = ({ chartData, maxAmount, period }: SpendingChartProps) => {
  const chartWidth = Math.max(SCREEN_WIDTH - 48, 300);
  const barAreaWidth = chartWidth - CHART_PADDING;
  const barCount = chartData.length;
  const barGap = 4;
  const barWidth = Math.max(4, Math.min(28, (barAreaWidth - barGap * barCount) / (barCount || 1)));
  const totalBarsWidth = barCount * (barWidth + barGap);
  const chartStartX = CHART_PADDING + (barAreaWidth - totalBarsWidth) / 2;

  if (chartData.every((d) => d.amount === 0)) {
    return (
      <View style={styles.emptyChart}>
        <Ionicons name="bar-chart-outline" size={40} color={Colors.textTertiary} style={styles.emptyIcon} />
        <Text style={styles.emptyText}>No spending history this {period}</Text>
      </View>
    );
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <Svg width={Math.max(chartWidth, totalBarsWidth + CHART_PADDING + 20)} height={CHART_HEIGHT + 40}>
        <Defs>
          <LinearGradient id="primaryGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={Colors.primary} stopOpacity="1" />
            <Stop offset="1" stopColor={Colors.primary} stopOpacity="0.4" />
          </LinearGradient>
          <LinearGradient id="secondaryGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={Colors.secondary} stopOpacity="1" />
            <Stop offset="1" stopColor={Colors.secondary} stopOpacity="0.6" />
          </LinearGradient>
          <LinearGradient id="mutedGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={Colors.surfaceElevated} stopOpacity="0.8" />
            <Stop offset="1" stopColor={Colors.surfaceElevated} stopOpacity="0.2" />
          </LinearGradient>
        </Defs>

        {/* Y-axis guide lines */}
        {[0, 0.5, 1].map((pct) => {
          const y = CHART_HEIGHT - pct * (CHART_HEIGHT - 20);
          return (
            <Line
              key={`guide-${pct}`}
              x1={CHART_PADDING - 5}
              y1={y}
              x2={Math.max(chartWidth, totalBarsWidth + CHART_PADDING + 20)}
              y2={y}
              stroke={Colors.border}
              strokeWidth={1}
              strokeDasharray="4,4"
              opacity={0.5}
            />
          );
        })}

        {/* Y-axis labels */}
        {[0, 0.5, 1].map((pct) => {
          const y = CHART_HEIGHT - pct * (CHART_HEIGHT - 20);
          const val = Math.round(pct * maxAmount);
          return (
            <SvgText
              key={`y-${pct}`}
              x={CHART_PADDING - 8}
              y={y + 4}
              fill={Colors.textMuted}
              fontSize={10}
              fontWeight="500"
              textAnchor="end"
            >
              {val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val.toString()}
            </SvgText>
          );
        })}

        {/* Bars */}
        {chartData.map((d, i) => {
          const height = maxAmount > 0 ? (d.amount / maxAmount) * (CHART_HEIGHT - 20) : 0;
          const x = chartStartX + i * (barWidth + barGap);
          const y = CHART_HEIGHT - height;
          const isHighest = d.amount === maxAmount && d.amount > 0;
          
          // Map fills to the gradients defined in Defs
          const fill = isHighest ? 'url(#secondaryGradient)' : (d.amount > 0 ? 'url(#primaryGradient)' : 'url(#mutedGradient)');
          const opacity = d.amount > 0 ? 1 : 0.6;

          // Generate an SVG group rather than View since we are inside Svg tags.
          return (
            <React.Fragment key={`bar-${i}`}>
              <Rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(height, 0)}
                rx={barWidth / 2}
                fill={fill}
                opacity={opacity}
              />
              <SvgText
                x={x + barWidth / 2}
                y={CHART_HEIGHT + 16}
                fill={Colors.textMuted}
                fontSize={barCount > 12 ? 8 : 10}
                fontWeight="600"
                textAnchor="middle"
              >
                {d.label}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  emptyChart: {
    height: CHART_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyIcon: {
    marginBottom: 12,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 15,
  },
});

export default memo(SpendingChart);
