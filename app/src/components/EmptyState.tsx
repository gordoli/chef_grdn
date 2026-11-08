import { Leaf } from 'lucide-react';
import type { ReactNode } from 'react';
export function EmptyState({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Leaf size={28} strokeWidth={1.2} />
      </span>
      <h2>{title}</h2>
      <div>{children}</div>
    </div>
  );
}
