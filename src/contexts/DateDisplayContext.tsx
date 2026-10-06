import { createContext, use, useMemo } from 'react';
import { DateDisplay } from '../configuration/dateDisplay';
import type { ZoneShift } from '../renderer/utils/dateFormatter';
import {
  type DateDisplaySegment,
  type ServerZone,
  dateDisplaySegments,
  effectiveDateDisplay,
  resolveServerZone,
  zoneShiftOf,
} from '../renderer/utils/dateZones';
import type { ServerTimeZoneName } from '../sql/dialect/metadata';
import { useConfiguration } from './ConfigurationContext';

interface DateDisplayContextValue {
  /** the one shown, which the preference comes to among `segments` */
  display: DateDisplay;
  /** the switch's segments: a single one leaves nothing to switch */
  segments: ReadonlyArray<DateDisplaySegment>;
  shift: ZoneShift | null;
  /** `null` outside a connection */
  serverZone: ServerZone | null;
  setDisplay: (display: DateDisplay) => void;
}

// outside a connection, and in a story: the server's text, and no switch
const DateDisplayContext = createContext<DateDisplayContextValue>({
  display: DateDisplay.Server,
  segments: [],
  shift: null,
  serverZone: null,
  setDisplay: () => {},
});

export function DateDisplayContextProvider({
  serverTimeZone,
  children,
}: {
  serverTimeZone: ServerTimeZoneName;
  children: React.ReactNode;
}) {
  const { configuration, setDateDisplay } = useConfiguration();
  const preferred = configuration.dateDisplay ?? DateDisplay.Server;

  const value = useMemo((): DateDisplayContextValue => {
    const localZone = Temporal.Now.timeZoneId();
    const serverZone = resolveServerZone(serverTimeZone);
    const segments = dateDisplaySegments(serverZone, localZone);
    const display = effectiveDateDisplay(preferred, segments);

    return {
      display,
      segments,
      shift: zoneShiftOf(display, serverZone, localZone),
      serverZone,
      setDisplay: setDateDisplay,
    };
  }, [serverTimeZone, preferred, setDateDisplay]);

  return (
    <DateDisplayContext value={value}>
      {children}
    </DateDisplayContext>
  );
}

export function useDateDisplay(): DateDisplayContextValue {
  return use(DateDisplayContext);
}

export const testables = {
  DateDisplayContext,
};
