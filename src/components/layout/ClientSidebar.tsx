import { Link, useLocation, useNavigate } from "react-router-dom";
import {
    LayoutDashboard,
    FileText,
    Files,
    ClipboardCheck,
    Award,
    LogOut,
    ChevronRight,
    ShieldCheck,
    FolderOpen,
    HeadphonesIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

const navigation = [
    { name: "Dashboard", href: "/client/dashboard", icon: LayoutDashboard },
    { name: "Apply Now", href: "/client/apply", icon: FileText },
    { name: "My Applications", href: "/client/applications", icon: FolderOpen },
    { name: "My Documents", href: "/client/documents", icon: Files },
    { name: "Inspections", href: "/client/inspections", icon: ClipboardCheck },
    { name: "Certificate Vault", href: "/client/certificates", icon: Award },
    { name: "Support Center", href: "/client/support", icon: HeadphonesIcon },
];

export function ClientSidebar() {
    const location = useLocation();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const handleLogout = async () => {
        setIsLoggingOut(true);
        try {
            const { error } = await supabase.auth.signOut();
            if (error) {
                toast({
                    title: "Logout failed",
                    description: error.message,
                    variant: "destructive",
                });
            } else {
                toast({
                    title: "Logged out",
                    description: "You have been signed out successfully.",
                });
                navigate("/auth/signin");
            }
        } catch (err) {
            toast({
                title: "Error",
                description: "An unexpected error occurred.",
                variant: "destructive",
            });
        } finally {
            setIsLoggingOut(false);
        }
    };

    return (
        <div className="flex h-full w-64 flex-col bg-sidebar-background border-r border-sidebar-border">
            <div className="flex h-16 items-center px-6 gap-3 border-b border-sidebar-border">
                <ShieldCheck className="h-8 w-8 text-secondary" />
                <div className="flex flex-col">
                    <span className="text-sm font-bold text-sidebar-foreground">Client Portal</span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-tighter">African Halal Inst.</span>
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
                                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
                            )}
                        >
                            <item.icon className={cn(
                                "mr-3 h-5 w-5 flex-shrink-0 transition-colors",
                                isActive ? "text-secondary-foreground" : "text-muted-foreground group-hover:text-sidebar-foreground"
                            )} />
                            {item.name}
                            {isActive && <ChevronRight className="ml-auto h-4 w-4" />}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-sidebar-border">
                <button 
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="flex w-full items-center px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-colors disabled:opacity-50"
                >
                    <LogOut className="mr-3 h-5 w-5" />
                    {isLoggingOut ? "Logging out..." : "Log Out"}
                </button>
            </div>
        </div>
    );
}
