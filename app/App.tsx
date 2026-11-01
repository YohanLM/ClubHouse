
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Button,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import CreateEventForm, { EventData } from './CreateEventForm';

const API = 'http://localhost:3000';

type Club = {
  id: number;
  name: string;
  category: string;
};

type Session = {
  accountId: number;
  role: string;
};

async function readResponse(response: Response) {
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Request failed');
  }

  return data;
}

export default function App() {
  const [email, setEmail] = useState(
    'dana.lee@mail.mcgill.ca'
  );
  const [password, setPassword] = useState('Passw0rd!23');
  const [token, setToken] = useState('');
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data: {
        token: string;
        session: Session;
      } = await readResponse(response);

      if (data.session.role !== 'CLUB_OWNER') {
        throw new Error('Only club owners can create events');
      }

      const clubsResponse = await fetch(`${API}/clubs`, {
        headers: {
          Authorization: `Bearer ${data.token}`,
        },
      });

      const clubsData: { clubs: Club[] } =
        await readResponse(clubsResponse);

      setClubs(clubsData.clubs);
      setToken(data.token);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Login failed'
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateEvent(event: EventData) {
    const response = await fetch(`${API}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(event),
    });

    await readResponse(response);
  }

  if (token) {
    return (
      <View style={{ flex: 1 }}>
        <View style={styles.logout}>
          <Button
            title="Log Out"
            onPress={() => {
              setToken('');
              setClubs([]);
            }}
          />
        </View>

        <CreateEventForm
          clubs={clubs}
          onSubmit={handleCreateEvent}
        />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>ClubHouse</Text>
      <Text style={styles.subtitle}>Club Owner Login</Text>

      <Text>Email</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <Text>Password</Text>
      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : null}

      {loading ? (
        <ActivityIndicator />
      ) : (
        <Button title="Log In" onPress={handleLogin} />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 30,
    backgroundColor: '#f0f4fa',
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: '#2053b6',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 25,
    color: '#475569',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccd6e3',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
    marginTop: 6,
    marginBottom: 18,
  },
  error: {
    color: '#b42318',
    marginBottom: 15,
  },
  logout: {
    alignItems: 'flex-end',
    padding: 8,
    backgroundColor: '#fff',
  },
});
