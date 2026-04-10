import { useLocation } from 'react-router-dom';
import SuiteLaunchOverlay, { ACCENT_TEXT } from '@/components/SuiteLaunchOverlay';

const ASM_URL = 'http://43.205.213.93:8000/';

const SCAN_LINES = [
  'Initializing recon modules...',
  'Loading subdomain enumeration engine...',
  'Connecting to threat intelligence feeds...',
  'Bootstrapping vulnerability scanner...',
  'Syncing attack surface database...',
  'Calibrating passive recon pipeline...',
  'Establishing secure tunnel...',
  'Attack Surface Management ready.',
];

export default function ASM() {
  const { key } = useLocation();
  return (
    <SuiteLaunchOverlay
      key={key}
      launchMode="redirect"
      targetUrl={ASM_URL}
      iframeTitle="Attack Surface Management"
      scanLines={SCAN_LINES}
      phases={['RECON', 'INTEL', 'SCAN', 'REPORT']}
      productTitle={
        <>
          Attack Surface <span style={ACCENT_TEXT}>Management</span>
        </>
      }
    />
  );
}
