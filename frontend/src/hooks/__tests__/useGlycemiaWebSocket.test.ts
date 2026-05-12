import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useGlycemiaWebSocket } from '../useGlycemiaWebSocket';

// Mock WebSocket
class MockWebSocket {
  static OPEN = 1;
  readyState = MockWebSocket.OPEN;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: ((event: { code: number }) => void) | null = null;
  onerror: (() => void) | null = null;
  send = jest.fn();
  close = jest.fn(() => {
    if (this.onclose) this.onclose({ code: 1000 });
  });

  constructor(public url: string) {
    // Simulate async open
    setTimeout(() => { if (this.onopen) this.onopen(); }, 0);
  }

  simulateMessage(data: object) {
    if (this.onmessage) this.onmessage({ data: JSON.stringify(data) });
  }

  simulateClose(code = 1000) {
    this.readyState = 3; // CLOSED
    if (this.onclose) this.onclose({ code });
  }

  simulateError() {
    if (this.onerror) this.onerror();
  }
}

let mockWsInstance: MockWebSocket;

(global as any).WebSocket = jest.fn().mockImplementation((url: string) => {
  mockWsInstance = new MockWebSocket(url);
  return mockWsInstance;
});
(global as any).WebSocket.OPEN = 1;

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useGlycemiaWebSocket', () => {
  it('does not connect when accessToken is null', () => {
    renderHook(() => useGlycemiaWebSocket(null, 'ws://localhost'));
    expect(global.WebSocket).not.toHaveBeenCalled();
  });

  it('connects when accessToken is provided', async () => {
    renderHook(() => useGlycemiaWebSocket('token123', 'ws://localhost'));
    expect(global.WebSocket).toHaveBeenCalledWith('ws://localhost/ws/glycemia/?token=token123');
  });

  it('sets isConnected to true on open', async () => {
    const { result } = renderHook(() => useGlycemiaWebSocket('token', 'ws://localhost'));
    await act(async () => { jest.runAllTimers(); });
    await waitFor(() => expect(result.current.isConnected).toBe(true));
  });

  it('handles glycemia_update message', async () => {
    const entry = { id: '1', value: 5.5, measured_at: '2024-01-01T10:00:00Z' };
    const { result } = renderHook(() => useGlycemiaWebSocket('token', 'ws://localhost'));
    await act(async () => { jest.runAllTimers(); });
    act(() => { mockWsInstance.simulateMessage({ type: 'glycemia_update', data: entry }); });
    expect(result.current.lastReading).toEqual(entry);
  });

  it('handles glycemia_alert message', async () => {
    const entry = { id: '2', value: 2.5, measured_at: '2024-01-01T11:00:00Z' };
    const { result } = renderHook(() => useGlycemiaWebSocket('token', 'ws://localhost'));
    await act(async () => { jest.runAllTimers(); });
    act(() => { mockWsInstance.simulateMessage({ type: 'glycemia_alert', alert_type: 'hypoglycemia', data: entry }); });
    expect(result.current.alert).toEqual({ type: 'hypoglycemia', data: entry });
  });

  it('handles connection_established message without error', async () => {
    const { result } = renderHook(() => useGlycemiaWebSocket('token', 'ws://localhost'));
    await act(async () => { jest.runAllTimers(); });
    act(() => { mockWsInstance.simulateMessage({ type: 'connection_established' }); });
    expect(result.current.isConnected).toBe(true);
  });

  it('handles pong message without error', async () => {
    const { result } = renderHook(() => useGlycemiaWebSocket('token', 'ws://localhost'));
    await act(async () => { jest.runAllTimers(); });
    act(() => { mockWsInstance.simulateMessage({ type: 'pong' }); });
    expect(result.current.lastReading).toBeNull();
  });

  it('handles unknown message type without error', async () => {
    const { result } = renderHook(() => useGlycemiaWebSocket('token', 'ws://localhost'));
    await act(async () => { jest.runAllTimers(); });
    act(() => { mockWsInstance.simulateMessage({ type: 'unknown_type', data: {} }); });
    expect(result.current.lastReading).toBeNull();
  });

  it('ignores malformed messages', async () => {
    const { result } = renderHook(() => useGlycemiaWebSocket('token', 'ws://localhost'));
    await act(async () => { jest.runAllTimers(); });
    act(() => {
      if (mockWsInstance.onmessage) mockWsInstance.onmessage({ data: 'not-json{{' });
    });
    expect(result.current.lastReading).toBeNull();
  });

  it('sets isConnected false on error', async () => {
    const { result } = renderHook(() => useGlycemiaWebSocket('token', 'ws://localhost'));
    await act(async () => { jest.runAllTimers(); });
    act(() => { mockWsInstance.simulateError(); });
    expect(result.current.isConnected).toBe(false);
  });

  it('does not reconnect on code 4001 (auth failure)', async () => {
    renderHook(() => useGlycemiaWebSocket('token', 'ws://localhost'));
    await act(async () => { jest.runAllTimers(); });
    const callsBefore = (global.WebSocket as jest.Mock).mock.calls.length;
    act(() => { mockWsInstance.simulateClose(4001); });
    jest.advanceTimersByTime(5000);
    expect((global.WebSocket as jest.Mock).mock.calls.length).toBe(callsBefore);
  });

  it('does not reconnect on code 1000 (normal close)', async () => {
    renderHook(() => useGlycemiaWebSocket('token', 'ws://localhost'));
    await act(async () => { jest.runAllTimers(); });
    const callsBefore = (global.WebSocket as jest.Mock).mock.calls.length;
    act(() => { mockWsInstance.simulateClose(1000); });
    jest.advanceTimersByTime(5000);
    expect((global.WebSocket as jest.Mock).mock.calls.length).toBe(callsBefore);
  });

  it('reconnects after 3s on unexpected close', async () => {
    renderHook(() => useGlycemiaWebSocket('token', 'ws://localhost'));
    await act(async () => { jest.runAllTimers(); });
    const callsBefore = (global.WebSocket as jest.Mock).mock.calls.length;
    act(() => {
      if (mockWsInstance.onclose) mockWsInstance.onclose({ code: 1006 });
    });
    act(() => { jest.advanceTimersByTime(3100); });
    expect((global.WebSocket as jest.Mock).mock.calls.length).toBeGreaterThan(callsBefore);
  });

  it('sendPing sends message when connected', async () => {
    const { result } = renderHook(() => useGlycemiaWebSocket('token', 'ws://localhost'));
    await act(async () => { jest.runAllTimers(); });
    act(() => { result.current.sendPing(); });
    expect(mockWsInstance.send).toHaveBeenCalledWith(JSON.stringify({ type: 'ping' }));
  });

  it('sendPing does nothing when not connected', () => {
    const { result } = renderHook(() => useGlycemiaWebSocket('token', 'ws://localhost'));
    mockWsInstance.readyState = 3; // CLOSED
    act(() => { result.current.sendPing(); });
    expect(mockWsInstance.send).not.toHaveBeenCalled();
  });

  it('clearAlert sets alert to null', async () => {
    const entry = { id: '1', value: 2.5, measured_at: '2024-01-01T10:00:00Z' };
    const { result } = renderHook(() => useGlycemiaWebSocket('token', 'ws://localhost'));
    await act(async () => { jest.runAllTimers(); });
    act(() => { mockWsInstance.simulateMessage({ type: 'glycemia_alert', alert_type: 'hypoglycemia', data: entry }); });
    expect(result.current.alert).not.toBeNull();
    act(() => { result.current.clearAlert(); });
    expect(result.current.alert).toBeNull();
  });

  it('cleans up WebSocket on unmount', async () => {
    const { unmount } = renderHook(() => useGlycemiaWebSocket('token', 'ws://localhost'));
    await act(async () => { jest.runAllTimers(); });
    unmount();
    expect(mockWsInstance.close).toHaveBeenCalled();
  });
});
