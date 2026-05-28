# Audit Navet for Multi-Backend Architecture

You are auditing the Navet codebase.

Navet is intended to be a premium smart-home frontend that can connect to multiple backend/integration systems.

Supported/future integration backends may include:

- Home Assistant
- Homey
- openHAB
- Demo/mock backend
- Future smart-home platforms

Important product direction:

Navet must NOT be architected as a Home Assistant-only frontend.

Home Assistant is currently one important backend, but the long-term goal is that any integration layer can connect to Navet through a stable Navet integration contract.

Your task is to audit the current codebase and determine whether Navet is built as:

1. A Home Assistant-specific frontend
2. A generic smart-home frontend with Home Assistant as one adapter
3. A mixed/fragile architecture that needs separation

Do not refactor yet.
Do not delete files yet.
Do not rewrite architecture yet.
First inspect, map, and report.

Be brutally honest. If the current code is too coupled to Home Assistant, say so clearly.

---

## Main questions

Answer these:

1. Is Navet currently coupled directly to Home Assistant concepts?
2. Does Navet have a generic smart-home domain model?
3. Is there a stable integration/provider contract?
4. Can Homey, openHAB, or another backend be added without rewriting UI cards?
5. Are UI components backend-agnostic, or do they know about Home Assistant internals?
6. Are entities/devices/services/actions modeled generically?
7. Is Home Assistant treated as one adapter, or is it hardcoded across the app?
8. What would break if we added a Homey adapter tomorrow?
9. What should be preserved?
10. What must change before Navet can support multiple backends properly?

---

## Core architecture target

Use this as the desired long-term direction:

Navet should have this separation:

```txt
Navet UI
Navet smart-home domain model
Navet integration contract
Backend adapters
Backend-specific mappers
```

Desired structure:

```txt
apps/
  web/
  addon/
  panel/

packages/
  navet-core/
    domain-model
    integration-contract
    state-model
    capability-model
    action-model

  navet-ui/
    design-system
    cards
    layouts
    dashboard-builder

  integrations/
    home-assistant/
      auth
      connection
      mapper
      actions
      resources

    homey/
      auth
      connection
      mapper
      actions
      resources

    openhab/
      auth
      connection
      mapper
      actions
      resources

    demo/
      fixtures
      mock-connection
```

The UI should depend on Navet core types, not directly on Home Assistant, Homey, or openHAB types.

---

## Desired mental model

Bad:

```txt
LightCard -> Home Assistant entity -> call homeassistant.turn_on
```

Good:

```txt
LightCard -> NavetDevice / NavetCapability -> adapter.executeAction()
```

Bad:

```txt
CameraCard -> builds /api/camera_proxy URL
```

Good:

```txt
CameraCard -> resourceResolver.resolve(camera.previewResource)
```

Bad:

```txt
Dashboard -> Home Assistant area/device/entity registry
```

Good:

```txt
Dashboard -> NavetLocation / NavetDevice / NavetCapability
```

---

## Step 1: Repository map

Inspect the full repository.

Pay special attention to:

```txt
src/
app/
packages/
components/
features/
hooks/
services/
lib/
utils/
contexts/
providers/
stores/
types/
api/
integrations/
home-assistant/
homey/
openhab/
dashboard/
cards/
auth/
resources/
package.json
README.md
AGENTS.md
agents.md
Docker files
add-on files
HACS/custom-panel files
Vite config
test setup
```

Create a map.

For each major folder:

- Folder
- Purpose
- Important files
- Depends on
- Used by
- Backend-specific or backend-agnostic
- Risk level: low / medium / high
- Notes

---

## Step 2: Identify backend-specific coupling

Search for these backend-specific terms.

Home Assistant terms:

```txt
homeassistant
Home Assistant
hass
HassEntity
entity_id
domain
device_class
supported_features
api/websocket
call_service
callService
states
services
areas
devices
entity_registry
device_registry
area_registry
camera_proxy
long_lived_access_token
supervisor
ingress
```

Homey terms:

```txt
homey
Homey
flow
zone
device class
capability
app
athom
websocket
bearer token
```

openHAB terms:

```txt
openhab
openHAB
item
thing
channel
sitemap
semantic model
rule
persistence
rest
```

Generic smart-home terms:

```txt
device
entity
capability
action
service
state
room
area
zone
location
scene
automation
trigger
condition
resource
media
camera
sensor
```

For each backend-specific match, classify it as:

- UI component coupling
- Hook coupling
- Store coupling
- Service/API coupling
- Type coupling
- Test coupling
- Config coupling
- Install-mode coupling

Report exact file paths and examples.

---

## Step 3: Audit domain model

Determine whether Navet has a backend-neutral smart-home model.

Look for existing types that represent:

- Device
- Entity
- Capability
- State
- Action
- Room/area/zone/location
- Scene
- Automation
- Sensor
- Camera
- Media player
- Climate device
- Lock
- Cover
- Vacuum
- Light
- Switch
- Weather
- Energy
- Calendar
- Notification
- Resource/media item

Answer:

- Are these types generic Navet types?
- Or are they Home Assistant types reused everywhere?
- Are Homey/openHAB concepts considered?
- Are backend IDs separated from Navet IDs?
- Is there a normalized device model?
- Is there a normalized capability model?
- Is there a normalized action model?
- Are backend-specific raw objects leaking into UI?

Use this classification.

Good:

- UI consumes NavetDevice, NavetCapability, NavetAction
- Backend raw data is mapped at adapter boundary
- Cards do not know backend-specific payloads
- Backend-specific IDs are hidden behind stable Navet IDs
- Capabilities are explicit

Bad:

- UI consumes HassEntity directly
- Cards check Home Assistant domain/device_class everywhere
- Service calls are hardcoded in cards
- Home Assistant supported_features are used directly in generic UI
- Resource URLs are built inside components
- Backend raw objects are stored as primary app state

---

## Step 4: Define the desired Navet integration contract

Check whether something like this already exists.

If not, recommend it.

Suggested contract:

```ts
export type NavetBackendId =
  | "home-assistant"
  | "homey"
  | "openhab"
  | "demo"
  | string;

export type NavetIntegrationProvider = {
  id: NavetBackendId;
  name: string;

  auth: NavetAuthProvider;

  connect(config: NavetConnectionConfig): Promise<NavetConnection>;
  disconnect(): Promise<void>;

  getSnapshot(): Promise<NavetSmartHomeSnapshot>;

  subscribeToUpdates(
    callback: (event: NavetIntegrationEvent) => void
  ): Promise<() => void>;

  executeAction(action: NavetActionRequest): Promise<NavetActionResult>;

  resolveResource(
    resource: NavetResourceRequest
  ): Promise<NavetResolvedResource>;

  getCapabilities(): Promise<NavetBackendCapabilities>;
};
```

Suggested normalized snapshot:

```ts
export type NavetSmartHomeSnapshot = {
  locations: NavetLocation[];
  devices: NavetDevice[];
  entities: NavetEntity[];
  scenes: NavetScene[];
  automations: NavetAutomation[];
  resources?: NavetResource[];
};
```

Suggested device/entity model:

```ts
export type NavetDevice = {
  id: string;
  backendId: string;
  source: NavetBackendId;
  name: string;
  locationId?: string;
  manufacturer?: string;
  model?: string;
  capabilities: NavetCapability[];
  raw?: unknown;
};

export type NavetEntity = {
  id: string;
  backendId: string;
  source: NavetBackendId;
  deviceId?: string;
  name: string;
  kind: NavetEntityKind;
  state: NavetState;
  capabilities: NavetCapability[];
  raw?: unknown;
};
```

Suggested capability model:

```ts
export type NavetCapability =
  | { type: "power"; actions: ["turnOn", "turnOff", "toggle"] }
  | { type: "brightness"; min: number; max: number }
  | { type: "color"; modes: string[] }
  | {
      type: "temperature";
      min?: number;
      max?: number;
      unit: "celsius" | "fahrenheit";
    }
  | { type: "humidity"; unit: "percent" }
  | { type: "lock"; actions: ["lock", "unlock"] }
  | { type: "cover"; actions: ["open", "close", "stop", "setPosition"] }
  | { type: "camera"; supportsStream: boolean; supportsSnapshot: boolean }
  | { type: "media"; actions: string[] }
  | { type: "vacuum"; actions: string[] }
  | { type: "sensor"; deviceClass?: string; unit?: string }
  | { type: "battery"; unit: "percent" };
```

Suggested action request:

```ts
export type NavetActionRequest = {
  source: NavetBackendId;
  targetId: string;
  action: string;
  payload?: Record<string, unknown>;
};
```

The audit should check whether current code is moving toward this model or away from it.

---

## Step 5: Audit UI components and cards

Inspect all cards and dashboard components.

For each card:

- File path
- Card name
- Does it consume generic Navet types?
- Does it consume Home Assistant types directly?
- Does it call backend APIs directly?
- Does it build backend-specific URLs?
- Does it know about HA entity_id/domain/device_class/supported_features?
- Could it work with Homey/openHAB after only adapter mapping?
- Risk level

Important:

Cards should render capabilities, not backend platforms.

Bad:

```ts
if (entity.entity_id.startsWith("light.")) {
  callService("light", "turn_on");
}
```

Good:

```ts
if (device.capabilities.some((capability) => capability.type === "power")) {
  executeAction({ targetId: device.id, action: "turnOn" });
}
```

---

## Step 6: Audit backend adapters

Check whether adapters exist.

Look for:

- Home Assistant adapter
- Homey adapter
- openHAB adapter
- Demo/mock adapter

For each adapter:

- Folder/file path
- Auth implementation
- Connection implementation
- State fetching
- Update subscription
- Action execution
- Resource resolving
- Mapping from backend model to Navet model
- Error handling
- Test coverage
- Risk level

If no adapter boundary exists, document where backend logic currently lives and recommend where it should move.

---

## Step 7: Audit Home Assistant implementation specifically

Home Assistant is still important, but it must be treated as one adapter.

Audit:

- Auth
- WebSocket
- REST
- Entity fetching
- Entity subscriptions
- Service calls
- Registries
- Areas/devices/entities
- Resource/media URL handling
- Add-on ingress
- HACS/custom panel
- Standalone Docker
- Local dev

Classify everything as:

- Belongs inside Home Assistant adapter
- Belongs in generic Navet core
- Belongs in UI
- Currently misplaced

---

## Step 8: Audit possible Homey/openHAB readiness

Even if Homey/openHAB are not implemented yet, evaluate whether the architecture allows them.

Answer:

- Where would a Homey adapter be added?
- Where would an openHAB adapter be added?
- What types would need to change?
- What cards would break?
- What assumptions are HA-only?
- Does Navet use “area” everywhere when Homey may use “zone”?
- Does Navet use “entity” everywhere when openHAB may use “item”?
- Does Navet assume service-call semantics from Home Assistant?
- Does Navet assume one backend per dashboard?
- Can multiple backends exist at the same time?

Important future requirement:

Navet should eventually support one or more connected backends.

Example:

- Home Assistant for local devices
- Homey for flows/devices
- openHAB for another installation
- Demo backend for marketing/testing

Audit whether current state model can support:

- One backend only
- Multiple backends but one active
- Multiple backends simultaneously

---

## Step 9: Audit state management

Find where smart-home state is stored.

Check for:

- React context
- Zustand
- Redux
- TanStack Query
- Local component state
- Custom store
- localStorage
- sessionStorage
- IndexedDB

Answer:

- Is state stored as backend raw data or normalized Navet data?
- Can entities from multiple backends coexist?
- Are IDs globally unique?
- Are backend IDs namespaced?
- Are updates applied through a generic event model?
- Are there multiple sources of truth?
- Is demo/mock state separated from real state?
- Can stale entities happen?
- Is reconnect handled?
- Is offline mode handled?

Desired event model:

```ts
export type NavetIntegrationEvent =
  | { type: "entity.updated"; source: string; entity: NavetEntity }
  | { type: "entity.removed"; source: string; entityId: string }
  | { type: "device.updated"; source: string; device: NavetDevice }
  | {
      type: "connection.status_changed";
      source: string;
      status: NavetConnectionStatus;
    }
  | { type: "resource.updated"; source: string; resource: NavetResource };
```

---

## Step 10: Audit resources and media

Resource handling must be backend-neutral.

Search for:

```txt
camera
camera_proxy
stream
media
album
artwork
entity_picture
picture
thumbnail
image
rss
external_url
internal_url
base_url
ingress
proxy
authenticated fetch
```

Answer:

- Is resource handling centralized?
- Is it Home Assistant-specific?
- Could Homey/openHAB resources be resolved the same way?
- Do UI components receive resolved resources or raw backend URLs?
- Are authenticated resources handled through adapter resolver?
- Are broken resources handled gracefully?

Desired model:

```ts
export type NavetResource = {
  id: string;
  source: NavetBackendId;
  type:
    | "image"
    | "camera_snapshot"
    | "camera_stream"
    | "media_artwork"
    | "rss"
    | "external";
  url?: string;
  requiresAuth?: boolean;
  expiresAt?: string;
  metadata?: Record<string, unknown>;
};

export type NavetResolvedResource = {
  url: string;
  headers?: Record<string, string>;
  refreshAt?: string;
};
```

---

## Step 11: Audit actions/services

Backend actions must be generic at UI level.

Search for:

```txt
callService
call_service
turn_on
turn_off
toggle
set_temperature
set_hvac_mode
open_cover
close_cover
lock
unlock
media_play_pause
start
pause
stop
return_to_base
send_command
flow
rule
item command
```

For each action:

- File path
- Backend-specific or generic
- Target model
- Payload model
- Validation
- Error handling
- User feedback
- Optimistic update
- Risk level

Flag cases where UI invokes Home Assistant services directly.

Desired model:

```ts
executeAction({
  source: "home-assistant",
  targetId: "device-or-entity-id",
  action: "turnOn",
  payload: {},
});
```

The adapter should translate this into:

- Home Assistant service call
- Homey capability change/flow/action
- openHAB item command/rule/action

---

## Step 12: Audit dashboard/layout model

Check whether dashboards are backend-agnostic.

Answer:

- Does dashboard config store Home Assistant entity IDs directly?
- Does it store generic Navet IDs?
- Can one dashboard contain devices from multiple backends?
- Can cards be generated from capabilities?
- Are layouts tied to Home Assistant areas?
- Can Homey zones/openHAB locations map into Navet locations?
- Is dashboard schema portable?

Desired model:

```ts
export type NavetDashboard = {
  id: string;
  title: string;
  sections: NavetSection[];
};

export type NavetCardInstance = {
  id: string;
  type: string;
  targetIds: string[];
  source?: NavetBackendId;
  size: "small" | "medium" | "large";
  config: Record<string, unknown>;
};
```

---

## Step 13: Audit tests

Classify tests into:

- Generic Navet domain tests
- Home Assistant adapter tests
- Homey adapter tests
- openHAB adapter tests
- Card/component tests
- Contract tests
- Implementation-based tests
- Snapshot-only tests
- Mocked tests that only prove mocks work
- Garbage tests that should be deleted later

Important:

Tests should verify the Navet integration contract and adapter mappings.

Good tests:

- Home Assistant light entity maps to Navet power + brightness capabilities
- Homey light device maps to the same Navet capabilities
- openHAB dimmer item maps to the same Navet capabilities
- LightCard works with generic power/brightness capability, not Home Assistant entity directly
- CameraCard receives NavetResource, not Home Assistant camera_proxy URL
- executeAction("turnOn") maps correctly per backend

Bad tests:

- LightCard only works with hardcoded Home Assistant entity shape
- Tests mock the current implementation and prove nothing
- Snapshots that do not verify behavior
- Tests that would still pass if backend integration was broken

For each test area:

- File path
- What it tests
- Backend-specific or generic
- Keep / rewrite / delete later
- Reason

---

## Step 14: Architecture classification

Classify the current codebase into one of these.

### A. Backend-agnostic architecture

- UI uses Navet domain types
- Backend adapters map raw models to Navet model
- Actions are generic
- Resources are resolved through adapter
- Home Assistant is one adapter

### B. Home Assistant-first but adaptable

- Home Assistant is dominant
- Some abstraction exists
- UI has some Home Assistant leakage
- Refactor is manageable

### C. Home Assistant-coupled

- UI uses Home Assistant entities directly
- Service calls are scattered
- Auth/resource handling is Home Assistant-specific
- Adding Homey/openHAB would require major rewrites

### D. Architecture is confused

- Multiple patterns exist
- No clear ownership
- Some generic abstractions exist but are bypassed
- Install modes behave differently

Pick one and explain why.

---

## Step 15: Recommended refactor direction

Create a prioritized plan.

Do not implement it yet.

Use this structure:

### Phase 0: Freeze and protect

- What should not be touched yet
- What should be documented before refactor
- What working behavior must be protected

### Phase 1: Introduce Navet integration contract

- Create generic Navet types
- Create provider interface
- Create normalized snapshot/event/action/resource models
- Add demo provider first if useful

### Phase 2: Move Home Assistant behind adapter

- Move Home Assistant auth, connection, WebSocket, REST, service calls, resource resolver into the Home Assistant adapter
- Convert Home Assistant entities/devices/areas into the Navet model
- Stop UI from using HassEntity directly

### Phase 3: Make UI backend-agnostic

- Cards consume NavetDevice/NavetEntity/NavetCapability
- Cards execute generic actions
- Cards render generic resources
- Dashboard stores Navet target IDs

### Phase 4: Add second backend proof-of-concept

- Add minimal Homey or openHAB adapter
- Support only a small set first:
  - light
  - switch
  - sensor
  - camera if possible
- Use this to prove the contract is real

### Phase 5: Testing cleanup

- Add contract tests
- Add adapter mapping tests
- Add generic card tests
- Remove implementation-only tests
- Add multi-backend fixture tests

---

## Step 16: Final output

Create a markdown audit file:

```txt
docs/audits/navet-multi-backend-architecture-audit.md
```

The audit must include:

1. Executive summary
2. Current architecture classification
3. Backend coupling map
4. Existing domain model analysis
5. Existing adapter/provider analysis
6. UI/card coupling analysis
7. State management analysis
8. Resource/action handling analysis
9. Test quality analysis
10. What is already good
11. What is dangerous
12. Recommended phased refactor plan
13. Final verdict

Final verdict must answer:

- Is Navet currently ready for multiple backends?
- Is Home Assistant too deeply embedded?
- What is the first architectural change to make?
- What should not be rewritten yet?
- What would make Navet fail if ignored?

Output rules:

- Include exact file paths.
- Include concrete code examples where useful.
- Do not be vague.
- Do not modify production code.
- Do not refactor.
- Do not delete tests yet.
- Create only the audit markdown file.
- After writing the audit, stop.
