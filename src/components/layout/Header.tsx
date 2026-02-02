import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, ChevronDown, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const navItems = [
  { name: "Home", path: "/" },
  { name: "About", path: "/about" },
  { name: "Governance", path: "/governance" },
  {
    name: "Certification",
    children: [
      { name: "Standards & Methodology", path: "/standards" },
      { name: "Certification Journey", path: "/certification-journey" },
      { name: "Industries We Certify", path: "/industries" },
    ],
  },
  { name: "Services", path: "/services" },
  { name: "Directory", path: "/directory" },
  { name: "Verify", path: "/verify" },
  { name: "Contact", path: "/contact" },
];

export function Header() {
  const [isDark, setIsDark] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle("dark");
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container flex h-16 items-center">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 mr-6">
          <img src="/logo.png" alt="African Halal Institute" className="h-10 w-auto" />
          <div className="hidden sm:block">
            <p className="text-sm font-bold text-primary leading-tight">African Halal Institute</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Integrity • Compliance</p>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-0.5">
          {navItems.map((item) =>
            item.children ? (
              <DropdownMenu key={item.name}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-1 px-3">
                    {item.name}
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center">
                  {item.children.map((child) => (
                    <DropdownMenuItem key={child.path} asChild>
                      <Link to={child.path}>{child.name}</Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                key={item.path}
                variant="ghost"
                asChild
                className={`px-3 ${isActive(item.path!) ? "bg-accent" : ""}`}
              >
                <Link to={item.path!}>{item.name}</Link>
              </Button>
            )
          )}
        </nav>

        {/* Right Side Actions */}
        <div className="flex items-center gap-3 ml-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="hidden sm:flex"
          >
            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>

          <Button
            asChild
            className="hidden sm:flex bg-secondary text-secondary-foreground hover:bg-secondary/90 transition-all active:scale-95"
          >
            <Link to="/auth/signin">Client Portal</Link>
          </Button>

          {/* Mobile Menu */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild className="lg:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] bg-primary text-primary-foreground">
              <div className="flex flex-col gap-4 mt-8">
                {navItems.map((item) =>
                  item.children ? (
                    <div key={item.name} className="space-y-2">
                      <p className="font-semibold text-secondary">{item.name}</p>
                      {item.children.map((child) => (
                        <Link
                          key={child.path}
                          to={child.path}
                          onClick={() => setIsOpen(false)}
                          className="block pl-4 py-1 hover:text-secondary transition-colors"
                        >
                          {child.name}
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <Link
                      key={item.path}
                      to={item.path!}
                      onClick={() => setIsOpen(false)}
                      className={`font-medium hover:text-secondary transition-colors ${isActive(item.path!) ? "text-secondary" : ""
                        }`}
                    >
                      {item.name}
                    </Link>
                  )
                )}
                <Button
                  asChild
                  className="mt-4 bg-secondary text-secondary-foreground hover:bg-secondary/90"
                  onClick={() => setIsOpen(false)}
                >
                  <Link to="/auth/signin">Client Portal</Link>
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
