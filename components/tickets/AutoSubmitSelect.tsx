"use client";

/** A <select> that submits its GET form on change, so filters apply without an extra click. */
export default function AutoSubmitSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} onChange={(e) => e.currentTarget.form?.requestSubmit()} />;
}
