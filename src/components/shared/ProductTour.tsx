'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Joyride, ACTIONS, EVENTS, STATUS, type EventData } from 'react-joyride';
import { useTranslations } from 'next-intl';
import { useTourStore } from '@/lib/stores/useTourStore';
import { TourTooltip } from '@/components/shared/TourTooltip';
import { TourBeacon } from '@/components/shared/TourBeacon';
import { TourInterceptContext } from '@/lib/stores/tourInterceptContext';

const STEP_TARGETS = [
  { target: '[data-tour="nav-tab-transactions"]',    placement: 'top'    as const, key: 'tx1' },
  { target: '[data-tour="tx-date-nav"]',             placement: 'bottom' as const, key: 'tx2' },
  { target: '[data-tour="tx-summary"]',              placement: 'bottom' as const, key: 'tx3' },
  { target: '[data-tour="fab-transactions"]',        placement: 'top'    as const, key: 'tx4' },
  { target: '[data-tour="transactions-filter-bar"]', placement: 'left'   as const, key: 'tx5' },
  { target: '[data-tour="tx-export"]',               placement: 'bottom' as const, key: 'tx6' },
  { target: '[data-tour="tx-history"]',              placement: 'bottom' as const, key: 'tx7' },
  { target: '[data-tour="nav-tab-wallet"]',          placement: 'top'    as const, key: 'wl1' },
  { target: '[data-tour="wl-total-balance"]',        placement: 'bottom' as const, key: 'wl2' },
  { target: '[data-tour="wl-filter-type"]',          placement: 'bottom' as const, key: 'wl3' },
  { target: '[data-tour="wl-sort"]',                 placement: 'bottom' as const, key: 'wl4' },
  { target: '[data-tour="fab-wallet"]',              placement: 'top'    as const, key: 'wl5' },
  { target: '[data-tour="wallet-first-card"]',       placement: 'bottom' as const, key: 'wl6' },
  { target: '[data-tour="nav-tab-loan"]',            placement: 'top'    as const, key: 'ln1' },
  { target: '[data-tour="fab-loan"]',                placement: 'top'    as const, key: 'ln2' },
  { target: '[data-tour="loan-counterparty-list"]',  placement: 'bottom' as const, key: 'ln3' },
  { target: '[data-tour="nav-tab-report"]',          placement: 'top'    as const, key: 'rp1' },
  { target: '[data-tour="report-period-tabs"]',      placement: 'bottom' as const, key: 'rp2' },
  { target: '[data-tour="report-donut-mode"]',       placement: 'bottom' as const, key: 'rp3' },
  { target: '[data-tour="report-donut-chart"]',      placement: 'bottom' as const, key: 'rp4' },
  { target: '[data-tour="report-custom-fab"]',       placement: 'top'    as const, key: 'rp5' },
  { target: '[data-tour="nav-tab-transactions"]',    placement: 'top'    as const, key: 'end' },
];

const TRANSITION_STEPS: Record<number, string> = {
  0:  '/transactions',
  7:  '/wallet',
  13: '/loan',
  16: '/report',
};

const SKIP_TARGETS: Record<number, number> = {
  0:  7,
  7:  13,
  13: 16,
  16: 21,
};

const MODULE_KEYS: Record<number, string> = {
  0:  'transactions',
  7:  'wallet',
  13: 'loan',
  16: 'report',
};

function TourSkipConfirm({
  open,
  moduleKey,
  onConfirm,
  onCancel,
}: Readonly<{
  open: boolean;
  moduleKey: string;
  onConfirm: () => void;
  onCancel: () => void;
}>) {
  const t = useTranslations('tour');
  if (!open) return null;

  const moduleName = moduleKey ? t(`modules.${moduleKey}`) : '';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <button
        type="button"
        aria-label={t("cancelAriaLabel")}
        onClick={onCancel}
        style={{ position: 'absolute', inset: 0, cursor: 'default', background: 'transparent', border: 'none' }}
      />
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: 480,
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-default)',
          borderTopLeftRadius: 'var(--radius-lg, 20px)',
          borderTopRightRadius: 'var(--radius-lg, 20px)',
          boxShadow: 'var(--shadow-lg)',
          padding: '20px 20px 24px',
          fontFamily: 'var(--font-sans, system-ui, sans-serif)',
        }}
      >
        <p
          style={{
            margin: '0 0 6px',
            fontSize: 'var(--font-size-headline, 17px)',
            fontWeight: 600,
            color: 'var(--text-primary)',
          }}
        >
          {t('skipTitle', { module: moduleName })}
        </p>
        <p
          style={{
            margin: '0 0 20px',
            fontSize: 'var(--font-size-subhead, 15px)',
            color: 'var(--text-secondary)',
            lineHeight: 1.5,
          }}
        >
          {t('skipDescription', { module: moduleName })}
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              flex: 1,
              height: 'var(--tap-target-min, 44px)',
              borderRadius: 'var(--radius-card, 12px)',
              border: '1px solid var(--border-default)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-secondary)',
              fontSize: 'var(--font-size-subhead, 15px)',
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {t('backToTour')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              flex: 1,
              height: 'var(--tap-target-min, 44px)',
              borderRadius: 'var(--radius-card, 12px)',
              border: 'none',
              background: 'var(--color-brand)',
              color: 'var(--text-on-primary)',
              fontSize: 'var(--font-size-subhead, 15px)',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {t('confirmSkip')}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ProductTour() {
  const [isMounted, setIsMounted] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [joyrideRun, setJoyrideRun] = useState(false);
  const [confirmSkip, setConfirmSkip] = useState(false);
  const [pendingModuleName, setPendingModuleName] = useState('');
  const pendingStepRef = useRef<number>(0);
  const pathname = usePathname();
  const router = useRouter();

  const t = useTranslations('tour');
  const run = useTourStore((s) => s.run);
  const completeTour = useTourStore((s) => s.completeTour);
  const skipTour = useTourStore((s) => s.skipTour);

  const tourSteps = STEP_TARGETS.map(({ target, placement, key }) => ({
    target,
    placement,
    disableBeacon: true,
    content: t(`steps.${key}`),
  }));

  useEffect(() => { setIsMounted(true); }, []);

  const pathnameRef = useRef(pathname);
  const routerRef = useRef(router);
  useEffect(() => { pathnameRef.current = pathname; }, [pathname]);
  useEffect(() => { routerRef.current = router; }, [router]);

  useEffect(() => {
    if (run) {
      setStepIndex(0);
      setJoyrideRun(false);
      if (!pathnameRef.current.startsWith('/transactions')) {
        routerRef.current.push('/transactions');
      }
    } else {
      setJoyrideRun(false);
    }
  }, [run]);

  useEffect(() => {
    if (run && pathname.startsWith('/transactions')) {
      setJoyrideRun(true);
    }
  }, [run, pathname]);

  const handleEvent = (data: EventData) => {
    const { action, status, type } = data;

    if (status === STATUS.FINISHED) { completeTour(); return; }
    if (status === STATUS.SKIPPED)  { skipTour(); return; }

    if (type === EVENTS.TARGET_NOT_FOUND) {
      setStepIndex((i) => i + 1);
      return;
    }

    if (type === EVENTS.STEP_AFTER) {
      if (action === ACTIONS.NEXT) {
        setStepIndex((i) => i + 1);
      } else if (action === ACTIONS.PREV) {
        setStepIndex((i) => i - 1);
      }
    }
  };

  const shouldIntercept = useCallback((index: number): boolean => {
    const expectedPath = TRANSITION_STEPS[index];
    if (expectedPath && !pathname.startsWith(expectedPath)) {
      pendingStepRef.current = index;
      setPendingModuleName(MODULE_KEYS[index] ?? '');
      setConfirmSkip(true);
      return true;
    }
    return false;
  }, [pathname]);

  const handleConfirmSkip = () => {
    setStepIndex(SKIP_TARGETS[pendingStepRef.current]);
    setConfirmSkip(false);
  };

  const handleCancelSkip = () => {
    setConfirmSkip(false);
  };

  const contextValue = useMemo(() => ({ shouldIntercept }), [shouldIntercept]);

  if (!isMounted) return null;

  return (
    <TourInterceptContext.Provider value={contextValue}>
      <Joyride
        steps={tourSteps}
        run={joyrideRun}
        stepIndex={stepIndex}
        continuous
        onEvent={handleEvent}
        tooltipComponent={TourTooltip}
        beaconComponent={TourBeacon}
        options={{
          zIndex: 1000,
          overlayColor: 'rgba(0, 0, 0, 0.45)',
          overlayClickAction: false,
          dismissKeyAction: false,
          showProgress: false,
          skipScroll: false,
          spotlightRadius: 12,
          spotlightPadding: 6,
        }}
      />

      <TourSkipConfirm
        open={confirmSkip}
        moduleKey={pendingModuleName}
        onConfirm={handleConfirmSkip}
        onCancel={handleCancelSkip}
      />
    </TourInterceptContext.Provider>
  );
}
