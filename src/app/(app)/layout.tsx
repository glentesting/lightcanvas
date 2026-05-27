import AppSidebar from "@/components/layout/AppSidebar";
import AppTopBar from "@/components/layout/AppTopBar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#FFFFFF" }}>
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <AppTopBar />
        <main id="main-content" className="flex-1 min-h-0 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
