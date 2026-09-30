import { useLocalSearchParams } from 'expo-router';
import H1App from '@/features/h1/H1App';

export default function ContactRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <H1App initialScreen="contact" initialContactId={id ?? 'bennett'} />;
}
