import { FounderCommandCentre } from '@/components/cos/founder-command-centre';
import { getCosDashboardSnapshot } from '@/modules/ai-cos';

export const dynamic = 'force-dynamic';

export default function CosFounderCommandCentrePage() {
  const initialSnapshot = getCosDashboardSnapshot();
  return <FounderCommandCentre initialSnapshot={initialSnapshot} />;
}
