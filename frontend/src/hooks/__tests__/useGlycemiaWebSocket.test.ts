import { renderHook, act } from '@testing-library/react-native';
import { useGlycemiaWebSocket } from '../useGlycemiaWebSocket';

type WsEventHandler = (event?: any) => void;

class MockWebSocket {
  static OPEN = 1;
  static CLOSED = 3;

  readyState = MockWebSocket.OPEN;
  onopen: WsEventHandler | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: ((event: { code: number }) => void) | null = null;
  onerror: WsEventHandler | null = null;

  send = jest.fn();
  close = jest.fn(() => {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.({ code: 1000 });
  });

  triggerOpen() { this.onopen?.(); }
  triggerMessage(data: object) { this.onmessage?.({ data: JSON.stringify(data) }); }
  triggerClose(code = 1000) {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.({ code });
  }
  triggerError() { this.onerror?.(); }
}

let mockWsInstance: MockWebSocket;

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  mockWsInstance = new MockWebSocket('');
  const MockWsConstructor = jest.fn(() => mockWsInstance);
  MockWsConstructor.OPEN = MockWebSocket.OPEN;
  MockWsConstructor.CLOSED = MockWebSocket.CLOSED;
  (global as any).WebSocket = MockWsConstructor;
});

afterEach(() => {
  jest.useRealTimers();
  delete (global as any).WebSocket;
});

describe('useGlycemiaWebSocket', () => {
  const TOKEN = 'test-token';
  const WS_URL = 'ws://localhost:8006';

  it('should start disconnected then connect on open', () => {
    const { result } = renderHook(() =>
      useGlycemiaWebSocket(TOKEN, WS_URL)
    );

    expect(result.current.isConnected).toBe(false);

    act(() => { mockWsInstance.triggerOpen(); });

    expect(result.current.isConnected).toBe(true);
  });

  it('should not connect when token is null', () => {
    renderHook(() => useGlycemiaWebSocket(null, WS_URL));

    expect(global.WebSocket).not.toHaveBeenCalled();
  });

  it('should build correct WebSocket URL with token', () => {
    renderHook(() => useGlycemiaWebSocket(TOKEN, WS_URL));

    expect(global.WebSocket).toHaveBeenCalledWith(
      `${WS_URL}/ws/glycemia/?token=${TOKEN}`
    );
  });

  it('should update lastReading on glycemia_update message', () => {
    const { result } = renderHook(() =>
      useGlycemiaWebSocket(TOKEN, WS_URL)
    );
    act(() => { mockWsInstance.triggerOpen(); });

    const reading = { id: '1', value: 115, measured_at: '2024-01-01T10:00:00Z', source: 'cgm' };

    act(() => {
      mockWsInstance.triggerMessage({ type: 'glycemia_update', data: reading });
    });

    expect(result.current.lastReading).toEqual(reading);
  });

  it('should set alert on glycemia_alert message', () => {
    const { result } = renderHook(() =>
      useGlycemiaWebSocket(TOKEN, WS_URL)
    );
    act(() => { mockWsInstance.triggerOpen(); });

    const reading = { id: '2', value: 55, measured_at: '2024-01-01T11:00:00Z', source: 'cgm' };

    act(() => {
      mockWsInstance.triggerMessage({
        type: 'glycemia_alert',
        alert_type: 'hypoglycemia',
        data: reading,
      });
    });

    expect(result.current.alert).toEqual({ type: 'hypoglycemia', data: reading });
  });

  it('should clear alert with clearAlert()', () => {
    const { result } = renderHook(() =>
      useGlycemiaWebSocket(TOKEN, WS_URL)
    );
    act(() => { mockWsInstance.triggerOpen(); });

    act(() => {
      mockWsInstance.triggerMessage({
        type: 'glycemia_alert',
        alert_type: 'hyperglycemia',
        data: { id: '3', value: 280 },
      });
    });

    expect(result.current.alert).not.toBeNull();

    act(() => { result.current.clearAlert(); });

    expect(result.current.alert).toBeNull();
  });

  it('should send ping when connected', () => {
    const { result } = renderHook(() =>
      useGlycemiaWebSocket(TOKEN, WS_URL)
    );
    act(() => { mockWsInstance.triggerOpen(); });

    act(() => { result.current.sendPing(); });

    expect(mockWsInstance.send).toHaveBeenCalledWith(
      JSON.stringify({ type: 'ping' })
    );
  });

  it('should not send ping when disconnected', () => {
    mockWsInstance.readyState = MockWebSocket.CLOSED;
    const { result } = renderHook(() =>
      useGlycemiaWebSocket(TOKEN, WS_URL)
    );

    act(() => { result.current.sendPing(); });

    expect(mockWsInstance.send).not.toHaveBeenCalled();
  });

  it('should set isConnected false on close', () => {
    const { result } = renderHook(() =>
      useGlycemiaWebSocket(TOKEN, WS_URL)
    );
    act(() => { mockWsInstance.triggerOpen(); });

    expect(result.current.isConnected).toBe(true);

    act(() => { mockWsInstance.triggerClose(1000); });

    expect(result.current.isConnected).toBe(false);
  });

  it('should set isConnected false on error', () => {
    const { result } = renderHook(() =>
      useGlycemiaWebSocket(TOKEN, WS_URL)
    );
    act(() => { mockWsInstance.triggerOpen(); });

    act(() => { mockWsInstance.triggerError(); });

    expect(result.current.isConnected).toBe(false);
  });

  it('should not reconnect on auth failure (code 4001)', () => {
    renderHook(() => useGlycemiaWebSocket(TOKEN, WS_URL));
    act(() => { mockWsInstance.triggerOpen(); });

    const constructorCallCount = (global.WebSocket as jest.Mock).mock.calls.length;

    act(() => { mockWsInstance.triggerClose(4001); });
    act(() => { jest.advanceTimersByTime(5000); });

    expect((global.WebSocket as jest.Mock).mock.calls.length).toBe(constructorCallCount);
  });

  it('should reconnect after 3s on unexpected close', () => {
    renderHook(() => useGlycemiaWebSocket(TOKEN, WS_URL));
    act(() => { mockWsInstance.triggerOpen(); });

    const callsBefore = (global.WebSocket as jest.Mock).mock.calls.length;

    act(() => { mockWsInstance.triggerClose(1006); });
    act(() => { jest.advanceTimersByTime(3000); });

    expect((global.WebSocket as jest.Mock).mock.calls.length).toBeGreaterThan(callsBefore);
  });

  it('should close WebSocket on unmount', () => {
    const { unmount } = renderHook(() =>
      useGlycemiaWebSocket(TOKEN, WS_URL)
    );

    unmount();

    expect(mockWsInstance.close).toHaveBeenCalled();
  });

  it('should ignore malformed JSON messages without throwing', () => {
    const { result } = renderHook(() =>
      useGlycemiaWebSocket(TOKEN, WS_URL)
    );
    act(() => { mockWsInstance.triggerOpen(); });

    expect(() => {
      act(() => {
        mockWsInstance.onmessage?.({ data: 'not-json{{{' });
      });
    }).not.toThrow();

    expect(result.current.lastReading).toBeNull();
  });

  it('should handle connection_established and pong messages silently', () => {
    const { result } = renderHook(() =>
      useGlycemiaWebSocket(TOKEN, WS_URL)
    );
    act(() => { mockWsInstance.triggerOpen(); });

    act(() => {
      mockWsInstance.triggerMessage({ type: 'connection_established' });
      mockWsInstance.triggerMessage({ type: 'pong' });
    });

    expect(result.current.lastReading).toBeNull();
    expect(result.current.alert).toBeNull();
  });
});
