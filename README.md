# Chore Quest

A small self-hosted chore app for the family. Parents add chores, kids see today's list on their iPad or iPhone, take a photo to prove a chore is done, and a parent approves it or sends it back. Approved chores earn stars, and kids trade them for rewards in their **Shop** (screen time, eating out, whatever you set). Stars never reset, so kids can save up.

- **Kids** sign in by tapping their avatar and typing a 4–6 digit PIN.
- **Parents** sign in with a password and get five tabs: **Check** (photos and reward requests waiting for you), **Today** (each kid's progress), **Chores**, **Rewards**, and **Family**.
- **Rewards:** in the parent **Rewards** tab, add rewards and set their price in stars. Kids ask for one in their Shop tab, the stars are held, and it shows up in **Check** for a parent to approve. Saying "not now" gives the stars back.
- Chores can repeat **every day**, on **certain days**, **once a week** (any day, resets Monday), or be **one-time** with an optional due date.
- Updates show up live on every device. Photos are shrunk on the phone before upload (~300 KB) and deleted automatically after 30 days (configurable). History and stars are kept.

It's one Docker container: Node.js + SQLite, no external database.

## Install on your Linux server

Needs Docker with the Compose plugin.

```bash
# copy this folder to the server, then:
cd chore-quest
cp .env.example .env        # set TZ, APP_URL, etc.
docker compose up -d --build
docker compose logs app     # shows the 6-digit first-run setup code
```

Open `http://<server-ip>:8080`, enter the setup code, and create your parent account. Then in **Family** add the second parent and both kids (each kid gets a PIN), and in **Chores** add their chores.

## Put it on the iPads and iPhones

1. Open the app's address in **Safari**.
2. Tap **Share**, then **Add to Home Screen**.
3. Open it from the home screen icon. It runs full-screen like a normal app.

On a shared iPad, kids tap **Switch person** at the bottom of their list to hand it over.

## Reaching it from outside the house (and HTTPS)

On your home Wi-Fi, `http://<server-ip>:8080` works fine. To use it away from home, and to get HTTPS (needed for the app to keep working offline and for the most reliable home-screen install), pick one:

**Cloudflare Tunnel** (easiest for the kids' devices, nothing to install on them)
1. In the Cloudflare dashboard (Zero Trust → Networks → Tunnels), create a tunnel and copy its token.
2. Add a public hostname, e.g. `chores.yourdomain.com`, with service `http://app:8080`.
3. Put the token in `.env` as `CLOUDFLARE_TUNNEL_TOKEN`, then run `docker compose --profile tunnel up -d`.

No ports are opened on your router. Note that anyone who finds the address can see the family's first names and avatars on the sign-in screen (nothing else without a PIN or password).

**Tailscale** (most private, the app is never on the public internet)
Install Tailscale on the server and on each iPad/iPhone, then run `tailscale serve --bg 8080` on the server to get an HTTPS address only your devices can reach.

## Notifications for parents (optional)

Install the free **ntfy** app on your phones, subscribe to a hard-to-guess topic, and set `NTFY_URL` in `.env` (for example `https://ntfy.sh/our-family-chores-8f3k2`). You'll get a push every time a kid turns in a chore. Restart with `docker compose up -d` after editing `.env`.

## Backups

Everything lives in the `chore-quest_chore-data` Docker volume (`chores.db` plus the `photos` folder).

```bash
docker compose stop app
docker run --rm -v chore-quest_chore-data:/data -v "$PWD":/backup alpine \
  tar czf /backup/chores-backup-$(date +%F).tgz -C /data .
docker compose start app
```

## Updating

Replace the files, then `docker compose up -d --build`. Your data stays in the volume.

## Security notes

- Passwords and PINs are hashed (scrypt). Five wrong tries locks that account for 5 minutes.
- Sessions use an HttpOnly cookie and last 180 days, so kids stay signed in. Changing a kid's PIN signs them out everywhere.
- Kids can only see and turn in their own chores and photos. Only parents can approve, edit chores, or manage the family.
- Photos are served only to signed-in family members and are never public.

## Settings (`.env`)

| Setting | What it does | Default |
|---|---|---|
| `TZ` | Time zone for "today" and the Monday weekly reset | `America/Los_Angeles` |
| `PHOTO_RETENTION_DAYS` | Days to keep photos after review, `0` = forever | `30` |
| `APP_URL` | Link opened when you tap a notification | – |
| `NTFY_URL` / `NTFY_TOKEN` | Push notifications to parents | off |
| `SETUP_CODE` | Fixed first-run code instead of a random one | random |
| `CLOUDFLARE_TUNNEL_TOKEN` | For the optional tunnel | – |

## Running without Docker

Node.js 22.13 or newer:

```bash
cd app
npm ci --omit=dev
DATA_DIR=./data TZ=America/Los_Angeles npm start
```
