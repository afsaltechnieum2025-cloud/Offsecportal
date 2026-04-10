import { useLocation } from 'react-router-dom';
import SuiteLaunchOverlay, { ACCENT_TEXT } from '@/components/SuiteLaunchOverlay';

const SAST_URL = 'http://13.203.230.135:3000/';

const SCAN_LINES = [
  'Initializing static analysis engine...',
  'Loading AST parser modules...',
  'Connecting to vulnerability databases...',
  'Bootstrapping taint analysis pipeline...',
  'Syncing OWASP Top 10 mappings...',
  'Calibrating data flow tracking...',
  'Loading semantic analysis classifiers...',
  'Static Application Security Testing ready.',
];

export default function SAST() {
  const { key } = useLocation();
  return (
    <SuiteLaunchOverlay
      key={key}
      launchMode="redirect"
      targetUrl={SAST_URL}
      iframeTitle="Static Application Security Testing"
      scanLines={SCAN_LINES}
      phases={['AST', 'TAINT', 'FLOW', 'VULN']}
      productTitle={
        <>
          Static Application <span style={ACCENT_TEXT}>Security Testing</span>
        </>
      }
    />
  );
}
