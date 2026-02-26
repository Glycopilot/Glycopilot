import { renderHook, act, waitFor } from '@testing-library/react-native';
import useGlycemia from '../useGlycemia';
import glycemiaService from '../../services/glycemiaService';

// Mock glycemiaService
jest.mock('../../services/glycemiaService', () => ({
    getCurrent: jest.fn(),
    getHistory: jest.fn(),
    createManualReading: jest.fn(),
    transformForChart: jest.fn(),
}));

describe('useGlycemia hook', () => {
    const mockCurrent = { id: '1', value: 100, measured_at: 'now', source: 'manual', unit: 'mg/dL' };
    const mockHistory = [mockCurrent];

    beforeEach(() => {
        jest.clearAllMocks();
        (glycemiaService.getCurrent as jest.Mock).mockResolvedValue(mockCurrent);
        (glycemiaService.getHistory as jest.Mock).mockResolvedValue(mockHistory);
    });

    it('should load data on mount', async () => {
        const { result } = renderHook(() => useGlycemia());

        expect(result.current.loading).toBe(true);
        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.currentValue).toEqual(mockCurrent);
        expect(result.current.measurements).toEqual(mockHistory);
    });

    it('should handle manual reading addition', async () => {
        const newReading = { id: '2', value: 120, measured_at: 'now', source: 'manual', unit: 'mg/dL' };
        (glycemiaService.createManualReading as jest.Mock).mockResolvedValue(newReading);

        const { result } = renderHook(() => useGlycemia());
        await waitFor(() => expect(result.current.loading).toBe(false));

        await act(async () => {
            const added = await result.current.addManualReading({ value: 120 });
            expect(added).toEqual(newReading);
        });

        expect(result.current.measurements).toContainEqual(newReading);
        expect(result.current.currentValue).toEqual(newReading);
    });

    it('should handle fetch errors in history', async () => {
        (glycemiaService.getHistory as jest.Mock).mockRejectedValue(new Error('Fetch failed'));

        const { result } = renderHook(() => useGlycemia());

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.error).toBe('Fetch failed');
    });

    it('should allow fetching history for different periods', async () => {
        const { result } = renderHook(() => useGlycemia());
        await waitFor(() => expect(result.current.loading).toBe(false));

        await act(async () => {
            await result.current.loadHistory(1); // Should call with period: 'day'
        });

        expect(glycemiaService.getHistory).toHaveBeenCalledWith({ period: 'day' });
    });
});
