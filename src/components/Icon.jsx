// Petites icônes dessinées à la main (SVG), aux couleurs du site. Décoratives : cachées aux lecteurs d'écran.
const PATHS = {
  phone: <><rect x="7" y="2.5" width="10" height="19" rx="2.5" /><path d="M10.5 18.5h3" /></>,
  book: <><path d="M4 5.5C4 4.7 4.7 4 5.5 4H11v15H5.5C4.7 19 4 18.3 4 17.5z" /><path d="M20 5.5c0-.8-.7-1.5-1.5-1.5H13v15h5.5c.8 0 1.5-.7 1.5-1.5z" /></>,
  coins: <><circle cx="9" cy="9" r="5" /><path d="M14.5 6.2A5 5 0 1 1 11 15.6" /><path d="M9 7v4m-1.5-2h3" /></>,
  shield: <><path d="M12 3 4.5 6v5.5c0 4.4 3 7.9 7.5 9.5 4.5-1.6 7.5-5.1 7.5-9.5V6z" /><path d="m8.8 12 2.3 2.3 4.1-4.6" /></>,
  target: <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1" /></>,
  pen: <><path d="M4 20l1-4L16.5 4.5a2 2 0 0 1 2.8 2.8L7.8 18.8z" /><path d="M14.5 6.5l3 3" /></>,
  lock: <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
  users: <><circle cx="9" cy="8.5" r="3.2" /><path d="M3 20c.4-3.4 2.9-5.5 6-5.5s5.600 2.100 6 5.500" /><path d="M16.500 5.800a3 3 0 0 1 0 5.400M18 14.800c1.800.700 2.800 2.400 3 5" /></>,
  check: <path d="m5 12.500 4.500 4.500L19 7.500" />,
};

export default function Icon({ name, size = 28 }) {
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {PATHS[name]}
    </svg>
  );
}
