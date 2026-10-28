/** React scene with accessible room navigation and one live activity caption. */

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent } from "react";
import { APARTMENT_STYLES, buildSceneSvg, resolveConfig } from "./scene.js";
import type { ApartmentConfig, HomeActivity, HomeActivitySource, DayPeriod, RoomId } from "./types.js";

export interface ApartmentSceneProps {
  config?: ApartmentConfig;
  /** Optional life source used to show its current activity. */
  activitySource?: HomeActivitySource;
  /** Freeze the scene at a specific time, useful for previews and tests. */
  now?: Date;
  initialRoom?: RoomId;
  /** Called after mount. Return the MountedAvatar from Avatar.mount to clean it up on unmount. */
  onAvatarMount?: (container: HTMLElement) => { destroy(): void } | void;
  onRoomChange?: (room: RoomId) => void;
  className?: string;
  style?: CSSProperties;
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
  const avatarHost = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!resolved.layout.rooms.some((room) => room.id === selectedRoom)) setSelectedRoom(resolved.layout.startRoom);
  }, [resolved.layout, resolved.layout.rooms, resolved.layout.startRoom, selectedRoom]);

  useEffect(() => {
    if (nowProp) return;
    const timer = setInterval(() => setClock(new Date()), 60_000);
    return () => clearInterval(timer);
  }, [activitySource, nowProp]);

  useEffect(() => {
    setClock(nowProp ?? new Date());
  }, [nowProp]);

  useEffect(() => {
    const host = avatarHost.current;
    if (!host || !onAvatarMount) return;
    const mounted = onAvatarMount(host);
    return () => mounted?.destroy();
  }, [onAvatarMount]);

  const activity = activitySource?.getCurrentActivity(clock);
  const scene = buildSceneSvg(resolved, clock, selectedRoom, activity);

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
    <div className={`ag-apartment ${className ?? ""}`.trim()} data-period={scene.period} data-activity={scene.activity.activity} onKeyDown={handleKeyDown} style={style}>
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
        <span>{activity
          ? scene.room.id === (activity.room ?? resolved.layout.startRoom) ? activity.caption : `A quiet ${scene.room.name.toLowerCase()}`
          : scene.activity.caption}</span>
      </p>
      {onAvatarMount ? <div ref={avatarHost} className="ag-apartment__widget" /> : null}
    </div>
  );
}

export type { ApartmentConfig, HomeActivity, DayPeriod, RoomId };
