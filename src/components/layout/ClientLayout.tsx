import { ReactNode } from "react";
import { ClientSidebar } from "./ClientSidebar";
import {
    Bell,
    Search,
    User,
    Settings,
    HelpCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ClientLayoutProps {
    children: ReactNode;
}

export function ClientLayout({ children }: ClientLayoutProps) {
    return (
        <div className="flex h-screen bg-background text-foreground overflow-hidden">
            {/* Sidebar - Desktop */}
            <div className="hidden md:flex flex-shrink-0">
                <ClientSidebar />
            </div>

            {/* Main Content */}
            <div className="flex flex-col flex-1 overflow-hidden">
                {/* Header */}
                <header className="h-16 border-b bg-card flex items-center justify-between px-6 flex-shrink-0">
                    <div className="flex items-center gap-4 flex-1">
                        <div className="relative w-full max-w-md hidden sm:block">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search certificates, documents..."
                                className="pl-10 bg-muted/30 border-none focus-visible:ring-primary h-9 text-sm"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
                            <HelpCircle className="h-5 w-5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary relative">
                            <Bell className="h-5 w-5" />
                            <span className="absolute top-2 right-2 h-2 w-2 bg-secondary rounded-full border-2 border-card" />
                        </Button>
                        <div className="h-8 w-px bg-border mx-2" />
                        <div className="flex items-center gap-3 pl-2">
                            <div className="flex flex-col items-end hidden sm:flex">
                                <span className="text-sm font-semibold leading-none">African Halal</span>
                                <span className="text-[10px] text-muted-foreground mt-1">Client Admin</span>
                            </div>
                            <Button variant="ghost" size="icon" className="rounded-full bg-primary/10 border-2 border-primary/20 p-0 overflow-hidden">
                                <User className="h-5 w-5 text-primary" />
                            </Button>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
                    <div className="max-w-7xl mx-auto h-full">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
