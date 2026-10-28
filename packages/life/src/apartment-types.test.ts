import { describe, expect, it } from "vitest";
import { APARTMENT_TYPES, apartmentTypeConfig } from "@avatar-gateway/starter-apartment";
import type { ApartmentTypeId } from "@avatar-gateway/starter-apartment";
import {
  availablePhoneTools, availableTools, buildEnvironment, createLifeSimulation,
  initialObjectStates, UtilityChooser,
} from "./index.js";

const TYPE_IDS: ApartmentTypeId[] = ["studio", "starter-flat", "one-bedroom", "high-rise"];
const START = new Date("2026-10-28T08:00:00.000Z");

describe("built-in apartment types", () => {
  it("exposes only each type's declared rooms, physical objects, and local tools", () => {
    for (const id of TYPE_IDS) {
      const type = APARTMENT_TYPES[id];
      const environment = buildEnvironment(apartmentTypeConfig(id));
      expect(environment.rooms.map(({ id: roomId }) => roomId)).toEqual(type.rooms.map(({ id: roomId }) => roomId));
      expect(environment.objects.map(({ id: objectId, kind, room, label }) => ({
        id: objectId.replace(/^prop-/, ""), kind, room, label,
      }))).toEqual(type.objects.map(({ id: objectId, kind, room, label }) => ({ id: objectId, kind, room, label })));

      const initial = initialObjectStates(environment);
      const tools = type.rooms.flatMap((room) => availableTools({
        environment,
        world: { location: room.id, objects: initial },
        hour: 12,
      }));
      const declared = new Set(environment.objects.map((object) => object.id));
      for (const tool of tools) {
        if (tool.objectId) expect(declared.has(tool.objectId), `${id} exposed ${tool.objectId}`).toBe(true);
        if (typeof tool.params.at === "string") expect(declared.has(tool.params.at), `${id} used ${tool.params.at}`).toBe(true);
      }
    }
  });

  it("keeps the studio bed area in its main room and gives it no bedroom room", () => {
    const studio = APARTMENT_TYPES.studio;
    expect(studio.rooms.map((room) => room.id)).not.toContain("bedroom");
    expect(studio.rooms.find((room) => room.id === "studio")?.name).toBe("Main room");
    expect(studio.objects.find((object) => object.id === "bed-area"))
      .toMatchObject({ room: "studio", kind: "bed", label: "Bed area" });
  });

  it("keeps apartment type rooms when applying a partial layout override", () => {
    const simulation = createLifeSimulation({
      agentId: "custom-studio",
      seed: "partial-layout",
      apartmentType: "studio",
      apartment: { layout: { startRoom: "bathroom" } },
      startedAt: START,
      timeZone: "UTC",
    });
    expect(simulation.getEnvironment().rooms.map((room) => room.id)).toEqual(["studio", "bathroom"]);
    expect(simulation.getEnvironment().startRoom).toBe("bathroom");
  });

  it("puts a network phone and its scope-gated actions in every apartment type", () => {
    for (const id of TYPE_IDS) {
      const environment = buildEnvironment(apartmentTypeConfig(id));
      const phone = environment.objects.find((object) => object.kind === "phone");
      expect(phone, `${id} has a phone`).toBeDefined();
      expect(phone?.features.network).toBe(1);
      const grants = [...new Set(availablePhoneTools(environment, [
        "timeline:read", "timeline:post", "feed:read", "follow:write", "dm:send", "dm:receive", "block:write",
      ]).map((tool) => tool.requiredScope))];
      const actions = availablePhoneTools(environment, grants);
      expect(new Set(actions.map((tool) => tool.action))).toEqual(new Set([
        "read_timeline", "read_notifications", "post", "reply", "like", "repost", "follow",
        "send_dm_request", "accept_dm", "send_dm", "read_dms", "block", "report", "flag_spam",
      ]));
      expect(actions.every((tool) => tool.objectId === phone?.id)).toBe(true);
      expect(availablePhoneTools(environment, ["timeline:read"]).map((tool) => tool.action)).toEqual(["read_timeline"]);
    }
  });

  it("lets the same seeded agent make different choices in different home types", () => {
    const chooserChoices = (apartmentType: ApartmentTypeId) => {
      const chosen: string[] = [];
      const policy = new UtilityChooser();
      const simulation = createLifeSimulation({
        agentId: "same-agent",
        seed: "same-seed",
        apartmentType,
        startedAt: START,
        timeZone: "UTC",
        chooser: {
          name: "recording utility chooser",
          choose(context) {
            const choice = policy.choose(context);
            chosen.push(choice.toolId);
            return choice;
          },
        },
      });
      for (let hour = 1; hour <= 36; hour += 1) {
        simulation.getCurrentActivity(new Date(START.getTime() + hour * 60 * 60 * 1000));
      }
      return chosen;
    };

    expect(chooserChoices("studio")).not.toEqual(chooserChoices("high-rise"));
  });
});
