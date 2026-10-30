import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Staff Dashboard | Arthur T Realty',
  robots: { index: false, follow: false },
};

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return children;
}
