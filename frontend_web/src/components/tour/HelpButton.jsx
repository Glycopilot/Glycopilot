import GlycoIcon from '../GlycoIcon';
import { useTour } from './TourProvider';

export default function HelpButton({ className = '', label = 'Lancer la visite guidée' }) {
  const { start } = useTour();
  return (
    <button
      type="button"
      className={`tour-help-btn ${className}`}
      onClick={start}
      title={label}
      aria-label={label}
    >
      <GlycoIcon size={16} alt="" />
    </button>
  );
}
