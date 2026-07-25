import Link from "next/link";

export default function NotFound() {
  return (
    <div className="notFound">
      <span>404 / evidence not indexed</span>
      <h1>This metric is outside the published catalog.</h1>
      <p>Return to the validated analytics set; arbitrary metric invention is disabled.</p>
      <Link className="primaryButton" href="/product-analytics">
        Open product analytics
      </Link>
    </div>
  );
}

