import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { giveawaysJson, giveawaysRss } from "./feedRoutes";

const http = httpRouter();

auth.addHttpRoutes(http);

// Public, unauthenticated integration surface.
http.route({ path: "/api/giveaways.json", method: "GET", handler: giveawaysJson });
http.route({ path: "/api/giveaways.xml", method: "GET", handler: giveawaysRss });

export default http;
