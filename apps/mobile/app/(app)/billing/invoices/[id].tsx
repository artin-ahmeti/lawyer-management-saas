import { useLocalSearchParams } from 'expo-router';
import H1App from '@/features/h1/H1App';

export default function InvoiceRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <H1App initialScreen="invoice" initialInvoiceId={id?.replace('INV-2026-', '') ?? '078'} />;
}
