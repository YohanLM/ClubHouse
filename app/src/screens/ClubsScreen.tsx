// Clubs list screen for ID_008 Browse Clubs (T042). Shows the active clubs in
// alphabetical order from GET /clubs, or the API's message, e.g. "Login
// required" when nobody is logged in. Pull down to refresh.
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import type { ApiResult } from '../api/client';
import { fetchClubs, type Club } from '../api/clubs';
import { useSession } from '../session';

export default function ClubsScreen() {
  const { session } = useSession();
  const token = session?.token ?? null;

  const [clubs, setClubs] = useState<Club[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  function showResult(result: ApiResult<{ clubs: Club[] }>) {
    setClubs(result.success ? result.clubs : []);
    setMessage(result.success ? null : result.message);
  }

  // Load again when the user logs in or out; ignore the answer to an older token
  useEffect(() => {
    let current = true;
    setLoading(true);
    fetchClubs(token).then((result) => {
      if (!current) return;
      showResult(result);
      setLoading(false);
    });
    return () => {
      current = false;
    };
  }, [token]);

  async function refresh() {
    setRefreshing(true);
    showResult(await fetchClubs(token));
    setRefreshing(false);
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Clubs</Text>
      <FlatList
        data={clubs}
        keyExtractor={(club) => String(club.id)}
        renderItem={({ item }) => (
          <View style={styles.club}>
            <Text style={styles.clubName}>{item.name}</Text>
            <Text style={styles.clubCategory}>{item.category}</Text>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={styles.empty} size="large" />
          ) : (
            <Text style={[styles.empty, styles.message]}>{message ?? 'No clubs yet.'}</Text>
          )
        }
        refreshing={refreshing}
        onRefresh={refresh}
      />
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
    paddingBottom: 12,
  },
  club: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  clubName: {
    fontSize: 18,
    fontWeight: '600',
  },
  clubCategory: {
    fontSize: 15,
    color: '#666',
    marginTop: 2,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#ccc',
    marginLeft: 20,
  },
  empty: {
    marginTop: 48,
    paddingHorizontal: 20,
  },
  message: {
    fontSize: 17,
    color: '#666',
    textAlign: 'center',
  },
});
