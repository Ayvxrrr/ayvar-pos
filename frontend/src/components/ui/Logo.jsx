/* Logo de Ayvar POS: bolsa de compra con visto de venta confirmada. */
export default function Logo({ size = 40, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Ayvar POS"
      className={className}
    >
      <defs>
        <linearGradient id="ayvar-logo-bg" x1="4" y1="2" x2="36" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3b82f6" />
          <stop offset="1" stopColor="#1d4ed8" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill="url(#ayvar-logo-bg)" />
      <rect x="0.5" y="0.5" width="39" height="39" rx="10.5" stroke="white" strokeOpacity="0.18" />
      <path
        d="M15.5 16.5v-1.2a4.5 4.5 0 0 1 9 0v1.2"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M11.6 16.5h16.8l-1.1 13.2a2.2 2.2 0 0 1-2.2 2H14.9a2.2 2.2 0 0 1-2.2-2L11.6 16.5Z"
        fill="white"
      />
      <path
        d="m16.4 24.4 2.7 2.7 5-5.3"
        stroke="#1d4ed8"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
