import assert from "node:assert/strict";
import test from "node:test";

import { getRoleChangeRequestProfilePath } from "../../lib/account/roleChangeRequest.server";

test("resolves the requester's public profile path from their current role", () => {
  assert.equal(getRoleChangeRequestProfilePath("athlete", "id"), "/players/id");
  assert.equal(getRoleChangeRequestProfilePath("staff", "id"), "/players/id");
  assert.equal(getRoleChangeRequestProfilePath("club", "id"), "/clubs/id");
  assert.equal(
    getRoleChangeRequestProfilePath("institution", "id"),
    "/institutions/id",
  );
  assert.equal(getRoleChangeRequestProfilePath("fan", "id"), null);
  assert.equal(getRoleChangeRequestProfilePath("unknown", "id"), null);
});
