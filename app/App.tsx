import { StatusBar } from 'expo-status-bar';
import ClubsScreen from './src/screens/ClubsScreen';
import { SessionProvider } from './src/session';

// The other screens (T039-T043) are added here as they are built.
export default function App() {
  return (
    <SessionProvider>
      <ClubsScreen />
      <StatusBar style="auto" />
    </SessionProvider>
  );
}
