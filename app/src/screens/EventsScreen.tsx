
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Button,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { apiRequest } from '../api/client';
import { cancelEvent, fetchOwnedEvents } from '../api/events';
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
  // ID_017 (T071): events the user can cancel, and the one being cancelled
  const [ownedIds, setOwnedIds] = useState<number[]>([]);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [reason, setReason] = useState('');

  // Load upcoming events from the backend
  const loadEvents = useCallback(async () => {
    setCancellingId(null);
    setReason('');

    if (!token) {
      setEvents([]);
      setOwnedIds([]);
      return;
    }

    setLoading(true);

    const [result, owned] = await Promise.all([
      apiRequest<{ events: CalendarEvent[] }>('/events/calendar', { token }),
      fetchOwnedEvents(token),
    ]);

    setOwnedIds(owned.success ? owned.events.map(event => event.id) : []);

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

  function startCancel(eventId: number) {
    setCancellingId(eventId);
    setReason('');
    setMessage('');
  }

  // Cancel the event; it then leaves the list of upcoming events
  async function handleCancel(event: CalendarEvent) {
    if (pendingId !== null) return;

    setPendingId(event.id);
    setMessage('');

    const result = await cancelEvent(token, event.id, reason);

    if (result.success) {
      setEvents(current => current.filter(item => item.id !== event.id));
      setCancellingId(null);
      setReason('');
      setMessage(`${result.message}: ${event.title}`);
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
          extraData={{ ownedIds, cancellingId, reason, pendingId }}
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

              {!ownedIds.includes(item.id) ? null : cancellingId === item.id ? (
                <View style={styles.cancelForm}>
                  <TextInput
                    style={styles.input}
                    value={reason}
                    onChangeText={setReason}
                    placeholder="Reason (optional)"
                    placeholderTextColor="#8895a7"
                    accessibilityLabel="Cancellation reason (optional)"
                    maxLength={500}
                    multiline
                  />
                  <View style={styles.buttons}>
                    <Button
                      title="Keep Event"
                      disabled={pendingId !== null}
                      onPress={() => setCancellingId(null)}
                    />
                    <Button
                      title="Confirm Cancellation"
                      color="#b42318"
                      disabled={pendingId !== null}
                      onPress={() => void handleCancel(item)}
                    />
                  </View>
                </View>
              ) : (
                <View style={styles.cancelForm}>
                  <Button
                    title="Cancel Event"
                    color="#b42318"
                    disabled={pendingId !== null}
                    onPress={() => startCancel(item.id)}
                  />
                </View>
              )}
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
  cancelForm: {
    marginTop: 12,
    gap: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccd6e3',
    borderRadius: 8,
    padding: 10,
    minHeight: 60,
    color: '#14243a',
  },
  message: {
    marginVertical: 12,
    color: '#2053b6',
  },
});
