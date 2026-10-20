import { PLATFORM_LABEL, STATUS_LABEL } from '../lib/format';
import type { Platform, Status } from '../lib/types';

const ICON: Record<Status, string> = { active: '●', paused: '❚❚', completed: '✓', draft: '✎' };

/** Status always ships with an icon and a label, never color alone. */
export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`badge status-${status}`}>
      <span aria-hidden className="badge-icon">{ICON[status]}</span>
      {STATUS_LABEL[status]}
    </span>
  );
}

export function PlatformTag({ platform }: { platform: Platform }) {
  return <span className="tag">{PLATFORM_LABEL[platform]}</span>;
}
