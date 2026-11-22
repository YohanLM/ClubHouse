# NFR ID_033 – Calendar Load Time (T103)

Requirement, from the Sprint B Project Preparation (Planguage):

| | |
|---|---|
| **Scale** | Seconds between requesting the events calendar and the first upcoming event being displayed. |
| **Meter** | Stopwatch measurement on a device over a Wi-Fi connection with 100 events stored. |
| **Must** | At most 2 seconds. |

The time has two parts: the server answering `GET /events/calendar`, and the network plus the app drawing the list. Part 1 is measured automatically. Part 2 is the stopwatch test on a phone.

## 1. Server side (automated)

```bash
npm run measure:calendar
```

`backend/scripts/measureCalendarLoad.ts`:
1. Creates a temporary SQLite database. Your local database is not touched, and the temporary one is deleted at the end.
2. Adds the demo data (T093), then fills up to **100 events stored**: 98 upcoming scheduled events, 1 cancelled and 1 completed.
3. Adds RSVPs from the 2 demo users, so the calendar's attendee counts are computed on real data.
4. Starts the real HTTP API and logs in as `alice.tremblay@mail.mcgill.ca`.
5. Requests the calendar 30 times. Each timing covers sending the request, receiving the response and reading its JSON, as the app does.

It checks that every upcoming event is returned. It fails (exit code 1) if a request takes more than 2 s.

### Results (2026-11-22)

Machine: Windows 11 (10.0.26200), AMD Ryzen 9 6900HS, Node 25.2.1. API and client on the same machine. 100 events stored, 98 returned, 19.4 KB of JSON.

| Run | First request | Median | 95th percentile | Max |
|---|---|---|---|---|
| 1 | 11.4 ms | 5.1 ms | 7.8 ms | 11.4 ms |
| 2 | 10.5 ms | 4.8 ms | 7.9 ms | 10.5 ms |
| 3 | 9.8 ms | 4.4 ms | 6.9 ms | 9.8 ms |

**Server side: met.** The server uses at most 12 ms, under 1 % of the 2 s budget. Almost all of the budget is left for the Wi-Fi network and for drawing the list on the phone.

## 2. Device (stopwatch): the NFR meter

The calendar is shown by the **Events** tab of the app (`app/src/screens/EventsScreen.tsx`, `GET /events/calendar`). The dedicated Calendar screen (T077) is not built yet. Measure again once it is.

1. Put the computer and the phone on the same Wi-Fi network. Find the computer's address (`ipconfig` on Windows, for example `192.168.0.12`).
2. Start the API with the 100 events:
   ```bash
   npm run measure:calendar -- --serve
   ```
   After the server-side results, it keeps the API running on port 3000 with the same 100 events, until Ctrl+C. If Windows asks, allow Node on private networks.
3. In a second terminal, start the app against that address, then open it in Expo Go on the phone:
   ```powershell
   $env:EXPO_PUBLIC_API_URL="http://192.168.0.12:3000"; npm run app
   ```
4. In the **Login** tab, log in as `alice.tremblay@mail.mcgill.ca`, password `Passw0rd!23`.
5. Start the stopwatch when you tap the **Events** tab. Stop it when the first event card (`Load Test Event 001`) is visible.
6. Do it 3 times. For trials 2 and 3, go to another tab, then tap **Events** again. Write down the median.

| Date | Device and OS | Network | Trial 1 | Trial 2 | Trial 3 | Median | Must (≤ 2 s) |
|---|---|---|---|---|---|---|---|
| _to do_ | | Wi-Fi | | | | | |
