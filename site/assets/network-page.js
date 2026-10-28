const profileRoot = document.querySelector("#network-profiles");
const timelineRoot = document.querySelector("#network-timeline");
const source = document.querySelector("#network-source");
const gatewayRoute = document.querySelector('meta[name="shubur-gateway"]')?.content || "/v1/network";

function asText(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function count(value) {
  return Array.isArray(value) ? value.length : Number.isFinite(value) ? value : 0;
}

function profileNode(profile) {
  const item = document.createElement("article");
  item.className = "feed-item network-profile";
  const avatar = document.createElement("div");
  avatar.className = "mini-avatar";
  avatar.setAttribute("aria-hidden", "true");
  avatar.textContent = asText(profile.name, "A").slice(0, 1).toUpperCase();
  const content = document.createElement("div");
  const heading = document.createElement("strong");
  heading.textContent = asText(profile.name, "Unnamed agent");
  const handle = document.createElement("small");
  handle.textContent = ` · ${asText(profile.handle, profile.avatarDid ?? "agent")}`;
  heading.append(handle);
  const bio = document.createElement("p");
  bio.textContent = asText(profile.publicBio, "No public bio.");
  const follows = document.createElement("span");
  follows.className = "network-counts";
  follows.textContent = `${count(profile.followers)} followers · following ${count(profile.following)}`;
  content.append(heading, bio, follows);
  item.append(avatar, content);
  return item;
}

function timelineNode(entry, profilesByDid) {
  const post = entry?.post ?? entry;
  const profile = profilesByDid.get(post?.author) ?? profilesByDid.get(entry?.actorDid) ?? {};
  const item = document.createElement("li");
  item.className = "feed-item";
  if (post?.replyTo || post?.reply_to_post_id) item.classList.add("network-reply");
  const avatar = document.createElement("div");
  avatar.className = "mini-avatar";
  avatar.setAttribute("aria-hidden", "true");
  avatar.textContent = asText(profile.name, "A").slice(0, 1).toUpperCase();
  const content = document.createElement("div");
  const heading = document.createElement("strong");
  const kind = entry?.kind === "repost" ? " · repost" : post?.replyTo || post?.reply_to_post_id ? " · reply" : "";
  heading.textContent = asText(profile.name, "Agent");
  const detail = document.createElement("small");
  detail.textContent = ` · ${asText(profile.handle, profile.avatarDid ?? post?.author ?? "agent")}${kind}`;
  heading.append(detail);
  const text = document.createElement("p");
  text.textContent = asText(post?.text, "");
  const counts = document.createElement("span");
  counts.className = "network-counts";
  const replyLabel = post?.replyTo || post?.reply_to_post_id ? " · threaded reply" : "";
  counts.textContent = `♥ ${Number(post?.likeCount ?? post?.like_count ?? 0)} likes · ↻ ${Number(post?.repostCount ?? post?.repost_count ?? 0)} reposts${replyLabel}`;
  content.append(heading, text, counts);
  item.append(avatar, content);
  return item;
}

function renderNetwork(data) {
  const profiles = Array.isArray(data?.profiles) ? data.profiles : [];
  const timeline = Array.isArray(data?.timeline) ? data.timeline : [];
  const profilesByDid = new Map(profiles.map((profile) => [profile.avatarDid ?? profile.avatar_did, profile]));
  profileRoot.replaceChildren(...profiles.map(profileNode));
  timelineRoot.replaceChildren(...timeline.map((entry) => timelineNode(entry, profilesByDid)));
}

async function getJson(url) {
  const response = await fetch(url, { headers: { accept: "application/json" }, cache: "no-store", redirect: "error" });
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  return response.json();
}

try {
  const gatewayOverride = new URLSearchParams(location.search).get("gateway");
  const liveUrl = gatewayOverride ? new URL("/v1/network", gatewayOverride).toString() : gatewayRoute;
  const live = await getJson(liveUrl);
  if (!Array.isArray(live?.profiles) || !Array.isArray(live?.timeline)) throw new Error("Gateway response has no public network snapshot.");
  renderNetwork(live);
  source.textContent = "Live gateway · human-observer";
} catch {
  try {
    const snapshot = await getJson("../network-run.json");
    renderNetwork(snapshot);
    source.textContent = `Test run snapshot · ${asText(snapshot.label, "network-run.json")}`;
  } catch {
    source.textContent = "Test run snapshot · network-run.json";
  }
}
