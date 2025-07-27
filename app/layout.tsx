import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import {
  ClerkProvider,
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Neiboro - Hyper-Local Mutual Aid Platform",
  description:
    "Connect with your neighbors. Offer and request help in your local community.",
  keywords: [
    "mutual aid",
    "community",
    "neighbors",
    "local help",
    "neighborhood",
  ],
  authors: [{ name: "Neiboro" }],
  creator: "Neiboro",
  publisher: "Neiboro",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  // manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Neiboro",
  },
};

export const viewport: Viewport = {
  maximumScale: 1,
  userScalable: false
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className="scroll-smooth">
        <body className={`${inter.variable} font-sans antialiased`}>
          <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
            <div className="container mx-auto px-4 flex justify-between items-center h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-bold text-gray-900">Neiboro</h1>
              </div>
              
              <div className="flex items-center gap-3">
                <SignedOut>
                  <SignInButton>
                    <button className="text-gray-600 hover:text-gray-900 font-medium text-sm transition-colors">
                      Sign In
                    </button>
                  </SignInButton>
                  <SignUpButton>
                    <button className="bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-sm px-4 py-2 transition-colors">
                      Join Community
                    </button>
                  </SignUpButton>
                </SignedOut>
                <SignedIn>
                  <UserButton 
                    appearance={{
                      elements: {
                        avatarBox: "w-8 h-8"
                      }
                    }}
                  />
                </SignedIn>
              </div>
            </div>
          </header>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
