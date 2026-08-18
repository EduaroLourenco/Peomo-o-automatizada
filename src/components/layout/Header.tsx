import { Menu, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-[#0B1120]/80 backdrop-blur-xl border-white/5 shadow-sm">
      <div className="container flex h-16 items-center">
        <div className="mr-4 hidden md:flex">
          <a className="mr-6 flex items-center space-x-2 text-primary" href="/">
            <Sparkles className="w-5 h-5" />
            <span className="hidden font-bold sm:inline-block text-foreground text-lg tracking-tight">
              Probel<span className="text-primary font-extrabold">Promo</span>
            </span>
          </a>
        </div>
        <button className="inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-ring disabled:opacity-50 disabled:pointer-events-none ring-offset-background hover:text-accent-foreground h-9 py-2 mr-2 px-0 text-base hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 md:hidden">
          <Menu className="h-6 w-6" />
          <span className="sr-only">Toggle Menu</span>
        </button>
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            {/* Espaço para barra de busca se precisar futuramente */}
          </div>
          <nav className="flex items-center">
            {/* Usuário ou Menu extra */}
          </nav>
        </div>
      </div>
    </header>
  );
}
