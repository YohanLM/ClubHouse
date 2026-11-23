// ID_016 Edit Event (T065): a Club Owner picks one of their scheduled events
// and edits its details. Only the changed fields are sent, and the backend
// checks the rules (ownership, status, dates, times, capacity) and returns
// the message of the feature file ("Event updated" or the error).
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { fetchOwnedEvents, updateEvent, type EventChanges, type OwnedEvent } from '../api/events';
import { useSession } from '../session';

type TextField = 'title' | 'category' | 'date' | 'startTime' | 'endTime' | 'location';

type FormValues = Record<TextField, string> & { capacity: string };

const CAPACITY_ERROR = 'Capacity must be a positive integer';

function toForm(event: OwnedEvent): FormValues {
  return {
    title: event.title,
    category: event.category,
    date: event.date,
    startTime: event.startTime,
    endTime: event.endTime,
    location: event.location,
    capacity: event.capacity == null ? '' : String(event.capacity),
  };
}

/** The changed fields, or an error message when the capacity is not a number. */
export function changesFrom(
  event: OwnedEvent,
  form: FormValues
): { changes: EventChanges } | { error: string } {
  const changes: EventChanges = {};
  const textFields: TextField[] = ['title', 'category', 'date', 'startTime', 'endTime', 'location'];

  for (const name of textFields) {
    const value = form[name].trim();
    if (value !== event[name]) changes[name] = value;
  }

  const capacityText = form.capacity.trim();
  let capacity: number | null = null;
  if (capacityText) {
    if (!/^\d+$/.test(capacityText) || !Number.isSafeInteger(Number(capacityText))) {
      return { error: CAPACITY_ERROR };
    }
    capacity = Number(capacityText);
  }
  if (capacity !== event.capacity) changes.capacity = capacity;

  return { changes };
}

export default function EditEventScreen() {
  const { session } = useSession();
  const token = session?.token ?? null;

  const [events, setEvents] = useState<OwnedEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<OwnedEvent | null>(null);
  const [form, setForm] = useState<FormValues | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const loadEvents = useCallback(async () => {
    if (!token) {
      setEvents([]);
      return;
    }

    setLoading(true);
    const result = await fetchOwnedEvents(token);
    if (result.success) {
      setEvents(result.events);
    } else {
      setEvents([]);
      setMessage(result.message);
      setIsError(true);
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    setSelected(null);
    setForm(null);
    void loadEvents();
  }, [loadEvents]);

  function select(event: OwnedEvent) {
    setSelected(event);
    setForm(toForm(event));
    setMessage('');
  }

  function setField(name: keyof FormValues, value: string) {
    setForm(current => (current ? { ...current, [name]: value } : current));
  }

  async function handleSave() {
    if (!selected || !form || saving) return;

    const diff = changesFrom(selected, form);
    if ('error' in diff) {
      setMessage(diff.error);
      setIsError(true);
      return;
    }
    if (Object.keys(diff.changes).length === 0) {
      setMessage('No changes to save');
      setIsError(false);
      return;
    }

    setSaving(true);
    const result = await updateEvent(token, selected.id, diff.changes);
    setSaving(false);

    setMessage(result.message);
    setIsError(!result.success);

    if (result.success) {
      const saved: OwnedEvent = { ...selected, ...diff.changes };
      setSelected(saved);
      setForm(toForm(saved));
      setEvents(current => current.map(event => (event.id === saved.id ? saved : event)));
    }
  }

  if (!token) {
    return (
      <View style={styles.container}>
        <Text>Please log in as a club owner to edit events.</Text>
      </View>
    );
  }

  function field(label: string, name: keyof FormValues, placeholder: string) {
    return (
      <View style={styles.field}>
        <Text style={styles.label}>{label}</Text>
        <TextInput
          style={styles.input}
          value={form?.[name] ?? ''}
          onChangeText={value => setField(name, value)}
          placeholder={placeholder}
          placeholderTextColor="#8895a7"
          accessibilityLabel={label}
        />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.brand}>CLUBHOUSE</Text>
      <Text style={styles.heading}>Edit Event</Text>
      <Text style={styles.subtitle}>Update the details of a scheduled event of your club.</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Select Event</Text>

        {loading ? (
          <ActivityIndicator />
        ) : events.length === 0 ? (
          <Text style={styles.hint}>You have no scheduled events to edit.</Text>
        ) : (
          <View style={styles.eventList}>
            {events.map(event => (
              <TouchableOpacity
                key={event.id}
                style={[styles.eventButton, selected?.id === event.id && styles.selectedEvent]}
                onPress={() => select(event)}
              >
                <Text style={[styles.eventTitle, selected?.id === event.id && styles.selectedText]}>
                  {event.title}
                </Text>
                <Text style={selected?.id === event.id ? styles.selectedText : styles.eventMeta}>
                  {event.clubName} · {event.date} {event.startTime}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {selected && form ? (
          <>
            {field('Event Title *', 'title', 'Robotics Workshop')}
            {field('Category *', 'category', 'Academic, Social...')}
            {field('Date *', 'date', 'YYYY-MM-DD')}

            <View style={styles.timeRow}>
              <View style={styles.timeColumn}>{field('Start Time *', 'startTime', 'HH:mm')}</View>
              <View style={styles.timeColumn}>{field('End Time *', 'endTime', 'HH:mm')}</View>
            </View>

            {field('Location *', 'location', 'McConnell 103')}
            {field('Capacity (empty for no limit)', 'capacity', '50')}
          </>
        ) : null}

        {message ? (
          <Text style={isError ? styles.error : styles.success}>{message}</Text>
        ) : null}

        {selected ? (
          <TouchableOpacity style={styles.submit} onPress={handleSave} disabled={saving}>
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#f0f4fa',
    padding: 24,
    paddingTop: 44,
  },
  brand: {
    color: '#2053b6',
    fontWeight: '800',
    letterSpacing: 2,
  },
  heading: {
    fontSize: 30,
    fontWeight: '800',
    color: '#14243a',
    marginTop: 12,
  },
  subtitle: {
    color: '#64748b',
    marginTop: 8,
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 22,
    maxWidth: 650,
    width: '100%',
    alignSelf: 'center',
  },
  eventList: {
    gap: 8,
    marginBottom: 20,
  },
  eventButton: {
    borderWidth: 1,
    borderColor: '#b8c8e0',
    borderRadius: 9,
    padding: 10,
  },
  selectedEvent: {
    backgroundColor: '#2053b6',
    borderColor: '#2053b6',
  },
  eventTitle: {
    fontWeight: '700',
    color: '#1e3a5f',
  },
  eventMeta: {
    color: '#64748b',
  },
  selectedText: {
    color: '#fff',
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontWeight: '700',
    marginBottom: 8,
    color: '#21354d',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccd6e3',
    borderRadius: 9,
    padding: 12,
    fontSize: 15,
    color: '#14243a',
  },
  timeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timeColumn: {
    flex: 1,
  },
  submit: {
    backgroundColor: '#2053b6',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  submitText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  error: {
    color: '#b42318',
    marginBottom: 12,
    fontWeight: '600',
  },
  success: {
    color: '#15803d',
    marginBottom: 12,
    fontWeight: '600',
  },
  hint: {
    color: '#64748b',
    marginBottom: 12,
  },
});
