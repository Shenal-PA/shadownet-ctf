'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import axios from 'axios';
import OperativeArtwork from '@/components/OperativeArtwork';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{
    id: string;
    username: string;
    total_points: number;
    challenges_solved: number;
    team_name?: string;
    is_admin?: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const fetchUser = async () => {
    try {
      const res = await axios.get('/api/auth/me');
      if (res.data.user) {
        setUser(res.data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await axios.post('/api/auth/logout');
      setUser(null);
      router.push('/auth/login');
      router.refresh();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const navLinks = [
    { name: 'Target Deck', href: '/dashboard/challenges' },
    { name: 'Leaderboard', href: '/dashboard/leaderboard' },
    { name: 'Killchain Progress', href: '/dashboard/progress' },
  ];

  return (
    <header className="site-header sticky top-0 z-50 w-full border-b backdrop-blur-md">
      <div className="w-full app-container">
        <div className="flex items-center justify-between h-16">
          {/* Left: Brand Logo & Main Nav Links */}
          <div className="flex items-center gap-6 lg:gap-8">
            <Link href="/" className="flex items-center gap-2.5 group flex-shrink-0">
              <div className="operative-avatar relative w-9 h-9 rounded-lg bg-[#141920] border border-[#FF6B00]/70 overflow-hidden transition-all group-hover:border-[#FF8533]">
                <OperativeArtwork
                  alt=""
                  sizes="36px"
                  loading="eager"
                  className="h-full w-full object-cover object-top"
                />
              </div>
              <div className="flex flex-col">
                <span className="font-mono font-black text-base tracking-wider text-[#F5F5F5] group-hover:text-[#FF8533] transition-colors leading-none">
                  SHADOW<span className="text-[#FF6B00]">NET</span>
                </span>
                <span className="text-[9px] font-mono text-[#FF9F43] tracking-widest uppercase mt-0.5 font-bold">
                  UNDERGROUND COLLECTIVE
                </span>
              </div>
            </Link>

            {/* Nav Divider */}
            <div className="hidden md:block w-px h-5 bg-[#232B36]"></div>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const isActive = pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    className={`px-3 py-2 rounded-md text-xs font-semibold tracking-wide transition-all ${
                      isActive
                        ? 'bg-[#FF6B00]/15 text-[#FF8533] border border-[#FF6B00]/35 shadow-[0_0_8px_rgba(255,107,0,0.15)]'
                        : 'text-[#8B949E] border border-transparent hover:text-[#F5F5F5] hover:bg-[#141920]'
                    }`}
                  >
                    {link.name}
                  </Link>
                );
              })}
              {user?.is_admin && (
                <Link
                  href="/admin"
                  className={`px-3 py-2 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ml-1 ${
                    pathname.startsWith('/admin')
                      ? 'bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/40'
                      : 'text-[#EF4444] hover:bg-[#EF4444]/15 border border-[#EF4444]/30'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] animate-pulse"></span>
                  COMMAND CORE
                </Link>
              )}
            </nav>
          </div>

          {/* Right: Live Status Pill + Auth / User Area */}
          <div className="hidden sm:flex items-center gap-3.5">
            {/* Live Target Status Indicator */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#10151C] border border-[#232B36] rounded-full text-[11px] font-mono text-[#8B949E]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse"></span>
              <span className="text-[#10B981] font-bold">NexaCorp Uplink</span>
            </div>

            {!loading && user ? (
              <div className="flex items-center gap-2.5">
                {/* Operative Score Pill */}
                <div className="flex items-center gap-2 px-3 py-1 bg-[#10151C] border border-[#232B36] rounded-lg">
                  <span className="text-[10px] font-mono text-[#8B949E]">OPERATIVE</span>
                  <span className="text-xs font-mono font-bold text-[#F5F5F5]">
                    {user.username}
                  </span>
                  <span className="text-[#232B36]">|</span>
                  <span className="text-xs font-mono font-black text-[#FF6B00]">
                    {user.total_points} XP
                  </span>
                  <span className="text-[#232B36]">|</span>
                  <span className="text-xs font-mono text-[#10B981] font-bold">
                    {user.challenges_solved}/8
                  </span>
                </div>

                <button
                  onClick={handleLogout}
                  className="px-2.5 py-1 text-xs font-mono font-semibold text-[#8B949E] hover:text-[#EF4444] hover:bg-[#141920] border border-[#232B36] rounded-lg transition-colors cursor-pointer"
                >
                  Sign out
                </button>
              </div>
            ) : !loading ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/auth/login"
                  className="btn-secondary text-xs h-8.5 px-3.5"
                >
                  Sign in
                </Link>
                <Link
                  href="/auth/register"
                  className="btn-primary text-xs h-8.5 px-4"
                >
                  Join Collective
                </Link>
              </div>
            ) : null}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
              className="w-10 h-10 p-2 rounded-lg bg-[#141920] border border-[#232B36] text-[#F5F5F5] font-mono text-sm hover:border-[#FF6B00]/40 transition-colors"
            >
              {mobileMenuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-3 border-t border-[#232B36] space-y-1.5 font-mono text-xs animate-fade-in">
            {user && (
              <div className="p-3 mb-2 rounded-lg bg-[#10151C] border border-[#232B36] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[#8B949E]">OPERATIVE</span>
                  <span className="font-bold text-[#F5F5F5]">{user.username}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-[#FF6B00]">{user.total_points} XP</span>
                  <span className="text-[#10B981]">({user.challenges_solved}/8)</span>
                </div>
              </div>
            )}

            {navLinks.map((link) => {
              const isActive = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-3.5 py-2.5 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-[#FF6B00]/15 text-[#FF6B00] font-bold border border-[#FF6B00]/40'
                      : 'text-[#8B949E] hover:text-[#F5F5F5] hover:bg-[#141920]'
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}

            {user?.is_admin && (
              <Link
                href="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3.5 py-2.5 rounded-lg text-[#EF4444] bg-[#EF4444]/10 border border-[#EF4444]/30 font-bold"
              >
                Command Core
              </Link>
            )}

            <div className="pt-2 mt-2 border-t border-[#232B36]">
              {!loading && user ? (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="w-full text-left px-3.5 py-2 text-[#EF4444] hover:bg-[#EF4444]/10 rounded-lg font-bold transition-colors"
                >
                  Sign out
                </button>
              ) : !loading ? (
                <div className="flex items-center gap-2 pt-1">
                  <Link
                    href="/auth/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="btn-secondary text-center flex-1 text-xs py-2"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/auth/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="btn-primary text-center flex-1 text-xs py-2"
                  >
                    Join Collective
                  </Link>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
