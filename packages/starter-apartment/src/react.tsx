/** React scene with accessible room navigation and a live local day-cycle. */

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent } from "react";
import { APARTMENT_STYLES, buildSceneSvg, currentActivity, localHour, resolveConfig } from "./scene.js";
import type { ApartmentConfig, DayActivity, DayActivitySource, DayPeriod, RoomId } from "./types.js";

export interface ApartmentSceneProps {
  config?: ApartmentConfig;
  /** Optional autonomous routine source. Its activity plan stays local to this page. */
  activitySource?: DayActivitySource;
  /** Freeze the scene at a specific time, useful for previews and tests. */
  now?: Date;
  initialRoom?: RoomId;
  /** Called after mount. Return the MountedAvatar from Avatar.mount to clean it up on unmount. */
  onAvatarMount?: (container: HTMLElement) => { destroy(): void } | void;
  onRoomChange?: (room: RoomId) => void;
  className?: string;
  style?: CSSProperties;
}

const ROOM_COLORS: Record<RoomId, string> = {
  studio: "#597b72",
  living: "#ba8b62",
  kitchen: "#d0a95b",
  bedroom: "#767996",
  bathroom: "#6ea0a8",
  gym: "#bb7061",
  garage: "#7e8588",
};

function daySegments(activities: DayActivity[]): string {
  const escapeHtml = (value: string): string => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#39;");
  return activities.map((activity) => {
    const room = activity.room;
    const color = room ? ROOM_COLORS[room] : "#597b72";
    const width = ((activity.endHour - activity.startHour) / 24 * 100).toFixed(3);
    const title = `${activity.caption} · ${String(activity.startHour).padStart(2, "0")}:00–${String(activity.endHour).padStart(2, "0")}:00`;
    return `<span style="width:${width}%;background:${color}" title="${escapeHtml(title)}"></span>`;
  }).join("");
}

export function ApartmentScene({
  config = {},
  activitySource,
  now: nowProp,
  initialRoom,
  onAvatarMount,
  onRoomChange,
  className,
  style,
}: ApartmentSceneProps) {
  const resolved = useMemo(() => resolveConfig(config), [config]);
  const startRoom = initialRoom && resolved.layout.rooms.some((room) => room.id === initialRoom)
    ? initialRoom
    : resolved.layout.startRoom;
  const [selectedRoom, setSelectedRoom] = useState<RoomId>(startRoom);
  const [clock, setClock] = useState<Date>(() => nowProp ?? new Date());
  const [activities, setActivities] = useState<DayActivity[]>(() => resolved.dayCycle.activities);
  const avatarHost = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!resolved.layout.rooms.some((room) => room.id === selectedRoom)) setSelectedRoom(resolved.layout.startRoom);
  }, [resolved.layout, resolved.layout.rooms, resolved.layout.startRoom, selectedRoom]);

  useEffect(() => {
    if (!resolved.dayCycle.enabled || nowProp) return;
    const timer = setInterval(() => setClock(new Date()), 60_000);
    return () => clearInterval(timer);
  }, [resolved.dayCycle.enabled, nowProp]);

  useEffect(() => {
    setClock(nowProp ?? new Date());
  }, [nowProp]);

  useEffect(() => {
    const nextActivities = activitySource?.getDayActivities(clock) ?? resolved.dayCycle.activities;
    const validated = resolveConfig({ dayCycle: { timezone: resolved.dayCycle.timezone, activities: nextActivities } });
    setActivities(validated.dayCycle.activities);
  }, [activitySource, clock, resolved]);

  useEffect(() => {
    const host = avatarHost.current;
    if (!host || !onAvatarMount) return;
    const mounted = onAvatarMount(host);
    return () => mounted?.destroy();
  }, [onAvatarMount]);

  const current = currentActivity(activities, resolved.dayCycle.timezone, clock);
  const scene = buildSceneSvg(resolved, clock, selectedRoom, activitySource ? current : undefined);
  const activity = resolved.dayCycle.enabled || activitySource
    ? current
    : { ...scene.activity, caption: "Taking a quiet moment" };
  const hour = localHour(resolved.dayCycle.timezone, clock);
  const time = new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit", timeZone: resolved.dayCycle.timezone }).format(clock);

  function changeRoom(room: RoomId): void {
    setSelectedRoom(room);
    onRoomChange?.(room);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    const index = resolved.layout.rooms.findIndex((room) => room.id === selectedRoom);
    const delta = event.key === "ArrowRight" ? 1 : -1;
    const next = (index + delta + resolved.layout.rooms.length) % resolved.layout.rooms.length;
    event.preventDefault();
    changeRoom(resolved.layout.rooms[next]!.id);
  }

  return (
    <div className={`ag-apartment ${className ?? ""}`.trim()} data-period={scene.period} data-activity={activity.activity} onKeyDown={handleKeyDown} style={style}>
      <style>{APARTMENT_STYLES}</style>
      <nav className="ag-apartment__rooms" aria-label="Apartment rooms">
        {resolved.layout.rooms.map((room) => (
          <button key={room.id} className="ag-apartment__room" type="button" aria-pressed={room.id === selectedRoom} onClick={() => changeRoom(room.id)}>
            {room.name}
          </button>
        ))}
      </nav>
      <div className="ag-apartment__stage" dangerouslySetInnerHTML={{ __html: scene.svg }} />
      <p className="ag-apartment__caption" aria-live="polite">
        <span>{scene.room.id === (activity.room ?? resolved.layout.startRoom) ? activity.caption : `A quiet ${scene.room.name.toLowerCase()}`}</span>
        <span className="ag-apartment__time">{time} · {resolved.dayCycle.timezone}</span>
      </p>
      <div className="ag-apartment__day" role="img" aria-label={`Daily routine. Current local hour ${hour}.`} dangerouslySetInnerHTML={{ __html: daySegments(activities) }} />
      {onAvatarMount ? <div ref={avatarHost} className="ag-apartment__widget" /> : null}
    </div>
  );
}

export type { ApartmentConfig, DayActivity, DayPeriod, RoomId };
