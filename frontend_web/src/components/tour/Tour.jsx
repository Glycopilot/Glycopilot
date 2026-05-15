import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { X, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { useTour } from './TourProvider';
import { tourSteps } from './tour-steps';
import './tour.css';

const TOOLTIP_W = 340;
const TOOLTIP_H = 240;
const PADDING = 16;
const SPOT_PAD = 8;

function clamp(value, min, max) {
  return Math.max(min, Math.min(value, max));
}

function computeTooltipPos(rect, placement = 'bottom') {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let x;
  let y;
  switch (placement) {
    case 'top':
      y = rect.top - TOOLTIP_H - PADDING;
      x = rect.left + rect.width / 2 - TOOLTIP_W / 2;
      break;
    case 'right':
      y = rect.top + rect.height / 2 - TOOLTIP_H / 2;
      x = rect.left + rect.width + PADDING;
      break;
    case 'left':
      y = rect.top + rect.height / 2 - TOOLTIP_H / 2;
      x = rect.left - TOOLTIP_W - PADDING;
      break;
    case 'bottom':
    default:
      y = rect.top + rect.height + PADDING;
      x = rect.left + rect.width / 2 - TOOLTIP_W / 2;
  }
  if (y < 12) y = rect.top + rect.height + PADDING;
  if (y + TOOLTIP_H > vh - 12) y = rect.top - TOOLTIP_H - PADDING;
  x = clamp(x, 12, vw - TOOLTIP_W - 12);
  y = clamp(y, 12, vh - TOOLTIP_H - 12);
  return { x, y };
}

async function findTarget(selector, timeoutMs = 1500) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const el = document.querySelector(selector);
    if (el) return el;
    await new Promise((r) => setTimeout(r, 60));
  }
  return null;
}

export default function Tour() {
  const { active, stepIndex, stop, next, prev, goTo, total } = useTour();
  const navigate = useNavigate();
  const location = useLocation();
  const [targetRect, setTargetRect] = useState(null);
  const [tooltipPos, setTooltipPos] = useState(null);

  const step = active ? tourSteps[stepIndex] : null;
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === total - 1;

  useEffect(() => {
    if (!active || !step) return undefined;

    let cancelled = false;

    const layout = (el) => {
      if (!el) {
        setTargetRect(null);
        setTooltipPos(null);
        return;
      }
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
      setTooltipPos(computeTooltipPos(rect, step.placement));
    };

    const setup = async () => {
      if (step.route && location.pathname !== step.route) {
        navigate(step.route);
        await new Promise((r) => setTimeout(r, 380));
      }
      if (cancelled) return;

      if (!step.target) {
        layout(null);
        return;
      }

      const el = await findTarget(step.target);
      if (cancelled) return;

      if (!el) {
        layout(null);
        return;
      }

      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      await new Promise((r) => setTimeout(r, 240));
      if (cancelled) return;

      layout(el);

      const onResize = () => {
        const current = document.querySelector(step.target);
        if (current) layout(current);
      };
      window.addEventListener('resize', onResize);
      window.addEventListener('scroll', onResize, true);

      const obs = new MutationObserver(() => {
        const current = document.querySelector(step.target);
        if (current) layout(current);
      });
      obs.observe(document.body, { childList: true, subtree: true, attributes: true });

      const cleanup = () => {
        window.removeEventListener('resize', onResize);
        window.removeEventListener('scroll', onResize, true);
        obs.disconnect();
      };
      cancelled = false;
      Tour._cleanup = cleanup;
    };

    setup();
    return () => {
      cancelled = true;
      if (Tour._cleanup) {
        Tour._cleanup();
        Tour._cleanup = null;
      }
    };
  }, [active, step, stepIndex, navigate, location.pathname]);

  useEffect(() => {
    if (!active) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') stop();
      else if (e.key === 'ArrowRight' && !isLast) next();
      else if (e.key === 'ArrowLeft' && !isFirst) prev();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [active, isFirst, isLast, next, prev, stop]);

  if (!active || !step) return null;

  const centered = !targetRect;

  const overlay = (
    <div className="tour-root" role="dialog" aria-modal="true" aria-label="Visite guidée">
      <div className="tour-backdrop" />

      {targetRect && (
        <div
          className="tour-spotlight"
          style={{
            top: targetRect.top - SPOT_PAD,
            left: targetRect.left - SPOT_PAD,
            width: targetRect.width + SPOT_PAD * 2,
            height: targetRect.height + SPOT_PAD * 2,
          }}
        />
      )}

      <div
        className={`tour-tooltip ${centered ? 'tour-tooltip-centered' : ''}`}
        style={!centered && tooltipPos ? { top: tooltipPos.y, left: tooltipPos.x } : undefined}
      >
        <button
          className="tour-close"
          onClick={stop}
          aria-label="Fermer la visite guidée"
          type="button"
        >
          <X size={16} />
        </button>

        <div className="tour-pill">
          <Sparkles size={12} />
          <span>Étape {stepIndex + 1} sur {total}</span>
        </div>

        <h3 className="tour-title">{step.title}</h3>
        <p className="tour-body">{step.body}</p>

        <div className="tour-dots" role="tablist" aria-label="Étapes de la visite">
          {tourSteps.map((s, i) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={i === stepIndex}
              aria-label={`Aller à l'étape ${i + 1} : ${s.title}`}
              className={`tour-dot ${i === stepIndex ? 'tour-dot-active' : ''}`}
              onClick={() => goTo(i)}
            />
          ))}
        </div>

        <div className="tour-actions">
          <button
            type="button"
            className="tour-btn tour-btn-secondary"
            onClick={stop}
          >
            Passer
          </button>
          <div className="tour-actions-right">
            {!isFirst && (
              <button type="button" className="tour-btn tour-btn-ghost" onClick={prev}>
                <ChevronLeft size={14} /> Précédent
              </button>
            )}
            {isLast ? (
              <button type="button" className="tour-btn tour-btn-primary" onClick={stop}>
                Terminer
              </button>
            ) : (
              <button type="button" className="tour-btn tour-btn-primary" onClick={next}>
                Suivant <ChevronRight size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}
