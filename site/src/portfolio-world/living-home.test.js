import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { ROOMS, ROOM_IDS } from "./world.js";
import { buildAgentMarkup, buildDoorMarkup, buildRoomMarkup, buildSleepMarkup, mapLifeActivity } from "./living-home.js";

const houseCSS = readFileSync(new URL("./house.css", import.meta.url), "utf8");

describe("portfolio CSS-3D house port", () => {
  it("maps Shubur Life activities onto the portfolio's existing room spots and poses", () => {
    expect(mapLifeActivity({ id: "sleep", room: "bedroom" })).toMatchObject({
      room: "bedroom",
      spotId: "bed",
      pose: "lie",
      outfit: "sleep",
    });
    expect(mapLifeActivity({ id: "work", room: "studio" })).toMatchObject({
      room: "studio",
      spotId: "desk",
      pose: "desk",
      outfit: "work",
    });
    expect(mapLifeActivity({ id: "exercise", room: "gym" })).toMatchObject({
      room: "gym",
      spotId: "mat",
      pose: "stretch",
      outfit: "gym",
    });
    expect(mapLifeActivity({ id: "idle", room: "unsupported" })).toMatchObject({
      room: "living",
      spotId: "sofaA",
      pose: "sofa",
    });
    expect(mapLifeActivity({ id: "relax", room: "living" }).hold).toBe("none");
  });

  it("provides a source room spot for every Life activity in its selected room", () => {
    const activities = ["sleep", "relax", "eat", "work", "read", "exercise", "wash", "groom", "tend", "gaze", "tinker", "idle"];
    for (const id of activities) {
      for (const room of ROOM_IDS) {
        const mapped = mapLifeActivity({ id, room });
        expect(mapped.room).toBe(room);
        expect(mapped.spot, `${id} in ${room}`).toBeTruthy();
      }
    }
  });

  it("renders all seven copied rooms through the source CSS-3D box/decal geometry", () => {
    expect(ROOM_IDS).toHaveLength(7);
    for (const roomId of ROOM_IDS) {
      const markup = buildRoomMarkup(roomId, "morning");
      expect(markup.length).toBeGreaterThan(1000);
      expect(markup).toContain("class=\"st-box");
      expect(markup).toContain("rotateX(90deg)");
      expect(markup).toContain("matrix3d(");
      expect(ROOMS[roomId].name).toBeTruthy();
    }
  });

  it("keeps the source-projected door labels for each room", () => {
    for (const roomId of ROOM_IDS) {
      const markup = buildDoorMarkup(roomId);
      for (const door of ROOMS[roomId].doors) expect(markup).toContain(ROOMS[door.to].name);
      if (ROOMS[roomId].doors.length) expect(markup).toMatch(/class="st-door"/);
    }
  });

  it("shows the copied sleep cue only for the sleeping bedroom pose", () => {
    expect(buildSleepMarkup(mapLifeActivity({ id: "sleep", room: "bedroom" }))).toContain('class="st-zz"');
    expect(buildSleepMarkup(mapLifeActivity({ id: "work", room: "studio" }))).toBe("");
  });

  it("builds the source avatar from 3D parts without portfolio identity or household characters", () => {
    const markup = buildAgentMarkup(mapLifeActivity({ id: "work", room: "studio" }));
    expect(markup).toContain("st-headpos");
    expect(markup).toContain("st-head3d");
    expect(markup).toContain("st-tapL");
    expect(markup).toContain("rotateX(90deg)");
    expect(markup).not.toMatch(/Ebube|Bruce|Girlfriend|Friend|truck|PS5/i);
  });

  it("does not put the owner-specific vehicle or console props into neutral scenes", () => {
    const garage = buildRoomMarkup("garage", "afternoon");
    const livingRoom = buildRoomMarkup("living", "evening");
    const kitchen = buildRoomMarkup("kitchen", "morning", {
      tv: "off", shelf: Array(10).fill(1), stove: false, coffee: false,
      plateN: "none", plateW: "none", plateIsland: null, sinkPlates: 0,
      bed: "made", lamp: false, nightBook: false, wardrobe: false,
      shower: false, towel: "rail", fog: false, tap: false, closed: false,
      tread: "off", dumb: "rack", bar: "rack", kettleOut: false,
      bottleOut: false, rollup: false, desk: "off", deskLamp: false,
      bowlFull: true,
    });
    expect(garage).not.toMatch(/truck|Ebube|Bruce/i);
    expect(livingRoom).not.toMatch(/PS5|PlayStation|remoteInHand|Ebube|Bruce/i);
    expect(kitchen).not.toContain("#8C5A34");
  });

  it("keeps copied house styles and reduced-motion support without portfolio tour controls", () => {
    expect(houseCSS).toContain("transform:rotateX(60deg) rotateZ(45deg)");
    expect(houseCSS).toContain("prefers-reduced-motion:reduce");
    expect(houseCSS).toContain(".st-door");
    expect(houseCSS).not.toMatch(/\.st-npc|\.st-lab|\.st-clock|\.st-who|\.st-chip|\.st-wag|\.st-paw|\.st-munch|\.st-breathe/);
  });
});
