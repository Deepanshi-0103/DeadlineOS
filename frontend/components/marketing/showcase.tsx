import {
  Globe, FileText, Image, Type, BrainCircuit, Tags, Calendar,
  Bell, Filter, BookmarkCheck, BarChart3, Smartphone
} from "lucide-react";

const features = [
  { icon: Globe,         title: "Browser Extension",   desc: "Save any opportunity from any website in one click. Works on Chrome, Arc, and Edge." },
  { icon: FileText,      title: "PDF & Document Parsing", desc: "Upload a grant PDF or job spec. AI reads and extracts all key details automatically." },
  { icon: Image,         title: "Screenshot Capture",  desc: "Drop an image of an Instagram post or poster. AI extracts the deadline and info." },
  { icon: Type,          title: "Paste Raw Text",       desc: "Copy-paste anything. Email body, tweet, forwarded message — AI figures out the rest." },
  { icon: BrainCircuit,  title: "AI Auto-Extraction",   desc: "Title, deadline, organizer, eligibility, prize/stipend, and a clean 2-line summary." },
  { icon: Tags,          title: "Auto-Categorisation",  desc: "Internship, Hackathon, Scholarship, Fellowship — automatically tagged and sorted." },
  { icon: Calendar,      title: "Calendar Integration", desc: "Push deadlines to Google Calendar or Apple Calendar. With built-in buffer reminders." },
  { icon: Bell,          title: "Smart Reminders",      desc: "7 days out, 3 days out, day-of. Never miss a window again." },
  { icon: Filter,        title: "Filters & Views",      desc: "Filter by status, category, urgency, or deadline range. Switch between board and list." },
  { icon: BookmarkCheck, title: "Status Tracking",      desc: "Track each opportunity through Saved → Applied → Under Review → Outcome." },
  { icon: BarChart3,     title: "Progress Analytics",   desc: "See how many you applied to, won, and your hit rate across categories." },
  { icon: Smartphone,    title: "Mobile Ready",          desc: "Capture and track on the go. Full PWA support with offline mode coming soon." },
];

export function Showcase() {
  return (
    <section id="features" className="py-24 bg-base">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-accent/25 bg-accent/6 text-accent text-xs font-semibold uppercase tracking-widest mb-4">
            Everything You Need
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold font-display text-ink mb-3">
            Built around how students actually work
          </h2>
          <p className="text-ink-muted text-base">
            No spreadsheets. No missed Notion reminders. Just one inbox that works.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="group p-5 rounded-2xl bg-surface border border-line hover:border-brand/30 hover:shadow-soft transition-all duration-300"
              >
                <div className="w-9 h-9 rounded-lg bg-brand/8 text-brand flex items-center justify-center mb-3.5 group-hover:bg-brand group-hover:text-on-brand transition-all duration-300">
                  <Icon size={18} />
                </div>
                <h3 className="text-sm font-bold font-display text-ink mb-1">{f.title}</h3>
                <p className="text-xs text-ink-muted leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
