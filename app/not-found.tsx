import Link from "next/link";

export default function NotFound() { return <div className="not-found"><p className="eyebrow">404</p><h1>This stay is off the map.</h1><p>The page may have moved, or this home is not currently part of the collection.</p><Link className="button button-primary" href="/stays">Explore stays</Link></div>; }
