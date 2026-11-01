
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export type EventData = {
  clubId: number;
  title: string;
  category: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  capacity: number | null;
};

type Club = {
  id: number;
  name: string;
};

type Props = {
  clubs: Club[];
  onSubmit: (event: EventData) => Promise<void>;
};

function validDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;

  const [year, month, day] = date.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));

  return d.getUTCFullYear() === year &&
    d.getUTCMonth() + 1 === month &&
    d.getUTCDate() === day;
}

function todayMontreal(): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Toronto',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const get = (type: string) =>
    parts.find(p => p.type === type)?.value ?? '';

  return `${get('year')}-${get('month')}-${get('day')}`;
}

export default function CreateEventForm({
  clubs,
  onSubmit,
}: Props) {
  const [clubId, setClubId] = useState(clubs[0]?.id ?? 0);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [capacity, setCapacity] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    setError('');

    if (!clubId) {
      setError('Please select a club');
      return;
    }

    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    if (!category.trim()) {
      setError('Category is required');
      return;
    }

    if (!validDate(date.trim())) {
      setError('Invalid event date');
      return;
    }

    if (date.trim() < todayMontreal()) {
      setError('Event date cannot be past');
      return;
    }

    const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

    if (!timePattern.test(startTime.trim()) ||
        !timePattern.test(endTime.trim())) {
      setError('Invalid event time');
      return;
    }

    if (endTime.trim() <= startTime.trim()) {
      setError('End time must be after start');
      return;
    }

    if (!location.trim()) {
      setError('Location is required');
      return;
    }

    if (capacity.trim() &&
        (!/^\d+$/.test(capacity.trim()) ||
         !Number.isSafeInteger(Number(capacity)) ||
         Number(capacity) <= 0)) {
      setError('Capacity must be a positive integer');
      return;
    }

    setLoading(true);

    try {
      await onSubmit({
        clubId,
        title: title.trim(),
        category: category.trim(),
        date: date.trim(),
        startTime: startTime.trim(),
        endTime: endTime.trim(),
        location: location.trim(),
        capacity: capacity.trim()
          ? Number(capacity.trim())
          : null,
      });

      Alert.alert('Success', 'Event created successfully!');

      setTitle('');
      setCategory('');
      setDate('');
      setStartTime('');
      setEndTime('');
      setLocation('');
      setCapacity('');
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Failed to create event'
      );
    } finally {
      setLoading(false);
    }
  }

  function field(
    label: string,
    value: string,
    change: (value: string) => void,
    placeholder: string
  ) {
    return (
      <View style={styles.field}>
        <Text style={styles.label}>{label}</Text>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={change}
          placeholder={placeholder}
          placeholderTextColor="#8895a7"
        />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.brand}>CLUBHOUSE</Text>
      <Text style={styles.heading}>Create Event</Text>
      <Text style={styles.subtitle}>
        Organize a new event for your club.
      </Text>

      <View style={styles.card}>
        <Text style={styles.label}>Select Club *</Text>

        <View style={styles.clubRow}>
          {clubs.map(club => (
            <TouchableOpacity
              key={club.id}
              style={[
                styles.clubButton,
                clubId === club.id && styles.selectedClub,
              ]}
              onPress={() => setClubId(club.id)}
            >
              <Text style={{
                color: clubId === club.id ? '#fff' : '#1e3a5f',
              }}>
                {club.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {field('Event Title *', title, setTitle, 'Robotics Workshop')}
        {field('Category *', category, setCategory, 'Academic, Social...')}
        {field('Date *', date, setDate, 'YYYY-MM-DD')}

        <View style={styles.timeRow}>
          <View style={styles.timeColumn}>
            {field('Start Time *', startTime, setStartTime, 'HH:mm')}
          </View>
          <View style={styles.timeColumn}>
            {field('End Time *', endTime, setEndTime, 'HH:mm')}
          </View>
        </View>

        {field('Location *', location, setLocation, 'McConnell 103')}
        {field('Capacity (optional)', capacity, setCapacity, '50')}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={styles.submit}
          onPress={handleCreate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>Create Event</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.hint}>* Required fields</Text>
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
  clubRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  clubButton: {
    borderWidth: 1,
    borderColor: '#b8c8e0',
    borderRadius: 9,
    padding: 10,
  },
  selectedClub: {
    backgroundColor: '#2053b6',
    borderColor: '#2053b6',
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
  hint: {
    color: '#64748b',
    textAlign: 'center',
    fontSize: 12,
    marginTop: 12,
  },
});
