import { toast } from 'react-toastify';
import { 
  showToast, 
  toastSuccess, 
  toastError, 
  toastInfo, 
  toastWarning 
} from './toastService';

jest.mock('react-toastify', () => ({
  toast: jest.fn(),
}));

// Mock the nested functions
toast.success = jest.fn();
toast.error = jest.fn();
toast.info = jest.fn();
toast.warning = jest.fn();

describe('toastService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('showToast', () => {
    it('calls toast.success with combined message', () => {
      showToast('success', 'Titre', 'Message', 2000);
      expect(toast.success).toHaveBeenCalledWith('Titre: Message', expect.any(Object));
    });

    it('calls toast.success with only title if message is empty', () => {
      showToast('success', 'Seul Titre', '', 2000);
      expect(toast.success).toHaveBeenCalledWith('Seul Titre', expect.any(Object));
    });

    it('calls toast.error for type error', () => {
      showToast('error', 'Erreur');
      expect(toast.error).toHaveBeenCalledWith('Erreur', expect.any(Object));
    });

    it('calls toast.info for type info', () => {
      showToast('info', 'Info');
      expect(toast.info).toHaveBeenCalledWith('Info', expect.any(Object));
    });

    it('calls toast.warning for type warning', () => {
      showToast('warning', 'Warning');
      expect(toast.warning).toHaveBeenCalledWith('Warning', expect.any(Object));
    });

    it('calls default toast for unknown type', () => {
      showToast('unknown', 'Default');
      expect(toast).toHaveBeenCalledWith('Default', expect.any(Object));
    });
  });

  describe('helper functions', () => {
    it('toastSuccess calls showToast with success', () => {
      toastSuccess('Gagné', 'Bravo');
      expect(toast.success).toHaveBeenCalledWith('Gagné: Bravo', expect.objectContaining({ autoClose: 2000 }));
    });

    it('toastError calls showToast with error', () => {
      toastError('Perdu', 'Aïe');
      expect(toast.error).toHaveBeenCalledWith('Perdu: Aïe', expect.objectContaining({ autoClose: 3000 }));
    });

    it('toastInfo calls showToast with info', () => {
      toastInfo('Info', 'Note');
      expect(toast.info).toHaveBeenCalledWith('Info: Note', expect.objectContaining({ autoClose: 2500 }));
    });

    it('toastWarning calls showToast with warning', () => {
      toastWarning('Attention', 'Gare');
      expect(toast.warning).toHaveBeenCalledWith('Attention: Gare', expect.objectContaining({ autoClose: 2500 }));
    });
  });
});
