'use client';

import type { BeaconRenderProps } from 'react-joyride';

const BEACON_SIZE = 36;

const STYLES = `
  @keyframes tbp { 0%,100%{transform:scale(1);opacity:.8} 50%{transform:scale(1.4);opacity:.2} }
  @keyframes tbd { 0%,100%{transform:scale(1)} 50%{transform:scale(.82)} }
  .tb-ring { animation: tbp 1.4s ease-in-out infinite; }
  .tb-dot  { animation: tbd 1.4s ease-in-out infinite; }
`;

export function TourBeacon(_props: Readonly<BeaconRenderProps>) {
  return (
    <span
      style={{
        width: BEACON_SIZE,
        height: BEACON_SIZE,
        borderRadius: '50%',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <span
        className="tb-ring"
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background: 'var(--color-brand)',
          opacity: 0.4,
        }}
      />
      <span
        className="tb-dot"
        style={{
          width: BEACON_SIZE * 0.5,
          height: BEACON_SIZE * 0.5,
          borderRadius: '50%',
          background: 'var(--color-brand)',
          display: 'block',
        }}
      />
    </span>
  );
}
