import { Link } from "react-router-dom";
import { Mail, Phone, MapPin, Facebook, Twitter, Linkedin, Instagram } from "lucide-react";

const footerLinks = {
  about: [
    { name: "Our Story", path: "/about" },
    { name: "Governance", path: "/governance" },
    { name: "Standards", path: "/standards" },
    { name: "Leadership", path: "/governance" },
  ],
  services: [
    { name: "Certification", path: "/certification-journey" },
    { name: "Industries", path: "/industries" },
    { name: "Training", path: "/services" },
    { name: "Consulting", path: "/services" },
  ],
  resources: [
    { name: "Directory", path: "/directory" },
    { name: "Verify Certificate", path: "/verify" },
    { name: "FAQs", path: "/#faq" },
    { name: "Contact", path: "/contact" },
  ],
};

export function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container section-padding">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand Column */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="African Halal Institute" className="h-12 w-auto brightness-0 invert" />
              <div>
                <p className="font-bold text-white">African Halal Institute</p>
                <p className="text-xs text-primary-foreground/70 text-white">AHI</p>
              </div>
            </div>
            <p className="text-sm text-primary-foreground/80">
              Setting the standard for Halal excellence across Africa and beyond.
              Integrity, compliance, and leadership in every certification.
            </p>
            <div className="flex gap-4">
              <a href="#" className="hover:text-secondary transition-colors">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="hover:text-secondary transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="hover:text-secondary transition-colors">
                <Linkedin className="h-5 w-5" />
              </a>
              <a href="#" className="hover:text-secondary transition-colors">
                <Instagram className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* About Links */}
          <div>
            <h4 className="font-semibold text-secondary mb-4">About AHI</h4>
            <ul className="space-y-2">
              {footerLinks.about.map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="text-sm text-primary-foreground/80 hover:text-secondary transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services Links */}
          <div>
            <h4 className="font-semibold text-secondary mb-4">Services</h4>
            <ul className="space-y-2">
              {footerLinks.services.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.path}
                    className="text-sm text-primary-foreground/80 hover:text-secondary transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="font-semibold text-secondary mb-4">Contact Us</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-sm text-primary-foreground/80">
                <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>123 Certification Drive, Johannesburg, South Africa</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-primary-foreground/80">
                <Phone className="h-4 w-4 flex-shrink-0" />
                <span>+27 11 123 4567</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-primary-foreground/80">
                <Mail className="h-4 w-4 flex-shrink-0" />
                <span>info@ahis.africa</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-primary-foreground/20">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-primary-foreground/60">
              © {new Date().getFullYear()} African Halal Institute. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm text-primary-foreground/60">
              <Link to="/privacy" className="hover:text-secondary transition-colors">
                Privacy Policy
              </Link>
              <Link to="/terms" className="hover:text-secondary transition-colors">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
