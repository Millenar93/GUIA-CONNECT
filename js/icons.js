// Shared line icons: the same stroke, proportions and family across the application.
const paths = {
  photo:
    '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="2"/><path d="m3 17 6-6 4 4 3-3 5 5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  link: '<path d="m10 14 4-4M8 16l-2 2a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0M16 8l2-2a4 4 0 0 1 6 6l-5 5a4 4 0 0 1-6 0" transform="translate(1 0) scale(.9)"/>',
  expand: '<path d="M14 3h7v7M10 21H3v-7M21 3l-7 7M3 21l7-7"/>',
  collapse: '<path d="M3 10h7V3M21 14h-7v7M10 10 3 3M14 14l7 7"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  heart:
    '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
  map: '<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Z"/><path d="M9 3v15M15 6v15"/>',
  star: '<path d="m12 3 2.8 5.7 6.3.9-4.5 4.4 1.1 6.3-5.7-3-5.7 3 1.1-6.3-4.5-4.4 6.3-.9Z"/>',
  person: '<circle cx="12" cy="7" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
  search: '<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',
  filters:
    '<path d="M3 6h18M3 12h18M3 18h18"/><circle cx="8" cy="6" r="2" fill="white"/><circle cx="16" cy="12" r="2" fill="white"/><circle cx="9" cy="18" r="2" fill="white"/>',
  locate:
    '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  food: '<path d="M4 3v6a3 3 0 0 0 6 0V3M7 3v18M20 21V3c-4 0-5 8 0 9"/>',
  bed: '<path d="M3 19V7M21 19V9a2 2 0 0 0-2-2H3M3 15h18M8 7v8M3 11h5"/>',
  boat: '<path d="m12 3 7 10H12ZM12 3v14M3 17h18l-3 4H6ZM3 23q3-2 6 0t6 0t6 0"/>',
  mountain:
    '<path d="m2 20 8-14 5 8 3-5 4 11ZM7 11l3 2 2-3"/><circle cx="18" cy="4" r="2"/>',
  calendar:
    '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18M7 14h2M15 14h2M7 17h2"/>',
  tools:
    '<path d="M14 5a5 5 0 0 0-6 6L3 16a3 3 0 0 0 4 4l5-5a5 5 0 0 0 6-6l-4 4-3-3Z"/>',
};
export function icon(name) {
  return `<svg class="line-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[name] || paths.map}</svg>`;
}
