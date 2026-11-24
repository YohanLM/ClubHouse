import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { fetchCalendar, type CalendarEvent } from '../api/calendar';
import { fetchFollowedClubIds } from '../api/clubs';
import { useSession } from '../session';

function localDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function CalendarScreen() {
  const { session } = useSession();
  const token = session?.token ?? null;
  const today = localDateString(new Date());
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState('');
  const [appliedRange, setAppliedRange] = useState({ from: today, to: '' });
  const [reloadId, setReloadId] = useState(0);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [followedIds, setFollowedIds] = useState<number[]>([]);
  const [followedOnly, setFollowedOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    Promise.all([
      fetchCalendar(token, appliedRange.from, appliedRange.to),
      fetchFollowedClubIds(token),
    ]).then(([calendar, followed]) => {
      if (!active) return;
      if (!calendar.success) {
        setEvents([]);
        setError(calendar.message);
      } else if (!followed.success) {
        setEvents([]);
        setError(followed.message);
      } else {
        setEvents(calendar.events);
        setFollowedIds(followed.clubIds);
      }
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [token, appliedRange, reloadId]);

  const visibleEvents = useMemo(
    () => followedOnly
      ? events.filter((event) => followedIds.includes(event.clubId))
      : events,
    [events, followedIds, followedOnly],
  );

  function applyFilters() {
    setAppliedRange({ from: from.trim(), to: to.trim() });
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Calendar</Text>
      <Text style={styles.subtitle}>Upcoming club events</Text>

      <View style={styles.filters}>
        <View style={styles.dateFields}>
          <View style={styles.dateField}>
            <Text style={styles.label}>From</Text>
            <TextInput
              accessibilityLabel="Start date"
              style={styles.input}
              value={from}
              onChangeText={setFrom}
              placeholder="YYYY-MM-DD"
              autoCapitalize="none"
              maxLength={10}
            />
          </View>
          <View style={styles.dateField}>
            <Text style={styles.label}>To</Text>
            <TextInput
              accessibilityLabel="End date"
              style={styles.input}
              value={to}
              onChangeText={setTo}
              placeholder="No end date"
              autoCapitalize="none"
              maxLength={10}
            />
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={applyFilters}
          style={({ pressed }) => [styles.applyButton, pressed && styles.pressed]}
        >
          <Text style={styles.applyText}>Apply date range</Text>
        </Pressable>

        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: followedOnly }}
          onPress={() => setFollowedOnly((value) => !value)}
          style={styles.followedFilter}
        >
          <View style={[styles.checkbox, followedOnly && styles.checkboxChecked]}>
            {followedOnly ? <Text style={styles.checkmark}>✓</Text> : null}
          </View>
          <Text style={styles.followedLabel}>Followed clubs only</Text>
        </Pressable>
      </View>

      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">{error}</Text>
      ) : null}

      {loading ? (
        <ActivityIndicator style={styles.loading} size="large" />
      ) : (
        <FlatList
          data={visibleEvents}
          keyExtractor={(event) => String(event.id)}
          contentContainerStyle={visibleEvents.length === 0 && styles.emptyList}
          renderItem={({ item }) => <EventCard event={item} />}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            error ? null : (
              <Text style={styles.empty}>
                {followedOnly && followedIds.length === 0
                  ? 'You are not following any clubs yet.'
                  : 'No upcoming events in this date range.'}
              </Text>
            )
          }
          onRefresh={() => setReloadId((id) => id + 1)}
          refreshing={loading}
        />
      )}
    </View>
  );
}

function EventCard({ event }: { event: CalendarEvent }) {
  return (
    <View style={styles.event}>
      <Text style={styles.eventDate}>{event.date} · {event.startTime}</Text>
      <Text style={styles.eventTitle}>{event.title}</Text>
      <Text style={styles.clubName}>{event.clubName}</Text>
      <Text style={styles.details}>{event.category} · {event.location}</Text>
      <Text style={styles.details}>
        {event.attendeeCount} attending · Ends {event.endTime}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    paddingHorizontal: 20,
  },
  subtitle: {
    color: '#64748b',
    fontSize: 16,
    paddingHorizontal: 20,
    paddingTop: 2,
    paddingBottom: 14,
  },
  filters: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  dateFields: {
    flexDirection: 'row',
    gap: 12,
  },
  dateField: {
    flex: 1,
  },
  label: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    color: '#0f172a',
  },
  applyButton: {
    alignItems: 'center',
    backgroundColor: '#2053b6',
    borderRadius: 8,
    marginTop: 10,
    paddingVertical: 11,
  },
  applyText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.75,
  },
  followedFilter: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 12,
    minHeight: 34,
  },
  checkbox: {
    alignItems: 'center',
    borderColor: '#94a3b8',
    borderRadius: 4,
    borderWidth: 1,
    height: 20,
    justifyContent: 'center',
    marginRight: 9,
    width: 20,
  },
  checkboxChecked: {
    backgroundColor: '#2053b6',
    borderColor: '#2053b6',
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    lineHeight: 17,
  },
  followedLabel: {
    color: '#334155',
    fontSize: 15,
  },
  error: {
    color: '#b42318',
    marginHorizontal: 20,
    marginBottom: 8,
  },
  loading: {
    marginTop: 36,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  empty: {
    color: '#64748b',
    fontSize: 16,
    paddingHorizontal: 24,
    textAlign: 'center',
  },
  event: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  eventDate: {
    color: '#2053b6',
    fontSize: 14,
    fontWeight: '600',
  },
  eventTitle: {
    color: '#0f172a',
    fontSize: 19,
    fontWeight: '700',
    marginTop: 4,
  },
  clubName: {
    color: '#334155',
    fontSize: 16,
    marginTop: 2,
  },
  details: {
    color: '#64748b',
    fontSize: 14,
    marginTop: 3,
  },
  separator: {
    backgroundColor: '#e2e8f0',
    height: StyleSheet.hairlineWidth,
    marginLeft: 20,
  },
});
