import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { app } from '@/app.config';
import { PREPAINT } from '@/lib/preferences';
import { Providers } from '@/components/base/providers';
import './globals.css';

/* The faces are self-hosted by next/font and handed to the tokens as --font-face-sans and --font-face-mono. */
const sans = Geist({ subsets: ['latin'], variable: '--font-face-sans', display: 'swap' });
const mono = Geist_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-face-mono', display: 'swap' });

export const metadata: Metadata = {
  title: { default: app.name, template: `%s · ${app.name}` },
  description: `${app.name}: traffic, latency, spend and health for every endpoint.`,
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#EEF0F8' },
    { media: '(prefers-color-scheme: dark)', color: '#0A0B10' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-accent={app.accent} className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: PREPAINT }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
