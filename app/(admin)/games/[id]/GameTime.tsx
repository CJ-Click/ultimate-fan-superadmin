'use client';

/**
 * Render scheduled_at in the viewer's local timezone.  The games list is a
 * client component, so its Date formatting already runs in the browser.  The
 * detail header is server-rendered; formatting there used Vercel's timezone
 * instead and made one game appear at two different times.
 */
export default function GameTime({ value }: { value: string }) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return (
    <span className="text-muted ml-2">
      · {date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })}
    </span>
  );
}
