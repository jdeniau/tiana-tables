import { DateDisplay } from '../../configuration/dateDisplay';
import type { ServerTimeZoneName } from '../../sql/dialect/metadata';
import type { ZoneShift } from './dateFormatter';

/** The server's zone: `zone` is `null` when its name resolves to no rules Temporal knows. */
export interface ServerZone {
  label: string;
  zone: string | null;
}

/** One segment of the date switch: the zone it names, and whether it can be picked. */
export interface DateDisplayOption {
  display: DateDisplay;
  zoneLabel: string | null;
  disabled: boolean;
}

const EPOCH = Temporal.Instant.fromEpochMilliseconds(0);

/** Temporal's own equality: `UTC`, `Etc/UTC` and `GMT` are one zone, as `Asia/Calcutta` and `Asia/Kolkata`. */
function isSameZone(left: string, right: string): boolean {
  return EPOCH.toZonedDateTimeISO(left).equals(EPOCH.toZonedDateTimeISO(right));
}

function isUtc(zone: string): boolean {
  return isSameZone(zone, 'UTC') || isSameZone(zone, '+00:00');
}

/**
 * The zone a server names, as rules to convert with.
 * An abbreviation resolves only when it is `UTC`: `GMT` is also London's winter, and `EST` a zone of its own, with no summer time, which a New York server named so in winter does have.
 */
export function resolveServerZone({
  name,
  isAbbreviation,
}: ServerTimeZoneName): ServerZone {
  try {
    const zone = Temporal.Now.zonedDateTimeISO(name).timeZoneId;

    return {
      label: name,
      zone: isAbbreviation && name !== 'UTC' ? null : zone,
    };
  } catch {
    // `EDT`, PostgreSQL's `localtime` or POSIX `UTC+3`, which means UTC−3
    return { label: name, zone: null };
  }
}

/**
 * The segments of the date switch, each zone once: a UTC server leaves no UTC segment, a machine in the server's zone or in UTC no local one.
 * Converting needs the server's rules, so without them only the server's own text can be shown.
 */
export function dateDisplayOptions(
  server: ServerZone,
  localZone: string
): DateDisplayOption[] {
  const disabled = server.zone === null;
  const options: DateDisplayOption[] = [
    { display: DateDisplay.Server, zoneLabel: server.label, disabled: false },
  ];

  if (server.zone === null || !isUtc(server.zone)) {
    options.push({ display: DateDisplay.Utc, zoneLabel: null, disabled });
  }

  if (
    !isUtc(localZone) &&
    (server.zone === null || !isSameZone(localZone, server.zone))
  ) {
    options.push({
      display: DateDisplay.Local,
      zoneLabel: localZone,
      disabled,
    });
  }

  return options;
}

/** The display a preference comes to among these segments: a zone left out is the same as the one that shows it. */
export function effectiveDateDisplay(
  preferred: DateDisplay,
  options: ReadonlyArray<DateDisplayOption>
): DateDisplay {
  const pickable = (display: DateDisplay) =>
    options.some((option) => option.display === display && !option.disabled);

  if (pickable(preferred)) {
    return preferred;
  }

  // a machine in UTC has its local time in the UTC segment
  return preferred === DateDisplay.Local && pickable(DateDisplay.Utc)
    ? DateDisplay.Utc
    : DateDisplay.Server;
}

/** How to convert the server's wall clock for a display, `null` to show it as written. */
export function zoneShiftOf(
  display: DateDisplay,
  server: ServerZone,
  localZone: string
): ZoneShift | null {
  if (display === DateDisplay.Server || server.zone === null) {
    return null;
  }

  return {
    from: server.zone,
    to: display === DateDisplay.Utc ? 'UTC' : localZone,
  };
}
