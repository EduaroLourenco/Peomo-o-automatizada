/* eslint-disable */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Home, FileSpreadsheet, History, Settings, Search, Database } from "lucide-react";

const sidebarNavItems = [
  {
    title: "Início",
    href: "/",
    icon: Home,
  },
  {
    title: "Processar Promoções",
    href: "/processar",
    icon: FileSpreadsheet,
  },
  {
    title: "Histórico",
    href: "/historico",
    icon: History,
  },
  {
    title: "Rastreador de Produto",
    href: "/rastreador",
    icon: Search,
  },
  {
    title: "Catálogo ML",
    href: "/catalogo",
    icon: Database,
  },
  {
    title: "Configurações",
    href: "/configuracoes",
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="grid items-start gap-1">
      {sidebarNavItems.map((item, index) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        return (
          <Link
            key={index}
            href={item.href}
            className={cn(
              "group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors duration-200",
              isActive 
                ? "bg-secondary text-secondary-foreground" 
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="mr-3 h-4 w-4" />
            <span>{item.title}</span>
          </Link>
        );
      })}
    </nav>
  );
}
