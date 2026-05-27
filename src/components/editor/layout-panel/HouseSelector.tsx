"use client";

import { useLayout3DStore } from "@/lib/store/layout3d-slice";
import { HOUSE_TEMPLATE_LIST } from "@/lib/3d/house-templates";

export function HouseSelector() {
  const activeTemplateId = useLayout3DStore((s) => s.activeTemplateId);
  const setTemplate = useLayout3DStore((s) => s.setTemplate);

  return (
    <div
      className="absolute top-3 left-3 z-10 flex items-center gap-2 px-3 py-1.5 rounded-full shadow-sm border"
      style={{ background: "#FAFAF8", borderColor: "#E5E0D5" }}
    >
      <label htmlFor="house-template" className="text-xs uppercase tracking-wide" style={{ color: "#8B8378" }}>
        House
      </label>
      <select
        id="house-template"
        value={activeTemplateId}
        onChange={(e) => setTemplate(e.target.value)}
        className="text-sm bg-transparent outline-none cursor-pointer"
        style={{ color: "#2A1A00" }}
      >
        {HOUSE_TEMPLATE_LIST.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
    </div>
  );
}
