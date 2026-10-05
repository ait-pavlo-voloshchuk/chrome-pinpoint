import { useState } from 'react';
import { createRoot } from 'react-dom/client';

function SaveButton({ onClick }: { onClick(): void }) {
  return (
    <button type="submit" className="primary" data-pp-src="src/BillingForm.tsx:12:5" onClick={e => { e.preventDefault(); onClick(); }}>
      Save changes
    </button>
  );
}

function Actions({ onSave }: { onSave(): void }) {
  return (
    <div className="actions">
      <button type="button">Cancel</button>
      <SaveButton onClick={onSave} />
    </div>
  );
}

function BillingForm({ onSave }: { onSave(): void }) {
  return (
    <form className="billing-form">
      <label>Name <input name="name" /></label>
      <Actions onSave={onSave} />
    </form>
  );
}

function App() {
  const [status, setStatus] = useState('idle');
  return (
    <main>
      <section className="billing">
        <h1>Billing</h1>
        <BillingForm onSave={() => setStatus('clicked')} />
        <p id="status">{status}</p>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
