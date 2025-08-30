import React from "react";
// IMP START - Quick Start
import Provider from "../components/provider";
// IMP END - Quick Start
// IMP START - SSR
import { cookieToWeb3AuthState } from "@web3auth/modal";
// IMP END - SSR
import "./globals.css";

import { Inter } from "next/font/google";
// IMP START - SSR
import { headers } from "next/headers";
// IMP END - SSR
const inter = Inter({ subsets: ["latin"] });


export const metadata = {
  title: "Cartfree - Connect, Pay, Done.",
  description: "Our seamless payment solution transforms hesitant browsers into committed buyers with a single click. By eliminating friction and providing an intuitive, lightning-fast checkout experience, we turn your digital storefront into a conversion powerhouse.",
};

// eslint-disable-next-line no-undef
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // IMP START - SSR
  const headersList = await headers();
  const web3authInitialState = cookieToWeb3AuthState(headersList.get('cookie'));
  // IMP END - SSR
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/png" href="/cartfree.png" />
      </head>
      <body className={inter.className}>
        {/* // IMP START - SSR */}
        <Provider web3authInitialState={web3authInitialState}>{children}</Provider>
        {/* // IMP END - SSR */}
      </body>
    </html>
  );
}
