import { ReactNode } from "react";
import { SupervisorSidebar } from "./SupervisorSidebar";
import { Bell, Search, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/ThemeToggle";

interface SupervisorLayoutProps {
  children: ReactNode;
}

export function SupervisorLayout({ children }: SupervisorLayoutProps) {
  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <div className="hidden md:flex flex-shrink-0">
        <SupervisorSidebar />
      </div>

      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="h-16 border-b bg-background/80 backdrop-blur-md flex items-center justify-between px-6 flex-shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative w-full max-w-md hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/80" />
              <Input
                placeholder="Search..."
                className="pl-10 bg-muted/50 border-border/50 focus-visible:ring-primary h-9 text-sm"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="icon" className="text-muted-foreground/80 hover:text-primary relative">
              <Bell className="h-5 w-5" />
            </Button>
            <div className="h-8 w-px bg-border mx-2" />
            <div className="flex items-center gap-3 pl-2">
              <div className="flex flex-col items-end hidden sm:flex">
                <span className="text-sm font-semibold leading-none">Supervisor</span>
                <span className="text-[10px] text-muted-foreground mt-1">On-site</span>
              </div>
              <Button variant="ghost" size="icon" className="rounded-full bg-primary/10 border-2 border-primary/20 p-0 overflow-hidden">
                <User className="h-5 w-5 text-primary" />
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar bg-muted/50">
          <div className="max-w-7xl mx-auto h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
