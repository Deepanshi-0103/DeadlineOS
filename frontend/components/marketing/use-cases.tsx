import { GraduationCap, Rocket, Briefcase, FlaskConical } from "lucide-react";

const useCases = [
  {
    icon: GraduationCap,
    audience: "Students",
    pain: "Tracking internship and scholarship deadlines across 20 browser tabs.",
    win: "One inbox with AI-extracted deadlines, priority tags, and day-of reminders.",
  },
  {
    icon: Rocket,
    audience: "Startup Founders",
    pain: "Missing accelerator and grant windows while building the product.",
    win: "Capture grant PDFs, get deadline alerts, track applications without leaving focus.",
  },
  {
    icon: Briefcase,
    audience: "Early-Career Professionals",
    pain: "Job applications scattered across email, notes, and memory.",
    win: "A single board showing every role, its status, and what's due when.",
  },
  {
    icon: FlaskConical,
    audience: "Researchers",
    pain: "Fellowship and conference submission deadlines buried in mailing lists.",
    win: "Forward the email. AI extracts the deadline, saves it, and reminds you.",
  },
];

export function UseCases() {
  return (
    <section id="usecases" className="py-24 bg-surface border-y border-line-soft">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold font-display text-ink mb-3">
            Who is it for?
          </h2>
          <p className="text-ink-muted text-base">
            Anyone who chases opportunities and can&apos;t afford to miss a deadline.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {useCases.map((u) => {
            const Icon = u.icon;
            return (
              <div
                key={u.audience}
                className="group p-8 rounded-2xl bg-base border border-line hover:border-brand/30 hover:shadow-soft transition-all duration-300 flex gap-5"
              >
                <div className="w-12 h-12 rounded-xl bg-brand/8 text-brand flex items-center justify-center shrink-0 group-hover:bg-brand group-hover:text-on-brand transition-all duration-300">
                  <Icon size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold font-display text-ink mb-2">{u.audience}</h3>
                  <p className="text-sm text-ink-muted mb-3">
                    <span className="font-semibold text-ink">Problem: </span>{u.pain}
                  </p>
                  <p className="text-sm text-ink-muted">
                    <span className="font-semibold text-brand">DeadlineOS: </span>{u.win}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
