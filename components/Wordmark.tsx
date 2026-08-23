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
              <path d="M11 10.3C8.2 7.5 6.7 5.7 6.7 3.8A3.3 3.3 0 0 1 13 2.4a3.3 3.3 0 0 1 6.1 2.4c0 2.7-3 4-8.1 5.5Z" />
              <path d="M10.6 10.4C7 11.2 4.7 11.2 3.2 10.1a3.3 3.3 0 0 1 2.6-5.9c2.7.4 3.5 3.6 4.8 6.2Z" />
              <path d="M11.2 10.5c2.1 3 3 5.1 2.4 6.9a3.3 3.3 0 0 1-6.4-.6c-.5-2.7 2.3-4.5 4-6.3Z" />
              <path d="m11 10 6.7 9.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
            <span className="wordmark-i-stem" />
          </span>
          a
        </span>
        <span className="wordmark-homes">Homes</span>
      </span>
    </span>
  );
}
