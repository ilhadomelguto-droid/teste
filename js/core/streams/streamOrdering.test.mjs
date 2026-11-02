import assert from "node:assert/strict";
import test from "node:test";

import { orderSourceNames, orderStreamsByAddonOrder } from "./streamOrdering.js";

function addon(id, name, order, streamId) {
  return {
    id: streamId,
    addonName: name,
    addonOrderIndex: order,
    streamOrigin: { kind: "addon", addonId: id, addonName: name, addonOrderIndex: order }
  };
}

test("ordering keeps managed groups first and preserves each source's stable internal order", () => {
  const streams = [
    addon("second", "Second", 1, "second-a"),
    addon("first", "First", 0, "first-a"),
    { ...addon("first", "First", 0, "first-b"), managed: true },
    addon("second", "Second", 1, "second-b"),
    { id: "plugin", addonName: "Plugin", streamOrigin: { kind: "plugin", sourceProviderId: "plugin" } }
  ];
  const ordered = orderStreamsByAddonOrder(
    streams,
    [
      { name: "First", orderIndex: 0 },
      { name: "Second", orderIndex: 1 }
    ],
    { isDirectDebrid: (stream) => stream.managed === true }
  );

  assert.deepEqual(ordered.map((stream) => stream.id), ["first-a", "first-b", "second-a", "second-b", "plugin"]);
});

test("source names and raw streams retain deterministic configured ordering when resolving is off", () => {
  const streams = [addon("second", "Second", 1, "raw-uncached"), addon("first", "First", 0, "raw-unknown")];
  const chips = [
    { name: "First", orderIndex: 0 },
    { name: "Second", orderIndex: 1 },
    { name: "Empty", orderIndex: 2 }
  ];
  assert.deepEqual(orderStreamsByAddonOrder(streams, chips).map((stream) => stream.id), ["raw-unknown", "raw-uncached"]);
  assert.deepEqual(orderSourceNames(streams, chips), ["First", "Second", "Empty"]);
});

test("Google Drive relay is kept first even when StreamTV exposes the same addon name", () => {
  const streams = [
    { ...addon("streamtv", "StreamTV · Direto", 0, "telegram"), url: "https://example.test/play/local/123" },
    { ...addon("streamtv", "StreamTV · Direto", 0, "gdrive"), url: "https://example.test/stremio/token/play/gdrive/456" },
    { ...addon("streamtv", "StreamTV · Direto", 0, "telegram-720"), url: "https://example.test/play/local/789" }
  ];
  assert.deepEqual(orderStreamsByAddonOrder(streams).map((stream) => stream.id), [
    "gdrive",
    "telegram",
    "telegram-720"
  ]);
});
