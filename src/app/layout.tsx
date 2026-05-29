import type { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';
import '@/styles/globals.css';


export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Sengoku Jidai — The Age of Warring States',
  description: 'A persistent strategy, politics and warfare simulation set in feudal Japan.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Cormorant+Garamond:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: { background: '#1f1815', color: '#e7dcc4', border: '1px solid #3a2e25', fontFamily: 'serif' },
          }}
        />
      </body>
    </html>
  );
}
