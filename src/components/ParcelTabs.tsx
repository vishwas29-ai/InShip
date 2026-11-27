"use client";

export type ParcelTab = "ALL" | "SENT" | "INCOMING";

type Props = {
  activeTab: ParcelTab;
  onChange: (tab: ParcelTab) => void;
  totalCount: number;
  sentCount: number;
  incomingCount: number;
};

export default function ParcelTabs({
  activeTab,
  onChange,
  totalCount,
  sentCount,
  incomingCount,
}: Props) {
  const tabs = [
    {
      id: "ALL" as const,
      label: "All Parcels",
      icon: "📦",
      count: totalCount,
    },
    {
      id: "SENT" as const,
      label: "Sent Parcels",
      icon: "📤",
      count: sentCount,
    },
    {
      id: "INCOMING" as const,
      label: "Incoming Parcels",
      icon: "📥",
      count: incomingCount,
    },
  ];

  return (
    <div className="mb-6 grid gap-3 rounded-2xl border border-[#DCEFEB] bg-white p-3 sm:grid-cols-3">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          aria-pressed={activeTab === tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex items-center justify-between gap-3 rounded-xl px-5 py-4 text-sm font-semibold transition ${
            activeTab === tab.id
              ? "bg-[#008F84] text-white shadow-sm"
              : "bg-[#F4FAFA] text-[#142B49] hover:bg-[#E0F8F7]"
          }`}
        >
          <span>
            {tab.icon} {tab.label}
          </span>

          <span
            className={`rounded-full px-3 py-1 text-xs ${
              activeTab === tab.id
                ? "bg-white/20 text-white"
                : "bg-[#E0F8F7] text-[#008F84]"
            }`}
          >
            {tab.count}
          </span>
        </button>
      ))}
    </div>
  );
}