function glyphClass(size, extra = '') {
  const s = `ui-glyph-s${size}`;
  return `ui-glyph ${s} ${extra}`.trim();
}

export function UiChevronLeft({ size = 14, className = '' }) {
  return <span className={glyphClass(size, `ui-chevron-right ui-chevron-left ${className}`)} aria-hidden />;
}

export function UiChevronRight({ size = 14, className = '' }) {
  return <span className={glyphClass(size, `ui-chevron-right ${className}`)} aria-hidden />;
}

export function UiChevronDown({ size = 16, className = '' }) {
  return <span className={glyphClass(size, `ui-chevron-down ${className}`)} aria-hidden />;
}

export function UiClose({ size = 20, className = '' }) {
  return <span className={glyphClass(size, `ui-close ${className}`)} aria-hidden />;
}

export function UiMenu({ size = 22, className = '' }) {
  return <span className={glyphClass(size, `ui-menu ${className}`)} aria-hidden />;
}

export function UiEye({ size = 16, className = '' }) {
  return <span className={glyphClass(size, `ui-eye ${className}`)} aria-hidden />;
}

export function UiEyeOff({ size = 16, className = '' }) {
  return <span className={glyphClass(size, `ui-eye-off ${className}`)} aria-hidden />;
}
