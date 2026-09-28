import SyncForm from "./SyncForm";

export default function ChatbotAdminPage() {
  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-xl font-semibold text-foreground">Chatbot knowledge</h1>
      <p className="text-sm text-text-secondary">
        The chatbot answers from the same Supabase content you edit here — profile, education,
        experience, projects, and research. Saving any of those re-syncs it automatically in the
        background. If a background sync ever fails (e.g. the backend was offline), use this to
        re-sync manually.
      </p>
      <SyncForm />
    </div>
  );
}
