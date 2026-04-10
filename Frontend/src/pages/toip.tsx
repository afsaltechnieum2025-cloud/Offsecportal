import { useLocation } from 'react-router-dom';
import SuiteLaunchOverlay, { ACCENT_TEXT } from '@/components/SuiteLaunchOverlay';

const TOIP_URL = 'http://13.232.87.75:5000';

const SCAN_LINES = [
  'Initializing threat intelligence modules...',
  'Loading adversary tracking engine...',
  'Connecting to dark web monitoring feeds...',
  'Bootstrapping IOC correlation pipeline...',
  'Syncing MITRE ATT&CK framework...',
  'Calibrating TTP mapping algorithms...',
  'Loading exploit intelligence database...',
  'Offensive Intelligence Portal ready.',
];

export default function TOIP() {
  const { key } = useLocation();
  return (
    <SuiteLaunchOverlay
      key={key}
      launchMode="redirect"
      targetUrl={TOIP_URL}
      iframeTitle="Offensive Intelligence Portal"
      scanLines={SCAN_LINES}
      phases={['INTEL', 'IOC', 'TTP', 'REPORT']}
      productTitle={
        <>
          Technieum Offensive Security{' '}
          <span style={ACCENT_TEXT}>Intelligence Portal</span>
        </>
      }
    />
  );
}
