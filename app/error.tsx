"use client";
export default function ErrorPage({ reset }: {
    reset: () => void;
}) { return <div className="container"><h1>We couldn’t load this page.</h1><p>The service may be temporarily unavailable. Your private work remains protected.</p><button className="button" onClick={reset}>Try again</button></div>; }
