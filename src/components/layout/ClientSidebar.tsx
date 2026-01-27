import { Link, useLocation } from "react-router-dom";
import {
    LayoutDashboard,
    FileText,
    Files,
    ClipboardCheck,
    Award,
    LogOut,
    ChevronRight,
    ShieldCheck
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
    { name: "Dashboard", href: "/client/dashboard", icon: LayoutDashboard },
    { name: "Apply Now", href: "/client/apply", icon: FileText },
    { name: "My Documents", href: "/client/documents", icon: Files },
    { name: "Inspections", href: "/client/inspections", icon: ClipboardCheck },
    { name: "Certificate Vault", href: "/client/certificates", icon: Award },
];

export function ClientSidebar() {
    const location = useLocation();

    return (
        <div className="flex h-full w-64 flex-col bg-sidebar-background border-r border-sidebar-border">
            <div className="flex h-16 items-center px-6 gap-3 border-b border-sidebar-border/50">
                <ShieldCheck className="h-8 w-8 text-secondary" />
                <div className="flex flex-col">
                    <span className="text-sm font-bold text-sidebar-foreground">Client Portal</span>
                    <span className="text-[10px] text-sidebar-foreground/60 uppercase tracking-tighter">African Halal Inst.</span>
                </div>
            </div>

            <nav className="flex-1 space-y-1 px-3 py-6">
                {navigation.map((item) => {
                    const isActive = location.pathname === item.href;
                    return (
                        <Link
                            key={item.name}
                            to={item.href}
                            className={cn(
                                "group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200",
                                isActive
                                    ? "bg-secondary text-secondary-foreground"
                                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                            )}
                        >
                            <item.icon className={cn(
                                "mr-3 h-5 w-5 flex-shrink-0 transition-colors",
                                isActive ? "text-secondary-foreground" : "text-sidebar-foreground/40 group-hover:text-sidebar-foreground"
                            )} />
                            {item.name}
                            {isActive && <ChevronRight className="ml-auto h-4 w-4" />}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-sidebar-border/50">
                <button className="flex w-full items-center px-3 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                    <LogOut className="mr-3 h-5 w-5" />
                    Log Out
                </button>
            </div>
        </div>
    );
}
