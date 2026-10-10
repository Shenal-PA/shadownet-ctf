import type { Metadata } from 'next';
import './globals.css';

import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'ShadowNet CTF | NexaCorp Infiltration Campaign',
  description: 'Underground collective cyber warfare CTF simulation. Infiltrate simulated NexaCorp corporate perimeters and internal datacenters across 8 progressive killchain vectors.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full bg-[#07090C]">
      <body className="bg-[#07090C] bg-cyber-grid bg-cyber-radial text-[#F5F5F5] min-h-screen flex flex-col antialiased overflow-x-hidden">
        <Navbar />
        <main className="flex-1 w-full app-container py-6 sm:py-8 lg:py-10 flex flex-col">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
