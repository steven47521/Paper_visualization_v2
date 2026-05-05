/**
 * Minimal stroke icons for domain subcategory turntable (24×24 viewBox).
 */
export function domainTabIconSvg(tabId: string): string {
  const stroke = 'stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" fill="none"';

  const map: Record<string, string> = {
    instruction_following: `<path ${stroke} d="M8 4h11v16H8zM6 4v16"/><path ${stroke} d="M11 9h5M11 13h5"/>`,
    long_context: `<circle ${stroke} cx="12" cy="12" r="8"/><path ${stroke} d="M12 8v5l3 2"/>`,
    math: `<path ${stroke} d="M9 7l-2 10M13 7l2 10M7 11h10"/><path ${stroke} d="M10 17h5"/>`,
    reasoning: `<path ${stroke} d="M12 5c-3 3-5 5.5-5 9a5 5 0 0 0 10 0c0-3.5-2-6-5-9z"/><path ${stroke} d="M12 14v3"/>`,
    knowledge: `<path ${stroke} d="M7 5h11v14H7z"/><path ${stroke} d="M10 5V3M15 5V3"/><path ${stroke} d="M10 19v2M15 19v2"/><path ${stroke} d="M10 9h6"/>`,
    safety: `<path ${stroke} d="M12 4l7 3v5c0 4-3 7-7 9-4-2-7-5-7-9V7l7-3z"/><circle cx="12" cy="11" r="1.25" fill="currentColor" stroke="none"/>`,
    role_playing: `<circle ${stroke} cx="12" cy="9" r="3"/><path ${stroke} d="M6 20v-1a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v1"/>`,
    code_agent: `<path ${stroke} d="M8 9l-3 3 3 3M16 15l3-3-3-3"/><path ${stroke} d="M14 6l-4 13"/>`,
    search_agent: `<circle ${stroke} cx="11" cy="11" r="6"/><path ${stroke} d="M20 20l-4-4"/>`,
    multimodal_agent: `<rect ${stroke} x="4" y="5" width="16" height="12" rx="2"/><circle ${stroke} cx="10" cy="11" r="2"/><path ${stroke} d="M14 9h4M14 13h3"/>`,
    /** MLLM / multimodal turntable */
    image_understanding: `<rect ${stroke} x="4.5" y="6" width="15" height="11" rx="1.75"/><circle ${stroke} cx="9" cy="10.5" r="1.35"/><path ${stroke} d="M6.5 16.5l2.5-3 2 2 3.5-4.5 3.5 5.5"/>`,
    long_video_understanding: `<rect ${stroke} x="4" y="6.5" width="16" height="10" rx="1.75"/><path ${stroke} d="M6.5 9v2M6.5 13v2M17.5 9v2M17.5 13v2"/><path ${stroke} d="M9.75 9.75l3.75 2.25-3.75 2.25z"/><path ${stroke} d="M5 18.25h14"/>`,
    video_captioning: `<rect ${stroke} x="5" y="5" width="14" height="8" rx="1.5"/><path ${stroke} d="M10 8.25l3.25 1.75L10 11.75z"/><path ${stroke} d="M6 15.5h12M6 18h8"/>`,
    omni_understanding: `<circle ${stroke} cx="12" cy="12" r="2.4"/><circle ${stroke} cx="12" cy="7.2" r="1.45"/><circle ${stroke} cx="7" cy="14.3" r="1.45"/><circle ${stroke} cx="17" cy="14.3" r="1.45"/><path ${stroke} d="M12 9.6V8.65M9.35 13.05l-1.1.65M14.65 13.05l1.1.65"/>`,
  };

  const fallback = `<path ${stroke} d="M6 6h12v12H6z"/><path ${stroke} d="M9 9h6v6H9z"/>`;
  const inner = map[tabId] ?? fallback;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">${inner}</svg>`;
}
