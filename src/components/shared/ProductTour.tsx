'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Joyride, ACTIONS, EVENTS, STATUS, type EventData, type Controls } from 'react-joyride';
import { useTranslations } from 'next-intl';
import { useTourStore } from '@/lib/stores/useTourStore';
import { TourTooltip } from '@/components/shared/TourTooltip';
import { TourBeacon } from '@/components/shared/TourBeacon';
import { TourInterceptContext } from '@/lib/stores/tourInterceptContext';

// index 0–6: Transactions, 7–12: Wallet, 13–15: Loan, 16–20: Report, 21: END
const STEP_TARGETS = [
  // Transactions (7 steps)
  { target: '[data-tour="nav-tab-transactions"]',    placement: 'top'    as const, key: 'tx1' }, // 0 — transition
  { target: '[data-tour="tx-date-nav"]',             placement: 'bottom' as const, key: 'tx2' }, // 1
  { target: '[data-tour="tx-summary"]',              placement: 'bottom' as const, key: 'tx3' }, // 2
  { target: '[data-tour="fab-transactions"]',        placement: 'top'    as const, key: 'tx4' }, // 3
  { target: '[data-tour="transactions-filter-bar"]', placement: 'left'   as const, key: 'tx5' }, // 4
  { target: '[data-tour="tx-export"]',               placement: 'bottom' as const, key: 'tx6' }, // 5
  { target: '[data-tour="tx-history"]',              placement: 'bottom' as const, key: 'tx7' }, // 6
  // Wallet (6 steps)
  { target: '[data-tour="nav-tab-wallet"]',          placement: 'top'    as const, key: 'wl1' }, // 7 — transition
  { target: '[data-tour="wl-total-balance"]',        placement: 'bottom' as const, key: 'wl2' }, // 8
  { target: '[data-tour="wl-filter-type"]',          placement: 'bottom' as const, key: 'wl3' }, // 9
  { target: '[data-tour="wl-sort"]',                 placement: 'bottom' as const, key: 'wl4' }, // 10
  { target: '[data-tour="fab-wallet"]',              placement: 'top'    as const, key: 'wl5' }, // 11
  { target: '[data-tour="wallet-first-card"]',       placement: 'bottom' as const, key: 'wl6' }, // 12
  // Loan (3 steps)
  { target: '[data-tour="nav-tab-loan"]',            placement: 'top'    as const, key: 'ln1' }, // 13 — transition
  { target: '[data-tour="fab-loan"]',                placement: 'top'    as const, key: 'ln2' }, // 14
  { target: '[data-tour="loan-counterparty-list"]',  placement: 'bottom' as const, key: 'ln3' }, // 15
  // Report (5 steps)
  { target: '[data-tour="nav-tab-report"]',          placement: 'top'    as const, key: 'rp1' }, // 16 — transition
  { target: '[data-tour="report-period-tabs"]',      placement: 'bottom' as const, key: 'rp2' }, // 17
  { target: '[data-tour="report-donut-mode"]',       placement: 'bottom' as const, key: 'rp3' }, // 18
  { target: '[data-tour="report-donut-chart"]',      placement: 'bottom' as const, key: 'rp4' }, // 19
  { target: '[data-tour="report-custom-fab"]',       placement: 'top'    as const, key: 'rp5' }, // 20 — silently skipped if not on Custom tab
  // End
  { target: '[data-tour="nav-tab-transactions"]',    placement: 'top'    as const, key: 'end' }, // 21
];

// Transition step indices that require tab navigation before advancing
const TRANSITION_STEPS: Record<number, string> = {
  0:  '/transactions',
  7:  '/wallet',
  13: '/loan',
  16: '/report',
};

const SKIP_TARGETS: Record<number, number> = {
  0:  7,  // Skip Transactions → WL-1
  7:  13, // Skip Wallet       → LN-1
  13: 16, // Skip Loan         → RP-1
  16: 21, // Skip Report       → END
};

const MODULE_NAMES: Record<number, string> = {
  0:  'Transactions',
  7:  'Wallet',
  13: 'Loan',
  16: 'Report',
};

function TourSkipConfirm({
  open,
  moduleName,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  moduleName: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const t = useTranslations('tour');
  if (!open) return null;

  return (
    // Plain div overlay — no Radix portal, no focus trap, no aria-hidden side-effects
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
      onClick={onCancel}
    >
      <div
        style={{
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
        onClick={(e) => e.stopPropagation()}
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
    content: t(`steps.${key}` as Parameters<typeof t>[0]),
  }));

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setIsMounted(true); }, []);

  // When tour is requested: reset step + navigate if needed, but don't start Joyride yet
  useEffect(() => {
    if (run) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStepIndex(0);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setJoyrideRun(false);
      if (!pathname.startsWith('/transactions')) {
        router.push('/transactions');
      }
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setJoyrideRun(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run]);

  // Only activate Joyride once we are actually on /transactions
  useEffect(() => {
    if (run && pathname.startsWith('/transactions')) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setJoyrideRun(true);
    }
  }, [run, pathname]);

  if (!isMounted) return null;

  const handleEvent = (data: EventData, _controls: Controls) => {
    const { action, index, status, type } = data;

    if (status === STATUS.FINISHED) { completeTour(); return; }
    if (status === STATUS.SKIPPED)  { skipTour(); return; }

    // Silently advance when target element is absent (e.g. empty wallet/loan list)
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

  const shouldIntercept = (index: number): boolean => {
    const expectedPath = TRANSITION_STEPS[index];
    if (expectedPath && !pathname.startsWith(expectedPath)) {
      pendingStepRef.current = index;
      setPendingModuleName(MODULE_NAMES[index] ?? '');
      setConfirmSkip(true);
      return true;
    }
    return false;
  };

  const handleConfirmSkip = () => {
    setStepIndex(SKIP_TARGETS[pendingStepRef.current]);
    setConfirmSkip(false);
  };

  const handleCancelSkip = () => {
    setConfirmSkip(false);
  };

  return (
    <TourInterceptContext.Provider value={{ shouldIntercept }}>
      <Joyride
        steps={tourSteps}
        run={joyrideRun}
        stepIndex={stepIndex}
        continuous
        onEvent={handleEvent}
        tooltipComponent={TourTooltip}
        beaconComponent={TourBeacon}
        options={{
          // Joyride z-index kept below dialog's z-[2000]
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
        moduleName={pendingModuleName}
        onConfirm={handleConfirmSkip}
        onCancel={handleCancelSkip}
      />
    </TourInterceptContext.Provider>
  );
}
