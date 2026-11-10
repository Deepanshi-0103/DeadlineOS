import { Clipboard, BrainCircuit, LayoutDashboard, BellRing } from "lucide-react";

const steps = [
  {
    num: "01",
    icon: Clipboard,
    title: "Capture Anything",
    desc: "Paste a URL, upload a PDF, drop a screenshot, or use the browser extension. DeadlineOS accepts opportunities in any format from any source.",
    tag: "Zero friction input",
  },
  {
    num: "02",
    icon: BrainCircuit,
    title: "AI Extracts the Details",
    desc: "Our AI reads the source and pulls out title, organizer, deadline, category, eligibility, registration link, and a concise summary — automatically.",
    tag: "No manual entry",
  },
  {
    num: "03",
    icon: LayoutDashboard,
    title: "Everything in One Dashboard",
    desc: "Your Opportunity Inbox organizes everything by deadline urgency. Filter by category, priority, or status. Nothing falls through the cracks.",
    tag: "Always organized",
  },
  {
    num: "04",
    icon: BellRing,
    title: "Reminders Before It's Too Late",
    desc: "Get reminders 7 days, 3 days, and 1 day before each deadline. Sync to Google Calendar or Apple Calendar in one click.",
    tag: "Never miss again",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 bg-surface border-y border-line-soft">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-brand/20 bg-brand/5 text-brand text-xs font-semibold uppercase tracking-widest mb-4">
            The Flow
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold font-display text-ink mb-3">
            From scattered links to a clean inbox
          </h2>
          <p className="text-ink-muted text-base">
            Four steps. Fully automated after step one.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.num}
                className="relative group p-7 rounded-2xl bg-base border border-line hover:border-brand/40 hover:shadow-soft transition-all duration-300"
              >
                <span className="absolute top-5 right-5 text-4xl font-bold font-display text-brand/10 group-hover:text-brand/20 transition-colors select-none">
                  {s.num}
                </span>

                <div className="w-11 h-11 rounded-xl bg-brand/8 text-brand flex items-center justify-center mb-5 group-hover:bg-brand group-hover:text-on-brand transition-all duration-300">
                  <Icon size={22} />
                </div>

                <h3 className="text-lg font-bold font-display text-ink mb-2">{s.title}</h3>
                <p className="text-sm text-ink-muted leading-relaxed mb-4">{s.desc}</p>
                <span className="inline-block text-[11px] font-semibold uppercase tracking-wider text-brand/80 bg-brand/6 px-2.5 py-1 rounded-full">
                  {s.tag}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
