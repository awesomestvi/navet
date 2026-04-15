function doc(overview: string, covers: string[], usage: string[], review: string[]) {
  return [
    overview,
    '',
    'What this page covers:',
    ...covers.map((item) => `- ${item}`),
    '',
    'How to use it:',
    ...usage.map((item) => `- ${item}`),
    '',
    'Review expectations:',
    ...review.map((item) => `- ${item}`),
  ].join('\n');
}

const STORY_DOCS: Record<string, string> = {
  'App Shell/Header/Header Actions': doc(
    'Desktop header action cluster for dashboard-level controls such as view switching, adding content, and entering customize mode.',
    [
      'The spacing and grouping between primary, secondary, and overflow-style header actions.',
      'How action density behaves when the top bar carries several competing controls.',
    ],
    [
      'Use this story when changing the action hierarchy in the dashboard header.',
      'Compare it with the topbar and search stories before adding another header-specific action variant.',
    ],
    [
      'Check that the highest-priority actions stay easy to scan at a glance.',
      'Check that the action row still feels balanced on narrower dashboard widths.',
    ]
  ),
  'App Shell/Header/Search Input': doc(
    'Topbar search input for filtering content from the main application chrome rather than from a feature-local form.',
    [
      'The shared search field treatment used in the header area.',
      'How placeholder text, icon treatment, and focus state behave in the shell.',
    ],
    [
      'Use this story when adjusting the global search affordance or its shell-specific styling.',
      'Keep search-field changes aligned with the header stories so the chrome still reads as one system.',
    ],
    [
      'Check focus visibility, placeholder legibility, and icon alignment.',
      'Check that the field remains usable without overpowering neighboring header actions.',
    ]
  ),
  'App Shell/Header/Topbar': doc(
    'Main dashboard topbar shell that brings together title, search, account controls, and primary actions.',
    [
      'The structure of the full top-level header rather than any single child control.',
      'How the header balances information, navigation, and actions in one row.',
    ],
    [
      'Use this story when changing the overall header layout or the relationship between its child elements.',
      'Review this before making isolated tweaks to header children so the whole shell still works together.',
    ],
    [
      'Check visual balance, scanability, and alignment across the complete header.',
      'Check that the header still feels stable on dashboard hardware where space is tighter.',
    ]
  ),
  'App Shell/Navigation/Room Nav': doc(
    'Room-switching navigation strip used to move between dashboard spaces quickly.',
    [
      'The active, inactive, and overflow behavior of the room navigation pattern.',
      'How the control reads when there are multiple peer destinations in the same navigation band.',
    ],
    [
      'Use this story when changing room labels, chip treatment, spacing, or active-state styling.',
      'Prefer updating this shared navigation surface over creating a room selector inside a feature.',
    ],
    [
      'Check that the selected room is obvious immediately.',
      'Check that the navigation remains comfortable to tap on touch-first displays.',
    ]
  ),
  'App Shell/Section Customize Button': doc(
    'Small entrypoint button for section-level customization actions on the dashboard.',
    [
      'The compact affordance used to enter section customization from a local context.',
      'How the control signals editability without overwhelming the surrounding card or section content.',
    ],
    [
      'Use this story when changing the affordance for entering section customization.',
      'Keep this aligned with the section customize shell so entry and destination feel connected.',
    ],
    [
      'Check that the button reads as editable tooling rather than regular content.',
      'Check that the control remains visible but does not dominate the section.',
    ]
  ),
  'App Shell/Section Customize Shell': doc(
    'Container shell for section-level customization controls and supporting actions.',
    [
      'How section-editing affordances are grouped and framed once customization is open.',
      'The visual relationship between edit tools and the section content they act on.',
    ],
    [
      'Use this story when changing section-editing layout, spacing, or supporting controls.',
      'Review it alongside the entry button story when section customization behavior changes.',
    ],
    [
      'Check that edit tools are clearly separated from normal dashboard content.',
      'Check that the shell feels lightweight enough for frequent use in edit mode.',
    ]
  ),
  'App Shell/Navigation/Sidebar': doc(
    'Primary sidebar navigation for moving between top-level areas of Navet.',
    [
      'The hierarchy of destinations, current selection treatment, and overall sidebar density.',
      'How the sidebar presents app-level navigation instead of room-level navigation.',
    ],
    [
      'Use this story when changing main navigation labels, spacing, icons, or grouping.',
      'Review it before adding another top-level destination so the main navigation stays cohesive.',
    ],
    [
      'Check active-state clarity and label scanability.',
      'Check that the sidebar still feels balanced when several destinations compete for attention.',
    ]
  ),
  'App Shell/Header/User Dropdown': doc(
    'Account and session menu surfaced from the header avatar area.',
    [
      'The dropdown trigger, menu hierarchy, and account-action presentation for user controls.',
      'How session-oriented actions are separated from the rest of the header tools.',
    ],
    [
      'Use this story when changing account-menu content, wording, or trigger styling.',
      'Keep account actions here rather than mixing them into general dashboard action groups.',
    ],
    [
      'Check menu clarity, item ordering, and trigger affordance.',
      'Check that account actions remain easy to find without adding chrome noise.',
    ]
  ),
  'Components/Primitives/Cards/Card Metric Action Layout': doc(
    'Card-layout primitive that pairs a compact metric readout with a trailing action affordance.',
    [
      'The shared internal layout used when a metric and a local action need to coexist in a card.',
      'How spacing and alignment hold together when cards become denser.',
    ],
    [
      'Use this story before inventing a one-off metric-plus-action arrangement inside a card.',
      'Prefer evolving this layout primitive when several cards need the same structure.',
    ],
    [
      'Check that the metric stays dominant while the action remains easy to reach.',
      'Check that the layout still works at compact card sizes.',
    ]
  ),
  'Components/Primitives/Cards/Card Metric': doc(
    'Compact metric primitive for showing one key value, label, or status readout inside a card.',
    [
      'The baseline formatting and hierarchy for a single emphasized metric.',
      'How numeric or short textual values are presented without full chart or table structure.',
    ],
    [
      'Use this story when a card needs a compact primary measurement rather than free-form text.',
      'Keep metric styling shared here when multiple cards need the same readout pattern.',
    ],
    [
      'Check numeral emphasis, label clarity, and truncation behavior.',
      'Check that the value remains readable from normal dashboard viewing distance.',
    ]
  ),
  'Components/Primitives/Checkbox': doc(
    'Shared checkbox primitive for boolean selection in dialogs, forms, and settings sections.',
    [
      'The base selected, unselected, and disabled behavior for checkbox inputs.',
      'How the control reads when paired with shared labels and supporting text.',
    ],
    [
      'Use this story before creating a boolean toggle that does not need switch semantics.',
      'Pair it with the shared field and label patterns instead of hand-building checkbox layouts.',
    ],
    [
      'Check focus clarity, checked-state visibility, and disabled contrast.',
      'Check that the hit target still feels comfortable on touch-first devices.',
    ]
  ),
  'Components/Primitives/Color Input Swatch': doc(
    'Compact swatch control used when color selection needs a visual chip rather than a full picker.',
    [
      'The selected and unselected presentation of a reusable color-choice surface.',
      'How color identity is communicated even in dense card or dialog layouts.',
    ],
    [
      'Use this story when editing color-preset selection behavior or swatch styling.',
      'Keep simple color-selection affordances here instead of introducing feature-local swatch variants.',
    ],
    [
      'Check selected-state clarity even for similar hues.',
      'Check that the control stays legible in both dark and light themes.',
    ]
  ),
  'Components/Primitives/Combobox': doc(
    'Shared combobox primitive for searchable selection inside forms and dialogs.',
    [
      'The base searchable-select behavior for longer or filterable option lists.',
      'How text input and option picking work together in a single shared control.',
    ],
    [
      'Use this story when a plain select is too rigid and users need to search or narrow options.',
      'Reuse this combobox before introducing another feature-local searchable picker.',
    ],
    [
      'Check input clarity, option readability, and keyboard-friendly interaction.',
      'Check that the control still feels predictable when empty, focused, or filtering results.',
    ]
  ),
  'Components/Primitives/Dialog Shell': doc(
    'Shared dialog container for settings-style overlays, including content framing and decorative layers.',
    [
      'The common modal shell used by several feature dialogs in Navet.',
      'How header content, body content, footer actions, and optional visual decoration fit together.',
    ],
    [
      'Use this story when changing the common modal structure rather than a card-specific settings form.',
      'Update the shell here before cloning dialog chrome in feature folders.',
    ],
    [
      'Check layering, readability, and close behavior.',
      'Check that decoration remains subtle enough for lower-power dashboard devices.',
    ]
  ),
  'Components/Primitives/Cards/Entity Card Header Icon': doc(
    'Shared icon treatment used in entity-card headers before card-specific content begins.',
    [
      'The icon sizing, framing, and visual emphasis used by card headers.',
      'How icon surfaces integrate with shared card tokens instead of feature-local styling.',
    ],
    [
      'Use this story when multiple cards need the same icon treatment change.',
      'Adjust the shared header icon here instead of restyling one domain card in isolation.',
    ],
    [
      'Check icon legibility and contrast across themes.',
      'Check that the icon surface still feels aligned with the broader card chrome.',
    ]
  ),
  'Components/Primitives/Cards/Entity Card Header': doc(
    'Shared card-header composition that brings together icon, title, subtitle, and leading context.',
    [
      'The baseline structure at the top of many entity cards.',
      'How textual hierarchy and supporting context are arranged before control content begins.',
    ],
    [
      'Use this story before changing card title placement or header spacing across several cards.',
      'Prefer evolving the shared header composition here rather than drifting card headers apart by domain.',
    ],
    [
      'Check title prominence, subtitle readability, and alignment with icon surfaces.',
      'Check that the header still works at smaller card sizes.',
    ]
  ),
  'Components/Primitives/Cards/Entity Card Title Block': doc(
    'Reusable title-and-subtitle block used inside cards when full header chrome is not needed.',
    [
      'The text-only hierarchy for compact card titles and supporting metadata.',
      'How title blocks behave when cards need lightweight labeling without extra controls.',
    ],
    [
      'Use this story when card titles need shared typography or truncation adjustments.',
      'Keep shared title hierarchy here so card text treatment remains consistent.',
    ],
    [
      'Check title truncation, subtitle contrast, and overall vertical rhythm.',
      'Check that supporting text remains secondary without becoming too faint.',
    ]
  ),
  'Components/Primitives/Heading': doc(
    'Shared heading primitive for section titles and content hierarchy across dialogs, settings, and pages.',
    [
      'The standard heading scale and emphasis available to shared UI.',
      'How headings establish hierarchy without custom typography in each feature.',
    ],
    [
      'Use this story before introducing a new section-title style in a feature.',
      'Prefer shared heading levels over local text-class combinations whenever the semantics match.',
    ],
    [
      'Check scale contrast between heading levels.',
      'Check that headings stay readable without overpowering nearby content.',
    ]
  ),
  'Components/Primitives/Input': doc(
    'Shared text-input primitive for short single-line form values.',
    [
      'The default text-field styling, spacing, and input behavior used across forms.',
      'How the base input fits into shared label and field structures.',
    ],
    [
      'Use this story when changing the standard text-field shell or its basic states.',
      'Keep short free-form entry cases on this primitive instead of spawning feature-local inputs.',
    ],
    [
      'Check focus visibility, placeholder readability, and disabled styling.',
      'Check that the control remains comfortable at dashboard viewing and tapping distances.',
    ]
  ),
  'Components/Primitives/Interactive Pill': doc(
    'Compact pill-shaped action or navigation surface used for small contextual selections.',
    [
      'The active and inactive treatment for pills used in previews, filters, and compact actions.',
      'How a small control can signal state without full button chrome.',
    ],
    [
      'Use this story when editing pill emphasis, density, or active-state behavior.',
      'Prefer this control for compact segmented or contextual actions before inventing another chip style.',
    ],
    [
      'Check selected-state clarity and label legibility.',
      'Check that the pill remains obviously clickable at smaller sizes.',
    ]
  ),
  'Components/Primitives/Loading Spinner': doc(
    'Shared loading indicator for lightweight pending states where the surrounding layout should stay intact.',
    [
      'The baseline spinner treatment used for waiting states in shared UI.',
      'How loading feedback is communicated without replacing the whole surface.',
    ],
    [
      'Use this story when adjusting loading feedback that appears inside existing layouts.',
      'Keep small loading affordances consistent here instead of styling them per feature.',
    ],
    [
      'Check visibility against light and dark surfaces.',
      'Check that the spinner communicates waiting without drawing too much attention.',
    ]
  ),
  'Components/Primitives/MessageBar': doc(
    'Shared inline feedback bar for short success, warning, or informational messages.',
    [
      'The standard structure for lightweight status communication inside flows and panels.',
      'How color, icon, and copy work together in a reusable message surface.',
    ],
    [
      'Use this story when a flow needs inline feedback rather than a toast or blocking dialog.',
      'Keep reusable feedback behavior here instead of creating feature-specific message banners.',
    ],
    [
      'Check message contrast, icon clarity, and text hierarchy.',
      'Check that the bar remains readable without feeling heavier than the surrounding content.',
    ]
  ),
  'Components/Primitives/Panel': doc(
    'Shared panel primitive for framed content sections that need more structure than plain layout wrappers.',
    [
      'The baseline framed-surface treatment for reusable content containers.',
      'How borders, padding, and surface styling support grouped content.',
    ],
    [
      'Use this story when shared content needs a framed container rather than a feature-only wrapper.',
      'Keep common panel treatments here to avoid diverging section containers.',
    ],
    [
      'Check padding rhythm, border visibility, and surface contrast.',
      'Check that panels still feel lightweight enough for dense dashboards.',
    ]
  ),
  'Components/Primitives/Radio': doc(
    'Shared radio input primitive for single-choice selection among a small set of options.',
    [
      'The base selected, unselected, and disabled states for radio controls.',
      'How the control is expected to look when paired with shared labels and field layouts.',
    ],
    [
      'Use this story when a choice should be mutually exclusive and visible all at once.',
      'Prefer this shared radio styling instead of local option-circle implementations.',
    ],
    [
      'Check selection visibility, focus state, and spacing next to labels.',
      'Check that the tap target remains comfortable in touch contexts.',
    ]
  ),
  'Components/Primitives/Rotary Knob': doc(
    'Shared rotary control for dense analog-style adjustments such as volume or intensity.',
    [
      'The interaction surface and visual framing for knob-style input.',
      'How this control communicates adjustable value in a more tactile way than a plain slider.',
    ],
    [
      'Use this story when changing compact analog controls used in dashboards or media surfaces.',
      'Review this before introducing another knob variant with slightly different chrome or sizing.',
    ],
    [
      'Check value legibility and grip affordance.',
      'Check that the control remains usable on touch screens and low-power devices.',
    ]
  ),
  'Components/Primitives/Round Control Button': doc(
    'Circular control button used for compact card actions and media-style controls.',
    [
      'The shared round action treatment used when the control itself is part of the visual language.',
      'How size, icon placement, and emphasis behave in compact control groups.',
    ],
    [
      'Use this story when altering circular action affordances shared by multiple features.',
      'Keep compact round-action styling centralized here so cards do not drift apart.',
    ],
    [
      'Check icon centering, hit target quality, and disabled-state clarity.',
      'Check that the control remains distinct from decorative circular elements.',
    ]
  ),
  'Components/Primitives/Select': doc(
    'Shared select primitive for choosing from a fixed list of options without search.',
    [
      'The baseline dropdown trigger and value presentation for standard option lists.',
      'How fixed-choice selection is styled in forms and settings surfaces.',
    ],
    [
      'Use this story when a fixed option list does not need the extra behavior of a combobox.',
      'Reuse this primitive before introducing another feature-specific dropdown shell.',
    ],
    [
      'Check selected-value readability and trigger affordance.',
      'Check that the field still reads clearly when empty or disabled.',
    ]
  ),
  'Components/Primitives/Slide Action': doc(
    'Slide-to-confirm action primitive for deliberate destructive or high-confidence interactions.',
    [
      'The gesture-driven confirmation pattern used when a tap is too easy to trigger accidentally.',
      'How track, thumb, and completion state work together in a shared action surface.',
    ],
    [
      'Use this story when evaluating whether a high-intent confirmation should use sliding instead of a standard button.',
      'Keep slide-confirm patterns centralized here rather than building feature-specific variants.',
    ],
    [
      'Check that the control clearly communicates both action and required gesture.',
      'Check that the gesture remains smooth and readable on touch hardware.',
    ]
  ),
  'Components/Primitives/Switch': doc(
    'Shared switch primitive for immediate on-off toggles where state changes directly.',
    [
      'The base toggle treatment for immediate binary actions.',
      'How the switch differs from checkbox semantics in both form and card contexts.',
    ],
    [
      'Use this story when a boolean action should change state immediately rather than represent form selection.',
      'Prefer the shared switch here over ad-hoc toggle visuals inside features.',
    ],
    [
      'Check on-off clarity, focus state, and disabled behavior.',
      'Check that the control still reads as an immediate toggle at small sizes.',
    ]
  ),
  'Components/Primitives/Tabs': doc(
    'Shared tabs primitive for switching between a small number of peer views inside the same surface.',
    [
      'The tab list, active indicator, and content-switching treatment used across shared UI.',
      'How segmented navigation should look when the user stays in the same broader flow.',
    ],
    [
      'Use this story when adjusting internal view switching rather than top-level app navigation.',
      'Keep tab affordances here instead of inventing feature-specific segmented controls.',
    ],
    [
      'Check active-state clarity and label scanability.',
      'Check that inactive tabs remain discoverable without competing with the active one.',
    ]
  ),
  'Components/Primitives/Tag': doc(
    'Shared tag primitive for lightweight labeling, status, or metadata chips.',
    [
      'The compact labeling treatment used when content needs low-emphasis categorization.',
      'How tags differ from interactive pills or action controls.',
    ],
    [
      'Use this story for passive metadata labels, not for primary actions.',
      'Keep tag styling shared here so small labels remain visually consistent.',
    ],
    [
      'Check label legibility and visual restraint.',
      'Check that tags remain clearly non-interactive unless explicitly paired with action behavior.',
    ]
  ),
  'Components/Primitives/Text': doc(
    'Shared text primitive for body copy, supporting copy, and lower-level content hierarchy.',
    [
      'The standard body-text styles used across shared and feature-level UI.',
      'How supporting copy should be expressed without custom text classes in every file.',
    ],
    [
      'Use this story before inventing another text treatment for regular UI copy.',
      'Prefer the shared text primitive when the need is hierarchy, tone, or readability rather than special branding.',
    ],
    [
      'Check readability, line-height, and contrast.',
      'Check that lower-emphasis copy stays readable on tinted or glass surfaces.',
    ]
  ),
  'Components/Primitives/Textarea': doc(
    'Shared multiline text input for notes, longer descriptions, and free-form editing.',
    [
      'The multiline input shell used when content exceeds a single line.',
      'How longer user-entered text sits inside shared field styling.',
    ],
    [
      'Use this story when longer input needs the same visual language as the standard input.',
      'Keep shared multiline-field behavior here instead of styling per feature form.',
    ],
    [
      'Check resizing behavior, vertical rhythm, and placeholder readability.',
      'Check that the field remains easy to use for longer text on tablet-sized dashboards.',
    ]
  ),
  'Components/Primitives/Tooltip': doc(
    'Shared tooltip primitive for short contextual explanations without persistent UI weight.',
    [
      'The hover or focus helper surface used to expose small amounts of extra context.',
      'How supplemental explanation is styled without becoming a full popover.',
    ],
    [
      'Use this story when a control needs brief clarification that should stay out of the main layout.',
      'Prefer tooltips for compact help, not for core instructions that users should always see.',
    ],
    [
      'Check readability, timing, and anchor alignment.',
      'Check that critical information is not hidden only inside the tooltip.',
    ]
  ),
  'Components/Shared/Card Size Selector': doc(
    'Navet-specific selector for choosing dashboard card footprint presets.',
    [
      'The control users rely on when resizing cards in edit and configuration flows.',
      'How card-size options are presented as product-specific choices rather than generic form values.',
    ],
    [
      'Use this story when changing supported size labels, order, or affordance.',
      'Keep card-resizing behavior centralized here so resize UX stays consistent across dialogs and edit mode.',
    ],
    [
      'Check that the currently selected size is obvious.',
      'Check that labels make sense to users who are thinking in layout terms, not internal implementation terms.',
    ]
  ),
  'Components/Shared/Device Editor/Dialog Section Row': doc(
    'Reusable row structure for grouped sections inside device-editor dialogs.',
    [
      'The local layout pattern used to organize editable device settings into readable sections.',
      'How labels, controls, and row spacing are framed in device-editing flows.',
    ],
    [
      'Use this story when changing how device-editor sections are grouped or aligned.',
      'Prefer reusing this row pattern over creating slightly different dialog section rows in each editor.',
    ],
    [
      'Check row spacing, alignment, and scanability.',
      'Check that the row supports dense settings without feeling cramped.',
    ]
  ),
  'Components/Shared/Device Editor/Icon Picker': doc(
    'Navet-specific icon picker used when editing device presentation inside the app.',
    [
      'The browsing and selection surface for choosing an icon in device-editing flows.',
      'How icon options are organized for app-specific editing rather than general asset browsing.',
    ],
    [
      'Use this story when changing icon selection workflow, option density, or search/browse behavior.',
      'Keep icon-picking UX shared here so device editors remain consistent.',
    ],
    [
      'Check icon discoverability and selected-state clarity.',
      'Check that the picker remains usable without overwhelming the dialog with too many choices at once.',
    ]
  ),
  'Components/Shared/Entity Room Selector': doc(
    'Navet-specific room assignment control for placing entities in dashboard spaces.',
    [
      'How rooms are selected and displayed in app-specific assignment flows.',
      'The product-specific language and hierarchy behind room placement.',
    ],
    [
      'Use this story when changing room-assignment behavior in settings or add-card workflows.',
      'Keep room-assignment affordances here instead of building local selectors around individual features.',
    ],
    [
      'Check that the current room and available destinations are easy to understand.',
      'Check that the control feels like placement within the dashboard, not a generic taxonomy picker.',
    ]
  ),
  'Components/Shared/Network Status Banner': doc(
    'Shared app-specific banner for connection and network state at the application level.',
    [
      'How connection problems or degraded status are communicated without blocking the whole UI.',
      'The visual severity and tone used for app-wide network awareness.',
    ],
    [
      'Use this story when changing wording, severity styling, or banner prominence for connectivity states.',
      'Keep network-status communication shared here rather than restyling it in each feature.',
    ],
    [
      'Check urgency, readability, and dismissibility expectations.',
      'Check that the banner is noticeable without permanently dominating the layout.',
    ]
  ),
  'Components/Primitives/Alert Dialog': doc(
    'Confirmation dialog primitive for high-consequence actions that should interrupt the current flow.',
    [
      'The blocking dialog treatment used for destructive or confirmation-heavy actions.',
      'How emphasis, copy, and action hierarchy communicate caution.',
    ],
    [
      'Use this story when a flow needs confirmation strong enough to block until the user decides.',
      'Keep destructive confirmation behavior here rather than styling custom modal warnings per feature.',
    ],
    [
      'Check danger emphasis, action ordering, and readability.',
      'Check that the dialog is reserved for truly consequential actions.',
    ]
  ),
  'Components/Primitives/Avatar': doc(
    'Shared avatar primitive for user identity and profile-adjacent surfaces.',
    [
      'The image, fallback, and sizing treatment used for user presence in the app shell.',
      'How compact identity surfaces fit into the broader shared component language.',
    ],
    [
      'Use this story when changing account-presence visuals or fallback behavior.',
      'Keep avatar styling consistent here so identity surfaces do not drift across menus and headers.',
    ],
    [
      'Check image cropping, fallback clarity, and size balance.',
      'Check that avatars remain distinct from generic circular action buttons.',
    ]
  ),
  'Components/Primitives/Dropdown Menu': doc(
    'Shared dropdown-menu wrapper for contextual action lists anchored to a trigger.',
    [
      'The menu shell used for compact contextual actions rather than full dialogs.',
      'How trigger, menu items, and separators are presented in shared UI.',
    ],
    [
      'Use this story when a small set of anchored actions belongs in a menu instead of inline buttons.',
      'Keep contextual action menus consistent here rather than styling them in each feature.',
    ],
    [
      'Check trigger clarity, menu hierarchy, and item spacing.',
      'Check that destructive or high-impact actions are still appropriately differentiated.',
    ]
  ),
  'Components/Primitives/Label': doc(
    'Shared label primitive for field titles and accessible control labeling.',
    [
      'The baseline text treatment for form labels and control captions.',
      'How labels fit into shared fields without each form inventing its own styling.',
    ],
    [
      'Use this story when adjusting field-label typography or spacing.',
      'Keep shared label behavior here so forms stay consistent across dialogs and settings.',
    ],
    [
      'Check readability, spacing from controls, and visual hierarchy.',
      'Check that labels remain clear even in dense settings layouts.',
    ]
  ),
  'Components/Primitives/Toast': doc(
    'Transient feedback surface for short non-blocking messages triggered by user actions.',
    [
      'How brief success or status messages are presented outside the main layout flow.',
      'The shared toast behavior used for ephemeral confirmation and feedback.',
    ],
    [
      'Use this story when changing the presentation of temporary feedback that should not block interaction.',
      'Keep one toast language here instead of spawning feature-specific transient banners.',
    ],
    [
      'Check message readability, timing, and visual intrusion.',
      'Check that important feedback stays noticeable without feeling noisy.',
    ]
  ),
  'Cards/Entity/Calendar': doc(
    'Entity card for upcoming calendar events rendered as a dashboard card rather than a full agenda view.',
    [
      'How upcoming events, time labels, and event metadata are summarized in a card footprint.',
      'The balance between immediacy and detail for calendar information on the dashboard.',
    ],
    [
      'Use this story when changing event density, time presentation, or the overall card hierarchy.',
      'Review it before expanding the card toward a full calendar list that would overwhelm the dashboard.',
    ],
    [
      'Check at-a-glance readability and event prioritization.',
      'Check that the card remains useful even when events are sparse or brief.',
    ]
  ),
  'Cards/Entity/HVAC': doc(
    'Entity card for HVAC control and status, focused on current mode, action, and target temperature.',
    [
      'The core thermostat states users need to read quickly from the dashboard.',
      'How setpoint, ambient temperature, and operating mode fit into one card.',
    ],
    [
      'Use this story when changing climate-card hierarchy, controls, or mode emphasis.',
      'Treat it as the domain-level review page before broader card-matrix checks.',
    ],
    [
      'Check that current mode and active heating or cooling state are obvious at a glance.',
      'Check that temperature values remain readable and well spaced across sizes.',
    ]
  ),
  'Cards/Dialogs/HVAC': doc(
    'Settings dialog for configuring the HVAC card rather than controlling the live climate entity.',
    [
      'The configuration surface used to tune how the climate card appears or behaves.',
      'How shared dialog sections and field patterns are applied to HVAC-specific settings.',
    ],
    [
      'Use this story when changing climate-card settings structure or wording.',
      'Keep configuration behavior aligned with the shared dialog shell and other card settings dialogs.',
    ],
    [
      'Check section grouping, field clarity, and action placement.',
      'Check that the dialog remains faster to scan than the card is to operate.',
    ]
  ),
  'Cards/Custom/Action': doc(
    'Custom dashboard action card for quick-trigger interactions that are not direct HA entity cards.',
    [
      'The compact widget treatment for a dashboard-native action surface.',
      'How a custom call-to-action card fits into the same dashboard language as entity cards.',
    ],
    [
      'Use this story when changing the visual weight or affordance of action-oriented custom cards.',
      'Review it before adding more one-off shortcut widgets that overlap with this pattern.',
    ],
    [
      'Check that the card reads like an actionable shortcut, not passive information.',
      'Check that the card stays concise enough for dashboard use.',
    ]
  ),
  'Cards/Custom/Map': doc(
    'Custom map card rendering person and device_tracker entities with GPS on an interactive Leaflet map.',
    [
      'How GPS-bearing entities are aggregated into a single spatial overview card.',
      'The full-bleed map layout and overlay conventions for non-entity custom cards.',
    ],
    [
      'Use this story when changing map tile styles, marker design, or GPS accuracy visualisation.',
      'Review when adjusting the bottom overlay or empty-state treatment.',
    ],
    [
      'Check that markers are readable at all three supported sizes (small, medium, large).',
      'Check that the dark/light tile variant switches correctly with the active theme.',
      'Check the empty state when no entities have GPS attributes.',
    ]
  ),
  'Cards/Custom/Battery Overview': doc(
    'Custom dashboard card for summarizing battery status across devices.',
    [
      'How aggregate health information is condensed into one at-a-glance card.',
      'The balance between overview value and dashboard footprint for maintenance-heavy information.',
    ],
    [
      'Use this story when changing aggregate-status presentation or maintenance-oriented dashboard summaries.',
      'Keep battery-overview logic and hierarchy here instead of scattering summary widgets.',
    ],
    [
      'Check that low-battery urgency stands out appropriately.',
      'Check that the card remains readable without turning into a dense list.',
    ]
  ),
  'Cards/Custom/Photo': doc(
    'Custom photo-frame card used to surface imagery as a dashboard-native visual widget.',
    [
      'The presentation of photo content inside the card system.',
      'How decorative or ambient visual content is balanced against the rest of the dashboard.',
    ],
    [
      'Use this story when adjusting image treatment, framing, or supporting chrome for photo content.',
      'Review it before adding richer media decoration that could hurt dashboard performance.',
    ],
    [
      'Check cropping, readability of any overlaid content, and overall visual restraint.',
      'Check that the card still feels intentional within a functional dashboard layout.',
    ]
  ),
  'Cards/Custom/Quick Note': doc(
    'Custom quick-note card for lightweight personal text pinned directly into the dashboard.',
    [
      'The balance between editable note content and a compact dashboard footprint.',
      'How a text-first custom card should feel inside a predominantly device-oriented layout.',
    ],
    [
      'Use this story when changing note density, hierarchy, or supporting affordances.',
      'Keep note-card presentation here instead of inventing parallel text-widget variants.',
    ],
    [
      'Check readability for short and medium-length notes.',
      'Check that the note still feels lightweight enough for regular dashboard placement.',
    ]
  ),
  'Cards/Overview/All Sizes': doc(
    'Cross-card comparison page for checking how supported card sizes behave across the dashboard system.',
    [
      'The relative density and content balance of cards at each supported size.',
      'How shared sizing decisions ripple across different card families.',
    ],
    [
      'Use this page after changing card padding, spacing, or size support.',
      'Review it before adding a new size option or shifting a card to a different minimum size.',
    ],
    [
      'Check that compact sizes remain usable and larger sizes do not feel underfilled.',
      'Check that card families still look like part of the same dashboard language.',
    ]
  ),
  'Cards/Overview/Catalog': doc(
    'Runtime inventory page for the card types Navet currently exposes in the dashboard.',
    [
      'The list of runtime-registered card types and how they are grouped.',
      'The boundary between entity cards, custom cards, and Storybook-only support surfaces.',
    ],
    [
      'Use this page before adding or renaming a card type.',
      'Use it to confirm whether a new story belongs in entity coverage, custom coverage, or overview coverage.',
    ],
    [
      'Check that new card types are represented in the right family.',
      'Check that custom cards are not silently treated as runtime entity cards.',
    ]
  ),
  'Cards/Overview/Extended State Matrix': doc(
    'Broader card-review matrix for comparing more entity-card families and edge states in one place.',
    [
      'A wide visual audit surface for cards beyond the core state matrix.',
      'How less-common card families hold together under the shared dashboard language.',
    ],
    [
      'Use this page for broader regression sweeps after shared card changes.',
      'Review it when a visual-system change could affect many card families at once.',
    ],
    [
      'Check cross-card consistency in spacing, header treatment, and state emphasis.',
      'Check that uncommon cards still feel like first-class members of the dashboard.',
    ]
  ),
  'Cards/Overview/Core State Matrix': doc(
    'Focused regression page for the most important card states across the core dashboard families.',
    [
      'On, off, playback, mode, and edit-mode states for the most common cards.',
      'A side-by-side comparison surface for spotting regressions quickly.',
    ],
    [
      'Use this page right after changing shared card tokens, chrome, or core interactions.',
      'Keep it as the first cross-card QA stop before the broader extended matrix.',
    ],
    [
      'Check that state changes remain immediately readable.',
      'Check that edit-mode tooling does not crowd out the runtime state of each card.',
    ]
  ),
  'Cards/Entity/Switch': doc(
    'Entity card for binary switch-style devices with a compact on-off interaction model.',
    [
      'How a simple device domain is represented without unnecessary extra chrome.',
      'The shared card behavior for immediate binary state changes.',
    ],
    [
      'Use this story when changing the layout or interaction of simple switch entities.',
      'Keep binary-card simplifications here rather than letting switch cards drift toward heavier light-card behavior.',
    ],
    [
      'Check that on-off state is obvious instantly.',
      'Check that the compact layout still feels intentional rather than underspecified.',
    ]
  ),
  'Cards/Entity/Light': doc(
    'Entity card for lighting with power, brightness, and color-temperature awareness in one dashboard surface.',
    [
      'The core light states and controls users expect to adjust quickly.',
      'How brightness and warmth information coexist with the main on-off state.',
    ],
    [
      'Use this story when changing light-card hierarchy, card sizes, or interaction behavior.',
      'Review this page before validating the card inside broader dashboard matrices.',
    ],
    [
      'Check that power state remains the first thing users see.',
      'Check that secondary lighting details do not clutter the card at smaller sizes.',
    ]
  ),
  'Cards/Dialogs/Light': doc(
    'Settings dialog for configuring the light card rather than operating the light itself.',
    [
      'The structure and wording of light-card configuration options.',
      'How shared dialog patterns are composed for this specific card family.',
    ],
    [
      'Use this story when changing light-card settings sections or field behavior.',
      'Keep light-card configuration aligned with the shared dialog shell and other settings dialogs.',
    ],
    [
      'Check that options are grouped logically and easy to scan.',
      'Check that the dialog stays lightweight enough for frequent card customization.',
    ]
  ),
  'Cards/Entity/Media': doc(
    'Entity card for media playback with transport state, progress, and device grouping context.',
    [
      'How currently playing information, playback state, and transport affordances fit into one card.',
      'The balance between information richness and dashboard density for media surfaces.',
      'TV variant: remote-style controls, one fixed-size D-pad (104×104) across all card sizes, small tile uses a header toggle to show or hide the pad with settings pinned when the pad is open.',
    ],
    [
      'Use this story when changing media hierarchy, progress treatment, or playback-control layout.',
      'Review it before extending the card toward a heavier full-player interface.',
      'Use the TV stories when changing `MediaTvView`, remote affordances, or D-pad layout.',
    ],
    [
      'Check that playback state and current content are immediately recognizable.',
      'Check that progress and secondary metadata remain readable without cluttering the card.',
      'For TV: check small vs wide layouts, source row, and D-pad visibility without overlapping controls.',
    ]
  ),
  'App Shell/Notifications/Panel': doc(
    'Notification-panel surface used from the app shell to review recent alerts and messages.',
    [
      'How individual notifications are grouped and presented inside the panel.',
      'The balance between recency, density, and readability in the notification center.',
    ],
    [
      'Use this story when changing notification layout, grouping, or panel-level framing.',
      'Keep notification-center behavior here instead of diverging across different entry points.',
    ],
    [
      'Check scanability, severity communication, and row density.',
      'Check that the panel remains easy to skim when several notifications are present.',
    ]
  ),
  'Cards/Entity/Person': doc(
    'Entity card for person presence, location, and home-state awareness.',
    [
      'How a person entity is summarized for quick dashboard awareness.',
      'The relationship between status, identity, and supporting presence context.',
    ],
    [
      'Use this story when changing presence emphasis, avatar treatment, or location metadata hierarchy.',
      'Keep person-card presentation concise enough for dashboard use rather than drifting into profile UI.',
    ],
    [
      'Check that home, away, or status changes are clear at a glance.',
      'Check that identity and presence remain balanced inside the card.',
    ]
  ),
  'Cards/Custom/RSS Feed': doc(
    'Custom dashboard card for a short RSS/news feed preview inside the dashboard.',
    [
      'How multiple feed items are summarized in a compact custom card.',
      'The tradeoff between content density and dashboard readability for feed content.',
    ],
    [
      'Use this story when changing article density, metadata hierarchy, or card framing for feed content.',
      'Review it before making the card behave like a full reading surface instead of a dashboard preview.',
    ],
    [
      'Check headline legibility and item scannability.',
      'Check that the card still feels like a quick-glance surface, not a dense content list.',
    ]
  ),
  'Cards/Dialogs/RSS Feed': doc(
    'Settings dialog for configuring the RSS feed card and its content behavior.',
    [
      'The configuration surface for feed source, display, and card-level behavior.',
      'How shared dialog sections are used for a content-oriented custom card.',
    ],
    [
      'Use this story when changing RSS card settings structure or editorial wording.',
      'Keep feed-card configuration consistent with the rest of the custom-card settings dialogs.',
    ],
    [
      'Check that settings are grouped clearly and use understandable language.',
      'Check that advanced options do not overwhelm the primary setup path.',
    ]
  ),
  'Cards/Entity/Scene': doc(
    'Entity card for scenes, optimized around recognition and triggering rather than ongoing status control.',
    [
      'How a scene is represented as a triggerable dashboard surface.',
      'The visual language for a card that acts more like an action than a continuously changing device.',
    ],
    [
      'Use this story when changing scene-card emphasis, copy, or trigger affordance.',
      'Keep scene cards clearly action-oriented instead of forcing them into device-status patterns.',
    ],
    [
      'Check that the card reads as a scene trigger immediately.',
      'Check that action emphasis is clear without feeling destructive or risky.',
    ]
  ),
  'Cards/Dialogs/Camera': doc(
    'Settings dialog for the camera card, focused on configuration rather than live viewing.',
    [
      'The options and section structure used to configure camera-card behavior.',
      'How shared dialog patterns support a media-rich security surface.',
    ],
    [
      'Use this story when changing camera-card settings or security-surface configuration wording.',
      'Keep camera configuration aligned with other card dialogs rather than inventing special-case shells.',
    ],
    [
      'Check that the options are easy to scan and understand.',
      'Check that configuration complexity does not spill into the runtime camera card.',
    ]
  ),
  'Cards/Entity/Camera': doc(
    'Entity card for camera feeds with enough framing to preview a security surface inside the dashboard.',
    [
      'How camera imagery, identity, and supporting status fit into a card footprint.',
      'The shared treatment for a visually rich card inside the broader dashboard system.',
    ],
    [
      'Use this story when changing preview framing, overlay treatment, or supporting camera metadata.',
      'Review it before adding heavier visual effects that could hurt performance on dashboard hardware.',
    ],
    [
      'Check preview clarity, overlay readability, and card balance.',
      'Check that the card still feels part of the same system as non-visual entity cards.',
    ]
  ),
  'Cards/Entity/Cover': doc(
    'Entity card for covers such as blinds or shades, centered on position and motion-oriented state.',
    [
      'How open-close state and cover context are summarized in a compact dashboard card.',
      'The interaction model for a device that lives between binary and continuous control.',
    ],
    [
      'Use this story when changing cover-state emphasis, control placement, or compact hierarchy.',
      'Keep cover-card behavior distinct from both simple switches and richer climate/media cards.',
    ],
    [
      'Check that current cover state is immediately understandable.',
      'Check that any motion or partial-position cues stay readable without extra clutter.',
    ]
  ),
  'Cards/Entity/Lock': doc(
    'Entity card for locks where security state must be obvious and actionable at a glance.',
    [
      'The lock and unlock presentation for a high-confidence security-oriented surface.',
      'How state emphasis and action readiness are balanced in a compact card.',
    ],
    [
      'Use this story when changing the lock-card hierarchy, action styling, or state wording.',
      'Keep security-state communication especially clear here before checking broader card matrices.',
    ],
    [
      'Check that locked and unlocked states are unmistakable.',
      'Check that the card feels secure and deliberate rather than casual.',
    ]
  ),
  'Cards/Entity/Grouped Sensor': doc(
    'Entity card for a grouped sensor summary, combining several related readings into one dashboard surface.',
    [
      'How several sensor values are summarized without turning into a dense table.',
      'The hierarchy between the headline state and the supporting grouped readings.',
    ],
    [
      'Use this story when changing grouped-sensor density, ordering, or emphasis.',
      'Keep grouped sensor presentation shared here instead of creating one-off summary cards by domain.',
    ],
    [
      'Check that the primary reading stands out while supporting values remain easy to compare.',
      'Check that the card stays readable at the smaller supported sizes.',
    ]
  ),
  'Cards/Custom/Info Card': doc(
    'Storybook-only informational card surface used for compact summary or helper content in the dashboard language.',
    [
      'A custom card pattern for passive information rather than direct device control.',
      'How informational dashboard content can still feel aligned with the broader card system.',
    ],
    [
      'Use this story when exploring passive dashboard summaries or helper surfaces.',
      'Review it before introducing more content-only cards that overlap with this role.',
    ],
    [
      'Check that information hierarchy is clear without feeling too text-heavy.',
      'Check that the card remains lightweight enough to coexist with interactive cards.',
    ]
  ),
  'Cards/Dialogs/Vacuum': doc(
    'Settings dialog for the vacuum card and its presentation or behavior options.',
    [
      'The configuration structure used for a maintenance-oriented device card.',
      'How shared settings patterns support a domain with multiple operational states.',
    ],
    [
      'Use this story when changing vacuum-card settings sections, labels, or defaults.',
      'Keep vacuum-card configuration consistent with the rest of the card-dialog family.',
    ],
    [
      'Check grouping clarity and ease of setup.',
      'Check that the dialog remains simpler than the operational card itself.',
    ]
  ),
  'Cards/Entity/Vacuum': doc(
    'Entity card for vacuum devices, including cleaning status and maintenance-oriented context.',
    [
      'How operational state, progress, and supporting device context are summarized in one card.',
      'The dashboard representation of a more workflow-oriented device domain.',
    ],
    [
      'Use this story when changing vacuum-card states, status hierarchy, or compact controls.',
      'Review it before broad dashboard-state checks so the domain-specific behavior is solid first.',
    ],
    [
      'Check that cleaning, docked, and paused states are easy to distinguish.',
      'Check that supporting maintenance details do not crowd the primary status.',
    ]
  ),
  'Cards/Entity/Weather': doc(
    'Entity card for current weather conditions and compact forecast context.',
    [
      'How ambient conditions are summarized for fast reading on the dashboard.',
      'The balance between atmosphere, iconography, and concise weather data.',
    ],
    [
      'Use this story when changing condition hierarchy, supporting metrics, or forecast emphasis.',
      'Keep weather-card presentation concise enough for dashboard scanning.',
    ],
    [
      'Check condition legibility, icon clarity, and value emphasis.',
      'Check that the card remains readable across themes with visually expressive weather content.',
    ]
  ),
  'Cards/Dialogs/Weather': doc(
    'Settings dialog for weather-card configuration and display choices.',
    [
      'The configuration surface for tuning how weather information is shown in the card.',
      'How shared settings patterns support a data-rich informational card.',
    ],
    [
      'Use this story when adjusting weather-card settings structure or wording.',
      'Keep weather configuration aligned with the broader card-dialog system.',
    ],
    [
      'Check that options are understandable without weather-specific jargon overload.',
      'Check that the dialog remains easy to scan despite several display choices.',
    ]
  ),
};

export function getStoryDocsDescription(title: string) {
  return STORY_DOCS[title] ?? '';
}
