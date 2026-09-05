import { ChevronDown, Instagram, Youtube } from 'lucide-react';

const platforms = [
  { name: 'Snapchat', icon: '♧', status: 'Live', live: true },
  { name: 'Instagram', icon: <Instagram size={17} />, status: 'Coming soon' },
  { name: 'TikTok', icon: '♪', status: 'Coming soon' },
  { name: 'YouTube', icon: <Youtube size={18} />, status: 'Coming soon' },
  { name: 'X', icon: '𝕏', status: 'Coming soon' },
];

export function PlatformSelector() {
  return (
    <details className="platform-selector">
      <summary className="platform-pill" aria-label="Choose social platform">
        <span className="snap-symbol">♧</span>
        <span>
          <small>Platform</small>
          Snapchat
        </span>
        <ChevronDown size={14} className="platform-chevron" />
        <span className="live-label">LIVE</span>
      </summary>
      <div className="platform-menu" role="menu" aria-label="Social platforms">
        {platforms.map((platform) => (
          <div
            className={`platform-option ${platform.live ? 'is-live' : ''}`}
            role="menuitem"
            aria-disabled={!platform.live}
            key={platform.name}
          >
            <span className="platform-option-icon">{platform.icon}</span>
            <strong>{platform.name}</strong>
            <span>{platform.status}</span>
          </div>
        ))}
      </div>
    </details>
  );
}
