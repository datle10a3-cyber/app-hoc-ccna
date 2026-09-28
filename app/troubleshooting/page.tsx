import { redirect } from 'next/navigation';

export default function TroubleshootingRedirectPage() {
  redirect('/notes');
}
