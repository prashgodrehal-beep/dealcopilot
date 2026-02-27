import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import './globals.css';

export const metadata: Metadata = {
  title: 'DealPilot — AI Sales Coach',
  description: 'Your AI co-pilot through every deal. Powered by Decision Science & Persuasion Psychology.',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="noise-bg min-h-screen">
        <div className="relative z-10">
          {children}
        </div>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#181c35',
              border: '1px solid #2a2f52',
              color: '#e5e7eb',
            },
          }}
        />
      </body>
    </html>
  );
}
