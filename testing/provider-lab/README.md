# Navet provider lab fixtures

These fixtures populate existing openHAB and Homey test installations with deterministic rooms,
devices, capabilities, and initial state. They are for local development only.

Install or update both fixture sets with one command:

```bash
pnpm provider-lab:install -- --compose-dir /path/to/docker
```

The provider-specific commands below are available when a contributor runs only one provider.

## Install the openHAB fixtures

From the Navet repository, point the installer at the directory containing the openHAB Compose
file and its `openhab/conf` bind mount:

```bash
pnpm provider-lab:openhab -- --compose-dir /path/to/docker
```

The command copies only the Navet-owned `navet-lab.items` and `navet-lab.rules` files, restarts
openHAB, and verifies a seeded fixture through the live REST API. Existing openHAB files are left
untouched. Use `--openhab-url` when port `8080` is not available at `localhost`, or `--no-restart`
when another process manages the openHAB service.

The fixtures include semantic rooms, lights, switches, power and environmental measurements,
contacts, a lock, motion and leak states, a blind, a fan, media state, and a timestamp.

Connect Navet using the openHAB administrator username and password. If Navet runs in Docker, use
the openHAB host's LAN URL rather than `localhost`, for example `http://192.168.1.50:8080`.

## Install the Homey fixture app

The Homey installer validates and uploads the private fixture app through the Homey account, adds
only missing fixtures, assigns them to matching existing zones, and verifies the final device set.
Each fixture has a device-specific Lucide icon. Normal runs never delete existing devices. To
migrate older managed fixtures that lack their expected icon, explicitly run the command with
`--refresh-homey-icons`; it recreates only those fixtures while preserving their zone and current
capability values. The installer installs the pinned Homey CLI dependency automatically on the
first run.

```bash
pnpm provider-lab:homey
```

If the previously selected Homey no longer exists, the CLI asks which active Homey should receive
the fixtures. The selected target should be a disposable Homey Self-Hosted Server. When a preferred
Living Room, Kitchen, Bedroom, Hallway, or Entrance zone does not exist, the installer safely falls
back to the first root zone.

The Homey fixtures cover lights, fans, sockets and energy measurements, climate, environmental and
security sensors, locks, blinds, and speakers. Changing a capability in Homey's UI updates its
stored value and emits the normal Homey realtime event consumed by Navet.
