import { redirect } from 'next/navigation';

export default function DiagnosticRedirectPage() {
  redirect('/notes');
}
