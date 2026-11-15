// Clubs list screen for ID_008 Browse Clubs (T042) and ID_011 Follow Club (T059).
// Shows the active clubs in alphabetical order from GET /clubs, or the API's
// message, e.g. "Login required" when nobody is logged in. Each club has a
// Follow button (POST /clubs/:id/follow) that turns into "Following" once the
// user follows it (GET /follows). Pull down to refresh.
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { ApiResult } from '../api/client';
import { fetchClubs, fetchFollowedClubIds, followClub, type Club } from '../api/clubs';
import { useSession } from '../session';

interface ClubsData {
  clubs: ApiResult<{ clubs: Club[] }>;
  followed: ApiResult<{ clubIds: number[] }>;
}

/** The clubs and the ids of the followed clubs, fetched together. */
async function loadClubs(token: string | null): Promise<ClubsData> {
  const [clubs, followed] = await Promise.all([fetchClubs(token), fetchFollowedClubIds(token)]);
  return { clubs, followed };
}

/** A copy of the set with the id added or removed. */
function withId(ids: Set<number>, id: number, present: boolean): Set<number> {
  const next = new Set(ids);
  if (present) next.add(id);
  else next.delete(id);
  return next;
}

export default function ClubsScreen() {
  const { session } = useSession();
  const token = session?.token ?? null;

  // Lets a follow request ignore its answer if the user logged out meanwhile
  const tokenRef = useRef(token);
  tokenRef.current = token;

  const [clubs, setClubs] = useState<Club[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [followedIds, setFollowedIds] = useState<Set<number>>(new Set());
  /** Clubs with a follow request in progress. */
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());
  /** Result of the last follow, e.g. "Club followed". */
  const [notice, setNotice] = useState<string | null>(null);

  function showResult({ clubs: clubsResult, followed }: ClubsData) {
    setClubs(clubsResult.success ? clubsResult.clubs : []);
    setMessage(clubsResult.success ? null : clubsResult.message);
    setFollowedIds(new Set(followed.success ? followed.clubIds : []));
    setNotice(null);
  }

  // Load again when the user logs in or out; ignore the answer to an older token
  useEffect(() => {
    let current = true;
    setLoading(true);
    setPendingIds(new Set());
    loadClubs(token).then((data) => {
      if (!current) return;
      showResult(data);
      setLoading(false);
    });
    return () => {
      current = false;
    };
  }, [token]);

  async function refresh() {
    setRefreshing(true);
    showResult(await loadClubs(token));
    setRefreshing(false);
  }

  async function follow(club: Club) {
    if (pendingIds.has(club.id)) return;

    const requestToken = token;
    setPendingIds((ids) => withId(ids, club.id, true));
    const result = await followClub(requestToken, club.id);
    if (tokenRef.current !== requestToken) return;
    setPendingIds((ids) => withId(ids, club.id, false));

    if (!result.success) {
      setNotice(`${club.name}: ${result.message}`);
      return;
    }

    setFollowedIds((ids) => withId(ids, club.id, true));
    const followers = `${result.followerCount} follower${result.followerCount === 1 ? '' : 's'}`;
    setNotice(`${result.message}: ${club.name} (${followers})`);
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Clubs</Text>
      {notice && (
        <Text style={styles.notice} accessibilityLiveRegion="polite">
          {notice}
        </Text>
      )}
      <FlatList
        data={clubs}
        extraData={{ followedIds, pendingIds }}
        keyExtractor={(club) => String(club.id)}
        renderItem={({ item }) => (
          <View style={styles.club}>
            <View style={styles.clubInfo}>
              <Text style={styles.clubName}>{item.name}</Text>
              <Text style={styles.clubCategory}>{item.category}</Text>
            </View>
            <FollowButton
              clubName={item.name}
              followed={followedIds.has(item.id)}
              pending={pendingIds.has(item.id)}
              onPress={() => follow(item)}
            />
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

interface FollowButtonProps {
  clubName: string;
  followed: boolean;
  pending: boolean;
  onPress: () => void;
}

/** "Follow", or "Following" once followed (unfollowing is ID_012, not built yet). */
function FollowButton({ clubName, followed, pending, onPress }: FollowButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={followed || pending}
      accessibilityRole="button"
      accessibilityLabel={followed ? `Following ${clubName}` : `Follow ${clubName}`}
      accessibilityState={{ disabled: followed || pending, selected: followed, busy: pending }}
      style={({ pressed }) => [
        styles.followButton,
        followed ? styles.followingButton : styles.followButtonActive,
        pressed && styles.followButtonPressed,
      ]}
    >
      {pending ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
        <Text style={[styles.followText, followed && styles.followingText]}>
          {followed ? '✓ Following' : 'Follow'}
        </Text>
      )}
    </Pressable>
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
  notice: {
    marginHorizontal: 20,
    marginBottom: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#eef3fc',
    color: '#1e3a8a',
    fontSize: 15,
  },
  club: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  clubInfo: {
    flex: 1,
    marginRight: 12,
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
  followButton: {
    minWidth: 104,
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followButtonActive: {
    backgroundColor: '#2053b6',
    borderColor: '#2053b6',
  },
  followingButton: {
    backgroundColor: '#fff',
    borderColor: '#ccd6e3',
  },
  followButtonPressed: {
    opacity: 0.7,
  },
  followText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  followingText: {
    color: '#475569',
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
