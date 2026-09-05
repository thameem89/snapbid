'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="page">
      <h1>A brief intermission.</h1>
      <p>We could not load this page. Please try again shortly.</p>
      <button className="button" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
