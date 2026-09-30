import { useLocalSearchParams } from 'expo-router';
import H1App from '@/features/h1/H1App';
import { MATTER_ORDER, MATTERS, type MatterId } from '@/features/h1/data';

export default function MatterRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const matterId: MatterId =
    MATTER_ORDER.find((key) => key === id || MATTERS[key].number === id) ?? 'bennett';
  return <H1App initialScreen="matter" initialMatterId={matterId} />;
}
