"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Filter,
  Users,
  AlertTriangle,
  Calculator,
  Target,
  TrendingUp,
  Settings,
  FileText,
  Github,
  Linkedin,
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { ThemeToggle } from "@/components/theme-toggle";

const navigation = [
  {
    name: "Executive Summary",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    name: "Revenue Intelligence",
    href: "/revenue",
    icon: TrendingUp,
  },
  {
    name: "Funnel Analysis",
    href: "/funnel",
    icon: Filter,
  },
  {
    name: "Customer Health",
    href: "/customers",
    icon: Users,
  },
  {
    name: "Revenue at Risk",
    href: "/risk",
    icon: AlertTriangle,
  },
  {
    name: "What-If Simulator",
    href: "/simulator",
    icon: Calculator,
  },
  {
    name: "Prioritized Actions",
    href: "/actions",
    icon: Target,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-64 flex-col border-r bg-background">
      {/* Logo */}
      <Link href="/" className="flex h-16 items-center border-b px-6 hover:bg-muted/50 transition-colors">
        <TrendingUp className="h-6 w-6 text-primary" />
        <div className="ml-2">
          <div className="text-lg font-semibold">Revenue Intel</div>
          <div className="text-xs text-muted-foreground">Lifecycle Analytics</div>
        </div>
      </Link>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item, index) => {
          const isActive = pathname === item.href;
          return (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05, duration: 0.3 }}
              whileHover={{ x: 4 }}
            >
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            </motion.div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t p-4">
        <div className="flex items-center justify-between mb-3">
          <a
            href="/methodology.html"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
            title="View data analysis methodology"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Methodology</span>
          </a>
          <ThemeToggle />
        </div>
        <div className="text-xs text-muted-foreground px-2 mb-3">
          <p>SaaS Revenue Analyzer</p>
          <p>v1.0.0</p>
        </div>
        <div className="flex items-center gap-3 px-2">
          <a
            href="https://github.com/NateDevIO/revenue-intel-saas"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors"
            title="View on GitHub"
          >
            <Github className="h-4 w-4" />
          </a>
          <a
            href="https://linkedin.com/in/NateDevIO"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors"
            title="Connect on LinkedIn"
          >
            <Linkedin className="h-4 w-4" />
          </a>
          <a
            href="https://NateDev.io"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors"
            title="Visit website"
          >
            <Globe className="h-4 w-4" />
          </a>
        </div>
      </div>
    </div>
  );
}
