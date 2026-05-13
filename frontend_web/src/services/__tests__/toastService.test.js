import { toast } from 'react-toastify';
import { toastSuccess, toastError, toastInfo, toastWarning, showToast } from '../toastService';

jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
  },
}));

describe('toastService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call toast.success with correct message', () => {
    toastSuccess('Success Title', 'Success Message');
    expect(toast.success).toHaveBeenCalledWith('Success Title: Success Message', expect.any(Object));
  });

  it('should call toast.error with correct message', () => {
    toastError('Error Title', 'Error Message');
    expect(toast.error).toHaveBeenCalledWith('Error Title: Error Message', expect.any(Object));
  });

  it('should call toast.info with correct message', () => {
    toastInfo('Info Title', 'Info Message');
    expect(toast.info).toHaveBeenCalledWith('Info Title: Info Message', expect.any(Object));
  });

  it('should call toast.warning with correct message', () => {
    toastWarning('Warning Title', 'Warning Message');
    expect(toast.warning).toHaveBeenCalledWith('Warning Title: Warning Message', expect.any(Object));
  });

  it('should handle missing message in showToast', () => {
    showToast('success', 'Title Only');
    expect(toast.success).toHaveBeenCalledWith('Title Only', expect.any(Object));
  });
});
