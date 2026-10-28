import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { app } from '@/app.config';
import { PREPAINT } from '@/lib/preferences';
import { Providers } from '@/components/base/providers';
import './globals.css';

/* The faces ship with the template (src/styles/fonts, Geist and Geist Mono from geist@1.8.2, under their licence there),
   so a build fetches nothing; next/font hands them to the tokens as --font-face-sans and --font-face-mono. */
const sans = localFont({ src: '../src/styles/fonts/Geist-Variable.woff2', weight: '100 900', variable: '--font-face-sans', display: 'swap' });
const mono = localFont({ src: '../src/styles/fonts/GeistMono-Variable.woff2', weight: '100 900', variable: '--font-face-mono', display: 'swap' });

export const metadata: Metadata = {
  title: { default: app.name, template: `%s · ${app.name}` },
  description: `${app.name}: ${app.description}`
};

/* The browser chrome's colour is a meta tag, which cannot read a CSS variable: these are the two grounds, by hand. */
export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#EEF0F8' }, // allow-literal-colour: ground, light
    { media: '(prefers-color-scheme: dark)', color: '#0A0B10' }, // allow-literal-colour: ground, dark
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
