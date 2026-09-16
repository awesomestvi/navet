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
only missing fixtures, creates missing Living Room, Kitchen, Bedroom, Hallway, Office, Bathroom, Laundry, and Garden zones, assigns devices to those zones,
and verifies the managed device set.
Each fixture has a device-specific Lucide icon. Normal runs never delete existing devices. To
migrate older managed fixtures that lack their expected icon, explicitly run the command with
`--refresh-homey-icons`; it recreates only those fixtures while preserving their zone and current
capability values. The installer installs the pinned Homey CLI dependency automatically on the
first run.

```bash
pnpm provider-lab:homey
```

If the previously selected Homey no longer exists, the CLI asks which active Homey should receive
the fixtures. The selected target should be a disposable Homey Self-Hosted Server. Existing zones and devices are preserved. New lab zones are children of the root zone.

The Homey fixtures cover lights, fans, sockets and household utility measurements, climate,
air quality, security and safety sensors, locks, blinds and curtains, speakers, appliances,
and garden watering. See the [everyday coverage audit](everyday-device-audit.md) for the full
inventory and the remaining provider gaps. Changing a capability in Homey's UI updates its
stored value and emits the normal Homey realtime event consumed by Navet.

## Homey permission coverage

Run `pnpm provider-lab:homey`, connect Navet to the selected Homey, and open its provider hub in
Settings. The installer adds 26 device fixtures, two runnable flows, two moods, and favorite
devices and flows while preserving existing favorites. Resources named `Navet Lab:` are added
only when missing; repeated installation preserves edits to existing flows and moods.

| Permission in the Homey connection screen | Lab coverage and check |
| --- | --- |
| View your Zones | Living Room, Kitchen, Bedroom, and Hallway; browse rooms and their devices. |
| Manage your Favorite Flows & Devices | Ceiling and color lights plus Evening and Morning flows are favorites; toggle a favorite in Navet. |
| Manage your Presence | Toggle Present and Asleep on your signed-in profile, then restore the original values. |
| View everyone's presence | Browse the real Homey users; invite a second test account through Homey to test multiple people. |
| View your Notifications | One welcome notification; running a lab flow adds a scene notification. |
| Set your Moods / View your Moods | Relax and Bright moods set the ceiling light to 25% and 90%; run each and inspect the light. |
| View your Insights | Climate temperature and humidity update every minute using Homey's device Insights. Leave the app running for several minutes before viewing history. |
| Start your Flows / View your Flows | Evening and Morning flows set the ceiling light to 30% and 85% and add a notification. |
| View your Devices / Control your Devices | Dimmable and color lights, fan, socket with energy readings, thermostat, multisensor, standalone safety and occupancy sensors, lock, covers, speakers, appliances, utility meters, and garden valves. Change writable capabilities and check realtime updates. |
| View your Apps | The installed Navet Provider Lab app appears in Apps. |
| View your name and e-mail | The signed-in Homey account supplies its real profile. |
| View your Homeys | The selected activated lab Homey supplies the installation; additional installations require real Homeys on the account. |

Presence, name, e-mail, and Homey discovery are account resources. Virtual devices cannot create
Homey accounts or installations, so the installer does not fabricate those records or change
anyone's presence. Use disposable test accounts when checking those permissions.
Insights starts recording current samples; the fixture does not backfill historical timestamps.
Only the climate fixture changes automatically; controls and sensor values on other fixtures
remain available for manual testing.

Curtain movement completes immediately in this virtual lab. Open, close, stop, position, and
closed-state controls keep the reported values consistent. The Kitchen speaker includes
artist, album, and track metadata; next and previous cycle through three demo tracks.
Valve On means open/watering enabled; Off means closed/watering disabled. An Office presence
sensor describes room occupancy and is separate from the signed-in account's presence.

Additional openHAB coverage includes window and occupancy contacts, smoke/CO and freezer alarm
states, low batteries, air quality, radiator readings, washing-machine power, utility meters,
garden measurements, irrigation and water shutoff switches, and a second cover. Contact-based
demo alarms use OPEN for active and CLOSED for inactive. Numeric radiator setpoints currently
appear as sensors in Navet's openHAB adapter rather than writable thermostat controls.
