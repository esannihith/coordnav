# CoordNav

> **Real-time group movement coordination and navigation — in one app, without the group chat spam.**

<!-- PLACEHOLDER: App screenshot / demo GIF -->
<!-- ![CoordNav Demo](./assets/demo.gif) -->

[![Platform](https://img.shields.io/badge/platform-Android-green?style=flat-square)](https://github.com/esannihith/coordnav)
[![Status](https://img.shields.io/badge/status-Pre--release%20MVP-orange?style=flat-square)](https://github.com/esannihith/coordnav)
[![Stack](https://img.shields.io/badge/stack-React%20Native%20%7C%20Expo%20%7C%20Firebase-blue?style=flat-square)](#tech-stack)

---

## What Is CoordNav?

CoordNav is a mobile application that unifies group coordination and turn-by-turn navigation into a single experience. It is built around the concept of a **Room** — a shared, ephemeral movement context that a group of people join for the duration of a trip or outing.

Inside a Room, every member sees each other's live location on a shared map, can search for places contextually relative to any member, share those places directly into a group chat, and navigate individually to a shared destination — all without leaving the app.

CoordNav is currently **pre-release** and under active development. An early MVP is available on GitHub.

---

## Why CoordNav Exists

The two tools people reach for when going somewhere in a group are Google Maps and WhatsApp. Neither was built for this:

| Problem | Google Maps | WhatsApp |
|---|---|---|
| Live location sharing | Solo-person context only | Requires phone number; tied to personal identity |
| Group coordination | No group awareness | Creates redundant trip groups that linger as spam |
| In-context place search | Works, but isolated from group | Nonexistent |
| Navigation + coordination | Switch apps constantly | Switch apps constantly |

CoordNav treats group movement as a first-class problem. A Room is not a persistent social group — it is a temporary coordination context that expires when the trip ends, with no residue.

---

## Core Concept: The Room

A **Room** is the foundational unit of CoordNav. Everything happens inside one.

- Identified by a **unique 6-digit alphanumeric code**
- Holds up to **10 members** in V1
- Expires automatically after **24 hours** by default; members receive an in-app warning 1 hour before expiry
- Requires Google authentication to create or join
- Automatically dissolves — no manual cleanup needed

### Creating a Room

The owner provides a **Room name** and an **optional destination**. That is the entire creation flow in V1. Advanced options (custom expiry, max member cap) are deferred to later versions.

### Joining a Room

Any authenticated user with the room code can join. The room code is the only credential required.

### Ownership and Lifecycle

- The **owner** can end the room for everyone at any time
- If the owner leaves, ownership transfers automatically to the next longest-standing member
- Any member can leave at any time; if connectivity is lost and not restored within a default timeout, the member is automatically removed
- A member who leaves or is removed can rejoin using the room code as long as the room is still active

---

## Features

### Authentication

Google Sign-In via Firebase. No phone number, email/password, or alternative authentication methods are supported. Authentication is required for all room actions.

---

### Live Location Sharing

All members broadcast their real-time location to the room. This is turned on by default when a member joins and can be toggled off at any time. Location data is visible to all room members on the shared map.

---

### Shared Map and Markers

All members view the same map. The following markers are displayed and visible to everyone:

| Marker Type | Who Creates It | Appearance |
|---|---|---|
| Destination | Room owner (at creation or later) | Distinct destination pin |
| Member location | Each member | Live avatar pin |
| Member-added marker | Any member | Custom pin with description |

**Example:** John adds a marker with the description *"Nice shop, visit on return"* — all members see it immediately.

---

### Place Search and Filtering

Members can search for places using the standard Google Places search. Search results appear as a **list of place cards** and as **markers on the map**.

The map markers are interactive and tied to the list:

- **Default (unvisited):** Standard marker
- **Visited:** Blue marker
- **Starred:** Gold marker
- **Discarded:** Marker removed from map

The place list has three tabs: **All**, **Starred**, and **Discarded** — reflecting the same states.

This solves a real usability problem: when searching for "restaurants near me" and 12 results appear on a map, it is impossible to track which you have already looked at. CoordNav's stateful marker system makes the decision-making process visible.

> **Scope note:** Search results are only visible to the member who performed the search. They are not broadcast to the room unless explicitly shared.

---

### Contextual Search (V1 Star Feature)

Inside a Room, search becomes group-aware. Members can query relative to any other member's live location.

**V1 examples:**
- `restaurants near @sannihith`
- `salons near @priya`
- `petrol station near @rahul`

The `@member` syntax resolves to that member's current live coordinates, making the search relevant to where that person actually is — not where you are.

**Planned in future versions:**
- Multi-member context: `restaurants near @member1, @member2`
- Whole-group queries: `restaurant best for @all` (midpoint or consensus-based)

---

### Place Sharing to Chat

Any search result can be shared directly into the Room chat.

**Single place:** Shares as a chat message. Recipients can tap to view place details.

**Bulk place sharing:** Shares a curated list as a single chat message. Tapping that message opens a scrollable list of place cards. This is designed for scenarios like *"here are the 5 restaurants I shortlisted — pick one."*

---

### Group Chat

Built-in real-time chat for all room members. Messages can be plain text or include shared place cards. No external messaging app is needed.

---

### Turn-by-Turn Navigation

Individual members can navigate to any destination using embedded Google Maps turn-by-turn navigation — without leaving the app or switching to Google Maps. Navigation is powered by the `@googlemaps/react-native-navigation-sdk`.

> **V1 scope:** Navigation is for individual use. There is no shared route or synchronized navigation state across members.

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | React Native (Expo) | Cross-platform foundation; fast iteration |
| Runtime | Expo Development Client | Required for native Google Maps SDK integration; Expo Go does not support native modules |
| Database | Cloud Firestore | Real-time sync via `onSnapshot` listeners; no backend to maintain in V1 |
| Authentication | Firebase Auth (Google Sign-In) | Zero friction; no custom auth surface |
| Maps & Navigation | `@googlemaps/react-native-navigation-sdk` | Native Maps and Navigation SDK; see [package README](https://github.com/googlemaps/react-native-navigation-sdk) for platform constraints |
| Places | Google Places API (Autocomplete, Place Details, Nearby Search) | Powers all place search and contextual search features |
| Routing | Google Directions API | Used internally by the navigation SDK |
| Platform | Android (V1 only) | iOS support deferred |

### Architecture Notes

There is no custom backend. All application logic runs client-side. Firestore `onSnapshot` listeners drive real-time updates for location, chat, and room state. This was a deliberate V1 choice: speed of development and the ability to experiment with data models without a backend deployment cycle.

The trade-offs this introduces — higher client-side Firestore read costs at scale, limited server-side validation — are understood and accepted for the current phase.

**Map Rendering Architecture**

The entire app is built on a single persistent `NavigationView` instance provided by the Google Maps Navigation SDK. This view mounts once when the app starts and is never unmounted. Navigation hooks (turn-by-turn guidance, route state, arrival events) are attached and detached as needed without touching the map layer itself.

The consequence is that map state changes — adding or removing markers, drawing or clearing polylines, updating member location pins — do not trigger a map rerender. The map renders exactly once. This is a deliberate performance decision and a meaningful constraint: any feature that interacts with the map must work within this single-instance model rather than relying on React re-render cycles to reflect map changes.

---

## Data Architecture

The Firestore schema, collection structure, and real-time event model are documented in the repository.

📂 **[View full data architecture on GitHub →](https://github.com/esannihith/coordnav)**

---

## Offline and Connectivity Behavior

**V1 behavior:** If a member loses connectivity and does not reconnect within a default timeout window, their member document is automatically deleted from the room. They can rejoin using the room code as long as the room has not expired. There is no background location support in V1 — the app must be in the foreground for live location to broadcast.

---

## V1 Scope Summary

The following is what ships in V1:

- ✅ Google Sign-In
- ✅ Room creation and joining (name + optional destination)
- ✅ Live location sharing (foreground only)
- ✅ Shared map with destination, member, and custom markers
- ✅ Room group chat with place message support
- ✅ Place search, filtering, and stateful markers (visited / starred / discarded)
- ✅ Single and bulk place sharing to chat
- ✅ Contextual search (`near @member`)
- ✅ Individual turn-by-turn navigation (in-app)
- ✅ Automatic room expiry (24 hours)

---

## Roadmap

### V1.5
- Shared invite links (deep link room join)
- Multi-room support
- Custom room expiry and member cap at creation
- Ownership transfer refusal option
- `displayname` field on room join

### V2 and Beyond
- Background location sharing
- Multi-member and whole-group contextual search (`@all`, midpoint logic)
- iOS support
- Expiry warning push notifications
- Route sharing and synchronized navigation

---

## Getting Started

> CoordNav is pre-release. The following is for developers setting up a local development environment.

**Prerequisites:**
- Node.js (dev toolchain only — no backend server)
- Android device or emulator
- A Firebase project with Firestore and Google Sign-In enabled
- Google Maps API key with Maps SDK (Android), Places API, and Directions API enabled
- Expo CLI and Expo Development Client

**Setup:**

```bash
git clone https://github.com/esannihith/coordnav
cd coordnav
npm install
```

Configure your environment variables (Google Maps API key, Firebase config) — refer to `.env.example` in the repository.

```bash
npx expo run:android
```

> Expo Go is **not supported**. The native Google Maps Navigation SDK requires a custom development client.

---

## License

<!-- TODO: Add license -->

---

*CoordNav is a solo-developed project, currently in pre-release.*
