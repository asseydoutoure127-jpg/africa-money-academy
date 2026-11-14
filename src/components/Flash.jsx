import { flashFor } from '@/lib/flash.js';

export default function Flash({ code }) {
  const f = flashFor(code);
  if (!f) return null;
  return (
    <p className={`flash ${f.type}`} role={f.type === 'err' ? 'alert' : 'status'}>
      {f.text}
    </p>
  );
}
