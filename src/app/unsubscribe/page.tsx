'use client';

import { useEffect, useState } from 'react';
import { getRuntimeConfig } from '@/lib/runtime-config';

export default function UnsubscribePage() {
  const [state, setState] = useState<'working' | 'done' | 'error'>('working');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    getRuntimeConfig()
      .then(({ apiUrl }) => fetch(`${apiUrl}/public/unsubscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead: params.get('lead'), sig: params.get('sig') }),
      }))
      .then((res) => setState(res.ok ? 'done' : 'error'))
      .catch(() => setState('error'));
  }, []);

  return (
    <section className="tw-spacing flex min-h-svh items-center justify-center bg-[#F5F6FA] px-4 pt-[120px] pb-20">
      <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
        <h1 className="font-heading text-2xl font-extrabold text-[#0A1F44]">
          {state === 'working' ? 'Unsubscribing…' : state === 'done' ? "You've been unsubscribed" : 'Something went wrong'}
        </h1>
        <p className="mt-3 font-body text-sm text-gray-500">
          {state === 'done' && "You won't receive any more emails from Arthur T Realty. To stop text messages, reply STOP to any text."}
          {state === 'error' && 'This unsubscribe link is invalid or expired. Reply to any of our emails and we will remove you.'}
        </p>
      </div>
    </section>
  );
}
