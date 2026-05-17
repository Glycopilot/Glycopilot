const mockMetricHandlers = {
  onCLS: jest.fn(),
  onINP: jest.fn(),
  onFCP: jest.fn(),
  onLCP: jest.fn(),
  onTTFB: jest.fn(),
};

jest.mock('web-vitals', () => mockMetricHandlers);

const flushImport = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('reportWebVitals', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('ne fait rien sans callback valide', async () => {
    const reportWebVitals = require('../../reportWebVitals').default;

    reportWebVitals();
    reportWebVitals('not-a-function');
    await flushImport();

    expect(mockMetricHandlers.onCLS).not.toHaveBeenCalled();
  });

  it('branche tous les handlers web-vitals sur le callback fourni', async () => {
    const reportWebVitals = require('../../reportWebVitals').default;
    const onPerfEntry = jest.fn();

    reportWebVitals(onPerfEntry);
    await flushImport();

    expect(mockMetricHandlers.onCLS).toHaveBeenCalledWith(onPerfEntry);
    expect(mockMetricHandlers.onINP).toHaveBeenCalledWith(onPerfEntry);
    expect(mockMetricHandlers.onFCP).toHaveBeenCalledWith(onPerfEntry);
    expect(mockMetricHandlers.onLCP).toHaveBeenCalledWith(onPerfEntry);
    expect(mockMetricHandlers.onTTFB).toHaveBeenCalledWith(onPerfEntry);
  });
});
