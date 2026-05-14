jest.mock('react-toastify', () => ({
  toast: Object.assign(jest.fn(), {
    success: jest.fn(),
    error:   jest.fn(),
    info:    jest.fn(),
    warning: jest.fn(),
  }),
}));

import { toast } from 'react-toastify';
import {
  showToast, toastSuccess, toastError, toastInfo, toastWarning,
} from '../../../services/toastService';

beforeEach(() => jest.clearAllMocks());

describe('toastService', () => {
  it('toastSuccess délègue à toast.success', () => {
    toastSuccess('OK', 'détails');
    expect(toast.success).toHaveBeenCalledWith('OK: détails', expect.objectContaining({ autoClose: 2000 }));
  });

  it('toastError délègue à toast.error', () => {
    toastError('KO', 'oops');
    expect(toast.error).toHaveBeenCalledWith('KO: oops', expect.objectContaining({ autoClose: 3000 }));
  });

  it('toastInfo délègue à toast.info', () => {
    toastInfo('Info', 'msg');
    expect(toast.info).toHaveBeenCalledWith('Info: msg', expect.objectContaining({ autoClose: 2500 }));
  });

  it('toastWarning délègue à toast.warning', () => {
    toastWarning('Attention', 'msg');
    expect(toast.warning).toHaveBeenCalledWith('Attention: msg', expect.objectContaining({ autoClose: 2500 }));
  });

  it('omet le suffixe si message est vide', () => {
    toastSuccess('Bienvenue');
    expect(toast.success).toHaveBeenCalledWith('Bienvenue', expect.any(Object));
  });

  it('showToast avec type inconnu utilise toast() par défaut', () => {
    showToast('mystery', 'title', 'msg', 1000);
    expect(toast).toHaveBeenCalledWith('title: msg', expect.objectContaining({ autoClose: 1000 }));
  });

  it('les options communes sont toujours présentes', () => {
    toastSuccess('Salut');
    expect(toast.success).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
      closeOnClick: true,
      pauseOnHover: true,
      draggable:    true,
      hideProgressBar: false,
    }));
  });
});
