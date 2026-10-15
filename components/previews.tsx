import { presentationEmbed } from '@/lib/validation.mjs';
export function PresentationPreview({ url, title }: {
    url: string;
    title: string;
}) { const src = presentationEmbed(url); if (!src)
    return null; return <details className="presentation-preview"><summary>Preview presentation (loads Google Slides)</summary><p className="muted">This preview connects to Google. Download and external-link options remain available.</p><iframe src={src} title={title} loading="lazy" referrerPolicy="no-referrer" sandbox="allow-scripts allow-same-origin" allowFullScreen style={{ width: '100%', aspectRatio: '16/9', border: '1px solid #dce5e9', borderRadius: 8 }}/></details>; }
