/**
 * React component for the Starter Apartment scene.
 *
 * Usage:
 *   import { ApartmentScene } from '@avatar-gateway/starter-apartment/react';
 *   <ApartmentScene config={{ avatar: { name: 'My Bot' } }} />
 *
 * Peer dependency: react >=18
 */

import { useState, useEffect, useCallback } from "react";
import { resolveConfig, buildSceneSvg, currentActivity } from "./scene.js";
import type { ApartmentConfig, DayActivity, DayPeriod } from "./types.js";

export interface ApartmentSceneProps {
  config?: ApartmentConfig;
  /** Override the "now" timestamp (useful for demos / testing). */
  now?: Date;
  /** Called after mount if gateway config is set. Receives the container element. */
  onAvatarMount?: (container: HTMLElement) => void;
  className?: string;
  style?: React.CSSProperties;
}

export function ApartmentScene({
  config = {},
  now: nowProp,
  onAvatarMount,
  className,
  style,
}: ApartmentSceneProps) {
  const resolved = resolveConfig(config);

  const getNow = useCallback(() => nowProp ?? new Date(), [nowProp]);

  const [sceneState, setSceneState] = useState(() => {
    const n = getNow();
    return buildSceneSvg(resolved, n);
  });

  // Re-render the scene every minute so day-cycle updates live.
  useEffect(() => {
    if (!resolved.dayCycle.enabled || nowProp) return;
    const id = setInterval(() => {
      setSceneState(buildSceneSvg(resolved, new Date()));
    }, 60_000);
    return () => clearInterval(id);
  }, [resolved, nowProp]);

  // Update when config or nowProp changes.
  useEffect(() => {
    setSceneState(buildSceneSvg(resolved, getNow()));
  }, [resolved, getNow]);

  const { svg, activity, period } = sceneState;

  return (
    <div
      className={`ag-apartment ${className ?? ""}`.trim()}
      data-period={period}
      data-activity={activity.activity}
      style={style}
    >
      {/* eslint-disable-next-line react/no-danger */}
      <div dangerouslySetInnerHTML={{ __html: svg }} />
      <p className="ag-apartment__caption" aria-live="polite">
        {activity.caption}
        <span className="ag-apartment__time"> · {resolved.dayCycle.timezone}</span>
      </p>
    </div>
  );
}

export type { ApartmentConfig, DayActivity, DayPeriod };
