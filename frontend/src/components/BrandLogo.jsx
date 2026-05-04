export default function BrandLogo({ className = "", compact = false }) {
  return (
    <div className={`ea-logo ${compact ? "is-compact" : ""} ${className}`.trim()}>
      <svg viewBox="0 0 84 84" role="img" aria-label="Elogixa Assess logo mark">
        <path
          d="M42 6 C33 16, 17 21, 8 23 C8 59, 31 73, 42 78 C53 73, 76 59, 76 23 C67 21, 51 16, 42 6 Z"
          fill="#8b5cf6"
        />
        <path
          d="M42 6 C51 16, 67 21, 76 23 C76 59, 53 73, 42 78 Z"
          fill="#f0abfc"
          opacity="0.45"
        />
        <path
          d="M16 28 C26 30, 32 35, 42 46 C52 35, 58 30, 68 28 C60 36, 52 47, 42 58 C32 47, 24 36, 16 28 Z"
          fill="#ffffff"
        />
        <path
          d="M20 22 C28 19, 36 15, 42 10 C45 14, 49 17, 54 20 C45 21, 33 26, 20 22 Z"
          fill="#ffffff"
          opacity="0.5"
        />
      </svg>
      <div className="ea-logo-text">
        <strong>
          <span>Elogixa</span> Assess
        </strong>
        <small>Smart Online Exams</small>
      </div>
    </div>
  );
}
