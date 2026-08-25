---
title: Home Assistant
description: Install Navet with HACS, as a Home Assistant App, or with Docker.
editUrl: https://github.com/awesomestvi/navet/edit/main/docs/HOME_ASSISTANT.md
---

This guide helps you install Navet for Home Assistant.

You only need to choose **one** installation method.

## Pick an installation method

| Choose this | Use it when |
|---|---|
| **HACS custom panel** | You already use HACS and want Navet in the Home Assistant sidebar. This is the easiest choice for most HACS users. |
| **Home Assistant App** | You use Home Assistant OS and want Home Assistant to run Navet for you. |
| **Standalone Docker** | You already manage Docker and want Navet to run as a separate website. |

Not sure which one to choose? Use the **HACS custom panel** if you already have HACS. Otherwise,
use the **Home Assistant App**.

## Option 1: Install with HACS

### What you need

- Home Assistant
- HACS

### Install Navet

1. Open **HACS** in Home Assistant.
2. Open **Integrations**.
3. Open the menu in the top-right corner and choose **Custom repositories**.
4. Paste this address:

   ```text
   https://github.com/awesomestvi/navet-hacs
   ```

5. Choose **Integration** as the category, then add the repository.
6. Search for **Navet** in HACS and download it.
7. Restart Home Assistant.
8. Go to **Settings → Devices & services**.
9. Choose **Add integration**, search for **Navet**, and add it.
10. Open **Navet** from the Home Assistant sidebar.

That is all. Navet uses your current Home Assistant session. You do not need a separate Navet
account, Home Assistant address, or access token.

## Option 2: Install the Home Assistant App

### What you need

- Home Assistant OS on an `amd64` or `aarch64` system

### Install Navet

1. Go to **Settings → Apps → App store**.
2. Open the menu in the top-right corner and choose **Repositories**.
3. Paste this address and add it:

   ```text
   https://github.com/awesomestvi/navet
   ```

4. Find **Navet** in the App store and install it.
5. Turn on **Start on boot**.
6. Turn on **Show in sidebar**.
7. Choose **Start**.
8. Wait until the App says **Running**.
9. Choose **Open Web UI**.

Your rooms and devices should appear automatically. You do not need to enter a Home Assistant
address or access token.

## Option 3: Install with Docker

Choose this option only if you are comfortable using Docker.

### What you need

- Docker with Docker Compose
- a Home Assistant address reachable from the browser while it signs in, such as a LAN, VPN,
  Tailscale, or external address
- a route from the Navet container to the same Home Assistant installation

### Create the Compose file

1. Make a new folder for Navet.
2. Inside that folder, create a file named `docker-compose.yml`.
3. Paste this into the file:

   ```yaml
   services:
     navet:
       image: ghcr.io/awesomestvi/navet:latest
       container_name: navet
       restart: unless-stopped
       ports:
         - "8080:80"
       volumes:
         - navet-data:/data

   volumes:
     navet-data:
   ```

### Start Navet

1. Open a terminal in the folder that contains `docker-compose.yml`.
2. Run:

   ```bash
   docker compose up -d
   ```

3. If you did not set `NAVET_HASS_URL` and this is a fresh installation, run
   `docker compose logs navet`, copy the URL containing
   `#navet_pairing=<64-character-key>`, and open that complete URL once. Navet removes the key
   from the address immediately and keeps it only until the first server is approved.
4. Open [`http://localhost:8080`](http://localhost:8080) when Docker runs on this computer. From
   another device, replace `localhost` with the Docker host's LAN, VPN, or public name.
5. Choose **Home Assistant**, enter an address that the current browser can reach, and sign in.
6. Approve the Home Assistant login when asked.

Keep the `navet-data` volume. It stores your Navet dashboard and browser sign-ins when the
container is updated or recreated.

### Sign in at home or through a VPN

After the first trusted Home Assistant server is approved, each browser can use the address that
works from its current network. Enter a LAN address at home or a VPN, Tailscale, or external
address while away.

You do not need to add every address to Docker Compose or pair each address separately. The
browser address opens the Home Assistant authorization page, while Navet verifies the completed
login and proxies dashboard API calls, WebSocket traffic, access-token renewal, and
provider-managed HTTP camera resources through its trusted server connection. After sign-in, the
remote browser does not need a route to the saved LAN address. An address for a different Home
Assistant installation cannot silently replace it.

A camera **direct-stream URL** that you explicitly configure in Navet is the exception: that custom
URL is intentionally opened by the browser and must be reachable from the browser's current
network. Home Assistant-provided snapshots, HLS, and fallback paths remain behind Navet's proxy.
Native WebRTC can still negotiate a separate media path supplied by Home Assistant; when that path
is not usable across the current network, Navet falls back to another provider-supported transport.

### Optional: set the trusted Home Assistant server

`NAVET_HASS_URL` is **not required**. If your Navet installation already connects to Home Assistant,
leave your Compose file as it is. Navet remembers the approved server in the `navet-data` volume.

For a brand-new installation, setting the address is the simplest way to approve the exact Home
Assistant server. Add these lines under `restart: unless-stopped`:

```yaml
environment:
  NAVET_HASS_URL: "http://homeassistant.local:8123"
```

Replace the example with an address that works from the Navet container. A browser may use another
LAN, VPN, Tailscale, or external address for the same Home Assistant installation.

If you leave the setting out, Navet tries common local Home Assistant addresses. A completely new
installation requires the one-time pairing link shown in the container log before it can approve
the first server. Existing installations with saved `navet-data` do not need to do this again.

If the remembered upstream becomes permanently unreachable, recover the installation key with
`docker exec navet cat /data/navet-installation-key`, reopen Navet once with
`#navet_pairing=<key>`, and complete a fresh Home Assistant sign-in in that same tab using the new
route. This changes the trusted route only after Home Assistant accepts the sign-in. Keep the key
private. When `NAVET_HASS_URL` is configured, update the pinned value and recreate the container
instead.

### Update the Docker installation

Run these commands from the same folder:

```bash
docker compose pull
docker compose up -d
```

Do not add `-v` when stopping the Compose project. That option deletes the saved Navet data.

## Optional: let Navet hide the Home Assistant bars

Skip this section during your first install. Navet works without it.

The HACS integration includes a small Home Assistant module that lets Navet hide the Home Assistant
header and sidebar in kiosk mode.

1. Make sure the Navet HACS integration is installed.
2. Open your Home Assistant `configuration.yaml` file.
3. Add:

   ```yaml
   frontend:
     extra_module_url:
       - /api/navet/static/navet-ha-shell.js
   ```

4. Save the file.
5. Check the configuration in Home Assistant.
6. Restart Home Assistant.

If you already have a `frontend:` section, add only the `extra_module_url` lines inside it. Do not
create a second `frontend:` section.

## If something does not work

### Navet is missing from the sidebar after a HACS install

1. Make sure Home Assistant was restarted after the download.
2. Go to **Settings → Devices & services**.
3. Check that the **Navet** integration is installed.
4. If it is missing, choose **Add integration** and add **Navet**.
5. Refresh the browser page.

### The Home Assistant App does not open

1. Open **Settings → Apps → Navet**.
2. Check that its status is **Running**.
3. Open the **Log** tab and read the first error.
4. Restart the App and try **Open Web UI** again.

### Docker cannot connect to Home Assistant

1. If the Home Assistant sign-in page does not open, make sure the address entered in Navet works
   from the current browser and that its VPN or external route is connected.
2. If Home Assistant accepts the sign-in but Navet does not connect, make sure the trusted server
   or `NAVET_HASS_URL` works from the Navet container.
3. If the server uses HTTPS, make sure the container trusts its certificate.
4. If Navet says operator pairing is required on an existing installation, make sure the original
   `navet-data` volume is mounted. For a new installation, use the one-time link in the container
   log or set `NAVET_HASS_URL`.
5. Run `docker compose up -d` again after changing the Compose file.

### Navet stays on Starting your dashboard

1. Reload Navet once so the current application version is active.
2. Confirm that the Navet container can still reach its trusted Home Assistant upstream. The
   browser does not need to reach that saved LAN address after sign-in.
3. Keep the VPN connected if it is how you reach Navet itself. A VPN route to Home Assistant is
   needed in the browser only when opening its authorization page or when you configured a custom
   camera direct-stream URL.
4. If the screen changes to a recovery message, use **Retry connection** for a temporary outage.
   Choose **Back to login** when you need to clear the current browser session and sign in again.

### Login returns to the wrong page

If Navet is behind a reverse proxy, make sure the proxy keeps the original host name and HTTPS
information. Start the login and finish it in the same browser.

For more checks, see [Connection or sign-in fails](/guide/troubleshooting/connection/).

## You are ready

Open Navet and check that your rooms and devices appear. Then continue with
[Your first 15 minutes with Navet](/guide/quick-start/first-15-minutes/).
