import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const profile = readFileSync("app/(dashboard)/players/[id]/page.tsx", "utf8");
const toggle = readFileSync(
  "components/clubs/ClubRosterToggleButton.tsx",
  "utf8",
);

test("a Club can manage an athlete roster membership from the public profile", () => {
  assert.match(
    profile,
    /viewerRole === ["']club["'] && viewedAccountType === ["']athlete["'] && !isMe/,
  );
  assert.match(
    profile,
    /ClubRosterToggleButton playerProfileId=\{profile\.id\}/,
  );
  assert.match(toggle, /fetch\(["']\/api\/clubs\/me\/roster["']/);
  assert.match(toggle, /playerProfileId: cleanId, inRoster: next/);
});
