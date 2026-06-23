export function ErrorMessage({ label, message }) {
  if (!message) return null;

  return (
    <pre className="error">
      {label}: {message}
    </pre>
  );
}
