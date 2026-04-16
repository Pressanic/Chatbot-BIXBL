import { ChatWindow } from '@/app/components/ChatWindow';

/**
 * Root page — renders the BIXBG chat interface.
 * Uses export default as required by Next.js App Router.
 * All other files in this project use named exports.
 */
export default function Home() {
  return <ChatWindow />;
}
