import { useLocation } from 'react-router-dom';
import SuiteLaunchOverlay, { ACCENT_TEXT } from '@/components/SuiteLaunchOverlay';

const LLM_URL = 'https://technieum-llm-suite-v2-iota.vercel.app/';

const SCAN_LINES = [
  'Initializing LLM attack surface engine...',
  'Loading prompt injection payloads...',
  'Bootstrapping jailbreak taxonomy...',
  'Connecting to model API endpoints...',
  'Calibrating token boundary analysis...',
  'Syncing RAG poisoning modules...',
  'Loading adversarial ML classifiers...',
  'LLM Attack Suite ready.',
];

export default function LLM() {
  const { key } = useLocation();
  return (
    <SuiteLaunchOverlay
      key={key}
      launchMode="iframe"
      targetUrl={LLM_URL}
      iframeTitle="LLM Attack Suite"
      scanLines={SCAN_LINES}
      phases={['RECON', 'INJECT', 'EXFIL', 'REPORT']}
      productTitle={
        <>
          Large Language <span style={ACCENT_TEXT}>Model Attack</span>
        </>
      }
    />
  );
}
