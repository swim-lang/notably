import { initBotId } from "botid/client/core";

// Match the server's free Basic check. Protect every form using this endpoint.
initBotId({
  protect: [{
    path: "/api/forms",
    method: "POST",
    advancedOptions: { checkLevel: "basic" },
  }],
});
