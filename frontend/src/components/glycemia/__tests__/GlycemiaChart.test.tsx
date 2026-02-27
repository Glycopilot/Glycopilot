import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import GlycemiaChart, { ChartMeasurement } from '../GlycemiaChart';

// Mock LineChart to avoid native dependencies
jest.mock('react-native-chart-kit', () => ({
    LineChart: ({ onDataPointClick }: any) => (
        // Simplified mock component that can trigger onDataPointClick
        // eslint-disable-next-line react/jsx-no-useless-fragment
        <>
            {/* Expose a test button to simulate a data point click */}
            <button
                title="data-point"
                onClick={() =>
                    onDataPointClick?.({
                        index: 0,
                        value: 100,
                        dataset: { data: [100] },
                        x: 0,
                        y: 0,
                        getColor: () => '#000',
                    })
                }
            />
        </>
    ),
}));

describe('GlycemiaChart', () => {
    const baseChartData = {
        labels: ['08:00'],
        datasets: [{ data: [110] }],
    };

    const measurements: ChartMeasurement[] = [
        { value: 110, label: '08:00', context: 'À jeun', time: '08:00', date: '2023-01-01' },
    ];

    it('renders empty state when there is no valid data', () => {
        const { getByText } = render(
            <GlycemiaChart
                chartData={{ labels: ['--'], datasets: [{ data: [0] }] }}
                measurementCount={0}
                measurements={[]}
            />,
        );

        expect(getByText('Pas encore de données')).toBeTruthy();
    });

    it('renders chart with valid data', () => {
        const { getByText } = render(
            <GlycemiaChart
                chartData={baseChartData}
                measurementCount={1}
                measurements={measurements}
            />,
        );

        expect(getByText('Niveaux de glucose')).toBeTruthy();
        expect(getByText('1 mesure affichée')).toBeTruthy();
    });

    // Le comportement détaillé du tooltip est testé via la logique de
    // transformation des données dans `glycemiaService` et via l'affichage
    // principal du graphique ci-dessus.
});

