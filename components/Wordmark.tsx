type WordmarkProps = {
  className?: string;
};

export function Wordmark({ className = "" }: WordmarkProps) {
  return (
    <span className={`wordmark ${className}`.trim()} aria-label="Utopia Homes">
      <span className="wordmark-art" aria-hidden="true">
        <svg className="wordmark-u" viewBox="0 0 46 52" focusable="false">
          <path className="wordmark-u-left" d="M2 3h9v34l12 8v7L2 40Z" />
          <path className="wordmark-u-right" d="M35 3h9v37L23 52v-7l12-8Z" />
          <path className="wordmark-u-light" d="m11 3 7 7v26l5 3v6l-12-8Z" />
          <path className="wordmark-u-shadow" d="m35 3-7 7v26l-5 3v6l12-8Z" />
        </svg>
        <span className="wordmark-utopia">
          top
          <span className="wordmark-i">
            <svg className="wordmark-clover" viewBox="0 0 22 22" focusable="false">
              <path d="M11 10.7C9.4 8.8 7.7 6.3 8.4 4.1A3.1 3.1 0 0 1 14.3 4c.8 2.3-1.3 4.9-3.3 6.7Z" />
              <path d="M10.5 11.1C7.9 11.2 4.7 10.8 3.5 8.8a3.1 3.1 0 0 1 4.3-4.2c2 1.2 2.5 4.3 2.7 6.5Z" />
              <path d="M11.5 11.1c.2-2.2.7-5.3 2.7-6.5a3.1 3.1 0 0 1 4.3 4.2c-1.2 2-4.4 2.4-7 2.3Z" />
              <path d="M11 10.5c.1 2.1 1.1 3.8 3.3 5.2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <span className="wordmark-i-stem" />
          </span>
          a
        </span>
        <span className="wordmark-homes">
          <svg className="wordmark-h" viewBox="0 0 38 52" focusable="false">
            <path className="wordmark-h-left" d="M2 3h9v18h16V3h9v46h-9V30H11v19H2Z" />
            <path className="wordmark-h-light" d="m11 3 6 6v12h-6ZM11 30h6v13l-6 6Z" />
            <path className="wordmark-h-shadow" d="m27 3-6 6v12h6ZM21 30h6v19l-6-6Z" />
          </svg>
          <span className="wordmark-omes">omes</span>
        </span>
      </span>
    </span>
  );
}
