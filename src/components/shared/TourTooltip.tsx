'use client';

import type { TooltipRenderProps } from 'react-joyride';
import { useTranslations } from 'next-intl';
import { useTourIntercept } from '@/lib/stores/tourInterceptContext';

export function TourTooltip({
  backProps,
  index,
  isLastStep,
  primaryProps,
  size,
  skipProps,
  step,
  tooltipProps,
}: TooltipRenderProps) {
  const { shouldIntercept } = useTourIntercept();
  const t = useTranslations('tour');

  // Strip joyride-injected `title` and `role` from button props.
  // `title` causes unwanted native browser tooltips on buttons that already
  // have visible text labels. `role` is redundant on a <button> element.
  const { title: _skipTitle, role: _skipRole, ...skipRest } = skipProps;
  const { title: _backTitle, role: _backRole, ...backRest } = backProps;
  const {
    title: _primaryTitle,
    role: _primaryRole,
    onClick: primaryOnClick,
    ...primaryRest
  } = primaryProps;

  return (
    <div
      {...tooltipProps}
      style={{
        fontFamily: 'var(--font-sans, system-ui, sans-serif)',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-card, 16px)',
        boxShadow: 'var(--shadow-lg)',
        padding: '20px 16px 16px',
        width: 300,
        maxWidth: 'calc(100vw - 32px)',
        boxSizing: 'border-box',
      }}
    >
      {/* Content */}
      <p
        style={{
          margin: 0,
          fontSize: 'var(--font-size-subhead, 15px)',
          lineHeight: '1.5',
          color: 'var(--text-primary)',
          fontWeight: 400,
        }}
      >
        {step.content as string}
      </p>

      {/* Progress dots */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 6,
          marginTop: 16,
          marginBottom: 14,
        }}
      >
        {Array.from({ length: size }).map((_, i) => {
          let dotBg: string;
          if (i === index) dotBg = 'var(--color-brand)';
          else if (i < index) dotBg = 'var(--color-brand-soft, rgba(91,141,239,0.3))';
          else dotBg = 'var(--bg-secondary)';

          return (
            <span
              key={`dot-${i}`} // NOSONAR — progress dots have no stable ID; index is intentional
              style={{
                display: 'block',
                width: i === index ? 16 : 6,
                height: 6,
                borderRadius: 'var(--radius-full, 9999px)',
                background: dotBg,
                transition: 'width 0.2s ease, background 0.2s ease',
              }}
            />
          );
        })}
      </div>

      {/* Buttons */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        {/* Skip — left side */}
        {!isLastStep && (
          <button
            type="button"
            {...skipRest}
            style={{
              flex: '0 0 auto',
              height: 32,
              padding: '0 10px',
              borderRadius: 8,
              border: 'none',
              background: 'transparent',
              color: 'var(--color-brand)',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'inherit',
              opacity: 0.7,
            }}
          >
            {t('skip')}
          </button>
        )}

        <div style={{ flex: 1 }} />

        {/* Back button */}
        {index > 0 && (
          <button
            type="button"
            {...backRest}
            style={{
              height: 32,
              padding: '0 12px',
              borderRadius: 8,
              border: '1.5px solid var(--color-brand)',
              background: 'var(--color-brand-soft)',
              color: 'var(--color-brand)',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {t('back')}
          </button>
        )}

        {/* Next / Finish button — always use primaryProps so ACTIONS.COMPLETE fires on last step */}
        <button
          type="button"
          {...primaryRest}
          onClick={(e) => {
            if (!isLastStep && shouldIntercept(index)) return;
            primaryOnClick(e);
          }}
          style={{
            height: 32,
            padding: '0 14px',
            borderRadius: 8,
            border: 'none',
            background: 'var(--color-brand)',
            color: 'var(--text-on-primary)',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {isLastStep ? t('finish') : t('next')}
        </button>
      </div>
    </div>
  );
}
