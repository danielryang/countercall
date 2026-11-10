import Link from 'next/link';

// Placeholder hero. The full landing page is Tier 6 (PLAN section 7.6); until then this links to the app and a keyless replay.
export default function Home() {
  return (
    <main style={{ padding: '4rem 2rem', maxWidth: '64rem' }}>
      <p>No. 01 / COUNTERCALL</p>
      <h1>Call the number you already have.</h1>
      <p>CounterCall reads accounts-payable email, freezes payments on a bank-change request, and phones the vendor on the number already on file.</p>
      <p>
        <Link href="/cases">Open the live queue</Link>
        {' · '}
        <Link href="/cases?replay=fraud">Watch a recorded real run</Link>
      </p>
    </main>
  );
}
