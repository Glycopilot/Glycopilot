// Type declarations for react-native-chart-kit
declare module 'react-native-chart-kit' {
  import { Component } from 'react';
  import { ViewStyle } from 'react-native';

  export interface ChartData {
    labels: string[];
    datasets: Array<{
      data: number[];
      color?: (opacity: number) => string;
      strokeWidth?: number;
    }>;
    legend?: string[];
  }

  export interface ChartConfig {
    backgroundColor?: string;
    backgroundGradientFrom?: string;
    backgroundGradientTo?: string;
    decimalPlaces?: number;
    color?: (opacity: number) => string;
    labelColor?: (opacity: number) => string;
    style?: ViewStyle;
    propsForDots?: {
      r?: string;
      strokeWidth?: string;
      stroke?: string;
      fill?: string;
    };
    propsForBackgroundLines?: {
      strokeDasharray?: string;
      stroke?: string;
      strokeWidth?: number;
    };
  }

  export interface LineChartProps {
    data: ChartData;
    width: number;
    height: number;
    chartConfig: ChartConfig;
    bezier?: boolean;
    style?: ViewStyle;
    withInnerLines?: boolean;
    withOuterLines?: boolean;
    withVerticalLines?: boolean;
    withHorizontalLines?: boolean;
    withVerticalLabels?: boolean;
    withHorizontalLabels?: boolean;
    fromZero?: boolean;
    segments?: number;
    yAxisLabel?: string;
    yAxisSuffix?: string;
  }

  export class LineChart extends Component<LineChartProps> {}

  export class BarChart extends Component<any> {}
  export class PieChart extends Component<any> {}
  export class ProgressChart extends Component<any> {}
  export class ContributionGraph extends Component<any> {}
  export class StackedBarChart extends Component<any> {}
}
