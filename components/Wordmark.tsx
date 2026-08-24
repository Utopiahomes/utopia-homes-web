import Image from "next/image";

type WordmarkProps = {
  className?: string;
  division?: "Homes" | "Interiors";
};

function DivisionInitial({ division }: { division: "Homes" | "Interiors" }) {
  if (division === "Homes") return <svg className="wordmark-division-initial wordmark-h" viewBox="0 0 38 52" focusable="false">
    <path className="wordmark-division-main" d="M2 3h9v18h16V3h9v46h-9V30H11v19H2Z" />
    <path className="wordmark-division-light" d="m11 3 6 6v12h-6ZM11 30h6v13l-6 6Z" />
    <path className="wordmark-division-shadow" d="m27 3-6 6v12h6ZM21 30h6v19l-6-6Z" />
  </svg>;

  return <svg className="wordmark-division-initial wordmark-interiors-i" viewBox="0 0 24 52" focusable="false">
    <path className="wordmark-division-main" d="M2 3h20v8h-6v30h6v8H2v-8h6V11H2Z" />
    <path className="wordmark-division-light" d="m8 11 8 6v24l-8-6Z" />
    <path className="wordmark-division-shadow" d="m16 17-5 4v18l5 2Z" />
  </svg>;
}

export function Wordmark({ className = "", division = "Homes" }: WordmarkProps) {
  if (division === "Homes") {
    return (
      <span className={`wordmark wordmark-homes ${className}`.trim()} aria-label="Utopia Homes">
        <Image
          className="wordmark-logo-image"
          src="/images/utopia-homes-logo.png"
          alt=""
          aria-hidden="true"
          width={2172}
          height={724}
          sizes="(max-width: 620px) 190px, 240px"
        />
      </span>
    );
  }

  const divisionRemainder = "nteriors";
  return (
    <span className={`wordmark wordmark-${division.toLowerCase()} ${className}`.trim()} aria-label={`Utopia ${division}`}>
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
            <svg className="wordmark-clover" viewBox="0 0 40 38" focusable="false">
              <path d="M20 15C15 11 11 7 12 3 13-1 18-1 20 3 22-1 27-1 28 3 29 7 25 11 20 15Z" />
              <path d="M18 17C13 18 6 19 3 16 0 13 2 8 6 8 4 4 10 2 13 5 17 8 18 13 18 17Z" />
              <path d="M22 17C27 18 34 19 37 16 40 13 38 8 34 8 36 4 30 2 27 5 23 8 22 13 22 17Z" />
              <path d="M19 15C20 21 21 26 26 31 28 33 26 36 24 34 18 30 17 23 18 17Z" />
            </svg>
            <span className="wordmark-i-stem" />
          </span>
          a
        </span>
        <span className="wordmark-division">
          <DivisionInitial division={division} />
          <span className="wordmark-division-remainder">{divisionRemainder}</span>
        </span>
      </span>
    </span>
  );
}
