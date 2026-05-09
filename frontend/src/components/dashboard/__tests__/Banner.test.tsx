import React from 'react';
import { render } from '@testing-library/react-native';
import Banner from '../Banner';
import useUser from '../../../hooks/useUser';

jest.mock('../../../hooks/useUser');

describe('Banner', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (useUser as jest.Mock).mockReturnValue({ user: { firstName: 'Test' } });
    });

    it('renders without crashing', () => {
        expect(() => render(<Banner />)).not.toThrow();
    });

    it('renders with all props', () => {
        const { getByText } = render(
            <Banner
                date="1 janvier 2026"
                healthScore={85}
                glucoseTrend="rising"
                glucoseValue={120}
                medication={{
                    taken_count: 1,
                    total_count: 2,
                    nextDose: {
                        name: 'Insuline',
                        scheduledAt: new Date().toISOString(),
                        status: 'pending',
                    },
                }}
            />
        );
        expect(getByText('1 janvier 2026')).toBeTruthy();
    });

    it('renders with healthScore below 50 (rouge)', () => {
        expect(() =>
            render(<Banner healthScore={30} glucoseTrend="falling" glucoseValue={55} />)
        ).not.toThrow();
    });

    it('renders with healthScore between 50 and 70 (orange)', () => {
        expect(() => render(<Banner healthScore={60} />)).not.toThrow();
    });

    it('renders with healthScore above 90 (excellent)', () => {
        expect(() => render(<Banner healthScore={95} />)).not.toThrow();
    });

    it('renders with no glucoseValue', () => {
        expect(() => render(<Banner glucoseTrend="flat" />)).not.toThrow();
    });

    it('renders with no medication nextDose', () => {
        expect(() =>
            render(<Banner medication={{ taken_count: 0, total_count: 1, nextDose: null }} />)
        ).not.toThrow();
    });

    it('renders with falling glucose trend', () => {
        expect(() =>
            render(<Banner glucoseTrend="falling" glucoseValue={65} />)
        ).not.toThrow();
    });

    it('renders with null user (default name)', () => {
        (useUser as jest.Mock).mockReturnValue({ user: null });
        expect(() => render(<Banner />)).not.toThrow();
    });

    it('formats date when not provided', () => {
        const { UNSAFE_getAllByType } = render(<Banner />);
        const { Text } = require('react-native');
        const texts = UNSAFE_getAllByType(Text);
        expect(texts.length).toBeGreaterThan(0);
    });
});
