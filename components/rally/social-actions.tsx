'use client';
import { Download, ArrowUpRight } from 'lucide-react';
import { post } from './forms';
export function DownloadCard({
  username,
  location,
  rank,
  demo,
}: {
  username: string;
  location: string;
  rank: number;
  demo: boolean;
}) {
  return (
    <button
      className="button secondary"
      onClick={() => {
        const canvas = document.createElement('canvas');
        canvas.width = 1080;
        canvas.height = 1350;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.fillStyle = '#101112';
        ctx.fillRect(0, 0, 1080, 1350);
        ctx.fillStyle = '#e8fa6c';
        ctx.font = 'bold 72px Arial';
        ctx.fillText('rally.', 80, 150);
        ctx.fillStyle = '#a0a5a4';
        ctx.font = '28px Arial';
        ctx.fillText('SNAPCHAT / SPONSORED RANKING', 80, 230);
        ctx.fillStyle = '#f3f4ee';
        ctx.font = '44px Arial';
        ctx.fillText(location, 80, 390);
        ctx.fillStyle = '#e8fa6c';
        ctx.font = 'bold 300px Arial';
        ctx.fillText(`#${rank}`, 65, 740);
        ctx.fillStyle = '#f3f4ee';
        ctx.font = 'bold 60px Arial';
        ctx.fillText(`@${username}`, 80, 880);
        ctx.fillStyle = '#a0a5a4';
        ctx.font = '25px Arial';
        ctx.fillText('Based on purchased promotion value.', 80, 1110);
        ctx.fillText(
          demo
            ? 'Fictional preview profile.'
            : `Position snapshot: ${new Date().toISOString().slice(0, 10)}`,
          80,
          1160,
        );
        ctx.fillText(
          'Independent platform. Not affiliated with Snap Inc.',
          80,
          1210,
        );
        const link = document.createElement('a');
        link.download = `rally-${username}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      }}
    >
      <Download size={15} /> Download ranking card
    </button>
  );
}
export function OutboundProfile({
  username,
  id,
}: {
  username: string;
  id: string;
}) {
  return (
    <a
      className="text-link"
      href={`https://www.snapchat.com/add/${encodeURIComponent(username)}`}
      rel="noopener noreferrer"
      target="_blank"
      onClick={() => {
        void post('/api/analytics', {
          event: 'outbound_click',
          accountId: id,
        }).catch(() => {});
      }}
    >
      Open Snapchat profile <ArrowUpRight size={16} />
    </a>
  );
}
