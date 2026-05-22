import logoImg from '../assets/glycopilot.png';
import markImg from '../assets/icon.png';

const SOURCES = {
  logo: logoImg,
  mark: markImg,
};

const SIZE_CLASS = {
  11: 'glyco-icon-s11',
  12: 'glyco-icon-s12',
  13: 'glyco-icon-s13',
  14: 'glyco-icon-s14',
  15: 'glyco-icon-s15',
  16: 'glyco-icon-s16',
  18: 'glyco-icon-s18',
  20: 'glyco-icon-s20',
  22: 'glyco-icon-s22',
  40: 'glyco-icon-s40',
  48: 'glyco-icon-s48',
};

export default function GlycoIcon({
  variant = 'mark',
  size = 18,
  alt = 'GlycoPilot',
  className = '',
}) {
  const sizeClass = SIZE_CLASS[size] || 'glyco-icon-s18';
  const variantClass = variant === 'logo' ? 'glyco-icon--logo' : '';

  return (
    <img
      src={SOURCES[variant] || markImg}
      alt={alt}
      className={`glyco-icon ${sizeClass} ${variantClass} ${className}`.trim()}
    />
  );
}
