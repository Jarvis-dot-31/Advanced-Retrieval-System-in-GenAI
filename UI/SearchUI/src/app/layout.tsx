import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import 'bootstrap/dist/css/bootstrap.min.css';
import './globals.css';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import AuthSessionProvider from '@/components/SessionProvider';
import Navbar from '@/components/Navbar';
import ParticleBackground from '@/components/ParticleBackground';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: {
    template: '%s | INSIGHT',
    default: 'INSIGHT - Hybrid Search',
  },
  description: 'INSIGHT — Intent-aware Neural Search with Integrated Graph and Hybrid Techniques',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="dark" data-bs-theme="dark" suppressHydrationWarning className={inter.className}>
      <body>
        <AuthSessionProvider>
          <ThemeProvider>
            <AuthProvider>
              <div className="app-wrapper">
                <ParticleBackground />
                <Navbar />
                <main>{children}</main>
              </div>
            </AuthProvider>
          </ThemeProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
