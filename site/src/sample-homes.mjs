/**
 * Sample homes for the landing page. The live apartment and the generated
 * day-in-the-life comparison both read from here, so the agent always lives in
 * the home that is drawn. Plain ApartmentConfig objects; no behaviour lives here.
 */

const AVATAR = { name: "Your agent", accessories: ["headphones"] };

/** Seed shared by every sample so the comparison shows the same agent in different homes. */
export const SAMPLE_SEED = "shubur";

export const SAMPLE_HOMES = [
  {
    id: "apartment",
    label: "Seven-room apartment",
    config: { name: "Starter Apartment", avatar: AVATAR },
  },
  {
    id: "studio-flat",
    label: "Studio flat",
    config: {
      name: "Studio flat",
      avatar: AVATAR,
      layout: {
        startRoom: "studio",
        rooms: [
          { id: "studio", name: "Studio", furniture: ["window", "sofa", "bookshelf", "plant", "floorLamp"] },
          { id: "kitchen", name: "Kitchenette", furniture: ["island", "sink"] },
          { id: "bathroom", name: "Bathroom", furniture: ["shower", "mirror"] },
        ],
      },
    },
  },
];
