
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Button,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { apiRequest } from '../api/client';
import { useSession } from '../session';

type CalendarEvent = {
  id: number;
  title: string;
  clubName: string;
  date: string;
  startTime: string;
  location: string;
  attendeeCount: number;
};

export default function EventsScreen() {
  const { session } = useSession();
  const token = session?.token ?? null;

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [message, setMessage] = useState('');

  // Load upcoming events from the backend
  const loadEvents = useCallback(async () => {
    if (!token) {
      setEvents([]);
      return;
    }

    setLoading(true);

    const result = await apiRequest<{ events: CalendarEvent[] }>(
      '/events/calendar',
      { token }
    );

    if (result.success) {
      setEvents(result.events);
      setMessage('');
    } else {
      setEvents([]);
      setMessage(result.message);
    }

    setLoading(false);
  }, [token]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  // Send an RSVP and update the attendee count
  async function handleRSVP(
    eventId: number,
    response: 'ATTENDING' | 'NOT_ATTENDING'
  ) {
    if (pendingId !== null) return;

    setPendingId(eventId);
    setMessage('');

    const result = await apiRequest<{
      message: string;
      attendeeCount: number;
    }>(`/events/${eventId}/rsvp`, {
      method: 'POST',
      token,
      body: { response },
    });

    if (result.success) {
      setEvents(current =>
        current.map(event =>
          event.id === eventId
            ? { ...event, attendeeCount: result.attendeeCount }
            : event
        )
      );
      setMessage(result.message);
    } else {
      setMessage(result.message);
    }

    setPendingId(null);
  }

  if (!token) {
    return (
      <View style={styles.container}>
        <Text>Please log in to view events.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Upcoming Events</Text>
      <Button title="Refresh" onPress={() => void loadEvents()} />

      {message ? <Text style={styles.message}>{message}</Text> : null}

      {loading ? (
        <ActivityIndicator />
      ) : (
        <FlatList
          data={events}
          keyExtractor={item => String(item.id)}
          ListEmptyComponent={
            <Text>No upcoming events found.</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.eventTitle}>{item.title}</Text>
              <Text>{item.clubName}</Text>
              <Text>{item.date} at {item.startTime}</Text>
              <Text>{item.location}</Text>

              <Text style={styles.count}>
                Attendees: {item.attendeeCount}
              </Text>

              <View style={styles.buttons}>
                <Button
                  title="Attending"
                  disabled={pendingId !== null}
                  onPress={() => void handleRSVP(item.id, 'ATTENDING')}
                />
                <Button
                  title="Not Attending"
                  disabled={pendingId !== null}
                  onPress={() => void handleRSVP(item.id, 'NOT_ATTENDING')}
                />
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f0f4fa',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  card: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginVertical: 8,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  count: {
    marginTop: 10,
    marginBottom: 10,
    fontWeight: 'bold',
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  message: {
    marginVertical: 12,
    color: '#2053b6',
  },
});
