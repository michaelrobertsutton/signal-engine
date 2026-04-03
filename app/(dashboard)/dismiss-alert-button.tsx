'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DismissAlertButton({ eventType }: { eventType: string }) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  async function handleClick() {
    await fetch('/api/admin/dismiss-alert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventType }),
    });
    setDismissed(true);
    router.refresh();
  }

  return (
    <button
      onClick={handleClick}
      className="ml-auto shrink-0 text-current opacity-60 hover:opacity-100 transition-opacity"
      aria-label="Dismiss alert"
    >
      ✕
    </button>
  );
}
