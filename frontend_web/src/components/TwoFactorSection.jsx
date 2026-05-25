import { useEffect, useState } from 'react';
import { ShieldCheck, Send } from 'lucide-react';
import authService from '../services/authService';
import { toastSuccess, toastError } from '../services/toastService';

/**
 * Section d'activation/désactivation de la 2FA par email pour le portail médecin.
 * Autonome : récupère l'état, envoie le code et le vérifie en ligne.
 */
export default function TwoFactorSection() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [codeMode, setCodeMode] = useState(false); // saisie du code en cours
  const [pendingEnable, setPendingEnable] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const status = await authService.getTwoFactorStatus();
      if (active) {
        setEnabled(status);
        setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const requestToggle = async (next) => {
    setPendingEnable(next);
    setBusy(true);
    try {
      await authService.sendTwoFactorCode();
      setCode('');
      setCodeMode(true);
      toastSuccess('Code envoyé', 'Saisissez le code reçu par email.');
    } catch {
      toastError('Erreur', "Impossible d'envoyer le code. Réessayez.");
    } finally {
      setBusy(false);
    }
  };

  const confirmCode = async () => {
    if (code.trim().length < 6) return toastError('Code incomplet', 'Le code contient 6 chiffres.');
    setBusy(true);
    try {
      if (pendingEnable) {
        await authService.enableTwoFactor(code.trim());
        setEnabled(true);
        toastSuccess('2FA activée', 'Un code vous sera demandé à chaque connexion.');
      } else {
        await authService.disableTwoFactor(code.trim());
        setEnabled(false);
        toastSuccess('2FA désactivée', '');
      }
      setCodeMode(false);
    } catch (err) {
      toastError('Erreur', err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="pcard pcard-security">
      <div className="pcard-title"><ShieldCheck size={16} /> Validation en deux étapes</div>
      <p className="security-desc">
        {enabled
          ? 'La 2FA est activée : un code vous est envoyé par email à chaque connexion.'
          : 'Renforcez la sécurité de votre compte en exigeant un code reçu par email à la connexion.'}
      </p>

      {loading ? (
        <span className="mini-spinner-blue" />
      ) : codeMode ? (
        <div className="twofa-code-row" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            className="pfield-input"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="123456"
            inputMode="numeric"
            maxLength={6}
            style={{ maxWidth: 140 }}
          />
          <button className="btn-reset-pass" onClick={confirmCode} disabled={busy}>
            {busy ? <><span className="mini-spinner-blue" /> Vérification…</> : 'Confirmer'}
          </button>
          <button className="btn-cancel" onClick={() => setCodeMode(false)} disabled={busy}>
            Annuler
          </button>
        </div>
      ) : (
        <button className="btn-reset-pass" onClick={() => requestToggle(!enabled)} disabled={busy}>
          {busy
            ? <><span className="mini-spinner-blue" /> Envoi en cours…</>
            : <><Send size={15} /> {enabled ? 'Désactiver la 2FA' : 'Activer la 2FA'}</>}
        </button>
      )}
    </section>
  );
}
