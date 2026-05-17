const mockRender = jest.fn();
const mockCreateRoot = jest.fn(() => ({ render: mockRender }));
const mockReportWebVitals = jest.fn();

jest.mock('react-dom/client', () => ({
  createRoot: mockCreateRoot,
}));

jest.mock('../../App', () => function MockApp() {
  return <div>App mock</div>;
});

jest.mock('../../reportWebVitals', () => mockReportWebVitals);

describe('index', () => {
  beforeEach(() => {
    jest.resetModules();
    mockCreateRoot.mockImplementation(() => ({ render: mockRender }));
    mockCreateRoot.mockClear();
    mockRender.mockClear();
    mockReportWebVitals.mockClear();
    document.body.innerHTML = '<div id="root"></div>';
  });

  it('monte React sur #root et initialise les web vitals', () => {
    require('../../index');

    expect(mockCreateRoot).toHaveBeenCalledWith(document.getElementById('root'));
    expect(mockRender).toHaveBeenCalled();
    expect(mockReportWebVitals).toHaveBeenCalledWith();
  });
});
